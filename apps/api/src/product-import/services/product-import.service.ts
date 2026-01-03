import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { ImportJobStatus, ImportJobPhase, Prisma } from '@prisma/client';
import {
  ImportJobConfig,
  ImportJobData,
  ImportJobProgress,
  ImportJobError,
  PRODUCT_IMPORT_QUEUE,
  ExternalProduct,
  FieldMapping,
  StorageUsageStats,
  StorageBreakdown,
  StorageCategory,
  ImportHistoryStats,
  ImportCostEstimate,
  CostBreakdown,
} from '../types/product-import.types';
import {
  CreateImportJobDto,
  PreviewImportDto,
  CreateFieldMappingProfileDto,
  UpdateFieldMappingProfileDto,
  ListImportJobsQueryDto,
  PreviewProductDto,
  PreviewImportResponseDto,
  FieldMappingDto,
} from '../dto/product-import.dto';
import { RoastifyService } from '../../integrations/services/providers/roastify.service';
import { CredentialEncryptionService } from '../../integrations/services/credential-encryption.service';
import { EncryptedCredentials } from '../../integrations/types/integration.types';
import { FieldMappingService } from './field-mapping.service';
import { ImportEventService } from './import-event.service';

@Injectable()
export class ProductImportService {
  private readonly logger = new Logger(ProductImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(PRODUCT_IMPORT_QUEUE) private readonly importQueue: Queue<ImportJobData>,
    private readonly roastifyService: RoastifyService,
    private readonly credentialEncryptionService: CredentialEncryptionService,
    private readonly fieldMappingService: FieldMappingService,
    private readonly importEventService: ImportEventService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // IMPORT JOB OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Create a new import job and queue it for processing
   */
  async createImportJob(
    dto: CreateImportJobDto,
    companyId: string,
    clientId: string,
    userId: string,
  ): Promise<ImportJobProgress> {
    // Validate integration exists and belongs to the company
    const integration = await this.prisma.clientIntegration.findFirst({
      where: {
        id: dto.integrationId,
        clientId,
      },
    });

    if (!integration) {
      throw new NotFoundException(
        'Integration not found. Please verify the integration ID is correct and belongs to your account.',
      );
    }

    // Get provider from integration
    const provider = integration.provider;

    // Fetch products to get total count
    const products = await this.fetchProductsFromProvider(integration);
    const selectedProducts = dto.selectedProductIds?.length
      ? products.filter((p) => dto.selectedProductIds!.includes(p.id))
      : products;

    // Calculate total images
    const totalImages = dto.importImages
      ? selectedProducts.reduce((sum, p) => sum + (p.images?.length || 0), 0)
      : 0;

    // Create import job config
    const config: ImportJobConfig = {
      provider,
      integrationId: dto.integrationId,
      selectedProductIds: dto.selectedProductIds,
      importImages: dto.importImages ?? true,
      generateThumbnails: dto.generateThumbnails ?? true,
      skipDuplicates: dto.skipDuplicates ?? true,
      updateExisting: dto.updateExisting ?? false,
      conflictStrategy: dto.conflictStrategy,
      fieldMappingProfileId: dto.fieldMappingProfileId,
      customMappings: dto.customMappings,
    };

    // Create the job in the database
    const job = await this.prisma.productImportJob.create({
      data: {
        companyId,
        clientId,
        integrationId: dto.integrationId,
        provider,
        status: ImportJobStatus.PENDING,
        phase: ImportJobPhase.QUEUED,
        totalProducts: selectedProducts.length,
        totalImages,
        config: config as unknown as Prisma.InputJsonValue,
        createdBy: userId,
      },
    });

    // Add to Bull queue
    const jobData: ImportJobData = {
      jobId: job.id,
      companyId,
      clientId,
      integrationId: dto.integrationId,
      provider,
      config,
      createdBy: userId,
    };

    await this.importQueue.add('process-import', jobData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: 100,
      removeOnFail: 50,
    });

    this.logger.log(`Created import job ${job.id} for ${selectedProducts.length} products`);

    return this.mapToProgress(job);
  }

  /**
   * Get import job by ID
   */
  async getImportJob(jobId: string, companyId: string): Promise<ImportJobProgress> {
    const job = await this.prisma.productImportJob.findFirst({
      where: { id: jobId, companyId },
    });

    if (!job) {
      throw new NotFoundException(
        'Import job not found. The job may have been deleted or you may not have access to it.',
      );
    }

    return this.mapToProgress(job);
  }

  /**
   * List import jobs with filters
   */
  async listImportJobs(
    companyId: string,
    query: ListImportJobsQueryDto,
  ): Promise<{ items: ImportJobProgress[]; total: number; limit: number; offset: number }> {
    const limit = parseInt(query.limit || '20', 10);
    const offset = parseInt(query.offset || '0', 10);

    const where: Prisma.ProductImportJobWhereInput = {
      companyId,
      ...(query.status && { status: query.status }),
      ...(query.provider && { provider: query.provider }),
    };

    const [jobs, total] = await Promise.all([
      this.prisma.productImportJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.productImportJob.count({ where }),
    ]);

    return {
      items: jobs.map((job) => this.mapToProgress(job)),
      total,
      limit,
      offset,
    };
  }

  /**
   * Cancel a running import job
   */
  async cancelImportJob(jobId: string, companyId: string): Promise<ImportJobProgress> {
    const job = await this.prisma.productImportJob.findFirst({
      where: { id: jobId, companyId },
    });

    if (!job) {
      throw new NotFoundException(
        'Import job not found. Please check the job ID and try again.',
      );
    }

    if (job.status === ImportJobStatus.COMPLETED || job.status === ImportJobStatus.CANCELLED) {
      throw new BadRequestException(
        'This import job cannot be cancelled because it has already completed or been cancelled.',
      );
    }

    // Update job status
    const updated = await this.prisma.productImportJob.update({
      where: { id: jobId },
      data: {
        status: ImportJobStatus.CANCELLED,
        completedAt: new Date(),
      },
    });

    // Remove from queue if still pending
    const bullJob = await this.importQueue.getJob(jobId);
    if (bullJob) {
      await bullJob.remove();
    }

    this.logger.log(`Cancelled import job ${jobId}`);

    const progress = this.mapToProgress(updated);

    // Emit job cancelled event for SSE subscribers (convert to event format)
    this.importEventService.emitJobCancelled(jobId, companyId, {
      id: progress.id,
      status: progress.status,
      phase: progress.phase,
      progress: progress.progress,
      totalProducts: progress.totalProducts,
      processedProducts: progress.processedProducts,
      totalImages: progress.totalImages,
      processedImages: progress.processedImages,
      importedCount: progress.importedCount,
      skippedCount: progress.skippedCount,
      errorCount: progress.errorCount,
      currentItem: progress.currentItem,
      estimatedSecondsRemaining: progress.estimatedSecondsRemaining,
      startedAt: progress.startedAt,
      completedAt: progress.completedAt,
    });

    return progress;
  }

  /**
   * Retry a failed import job
   */
  async retryImportJob(
    jobId: string,
    companyId: string,
    userId: string,
  ): Promise<ImportJobProgress> {
    const job = await this.prisma.productImportJob.findFirst({
      where: { id: jobId, companyId },
    });

    if (!job) {
      throw new NotFoundException(
        'Import job not found. The job may have expired or been removed.',
      );
    }

    if (job.status !== ImportJobStatus.FAILED) {
      throw new BadRequestException(
        `Only failed import jobs can be retried. This job has status: ${job.status}`,
      );
    }

    // Reset job status
    const updated = await this.prisma.productImportJob.update({
      where: { id: jobId },
      data: {
        status: ImportJobStatus.PENDING,
        phase: ImportJobPhase.QUEUED,
        processedProducts: 0,
        processedImages: 0,
        importedCount: 0,
        skippedCount: 0,
        errorCount: 0,
        progress: 0,
        currentItem: null,
        estimatedSecondsRemaining: null,
        errorLog: null,
        importedIds: [],
        startedAt: null,
        completedAt: null,
      },
    });

    // Re-queue the job
    const config = job.config as unknown as ImportJobConfig;
    const jobData: ImportJobData = {
      jobId: job.id,
      companyId,
      clientId: job.clientId,
      integrationId: job.integrationId,
      provider: job.provider,
      config,
      createdBy: userId,
    };

    await this.importQueue.add('process-import', jobData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });

    this.logger.log(`Retrying import job ${jobId}`);

    return this.mapToProgress(updated);
  }

  // ═══════════════════════════════════════════════════════════════
  // PREVIEW OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Preview products before import with field mapping
   */
  async previewImport(
    dto: PreviewImportDto,
    companyId: string,
    clientId: string,
  ): Promise<PreviewImportResponseDto> {
    // Get integration
    const integration = await this.prisma.clientIntegration.findFirst({
      where: {
        id: dto.integrationId,
        clientId,
      },
    });

    if (!integration) {
      throw new NotFoundException(
        'Integration not found. Please select a valid integration from Settings > Integrations.',
      );
    }

    // Fetch products from provider
    const products = await this.fetchProductsFromProvider(integration);

    // Get field mappings
    const mappings = await this.getFieldMappings(
      integration.provider,
      companyId,
      dto.fieldMappingProfileId,
      dto.customMappings,
    );

    // Get existing products for duplicate detection
    const existingSkus = await this.prisma.product.findMany({
      where: { companyId },
      select: { sku: true, externalId: true, importSource: true },
    });

    const existingSkuSet = new Set(existingSkus.map((p) => p.sku));
    const existingExternalIds = new Set(
      existingSkus
        .filter((p) => p.importSource === integration.provider)
        .map((p) => p.externalId),
    );

    // Map products for preview
    const previewProducts: PreviewProductDto[] = products.map((product) => {
      const isDuplicate =
        existingExternalIds.has(product.id) || existingSkuSet.has(product.sku);
      const willImport = !isDuplicate;

      // Handle variant count - could be in variants array or metadata
      const variantCount: number = Array.isArray(product.variants)
        ? product.variants.length
        : (typeof product.metadata?.variantCount === 'number' ? product.metadata.variantCount : 0);

      return {
        externalId: product.id,
        sku: product.sku,
        name: product.name,
        description: product.description,
        price: product.price,
        currency: product.currency,
        imageCount: product.images?.length || 0,
        variantCount,
        willImport,
        skipReason: isDuplicate ? 'Product already exists in your catalog (matching SKU or product ID)' : undefined,
        mappedData: this.fieldMappingService.applyMappings(product, mappings).data,
      };
    });

    const willImport = previewProducts.filter((p) => p.willImport).length;
    const willSkip = previewProducts.filter((p) => !p.willImport).length;
    const estimatedImages = previewProducts
      .filter((p) => p.willImport)
      .reduce((sum, p) => sum + p.imageCount, 0);

    // Extract available source fields from the actual product data
    const availableSourceFields = this.extractAvailableFields(products);

    // Get default mappings and filter to only include fields that exist in source data
    const defaultMappings = this.getDefaultMappings(integration.provider);
    const suggestedMappings: FieldMappingDto[] = defaultMappings.map((m) => {
      // Only set sourceField if it exists in the available fields
      const sourceExists = availableSourceFields.includes(m.sourceField);
      return {
        sourceField: sourceExists ? m.sourceField : '', // Empty if field doesn't exist
        targetField: m.targetField,
        transform: typeof m.transform === 'string' ? m.transform : undefined,
      };
    });

    return {
      provider: integration.provider,
      totalProducts: products.length,
      willImport,
      willSkip,
      estimatedImages,
      products: previewProducts,
      suggestedMappings,
      availableSourceFields,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // FIELD MAPPING PROFILE OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Create a new field mapping profile
   */
  async createFieldMappingProfile(
    dto: CreateFieldMappingProfileDto,
    companyId: string,
    userId: string,
  ) {
    // If setting as default, unset existing defaults
    if (dto.isDefault) {
      await this.prisma.fieldMappingProfile.updateMany({
        where: { companyId, provider: dto.provider, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.fieldMappingProfile.create({
      data: {
        companyId,
        provider: dto.provider,
        name: dto.name,
        mappings: dto.mappings as unknown as Prisma.InputJsonValue,
        isDefault: dto.isDefault ?? false,
        createdBy: userId,
      },
    });
  }

  /**
   * Update a field mapping profile
   */
  async updateFieldMappingProfile(
    profileId: string,
    dto: UpdateFieldMappingProfileDto,
    companyId: string,
  ) {
    const profile = await this.prisma.fieldMappingProfile.findFirst({
      where: { id: profileId, companyId },
    });

    if (!profile) {
      throw new NotFoundException(
        'Field mapping profile not found. It may have been deleted or belongs to a different company.',
      );
    }

    // If setting as default, unset existing defaults
    if (dto.isDefault) {
      await this.prisma.fieldMappingProfile.updateMany({
        where: { companyId, provider: profile.provider, isDefault: true, id: { not: profileId } },
        data: { isDefault: false },
      });
    }

    return this.prisma.fieldMappingProfile.update({
      where: { id: profileId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.mappings && { mappings: dto.mappings as unknown as Prisma.InputJsonValue }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
      },
    });
  }

  /**
   * Delete a field mapping profile
   */
  async deleteFieldMappingProfile(profileId: string, companyId: string): Promise<void> {
    const profile = await this.prisma.fieldMappingProfile.findFirst({
      where: { id: profileId, companyId },
    });

    if (!profile) {
      throw new NotFoundException(
        'Field mapping profile not found. Please verify the profile ID and try again.',
      );
    }

    await this.prisma.fieldMappingProfile.delete({
      where: { id: profileId },
    });
  }

  /**
   * List field mapping profiles
   */
  async listFieldMappingProfiles(companyId: string, provider?: string) {
    return this.prisma.fieldMappingProfile.findMany({
      where: {
        companyId,
        ...(provider && { provider }),
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // PROVIDER OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Fetch products from a provider integration
   *
   * IMPORTANT: Each provider handler is responsible for normalizing data
   * to the standard ExternalProduct format:
   * - price: Always in dollars (not cents)
   * - name: Product title/name
   * - sku: Stock keeping unit
   * - description: Product description
   * - images: Array of { id, url, altText, position }
   * - variants: Array of variant data
   *
   * This normalization happens HERE, so default field mappings can be generic.
   * When adding new providers, follow the Roastify example for data transformation.
   */
  private async fetchProductsFromProvider(
    integration: {
      provider: string;
      credentials: Prisma.JsonValue | null;
    },
  ): Promise<ExternalProduct[]> {
    if (!integration.credentials) {
      throw new BadRequestException(
        'Integration credentials not configured. Please add your credentials in Settings > Integrations before importing products.',
      );
    }

    // Decrypt credentials before using them
    const encryptedCredentials = integration.credentials as unknown as EncryptedCredentials;
    const credentials = this.credentialEncryptionService.decrypt(encryptedCredentials) as Record<string, string>;

    switch (integration.provider) {
      case 'ROASTIFY':
        // Fetch USER products from GET /products endpoint
        const roastifyProducts = await this.roastifyService.importAllProducts({
          apiKey: credentials.apiKey,
        });
        // Log raw data from Roastify
        this.logger.log(`RAW Roastify products: ${JSON.stringify(roastifyProducts)}`);

        // Map Roastify product format to our format
        // Roastify: { id, title, description, imageUrl, images[], variants[], productType }
        return roastifyProducts.map((p: any) => {
          // Collect all images
          const images: { id: string; url: string; altText?: string; position: number }[] = [];
          if (p.imageUrl) {
            images.push({ id: `${p.id}-main`, url: p.imageUrl, altText: p.title, position: 0 });
          }
          if (Array.isArray(p.images)) {
            p.images.forEach((img: any, idx: number) => {
              if (img.url && img.url !== p.imageUrl) {
                images.push({ id: `${p.id}-${idx}`, url: img.url, altText: p.title, position: idx + 1 });
              }
            });
          }

          // Map variants (retailPrice is in cents, convert to dollars)
          const variants = Array.isArray(p.variants) ? p.variants.map((v: any) => ({
            id: v.id,
            sku: v.sku || v.id,
            name: v.title || v.size || 'Default',
            price: (v.retailPrice || 0) / 100,
            inventory: v.stockQty || 0,
            inStock: v.inStock ?? true,
          })) : [];

          // Get price from first variant if available
          const firstVariant = variants[0];
          const price = firstVariant?.price || 0;

          return {
            id: p.id,
            // Use product-level SKU first, then variant SKU, then fallback to product ID
            sku: p.sku || firstVariant?.sku || p.id,
            name: p.title || 'Unnamed Product',
            description: p.description || '',
            price,
            currency: 'USD',
            images,
            variants,
            metadata: {
              productType: p.productType,
              createdAt: p.createdAt,
            },
          };
        });

      default:
        throw new BadRequestException(
          `Provider "${integration.provider}" not supported for product import. Currently supported: Roastify. More providers coming soon!`,
        );
    }
  }

  /**
   * Get field mappings for import
   */
  private async getFieldMappings(
    provider: string,
    companyId: string,
    profileId?: string,
    customMappings?: FieldMapping[],
  ): Promise<FieldMapping[]> {
    // Use custom mappings if provided
    if (customMappings?.length) {
      return customMappings;
    }

    // Try to get profile mappings
    if (profileId) {
      const profile = await this.prisma.fieldMappingProfile.findFirst({
        where: { id: profileId, companyId },
      });
      if (profile) {
        return profile.mappings as unknown as FieldMapping[];
      }
    }

    // Try to get default profile
    const defaultProfile = await this.prisma.fieldMappingProfile.findFirst({
      where: { companyId, provider, isDefault: true },
    });
    if (defaultProfile) {
      return defaultProfile.mappings as unknown as FieldMapping[];
    }

    // Return default mappings for provider
    return this.getDefaultMappings(provider);
  }

  /**
   * Get default field mappings for a provider
   *
   * These mappings include sensible default transforms:
   * - 'trim' for text fields to clean up whitespace
   * - 'uppercase' for SKU for consistency
   * - 'stripHtml' for description to ensure clean text
   *
   * Note: Price normalization (cents to dollars) happens in fetchProductsFromProvider()
   * so no price transform is needed here.
   */
  private getDefaultMappings(provider: string): FieldMapping[] {
    // Provider-specific mappings with recommended transforms
    switch (provider) {
      case 'ROASTIFY':
        // Roastify data is pre-normalized in fetchProductsFromProvider
        // Add helpful text transforms for cleaner data
        return [
          { sourceField: 'name', targetField: 'name', transform: 'trim' },
          { sourceField: 'sku', targetField: 'sku', transform: 'uppercase' },
          { sourceField: 'price', targetField: 'price' },
          { sourceField: 'description', targetField: 'description', transform: 'stripHtml' },
        ];

      default:
        // Generic mappings for unknown providers
        return [
          { sourceField: 'name', targetField: 'name', transform: 'trim' },
          { sourceField: 'sku', targetField: 'sku', transform: 'uppercase' },
          { sourceField: 'price', targetField: 'price' },
          { sourceField: 'description', targetField: 'description', transform: 'trim' },
        ];
    }
  }

  /**
   * Extract available source fields from product data
   * Returns list of field names that have non-empty values in at least one product
   */
  private extractAvailableFields(products: ExternalProduct[]): string[] {
    if (!products.length) return [];

    const fieldsSet = new Set<string>();

    // Check first product for available fields (all products should have same structure)
    const sampleProduct = products[0];

    // Check standard fields
    if (sampleProduct.name) fieldsSet.add('name');
    if (sampleProduct.sku) fieldsSet.add('sku');
    if (sampleProduct.description) fieldsSet.add('description');
    if (typeof sampleProduct.price === 'number') fieldsSet.add('price');
    if (sampleProduct.currency) fieldsSet.add('currency');
    if (sampleProduct.images?.length) fieldsSet.add('images');
    if (sampleProduct.variants?.length) fieldsSet.add('variants');

    // Check metadata fields
    if (sampleProduct.metadata) {
      Object.keys(sampleProduct.metadata).forEach((key) => {
        if (sampleProduct.metadata![key] !== undefined && sampleProduct.metadata![key] !== null) {
          fieldsSet.add(key);
        }
      });
    }

    return Array.from(fieldsSet).sort();
  }

  // Note: Field mapping application is now handled by FieldMappingService
  // which provides enhanced functionality including validation, conditional
  // mappings, and complex transforms (Phase 2 enhancement).

  /**
   * Map database job to progress response
   */
  private mapToProgress(job: {
    id: string;
    companyId: string;
    provider: string;
    status: ImportJobStatus;
    phase: ImportJobPhase;
    progress: number;
    totalProducts: number;
    processedProducts: number;
    totalImages: number;
    processedImages: number;
    importedCount: number;
    skippedCount: number;
    errorCount: number;
    currentItem: string | null;
    estimatedSecondsRemaining: number | null;
    errorLog: unknown;
    createdAt: Date;
    startedAt: Date | null;
    completedAt: Date | null;
  }): ImportJobProgress {
    // Parse error log if available
    const errors = this.parseErrorLog(job.errorLog);

    return {
      id: job.id,
      companyId: job.companyId,
      provider: job.provider,
      status: job.status,
      phase: job.phase,
      progress: job.progress,
      totalProducts: job.totalProducts,
      processedProducts: job.processedProducts,
      totalImages: job.totalImages,
      processedImages: job.processedImages,
      importedCount: job.importedCount,
      skippedCount: job.skippedCount,
      errorCount: job.errorCount,
      currentItem: job.currentItem ?? undefined,
      estimatedSecondsRemaining: job.estimatedSecondsRemaining ?? undefined,
      errors: errors.length > 0 ? errors : undefined,
      createdAt: job.createdAt,
      startedAt: job.startedAt ?? undefined,
      completedAt: job.completedAt ?? undefined,
    };
  }

  /**
   * Parse error log from JSON to typed errors
   */
  private parseErrorLog(errorLog: unknown): ImportJobError[] {
    if (!errorLog) return [];
    if (!Array.isArray(errorLog)) return [];

    return errorLog.map((err: any) => ({
      productId: err.productId,
      sku: err.sku,
      message: err.message || 'Unknown error',
      code: err.code || 'UNKNOWN_ERROR',
      timestamp: err.timestamp ? new Date(err.timestamp) : new Date(),
      details: err.details,
    }));
  }

  // ═══════════════════════════════════════════════════════════════
  // STORAGE & BILLING OPERATIONS (Phase 6)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get storage usage statistics for a company
   */
  async getStorageUsage(companyId: string): Promise<StorageUsageStats> {
    // Get all product images for the company
    const images = await this.prisma.productImage.findMany({
      where: {
        companyId,
      },
      select: {
        id: true,
        cdnUrl: true,
        s3Key: true,
        size: true,
        thumbnailSmall: true,
        thumbnailMedium: true,
        thumbnailLarge: true,
        thumbnailBytes: true,
      },
    });

    // Calculate storage breakdown
    const breakdown = this.calculateStorageBreakdown(images);

    // Calculate totals
    const totalStorageBytes =
      breakdown.originals.bytes +
      breakdown.thumbnailsSmall.bytes +
      breakdown.thumbnailsMedium.bytes +
      breakdown.thumbnailsLarge.bytes;

    const totalImages = breakdown.originals.count;
    const totalThumbnails =
      breakdown.thumbnailsSmall.count +
      breakdown.thumbnailsMedium.count +
      breakdown.thumbnailsLarge.count;

    return {
      companyId,
      totalStorageBytes,
      totalStorageFormatted: this.formatBytes(totalStorageBytes),
      totalImages,
      totalThumbnails,
      breakdown,
      lastUpdated: new Date(),
    };
  }

  /**
   * Get import history statistics for a company
   */
  async getImportHistory(companyId: string): Promise<ImportHistoryStats> {
    // Get job counts by status
    const [
      totalJobs,
      successfulJobs,
      failedJobs,
      cancelledJobs,
    ] = await Promise.all([
      this.prisma.productImportJob.count({ where: { companyId } }),
      this.prisma.productImportJob.count({
        where: { companyId, status: ImportJobStatus.COMPLETED },
      }),
      this.prisma.productImportJob.count({
        where: { companyId, status: ImportJobStatus.FAILED },
      }),
      this.prisma.productImportJob.count({
        where: { companyId, status: ImportJobStatus.CANCELLED },
      }),
    ]);

    // Get aggregated stats for completed jobs
    const stats = await this.prisma.productImportJob.aggregate({
      where: { companyId, status: ImportJobStatus.COMPLETED },
      _sum: {
        importedCount: true,
        processedImages: true,
      },
    });

    // Calculate average job duration for completed jobs
    const completedJobs = await this.prisma.productImportJob.findMany({
      where: {
        companyId,
        status: ImportJobStatus.COMPLETED,
        startedAt: { not: null },
        completedAt: { not: null },
      },
      select: {
        startedAt: true,
        completedAt: true,
      },
    });

    let avgJobDurationSeconds = 0;
    if (completedJobs.length > 0) {
      const totalDuration = completedJobs.reduce((sum, job) => {
        if (job.startedAt && job.completedAt) {
          return sum + (job.completedAt.getTime() - job.startedAt.getTime());
        }
        return sum;
      }, 0);
      avgJobDurationSeconds = Math.round(totalDuration / completedJobs.length / 1000);
    }

    // Get jobs by provider
    const providerCounts = await this.prisma.productImportJob.groupBy({
      by: ['provider'],
      where: { companyId },
      _count: { id: true },
    });
    const jobsByProvider: Record<string, number> = {};
    providerCounts.forEach((p) => {
      jobsByProvider[p.provider] = p._count.id;
    });

    // Get jobs over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentJobs = await this.prisma.productImportJob.findMany({
      where: {
        companyId,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        createdAt: true,
      },
    });

    // Group by date
    const jobsByDate = new Map<string, number>();
    recentJobs.forEach((job) => {
      const dateStr = job.createdAt.toISOString().split('T')[0];
      jobsByDate.set(dateStr, (jobsByDate.get(dateStr) || 0) + 1);
    });

    const jobsOverTime = Array.from(jobsByDate.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      companyId,
      totalJobs,
      successfulJobs,
      failedJobs,
      cancelledJobs,
      totalProductsImported: stats._sum.importedCount || 0,
      totalImagesImported: stats._sum.processedImages || 0,
      avgJobDurationSeconds,
      jobsByProvider,
      jobsOverTime,
    };
  }

  /**
   * Estimate costs for an import job
   */
  async estimateImportCost(
    companyId: string,
    productCount: number,
    imageCount: number,
    generateThumbnails: boolean,
  ): Promise<ImportCostEstimate> {
    // Default pricing (cents)
    const pricing: CostBreakdown = {
      storagePerGbCents: 23, // $0.023/GB/month (S3 standard)
      imageProcessingCents: 1, // $0.01 per image processed
      thumbnailGenerationCents: 2, // $0.02 per thumbnail set
      monthlyStorageCents: 0, // Calculated below
      processingCostCents: 0, // Calculated below
    };

    // Estimate storage (average 500KB per image, 50KB per thumbnail)
    const avgImageBytes = 500 * 1024;
    const avgThumbnailBytes = 50 * 1024;
    const thumbnailCount = generateThumbnails ? imageCount * 3 : 0;

    const estimatedStorageBytes =
      imageCount * avgImageBytes + thumbnailCount * avgThumbnailBytes;

    // Calculate costs
    const storageGb = estimatedStorageBytes / (1024 * 1024 * 1024);
    pricing.monthlyStorageCents = Math.ceil(storageGb * pricing.storagePerGbCents);
    pricing.processingCostCents =
      imageCount * pricing.imageProcessingCents +
      (generateThumbnails ? imageCount * pricing.thumbnailGenerationCents : 0);

    const totalCostCents = pricing.monthlyStorageCents + pricing.processingCostCents;

    return {
      productCount,
      imageCount,
      estimatedStorageBytes,
      estimatedStorageFormatted: this.formatBytes(estimatedStorageBytes),
      estimatedThumbnails: thumbnailCount,
      costs: pricing,
      totalCostCents,
      currency: 'USD',
    };
  }

  /**
   * Calculate storage breakdown from product images
   */
  private calculateStorageBreakdown(
    images: {
      id: string;
      cdnUrl: string | null;
      s3Key: string | null;
      size: number | null;
      thumbnailSmall: string | null;
      thumbnailMedium: string | null;
      thumbnailLarge: string | null;
      thumbnailBytes: number | null;
    }[],
  ): StorageBreakdown {
    // Estimate sizes if not stored (average estimates)
    const avgOriginalSize = 500 * 1024; // 500KB
    const avgSmallThumb = 15 * 1024; // 15KB
    const avgMediumThumb = 40 * 1024; // 40KB
    const avgLargeThumb = 80 * 1024; // 80KB

    let originalsCount = 0;
    let originalsBytes = 0;
    let smallCount = 0;
    let smallBytes = 0;
    let mediumCount = 0;
    let mediumBytes = 0;
    let largeCount = 0;
    let largeBytes = 0;

    for (const img of images) {
      // Original image
      if (img.s3Key || img.cdnUrl) {
        originalsCount++;
        originalsBytes += img.size || avgOriginalSize;
      }

      // Thumbnails - use actual thumbnailBytes if available, divide equally among generated thumbnails
      const thumbCount = (img.thumbnailSmall ? 1 : 0) + (img.thumbnailMedium ? 1 : 0) + (img.thumbnailLarge ? 1 : 0);
      const actualThumbBytes = img.thumbnailBytes && thumbCount > 0 ? img.thumbnailBytes / thumbCount : 0;

      if (img.thumbnailSmall) {
        smallCount++;
        smallBytes += actualThumbBytes > 0 ? actualThumbBytes : avgSmallThumb;
      }
      if (img.thumbnailMedium) {
        mediumCount++;
        mediumBytes += actualThumbBytes > 0 ? actualThumbBytes : avgMediumThumb;
      }
      if (img.thumbnailLarge) {
        largeCount++;
        largeBytes += actualThumbBytes > 0 ? actualThumbBytes : avgLargeThumb;
      }
    }

    return {
      originals: {
        count: originalsCount,
        bytes: originalsBytes,
        formatted: this.formatBytes(originalsBytes),
      },
      thumbnailsSmall: {
        count: smallCount,
        bytes: smallBytes,
        formatted: this.formatBytes(smallBytes),
      },
      thumbnailsMedium: {
        count: mediumCount,
        bytes: mediumBytes,
        formatted: this.formatBytes(mediumBytes),
      },
      thumbnailsLarge: {
        count: largeCount,
        bytes: largeBytes,
        formatted: this.formatBytes(largeBytes),
      },
    };
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = bytes / Math.pow(k, i);

    return `${size.toFixed(i > 0 ? 2 : 0)} ${units[i]}`;
  }
}
