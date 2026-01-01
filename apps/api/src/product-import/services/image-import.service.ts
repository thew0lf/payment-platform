import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  S3StorageService,
  S3Credentials,
  UploadResult,
} from '../../integrations/services/providers/s3-storage.service';
import { CredentialEncryptionService } from '../../integrations/services/credential-encryption.service';
import { EncryptedCredentials } from '../../integrations/types/integration.types';
import { ExternalProductImage, ImportImageResult } from '../types/product-import.types';
import axios from 'axios';
import { URL } from 'url';

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

  /**
   * Allowlist of trusted image source domains for SSRF protection
   * Only URLs from these domains will be downloaded
   */
  private readonly ALLOWED_IMAGE_DOMAINS = [
    'storage.roastify.app',
    'cdn.shopify.com',
    'images.shopify.com',
    'cdn.shopifycdn.net',
    // S3 buckets (for cross-account imports)
    'avnz-platform-assets.s3.us-east-1.amazonaws.com',
    'avnz-platform-assets.s3.amazonaws.com',
  ];

  /**
   * Blocked IP ranges for SSRF protection
   * Prevents requests to internal networks, cloud metadata, etc.
   */
  private readonly BLOCKED_IP_PATTERNS = [
    /^127\./,                      // Loopback
    /^10\./,                       // Private Class A
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private Class B
    /^192\.168\./,                 // Private Class C
    /^169\.254\./,                 // Link-local / Cloud metadata
    /^0\./,                        // Current network
    /^224\./,                      // Multicast
    /^::1$/,                       // IPv6 loopback
    /^fe80:/i,                     // IPv6 link-local
    /^fc00:/i,                     // IPv6 private
    /^fd00:/i,                     // IPv6 private
  ];

  /**
   * Validate URL for SSRF protection
   * Returns error message if URL is blocked, null if allowed
   */
  private validateUrlForSsrf(urlString: string): string | null {
    try {
      const url = new URL(urlString);

      // Must be HTTPS
      if (url.protocol !== 'https:') {
        return 'Only HTTPS URLs are allowed';
      }

      // Check against blocked IP patterns
      const hostname = url.hostname.toLowerCase();
      for (const pattern of this.BLOCKED_IP_PATTERNS) {
        if (pattern.test(hostname)) {
          return 'URL points to blocked network range';
        }
      }

      // Block localhost variations
      if (
        hostname === 'localhost' ||
        hostname === '0.0.0.0' ||
        hostname.endsWith('.localhost') ||
        hostname === 'metadata.google.internal'
      ) {
        return 'URL points to blocked host';
      }

      // Check against allowlist
      const isAllowed = this.ALLOWED_IMAGE_DOMAINS.some(
        (domain) => hostname === domain || hostname.endsWith('.' + domain),
      );

      if (!isAllowed) {
        this.logger.warn(`Image URL from non-allowlisted domain blocked: ${hostname}`);
        return `Domain not in allowlist: ${hostname}`;
      }

      return null; // URL is allowed
    } catch (error) {
      return 'Invalid URL format';
    }
  }

  /**
   * Sanitize a string for use in S3 metadata
   * AWS S3 metadata values must be ASCII-safe (US-ASCII characters only)
   * Non-ASCII characters cause signature calculation failures
   */
  private sanitizeForS3Metadata(value: string): string {
    if (!value) return '';
    // Replace non-ASCII characters with their closest ASCII equivalent or remove them
    return value
      .normalize('NFD') // Decompose accented characters
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
      .replace(/[^\x00-\x7F]/g, '') // Remove any remaining non-ASCII
      .substring(0, 1024); // S3 metadata value limit
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Storage: S3StorageService,
    private readonly credentialEncryptionService: CredentialEncryptionService,
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
            originalUrl: this.sanitizeForS3Metadata(image.url),
            altText: this.sanitizeForS3Metadata(image.altText || ''),
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
   * Includes SSRF protection via URL validation
   */
  private async downloadImage(url: string): Promise<{
    success: boolean;
    buffer?: Buffer;
    contentType: string;
    error?: string;
  }> {
    // SSRF Protection: Validate URL before making request
    const ssrfError = this.validateUrlForSsrf(url);
    if (ssrfError) {
      return {
        success: false,
        contentType: 'unknown',
        error: ssrfError,
      };
    }

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
   * Safely extract file extension from content type
   * Returns default extension if content type is invalid
   */
  private getExtensionFromMimeType(mimeType: string | undefined): string {
    if (!mimeType || typeof mimeType !== 'string') {
      return 'jpg';
    }
    const parts = mimeType.split('/');
    if (parts.length !== 2 || !parts[1]) {
      return 'jpg';
    }
    // Sanitize the extension (alphanumeric only)
    return parts[1].replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
  }

  /**
   * Update product with imported image URLs
   *
   * IMPORTANT: This method syncs products.images with the ProductImage table
   * to ensure the JSON array only contains URLs that actually exist.
   * This prevents broken image references when S3 uploads fail.
   *
   * Uses a Prisma transaction to ensure atomicity - if any operation fails,
   * all changes are rolled back to maintain data consistency.
   *
   * Handles re-import scenarios by deleting existing images before creating new ones.
   */
  async updateProductImages(
    productId: string,
    companyId: string,
    images: ImportImageResult[],
    importSource?: string,
  ): Promise<void> {
    const successfulImages = images.filter((img) => img.success && img.s3Key && img.cdnUrl);

    if (successfulImages.length === 0) {
      return;
    }

    // Use a transaction to ensure atomicity
    // All operations succeed or all are rolled back
    await this.prisma.$transaction(async (tx) => {
      // Delete existing ProductImage records for this product (re-import support)
      // This prevents duplicate records when re-importing a product
      await tx.productImage.deleteMany({
        where: { productId },
      });

      // Delete existing ProductMedia records for this product (re-import support)
      await tx.productMedia.deleteMany({
        where: { productId },
      });

      // Create ProductImage records with all required fields
      await tx.productImage.createMany({
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

      // Also create ProductMedia records for the product detail page UI
      // The ProductMedia table is used by the admin dashboard product detail page
      await tx.productMedia.createMany({
        data: successfulImages.map((img, index) => ({
          productId,
          type: 'IMAGE' as const,
          url: img.cdnUrl!,
          filename: img.filename || `imported-image-${index}.${this.getExtensionFromMimeType(img.contentType)}`,
          mimeType: img.contentType || 'image/jpeg',
          size: img.size || 0,
          altText: '',
          sortOrder: index,
          isPrimary: index === 0,
          storageProvider: 'S3',
          storageKey: img.s3Key!,
          cdnUrl: img.cdnUrl!,
        })),
      });

      // Query the actual ProductImage records from database
      // to ensure products.images only contains verified URLs
      // This prevents broken references when S3 uploads fail silently
      const productImages = await tx.productImage.findMany({
        where: { productId },
        orderBy: { position: 'asc' },
        select: { cdnUrl: true },
      });

      // Update product's images JSON array with verified CDN URLs from database
      const verifiedImageUrls = productImages.map((img) => img.cdnUrl);
      await tx.product.update({
        where: { id: productId },
        data: {
          images: verifiedImageUrls,
        },
      });
    });
  }

  /**
   * Get S3 credentials for a company
   * Credentials are stored encrypted and must be decrypted before use
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
      try {
        // Decrypt the encrypted credentials
        const encryptedCreds = integration.credentials as unknown as EncryptedCredentials;
        const creds = this.credentialEncryptionService.decrypt(encryptedCreds) as Record<string, string>;
        return {
          region: creds.region || 'us-east-1',
          bucket: creds.bucket,
          accessKeyId: creds.accessKeyId,
          secretAccessKey: creds.secretAccessKey,
          cloudfrontDomain: creds.cloudfrontDomain,
          keyPrefix: `products/${companyId}/`,
        };
      } catch (error) {
        this.logger.error(`Failed to decrypt client S3 credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
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
      try {
        // Decrypt the encrypted credentials
        const encryptedCreds = platformIntegration.credentials as unknown as EncryptedCredentials;
        const creds = this.credentialEncryptionService.decrypt(encryptedCreds) as Record<string, string>;
        return {
          region: creds.region || 'us-east-1',
          bucket: creds.bucket,
          accessKeyId: creds.accessKeyId,
          secretAccessKey: creds.secretAccessKey,
          cloudfrontDomain: creds.cloudfrontDomain,
          keyPrefix: `clients/${clientId}/products/${companyId}/`,
        };
      } catch (error) {
        this.logger.error(`Failed to decrypt platform S3 credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
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
