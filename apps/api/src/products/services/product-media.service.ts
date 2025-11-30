import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HierarchyService, UserContext } from '../../hierarchy/hierarchy.service';
import { PlatformIntegrationService } from '../../integrations/services/platform-integration.service';
import { S3StorageService, S3Credentials } from '../../integrations/services/providers/s3-storage.service';
import { CloudinaryService, CloudinaryCredentials } from '../../integrations/services/providers/cloudinary.service';
import { MediaType, ProductMedia } from '@prisma/client';
import { CreateMediaDto, UpdateMediaDto, ProcessMediaDto } from '../dto/product-media.dto';
import { IntegrationProvider } from '../../integrations/types/integration.types';

@Injectable()
export class ProductMediaService {
  private readonly logger = new Logger(ProductMediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
    private readonly platformIntegrationService: PlatformIntegrationService,
    private readonly s3StorageService: S3StorageService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  /**
   * List media for a product
   */
  async listMedia(
    productId: string,
    variantId?: string,
  ): Promise<ProductMedia[]> {
    const where: any = { productId };
    if (variantId) {
      where.variantId = variantId;
    }

    return this.prisma.productMedia.findMany({
      where,
      orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
    });
  }

  /**
   * Upload media for a product
   */
  async uploadMedia(
    productId: string,
    file: Express.Multer.File,
    dto: CreateMediaDto,
    user: UserContext,
  ): Promise<ProductMedia> {
    // Get product to verify it exists and get companyId
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        companyId: true,
        company: {
          select: {
            client: {
              select: { organizationId: true },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Validate user has access to this company
    const hasAccess = await this.hierarchyService.canAccessCompany(user, product.companyId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this product');
    }

    // Get S3 credentials from platform integration
    const organizationId = product.company?.client?.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization not found for product');
    }

    const s3Credentials = await this.getS3Credentials(organizationId);

    // Determine media type
    const mediaType = this.getMediaType(file.mimetype);

    // Upload to S3
    const uploadResult = await this.s3StorageService.uploadFile(
      s3Credentials,
      file.buffer,
      file.originalname,
      {
        companyId: product.companyId,
        folder: `products/${productId}`,
        contentType: file.mimetype,
      },
    );

    // Get next sort order
    const lastMedia = await this.prisma.productMedia.findFirst({
      where: { productId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    const sortOrder = (lastMedia?.sortOrder ?? -1) + 1;

    // Check if this is the first image (make it primary)
    const mediaCount = await this.prisma.productMedia.count({
      where: { productId },
    });

    // Create media record
    const media = await this.prisma.productMedia.create({
      data: {
        productId,
        variantId: dto.variantId,
        type: mediaType,
        url: uploadResult.url,
        thumbnailUrl: uploadResult.thumbnails?.medium,
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        width: undefined, // Would need image dimension extraction
        height: undefined,
        altText: dto.altText,
        caption: dto.caption,
        sortOrder,
        isPrimary: mediaCount === 0,
        storageProvider: 'S3',
        storageKey: uploadResult.key,
        cdnUrl: uploadResult.cdnUrl,
      },
    });

    this.logger.log(`Uploaded media ${media.id} for product ${productId}`);
    return media;
  }

  /**
   * Upload multiple files
   */
  async uploadMultipleMedia(
    productId: string,
    files: Express.Multer.File[],
    dto: CreateMediaDto,
    user: UserContext,
  ): Promise<ProductMedia[]> {
    const results: ProductMedia[] = [];

    for (const file of files) {
      const media = await this.uploadMedia(productId, file, dto, user);
      results.push(media);
    }

    return results;
  }

  /**
   * Update media metadata
   */
  async updateMedia(
    productId: string,
    mediaId: string,
    dto: UpdateMediaDto,
    user: UserContext,
  ): Promise<ProductMedia> {
    const media = await this.prisma.productMedia.findFirst({
      where: { id: mediaId, productId },
      include: {
        product: {
          select: { companyId: true },
        },
      },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    // Validate user has access
    const hasAccess = await this.hierarchyService.canAccessCompany(user, media.product.companyId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.productMedia.update({
      where: { id: mediaId },
      data: {
        altText: dto.altText,
        caption: dto.caption,
        variantId: dto.variantId,
      },
    });
  }

  /**
   * Delete media
   */
  async deleteMedia(
    productId: string,
    mediaId: string,
    user: UserContext,
  ): Promise<void> {
    const media = await this.prisma.productMedia.findFirst({
      where: { id: mediaId, productId },
      include: {
        product: {
          select: {
            companyId: true,
            company: {
              select: {
                client: {
                  select: { organizationId: true },
                },
              },
            },
          },
        },
      },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    // Validate user has access
    const hasAccess = await this.hierarchyService.canAccessCompany(user, media.product.companyId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    // Delete from S3
    try {
      const organizationId = media.product.company?.client?.organizationId;
      if (organizationId) {
        const s3Credentials = await this.getS3Credentials(organizationId);
        await this.s3StorageService.deleteFile(s3Credentials, media.storageKey);
      }
    } catch (error) {
      this.logger.warn(`Failed to delete S3 file: ${error.message}`);
    }

    // Delete from database
    await this.prisma.productMedia.delete({
      where: { id: mediaId },
    });

    // If this was primary, set another as primary
    if (media.isPrimary) {
      const nextMedia = await this.prisma.productMedia.findFirst({
        where: { productId },
        orderBy: { sortOrder: 'asc' },
      });
      if (nextMedia) {
        await this.prisma.productMedia.update({
          where: { id: nextMedia.id },
          data: { isPrimary: true },
        });
      }
    }

    this.logger.log(`Deleted media ${mediaId} from product ${productId}`);
  }

  /**
   * Reorder media
   */
  async reorderMedia(
    productId: string,
    mediaIds: string[],
    user: UserContext,
  ): Promise<ProductMedia[]> {
    // Validate product access
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { companyId: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const hasAccess = await this.hierarchyService.canAccessCompany(user, product.companyId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    // Update sort order for each media
    const updates = mediaIds.map((id, index) =>
      this.prisma.productMedia.updateMany({
        where: { id, productId },
        data: { sortOrder: index },
      }),
    );

    await this.prisma.$transaction(updates);

    return this.listMedia(productId);
  }

  /**
   * Set a media as primary
   */
  async setAsPrimary(
    productId: string,
    mediaId: string,
    user: UserContext,
  ): Promise<ProductMedia> {
    const media = await this.prisma.productMedia.findFirst({
      where: { id: mediaId, productId },
      include: {
        product: {
          select: { companyId: true },
        },
      },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    const hasAccess = await this.hierarchyService.canAccessCompany(user, media.product.companyId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    // Remove primary from all other media
    await this.prisma.productMedia.updateMany({
      where: { productId, isPrimary: true },
      data: { isPrimary: false },
    });

    // Set this one as primary and move to top
    return this.prisma.productMedia.update({
      where: { id: mediaId },
      data: { isPrimary: true, sortOrder: 0 },
    });
  }

  /**
   * Process media with Cloudinary (background removal, smart crop, etc.)
   */
  async processMedia(
    productId: string,
    mediaId: string,
    dto: ProcessMediaDto,
    user: UserContext,
  ): Promise<ProductMedia> {
    const media = await this.prisma.productMedia.findFirst({
      where: { id: mediaId, productId },
      include: {
        product: {
          select: {
            companyId: true,
            company: {
              select: {
                client: {
                  select: { organizationId: true },
                },
              },
            },
          },
        },
      },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    if (media.type !== 'IMAGE') {
      throw new BadRequestException('Only images can be processed');
    }

    const hasAccess = await this.hierarchyService.canAccessCompany(user, media.product.companyId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    const organizationId = media.product.company?.client?.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization not found');
    }

    const cloudinaryCredentials = await this.getCloudinaryCredentials(organizationId);
    const s3Credentials = await this.getS3Credentials(organizationId);

    let processResult;

    switch (dto.action) {
      case 'remove_background':
        processResult = await this.cloudinaryService.removeBackground(
          cloudinaryCredentials,
          media.url,
        );
        break;
      case 'smart_crop':
        processResult = await this.cloudinaryService.smartCrop(
          cloudinaryCredentials,
          media.url,
          {
            aspectRatio: dto.options?.width && dto.options?.height
              ? `${dto.options.width}:${dto.options.height}`
              : '1:1',
            gravity: (dto.options?.gravity as any) || 'auto',
          },
        );
        break;
      case 'enhance':
        processResult = await this.cloudinaryService.enhance(
          cloudinaryCredentials,
          media.url,
        );
        break;
      case 'upscale':
        processResult = await this.cloudinaryService.upscale(
          cloudinaryCredentials,
          media.url,
          dto.options?.scale || 2,
        );
        break;
      default:
        throw new BadRequestException(`Unknown action: ${dto.action}`);
    }

    // Re-upload processed image to S3
    const uploadResult = await this.s3StorageService.uploadFile(
      s3Credentials,
      processResult.buffer,
      `${media.filename.split('.')[0]}_processed.webp`,
      {
        companyId: media.product.companyId,
        folder: `products/${productId}`,
        contentType: 'image/webp',
      },
    );

    // Update media record with new URL (replace strategy)
    return this.prisma.productMedia.update({
      where: { id: mediaId },
      data: {
        url: uploadResult.url,
        thumbnailUrl: uploadResult.thumbnails?.medium,
        storageKey: uploadResult.key,
        cdnUrl: uploadResult.cdnUrl,
        size: processResult.buffer.length,
        width: processResult.newDimensions.width,
        height: processResult.newDimensions.height,
        generatedBy: 'CLOUDINARY',
        generationMetadata: {
          action: dto.action,
          options: dto.options ? { ...dto.options } : undefined,
          processedAt: new Date().toISOString(),
        } as any,
      },
    });
  }

  /**
   * Get media type from mime type
   */
  private getMediaType(mimeType: string): MediaType {
    if (mimeType.startsWith('image/')) return 'IMAGE';
    if (mimeType.startsWith('video/')) return 'VIDEO';
    if (mimeType === 'model/gltf-binary' || mimeType === 'model/gltf+json') return 'MODEL_3D';
    return 'DOCUMENT';
  }

  /**
   * Get S3 credentials from platform integration
   */
  private async getS3Credentials(organizationId: string): Promise<S3Credentials> {
    const integration = await this.platformIntegrationService.getByProvider(
      organizationId,
      IntegrationProvider.AWS_S3,
    );

    if (!integration) {
      throw new BadRequestException('S3 integration not configured. Please set up AWS S3 integration first.');
    }

    const credentials = await this.platformIntegrationService.getDecryptedCredentials(integration.id);

    return {
      region: credentials.region,
      bucket: credentials.bucket,
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      cloudfrontDomain: credentials.cloudfrontDomain,
      keyPrefix: credentials.keyPrefix,
    };
  }

  /**
   * Get Cloudinary credentials from platform integration
   */
  private async getCloudinaryCredentials(organizationId: string): Promise<CloudinaryCredentials> {
    const integration = await this.platformIntegrationService.getByProvider(
      organizationId,
      IntegrationProvider.CLOUDINARY,
    );

    if (!integration) {
      throw new BadRequestException('Cloudinary integration not configured. Please set up Cloudinary integration first.');
    }

    const credentials = await this.platformIntegrationService.getDecryptedCredentials(integration.id);

    return {
      cloudName: credentials.cloudName,
      apiKey: credentials.apiKey,
      apiSecret: credentials.apiSecret,
    };
  }
}
