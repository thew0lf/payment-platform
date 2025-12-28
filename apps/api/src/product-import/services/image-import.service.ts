import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  S3StorageService,
  S3Credentials,
  UploadResult,
} from '../../integrations/services/providers/s3-storage.service';
import { ExternalProductImage, ImportImageResult } from '../types/product-import.types';
import axios from 'axios';

export interface ImageImportOptions {
  companyId: string;
  productId: string;
  jobId: string;
  generateThumbnails: boolean;
}

export interface ImageImportProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  currentImage?: string;
}

@Injectable()
export class ImageImportService {
  private readonly logger = new Logger(ImageImportService.name);
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds
  private readonly MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Storage: S3StorageService,
  ) {}

  /**
   * Import images for a product from external URLs
   */
  async importProductImages(
    images: ExternalProductImage[],
    options: ImageImportOptions,
    s3Credentials: S3Credentials,
    onProgress?: (progress: ImageImportProgress) => void,
  ): Promise<ImportImageResult[]> {
    const results: ImportImageResult[] = [];
    const progress: ImageImportProgress = {
      total: images.length,
      processed: 0,
      successful: 0,
      failed: 0,
    };

    // Process images sequentially to avoid overwhelming external servers
    for (const image of images) {
      try {
        progress.currentImage = image.url;

        const result = await this.importSingleImage(
          image,
          options,
          s3Credentials,
        );

        results.push(result);

        if (result.success) {
          progress.successful++;
        } else {
          progress.failed++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(`Failed to import image ${image.url}: ${errorMessage}`);

        results.push({
          success: false,
          originalUrl: image.url,
          error: errorMessage,
        });
        progress.failed++;
      }

      progress.processed++;

      if (onProgress) {
        onProgress(progress);
      }
    }

    return results;
  }

  /**
   * Import a single image from an external URL
   */
  private async importSingleImage(
    image: ExternalProductImage,
    options: ImageImportOptions,
    s3Credentials: S3Credentials,
  ): Promise<ImportImageResult> {
    // Download image from external URL
    const downloadResult = await this.downloadImage(image.url);

    if (!downloadResult.success) {
      return {
        success: false,
        originalUrl: image.url,
        error: downloadResult.error,
      };
    }

    // Generate a unique filename based on product and position
    const ext = this.getExtensionFromContentType(downloadResult.contentType);
    const filename = `${options.productId}_${image.position || 0}_${Date.now()}${ext}`;

    // Upload to S3
    try {
      const uploadResult = await this.s3Storage.uploadFile(
        s3Credentials,
        downloadResult.buffer,
        filename,
        {
          companyId: options.companyId,
          folder: 'product-images',
          metadata: {
            productId: options.productId,
            importJobId: options.jobId,
            originalUrl: image.url,
            altText: image.altText || '',
            position: String(image.position || 0),
          },
        },
        {
          generateThumbnails: options.generateThumbnails,
        },
      );

      return {
        success: true,
        originalUrl: image.url,
        cdnUrl: uploadResult.cdnUrl || uploadResult.url,
        s3Key: uploadResult.key,
        filename,
        contentType: uploadResult.contentType,
        size: uploadResult.size,
        thumbnails: uploadResult.thumbnails,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      return {
        success: false,
        originalUrl: image.url,
        error: errorMessage,
      };
    }
  }

  /**
   * Download an image from an external URL
   */
  private async downloadImage(url: string): Promise<{
    success: boolean;
    buffer?: Buffer;
    contentType: string;
    error?: string;
  }> {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: this.REQUEST_TIMEOUT,
        maxContentLength: this.MAX_IMAGE_SIZE,
        headers: {
          'User-Agent': 'AVNZ-ProductImport/1.0',
          'Accept': 'image/*',
        },
        validateStatus: (status) => status >= 200 && status < 300,
      });

      const contentType = response.headers['content-type'] || 'image/jpeg';

      // Validate it's actually an image
      if (!contentType.startsWith('image/')) {
        return {
          success: false,
          contentType,
          error: `Invalid content type: ${contentType}`,
        };
      }

      const buffer = Buffer.from(response.data);

      // Validate minimum size (likely corrupted if too small)
      if (buffer.length < 100) {
        return {
          success: false,
          contentType,
          error: 'Image file too small or corrupted',
        };
      }

      return {
        success: true,
        buffer,
        contentType,
      };
    } catch (error) {
      let errorMessage = 'Download failed';

      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          errorMessage = 'Download timeout';
        } else if (error.response) {
          errorMessage = `HTTP ${error.response.status}`;
        } else if (error.code) {
          errorMessage = `Network error: ${error.code}`;
        }
      }

      return {
        success: false,
        contentType: 'unknown',
        error: errorMessage,
      };
    }
  }

  /**
   * Get file extension from content type
   */
  private getExtensionFromContentType(contentType: string): string {
    const typeMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/avif': '.avif',
      'image/svg+xml': '.svg',
    };
    return typeMap[contentType] || '.jpg';
  }

  /**
   * Update product with imported image URLs
   */
  async updateProductImages(
    productId: string,
    companyId: string,
    images: ImportImageResult[],
    importSource?: string,
  ): Promise<void> {
    const successfulImages = images.filter((img) => img.success);

    if (successfulImages.length === 0) {
      return;
    }

    // Create ProductImage records with all required fields
    await this.prisma.productImage.createMany({
      data: successfulImages.map((img, index) => ({
        productId,
        companyId,
        s3Key: img.s3Key!,
        cdnUrl: img.cdnUrl!,
        originalUrl: img.originalUrl,
        importSource,
        filename: img.filename || `image_${index}`,
        contentType: img.contentType || 'image/jpeg',
        size: img.size || 0,
        altText: '',
        position: index,
        isPrimary: index === 0,
        thumbnailSmall: img.thumbnails?.small,
        thumbnailMedium: img.thumbnails?.medium,
        thumbnailLarge: img.thumbnails?.large,
      })),
    });

    // Update product's images JSON array with CDN URLs
    const imageUrls = successfulImages.map((img) => img.cdnUrl!);
    await this.prisma.product.update({
      where: { id: productId },
      data: {
        images: imageUrls,
      },
    });
  }

  /**
   * Get S3 credentials for a company
   */
  async getS3Credentials(companyId: string, clientId: string): Promise<S3Credentials | null> {
    // First check for company-level S3 integration
    const integration = await this.prisma.clientIntegration.findFirst({
      where: {
        clientId,
        provider: 'AWS_S3',
        status: 'ACTIVE',
      },
    });

    if (integration?.credentials) {
      const creds = integration.credentials as Record<string, string>;
      return {
        region: creds.region || 'us-east-1',
        bucket: creds.bucket,
        accessKeyId: creds.accessKeyId,
        secretAccessKey: creds.secretAccessKey,
        cloudfrontDomain: creds.cloudfrontDomain,
        keyPrefix: `products/${companyId}/`,
      };
    }

    // Fall back to platform-level S3 integration
    const platformIntegration = await this.prisma.platformIntegration.findFirst({
      where: {
        provider: 'AWS_S3',
        isSharedWithClients: true,
        status: 'ACTIVE',
      },
    });

    if (platformIntegration?.credentials) {
      const creds = platformIntegration.credentials as Record<string, string>;
      return {
        region: creds.region || 'us-east-1',
        bucket: creds.bucket,
        accessKeyId: creds.accessKeyId,
        secretAccessKey: creds.secretAccessKey,
        cloudfrontDomain: creds.cloudfrontDomain,
        keyPrefix: `clients/${clientId}/products/${companyId}/`,
      };
    }

    return null;
  }

  /**
   * Calculate total image count from products
   */
  calculateTotalImages(
    products: { images: ExternalProductImage[] }[],
  ): number {
    return products.reduce((sum, product) => sum + (product.images?.length || 0), 0);
  }
}
