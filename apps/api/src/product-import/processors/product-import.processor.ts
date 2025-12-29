import { Process, Processor, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { ImportJobStatus, ImportJobPhase, Prisma } from '@prisma/client';
import {
  ImportJobData,
  ImportJobError,
  ImportJobProgress,
  ImportErrorCode,
  PRODUCT_IMPORT_QUEUE,
  FieldMapping,
  ExternalProduct,
  ExternalProductImage,
  ConflictStrategy,
  ConflictInfo,
  ImportJobConfig,
} from '../types/product-import.types';
import { RoastifyService } from '../../integrations/services/providers/roastify.service';
import { CredentialEncryptionService } from '../../integrations/services/credential-encryption.service';
import { EncryptedCredentials } from '../../integrations/types/integration.types';
import { FieldMappingService } from '../services/field-mapping.service';
import { ImageImportService } from '../services/image-import.service';
import { ImportEventService } from '../services/import-event.service';
import { S3Credentials } from '../../integrations/services/providers/s3-storage.service';

@Processor(PRODUCT_IMPORT_QUEUE)
export class ProductImportProcessor {
  private readonly logger = new Logger(ProductImportProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly roastifyService: RoastifyService,
    private readonly credentialEncryptionService: CredentialEncryptionService,
    private readonly fieldMappingService: FieldMappingService,
    private readonly imageImportService: ImageImportService,
    private readonly importEventService: ImportEventService,
  ) {}

  @OnQueueActive()
  onActive(job: Job<ImportJobData>) {
    this.logger.log(`Processing import job ${job.data.jobId} for company ${job.data.companyId}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job<ImportJobData>) {
    this.logger.log(`Completed import job ${job.data.jobId}`);
  }

  @OnQueueFailed()
  async onFailed(job: Job<ImportJobData>, error: Error) {
    const { jobId, companyId } = job.data;
    this.logger.error(`Failed import job ${jobId}: ${error.message}`);

    const failedAt = new Date();

    // Update job status to failed
    await this.prisma.productImportJob.update({
      where: { id: jobId },
      data: {
        status: ImportJobStatus.FAILED,
        completedAt: failedAt,
        errorLog: [
          {
            message: error.message,
            code: 'UNKNOWN_ERROR' as ImportErrorCode,
            timestamp: failedAt,
          },
        ] as unknown as Prisma.InputJsonValue,
      },
    });

    // Emit job failed event
    this.importEventService.emitJobFailed(jobId, companyId, {
      message: error.message,
      code: 'UNKNOWN_ERROR',
      timestamp: failedAt,
    });
  }

  @Process('process-import')
  async processImport(job: Job<ImportJobData>) {
    const { jobId, companyId, clientId, integrationId, config } = job.data;
    const errors: ImportJobError[] = [];
    const importedIds: string[] = [];
    // Map of productId -> images to import
    const productImagesMap = new Map<string, ExternalProductImage[]>();
    let processedProducts = 0;
    let importedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    let totalImages = 0;
    let processedImages = 0;

    try {
      // Emit job started event
      this.importEventService.emitJobStarted(jobId, companyId, {
        id: jobId,
        status: ImportJobStatus.IN_PROGRESS,
        phase: ImportJobPhase.FETCHING,
        progress: 0,
        totalProducts: 0,
        processedProducts: 0,
        totalImages: 0,
        processedImages: 0,
        importedCount: 0,
        skippedCount: 0,
        errorCount: 0,
        startedAt: new Date(),
      });

      // Update job status to IN_PROGRESS
      await this.updateJobPhase(jobId, companyId, ImportJobPhase.FETCHING);
      await this.updateJobStatus(jobId, ImportJobStatus.IN_PROGRESS, new Date());

      // Get integration credentials
      const integration = await this.prisma.clientIntegration.findFirst({
        where: { id: integrationId, clientId },
      });

      if (!integration || !integration.credentials) {
        throw new Error('Integration not found or credentials missing');
      }

      // Decrypt credentials before using them
      const encryptedCredentials = integration.credentials as unknown as EncryptedCredentials;
      const credentials = this.credentialEncryptionService.decrypt(encryptedCredentials) as Record<string, string>;

      // Fetch products from provider
      const products = await this.fetchProducts(config.provider, credentials);
      const selectedProducts = config.selectedProductIds?.length
        ? products.filter((p) => config.selectedProductIds!.includes(p.id))
        : products;

      // Update total count
      await this.prisma.productImportJob.update({
        where: { id: jobId },
        data: { totalProducts: selectedProducts.length },
      });

      // Get field mappings
      const mappings = await this.getFieldMappings(config, companyId);

      // Phase: MAPPING
      await this.updateJobPhase(jobId, companyId, ImportJobPhase.MAPPING, {
        totalProducts: selectedProducts.length,
      });

      // Get existing products for duplicate detection
      const existingProducts = await this.prisma.product.findMany({
        where: { companyId },
        select: { id: true, sku: true, externalId: true, importSource: true },
      });

      const existingSkuSet = new Set(existingProducts.map((p) => p.sku));
      const existingExternalIds = new Map(
        existingProducts
          .filter((p) => p.importSource === config.provider)
          .map((p) => [p.externalId, p.id]),
      );

      // Phase: CREATING
      await this.updateJobPhase(jobId, companyId, ImportJobPhase.CREATING, {
        totalProducts: selectedProducts.length,
      });

      // Get effective conflict strategy (with backward compatibility)
      const conflictStrategy = this.getEffectiveConflictStrategy(config);
      this.logger.debug(`Using conflict strategy: ${conflictStrategy}`);

      // Process products in batches
      const batchSize = 10;
      for (let i = 0; i < selectedProducts.length; i += batchSize) {
        const batch = selectedProducts.slice(i, i + batchSize);

        for (const product of batch) {
          try {
            // Check for conflicts
            const existingId = existingExternalIds.get(product.id);
            const isDuplicateSku = existingSkuSet.has(product.sku);
            const hasConflict = existingId || isDuplicateSku;

            // Handle conflict if present
            let effectiveSku = product.sku;
            let updateExistingId: string | undefined;

            if (hasConflict) {
              const conflictResult = this.handleConflict(
                jobId,
                companyId,
                product,
                existingId,
                isDuplicateSku,
                conflictStrategy,
                existingSkuSet,
              );

              if (conflictResult.skip) {
                skippedCount++;
                processedProducts++;
                continue;
              }

              if (conflictResult.modifiedSku) {
                effectiveSku = conflictResult.modifiedSku;
              }

              if (conflictResult.existingId) {
                updateExistingId = conflictResult.existingId;
              }
            }

            // Apply field mappings with the enhanced service
            const { data: mappedData, validation } = this.fieldMappingService.applyMappings(product, mappings);

            // Check for validation errors
            if (!validation.isValid) {
              errorCount++;
              errors.push({
                productId: product.id,
                sku: product.sku,
                message: validation.errors.map(e => e.message).join('; '),
                code: 'VALIDATION_FAILED',
                timestamp: new Date(),
                details: { validationErrors: validation.errors },
              });
              processedProducts++;
              continue;
            }

            // Create or update product based on conflict resolution
            if (updateExistingId) {
              // Calculate the import price once with proper null handling
              const importPrice = mappedData.price != null
                ? (mappedData.price as number)
                : product.price / 100;

              // Update existing product
              if (conflictStrategy === 'MERGE') {
                // MERGE: Get existing product and only update empty fields
                const existingProduct = await this.prisma.product.findUnique({
                  where: { id: updateExistingId },
                });

                await this.prisma.product.update({
                  where: { id: updateExistingId },
                  data: {
                    name: existingProduct?.name || (mappedData.name as string),
                    description: existingProduct?.description ?? (mappedData.description as string),
                    price: existingProduct?.price ?? importPrice,
                    currency: existingProduct?.currency ?? (mappedData.currency as string) ?? 'USD',
                    lastSyncedAt: new Date(),
                  },
                });
              } else {
                // UPDATE: Replace all fields with imported values
                await this.prisma.product.update({
                  where: { id: updateExistingId },
                  data: {
                    name: mappedData.name as string,
                    description: (mappedData.description as string) ?? product.description ?? '',
                    price: importPrice,
                    currency: (mappedData.currency as string) ?? 'USD',
                    lastSyncedAt: new Date(),
                  },
                });
              }
              importedIds.push(updateExistingId);
              this.importEventService.emitProductImported(jobId, companyId, updateExistingId, effectiveSku);
              // Track images for this updated product
              if (config.importImages && product.images?.length > 0) {
                productImagesMap.set(updateExistingId, product.images);
                totalImages += product.images.length;
              }
            } else {
              // Create new product - generate slug from name
              const productName = (mappedData.name as string) || product.name;
              const slug = this.generateSlug(productName, effectiveSku);

              // Use nullish coalescing (??) to handle 0 as a valid price
              // mappedData.price already has transforms applied (e.g., centsToDecimal)
              // Fall back to raw product.price / 100 only when mappedData.price is null/undefined
              const finalPrice = mappedData.price != null
                ? (mappedData.price as number)
                : product.price / 100;

              const newProduct = await this.prisma.product.create({
                data: {
                  companyId,
                  name: productName,
                  description: (mappedData.description as string) ?? product.description ?? '',
                  sku: effectiveSku,
                  slug,
                  price: finalPrice,
                  currency: (mappedData.currency as string) ?? product.currency ?? 'USD',
                  status: 'DRAFT',
                  importSource: config.provider,
                  externalId: product.id,
                  externalSku: product.sku,
                  lastSyncedAt: new Date(),
                },
              });
              importedIds.push(newProduct.id);
              existingSkuSet.add(effectiveSku);
              this.importEventService.emitProductImported(jobId, companyId, newProduct.id, effectiveSku);
              // Track images for this new product
              if (config.importImages && product.images?.length > 0) {
                productImagesMap.set(newProduct.id, product.images);
                totalImages += product.images.length;
              }
            }

            importedCount++;
          } catch (error) {
            errorCount++;
            errors.push({
              productId: product.id,
              sku: product.sku,
              message: error instanceof Error ? error.message : 'Unknown error',
              code: 'DATABASE_ERROR',
              timestamp: new Date(),
            });
          }

          processedProducts++;

          // Update progress every 5 products
          if (processedProducts % 5 === 0) {
            const progress = Math.round((processedProducts / selectedProducts.length) * 100);
            await this.updateProgress(jobId, companyId, {
              processedProducts,
              progress,
              currentItem: product.name,
              totalProducts: selectedProducts.length,
              importedCount,
              skippedCount,
              errorCount,
              totalImages,
              processedImages,
              phase: ImportJobPhase.CREATING,
            });
          }
        }
      }

      // Phase: IMAGE IMPORT (if enabled)
      if (config.importImages && productImagesMap.size > 0) {
        // Update job with total image count
        await this.prisma.productImportJob.update({
          where: { id: jobId },
          data: { totalImages },
        });

        // Get S3 credentials
        const s3Credentials = await this.imageImportService.getS3Credentials(companyId, clientId);

        if (s3Credentials) {
          this.logger.log(`Starting image import for ${productImagesMap.size} products (${totalImages} total images)`);

          // Phase: DOWNLOADING_IMAGES
          await this.updateJobPhase(jobId, companyId, ImportJobPhase.DOWNLOADING_IMAGES, {
            totalProducts: selectedProducts.length,
            processedProducts,
            totalImages,
            processedImages,
            importedCount,
            skippedCount,
            errorCount,
          });

          // Process images for each product
          for (const [productId, images] of productImagesMap) {
            try {
              // Phase: UPLOADING_IMAGES (once we start uploading first product's images)
              if (processedImages === 0) {
                await this.updateJobPhase(jobId, companyId, ImportJobPhase.UPLOADING_IMAGES, {
                  totalProducts: selectedProducts.length,
                  processedProducts,
                  totalImages,
                  processedImages,
                  importedCount,
                  skippedCount,
                  errorCount,
                });
              }

              const imageResults = await this.imageImportService.importProductImages(
                images,
                {
                  companyId,
                  productId,
                  jobId,
                  generateThumbnails: config.generateThumbnails ?? true,
                },
                s3Credentials,
                (progress) => {
                  // Update progress during image import
                  this.updateImageProgress(
                    jobId,
                    companyId,
                    processedImages + progress.processed,
                    totalImages,
                    progress.currentImage || '',
                    {
                      totalProducts: selectedProducts.length,
                      processedProducts,
                      importedCount,
                      skippedCount,
                      errorCount,
                    },
                  ).catch((err) =>
                    this.logger.warn(`Failed to update image progress: ${err.message}`),
                  );
                },
              );

              // Update product with imported images
              await this.imageImportService.updateProductImages(
                productId,
                companyId,
                imageResults,
                config.provider,
              );

              // Track successful and failed images
              const failedImages = imageResults.filter((r) => !r.success);
              if (failedImages.length > 0) {
                errors.push(
                  ...failedImages.map((img) => ({
                    productId,
                    message: `Image import failed: ${img.error}`,
                    code: 'IMAGE_IMPORT_ERROR' as ImportErrorCode,
                    timestamp: new Date(),
                    details: { originalUrl: img.originalUrl },
                  })),
                );
              }

              processedImages += images.length;
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Image import failed';
              this.logger.warn(`Failed to import images for product ${productId}: ${errorMessage}`);
              errors.push({
                productId,
                message: errorMessage,
                code: 'IMAGE_IMPORT_ERROR',
                timestamp: new Date(),
              });
              processedImages += images.length;
            }
          }

          // Phase: GENERATING_THUMBNAILS (already done by S3StorageService if enabled)
          if (config.generateThumbnails) {
            await this.updateJobPhase(jobId, companyId, ImportJobPhase.GENERATING_THUMBNAILS, {
              totalProducts: selectedProducts.length,
              processedProducts,
              totalImages,
              processedImages,
              importedCount,
              skippedCount,
              errorCount,
            });
          }
        } else {
          this.logger.warn(`No S3 credentials found for company ${companyId}, skipping image import`);
          errors.push({
            message: 'Image import skipped: No S3 integration configured',
            code: 'NO_S3_CREDENTIALS',
            timestamp: new Date(),
          });
        }
      }

      // Phase: FINALIZING
      await this.updateJobPhase(jobId, companyId, ImportJobPhase.FINALIZING, {
        progress: 95,
        totalProducts: selectedProducts.length,
        processedProducts,
        totalImages,
        processedImages,
        importedCount,
        skippedCount,
        errorCount,
      });

      // Phase: DONE
      await this.updateJobPhase(jobId, companyId, ImportJobPhase.DONE, {
        progress: 100,
        totalProducts: selectedProducts.length,
        processedProducts,
        totalImages,
        processedImages,
        importedCount,
        skippedCount,
        errorCount,
      });

      // Update final job status
      const completedAt = new Date();
      await this.prisma.productImportJob.update({
        where: { id: jobId },
        data: {
          status: ImportJobStatus.COMPLETED,
          phase: ImportJobPhase.DONE,
          progress: 100,
          processedProducts,
          importedCount,
          skippedCount,
          errorCount,
          importedIds,
          totalImages,
          processedImages,
          errorLog: errors.length > 0 ? (errors as unknown as Prisma.InputJsonValue) : null,
          completedAt,
          currentItem: null,
        },
      });

      // Emit job completed event
      this.importEventService.emitJobCompleted(jobId, companyId, {
        id: jobId,
        status: ImportJobStatus.COMPLETED,
        phase: ImportJobPhase.DONE,
        progress: 100,
        totalProducts: selectedProducts.length,
        processedProducts,
        totalImages,
        processedImages,
        importedCount,
        skippedCount,
        errorCount,
        completedAt,
      });

      this.logger.log(
        `Import job ${jobId} completed: ${importedCount} imported, ${skippedCount} skipped, ${errorCount} errors, ${processedImages}/${totalImages} images`,
      );

      return {
        jobId,
        status: ImportJobStatus.COMPLETED,
        importedCount,
        skippedCount,
        errorCount,
        importedIds,
        totalImages,
        processedImages,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Import job ${jobId} failed: ${errorMessage}`);

      const failedAt = new Date();
      await this.prisma.productImportJob.update({
        where: { id: jobId },
        data: {
          status: ImportJobStatus.FAILED,
          completedAt: failedAt,
          errorLog: [
            ...errors,
            {
              message: errorMessage,
              code: 'UNKNOWN_ERROR' as ImportErrorCode,
              timestamp: failedAt,
            },
          ] as unknown as Prisma.InputJsonValue,
        },
      });

      // Emit job failed event
      this.importEventService.emitJobFailed(jobId, companyId, {
        message: errorMessage,
        code: 'UNKNOWN_ERROR',
        timestamp: failedAt,
      });

      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  private async fetchProducts(
    provider: string,
    credentials: Record<string, string>,
  ): Promise<ExternalProduct[]> {
    switch (provider) {
      case 'ROASTIFY':
        const roastifyProducts = await this.roastifyService.importAllProducts({
          apiKey: credentials.apiKey,
        });
        return roastifyProducts.map((p) => {
          // Roastify API returns 'title' for product name
          const productName = p.title || p.name || 'Untitled Product';
          // Extract first variant SKU if product-level SKU is not available
          const productSku = p.sku || p.variants?.[0]?.sku || `ROAST-${p.id.substring(0, 8)}`;
          // Get price from first variant if product-level price not available
          const productPrice = p.price ?? p.retailPrice ?? p.variants?.[0]?.retailPrice ?? 0;

          return {
            id: p.id,
            sku: productSku,
            name: productName,
            description: p.description || '',
            price: productPrice,
            currency: p.currency || 'USD',
            images: (p.images || []).map((img: any, index: number) => ({
              id: img.id || `img-${index}`,
              url: img.url,
              altText: img.altText || productName,
              position: img.position ?? index,
            })),
            variants: (p.variants || []).map((v: any) => ({
              id: v.id,
              sku: v.sku,
              name: v.title || v.name || '',
              price: v.retailPrice ?? v.price ?? 0,
              inventory: v.stockQty ?? v.inventory ?? 0,
            })),
            metadata: {
              productType: p.productType,
              roastLevel: p.roastLevel,
              origin: p.origin,
            },
          };
        });

      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  private async getFieldMappings(
    config: ImportJobData['config'],
    companyId: string,
  ): Promise<FieldMapping[]> {
    let mappings: FieldMapping[];

    if (config.customMappings?.length) {
      mappings = config.customMappings;
    } else if (config.fieldMappingProfileId) {
      const profile = await this.prisma.fieldMappingProfile.findFirst({
        where: { id: config.fieldMappingProfileId, companyId },
      });
      if (profile) {
        mappings = profile.mappings as unknown as FieldMapping[];
      } else {
        mappings = this.getDefaultMappings();
      }
    } else {
      mappings = this.getDefaultMappings();
    }

    // Apply provider-specific transforms for price fields
    // Roastify prices are in cents, so we need to convert to dollars
    if (config.provider === 'ROASTIFY') {
      mappings = mappings.map((m) => {
        if (m.targetField === 'price' && !m.transform) {
          this.logger.debug('Auto-applying centsToDecimal transform for Roastify price field');
          return { ...m, transform: 'centsToDecimal' as const };
        }
        return m;
      });
    }

    return mappings;
  }

  private getDefaultMappings(): FieldMapping[] {
    return [
      { sourceField: 'name', targetField: 'name' },
      { sourceField: 'description', targetField: 'description' },
      { sourceField: 'sku', targetField: 'sku' },
      { sourceField: 'price', targetField: 'price', transform: 'centsToDecimal' },
      { sourceField: 'currency', targetField: 'currency' },
    ];
  }

  private async updateJobPhase(
    jobId: string,
    companyId: string,
    phase: ImportJobPhase,
    progress?: Partial<ImportJobProgress>,
  ): Promise<void> {
    await this.prisma.productImportJob.update({
      where: { id: jobId },
      data: { phase },
    });
    this.logger.debug(`Job ${jobId} phase: ${phase}`);

    // Emit phase change event
    this.importEventService.emitPhaseChanged(jobId, companyId, {
      id: jobId,
      status: ImportJobStatus.IN_PROGRESS,
      phase,
      progress: progress?.progress ?? 0,
      totalProducts: progress?.totalProducts ?? 0,
      processedProducts: progress?.processedProducts ?? 0,
      totalImages: progress?.totalImages ?? 0,
      processedImages: progress?.processedImages ?? 0,
      importedCount: progress?.importedCount ?? 0,
      skippedCount: progress?.skippedCount ?? 0,
      errorCount: progress?.errorCount ?? 0,
      currentItem: progress?.currentItem,
    });
  }

  private async updateJobStatus(
    jobId: string,
    status: ImportJobStatus,
    startedAt?: Date,
  ): Promise<void> {
    await this.prisma.productImportJob.update({
      where: { id: jobId },
      data: {
        status,
        ...(startedAt && { startedAt }),
      },
    });
  }

  private async updateProgress(
    jobId: string,
    companyId: string,
    progressData: {
      processedProducts: number;
      progress: number;
      currentItem: string;
      totalProducts: number;
      importedCount: number;
      skippedCount: number;
      errorCount: number;
      totalImages: number;
      processedImages: number;
      phase?: ImportJobPhase;
    },
  ): Promise<void> {
    await this.prisma.productImportJob.update({
      where: { id: jobId },
      data: {
        processedProducts: progressData.processedProducts,
        progress: progressData.progress,
        currentItem: progressData.currentItem,
      },
    });

    // Emit progress event
    this.importEventService.emitProgress(jobId, companyId, {
      id: jobId,
      status: ImportJobStatus.IN_PROGRESS,
      phase: progressData.phase ?? ImportJobPhase.CREATING,
      progress: progressData.progress,
      totalProducts: progressData.totalProducts,
      processedProducts: progressData.processedProducts,
      totalImages: progressData.totalImages,
      processedImages: progressData.processedImages,
      importedCount: progressData.importedCount,
      skippedCount: progressData.skippedCount,
      errorCount: progressData.errorCount,
      currentItem: progressData.currentItem,
    });
  }

  private async updateImageProgress(
    jobId: string,
    companyId: string,
    processedImages: number,
    totalImages: number,
    currentItem: string,
    additionalData?: {
      totalProducts: number;
      processedProducts: number;
      importedCount: number;
      skippedCount: number;
      errorCount: number;
    },
  ): Promise<void> {
    await this.prisma.productImportJob.update({
      where: { id: jobId },
      data: {
        processedImages,
        currentItem,
      },
    });

    // Emit progress event for image processing
    const imageProgress = Math.round((processedImages / totalImages) * 100);
    this.importEventService.emitProgress(jobId, companyId, {
      id: jobId,
      status: ImportJobStatus.IN_PROGRESS,
      phase: ImportJobPhase.UPLOADING_IMAGES,
      progress: imageProgress,
      totalProducts: additionalData?.totalProducts ?? 0,
      processedProducts: additionalData?.processedProducts ?? 0,
      totalImages,
      processedImages,
      importedCount: additionalData?.importedCount ?? 0,
      skippedCount: additionalData?.skippedCount ?? 0,
      errorCount: additionalData?.errorCount ?? 0,
      currentItem,
    });
  }

  private generateSlug(name: string, sku: string): string {
    // Generate a URL-friendly slug from the product name
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .substring(0, 50); // Limit length

    // Add SKU suffix for uniqueness
    const skuSuffix = sku
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .substring(0, 20);

    return `${baseSlug}-${skuSuffix}`;
  }

  /**
   * Get effective conflict strategy from config with backward compatibility
   * Supports deprecated skipDuplicates/updateExisting flags
   */
  private getEffectiveConflictStrategy(config: ImportJobConfig): ConflictStrategy {
    // If new conflictStrategy is set, use it
    if (config.conflictStrategy) {
      return config.conflictStrategy;
    }

    // Backward compatibility with deprecated boolean flags
    if (config.updateExisting) {
      return 'UPDATE';
    }
    if (config.skipDuplicates) {
      return 'SKIP';
    }

    // Default strategy
    return 'SKIP';
  }

  /**
   * Generate a unique SKU by appending a suffix
   */
  private generateUniqueSku(baseSku: string, existingSkus: Set<string>): string {
    let suffix = 1;
    let newSku = `${baseSku}-${suffix}`;
    while (existingSkus.has(newSku)) {
      suffix++;
      newSku = `${baseSku}-${suffix}`;
    }
    return newSku;
  }

  /**
   * Handle conflict based on strategy and emit conflict event
   */
  private handleConflict(
    jobId: string,
    companyId: string,
    product: ExternalProduct,
    existingProductId: string | undefined,
    isDuplicateSku: boolean,
    strategy: ConflictStrategy,
    existingSkuSet: Set<string>,
  ): { skip: boolean; modifiedSku?: string; existingId?: string } {
    // Determine conflict type
    const conflictType: ConflictInfo['conflictType'] =
      existingProductId && isDuplicateSku ? 'BOTH' :
      existingProductId ? 'EXTERNAL_ID' : 'SKU';

    const conflict: ConflictInfo = {
      externalId: product.id,
      sku: product.sku,
      existingProductId,
      conflictType,
      resolution: strategy,
      skipped: false,
    };

    switch (strategy) {
      case 'SKIP':
        conflict.skipped = true;
        this.importEventService.emitConflictDetected(jobId, companyId, conflict);
        this.importEventService.emitProductSkipped(jobId, companyId, product.id, product.sku);
        return { skip: true };

      case 'UPDATE':
        if (existingProductId) {
          this.importEventService.emitConflictDetected(jobId, companyId, conflict);
          return { skip: false, existingId: existingProductId };
        }
        // No existing product to update, treat as new
        return { skip: false };

      case 'MERGE':
        if (existingProductId) {
          this.importEventService.emitConflictDetected(jobId, companyId, conflict);
          return { skip: false, existingId: existingProductId };
        }
        return { skip: false };

      case 'FORCE_CREATE':
        if (isDuplicateSku) {
          const modifiedSku = this.generateUniqueSku(product.sku, existingSkuSet);
          conflict.modified = true;
          conflict.modifiedSku = modifiedSku;
          this.importEventService.emitConflictDetected(jobId, companyId, conflict);
          return { skip: false, modifiedSku };
        }
        return { skip: false };

      default:
        return { skip: false };
    }
  }

  // Note: The old applyMappings, getNestedValue, and applyTransform methods
  // have been replaced by FieldMappingService.applyMappings() which provides
  // enhanced functionality including validation, conditional mappings, and
  // complex transforms.
}