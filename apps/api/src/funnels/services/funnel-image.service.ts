/**
 * Funnel Image Service
 * Resolves and manages images for AI-generated funnels.
 * Integrates with stock images, Cloudinary processing, and S3 storage.
 *
 * Phase 1: Stock image fallback (Unsplash/Pexels)
 * Phase 2: Cloudinary AI processing (background removal, smart crop, enhance)
 * Phase 3: Runway video generation (enterprise tier)
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  StockImageService,
  StockImageResult,
} from '../../integrations/services/providers/stock-image.service';
import {
  CloudinaryService,
  CloudinaryCredentials,
} from '../../integrations/services/providers/cloudinary.service';
import {
  S3StorageService,
  S3Credentials,
} from '../../integrations/services/providers/s3-storage.service';
import { ClientIntegrationService } from '../../integrations/services/client-integration.service';
import { CredentialEncryptionService } from '../../integrations/services/credential-encryption.service';
import {
  IntegrationProvider,
  IntegrationStatus,
  EncryptedCredentials,
} from '../../integrations/types/integration.types';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ResolvedImage {
  url: string;
  thumbnailUrl?: string;
  alt: string;
  width?: number;
  height?: number;
  source: 'stock' | 'uploaded' | 'cloudinary' | 'generated';
  attribution?: {
    photographer?: string;
    photographerUrl?: string;
    platform?: string;
  };
}

export interface ImageResolutionOptions {
  keywords: string[];
  orientation?: 'landscape' | 'portrait' | 'square';
  preferredSource?: 'stock' | 'uploaded';
  fallbackColor?: string;
}

export interface ResolvedVideo {
  url: string;
  posterUrl?: string;
  duration: number;
  resolution: string;
  mimeType: string;
  source: 'runway' | 'uploaded';
}

export interface HeroContent {
  type: 'image' | 'video';
  image?: ResolvedImage;
  video?: ResolvedVideo;
}

export interface FunnelMediaAssets {
  hero?: ResolvedImage;
  heroVideo?: ResolvedVideo;
  heroContent?: HeroContent;
  features?: ResolvedImage[];
  testimonials?: ResolvedImage[];
  products?: ResolvedImage[];
  gallery?: ResolvedImage[];
  ogImage?: ResolvedImage;
}

export type VisualContentTier = 'free' | 'pro' | 'enterprise';

export interface VisualContentCapabilities {
  tier: VisualContentTier;
  hasCloudinary: boolean;
  hasRunway: boolean;
  hasOpenAI: boolean;
  hasS3: boolean;
  maxImages: number;
  maxVideoDuration?: number;
  features: string[];
}

// ═══════════════════════════════════════════════════════════════
// PHASE 2: CLOUDINARY PROCESSING TYPES
// ═══════════════════════════════════════════════════════════════

export type ImageProcessingOperation =
  | 'background_removal'
  | 'smart_crop'
  | 'enhance'
  | 'upscale';

export interface ProcessImageRequest {
  /** Source image URL (stock image or uploaded) */
  sourceUrl: string;
  /** Operations to apply */
  operations: ImageProcessingOperation[];
  /** Smart crop options */
  cropOptions?: {
    aspectRatio?: '1:1' | '4:3' | '16:9' | '9:16';
    gravity?: 'auto' | 'face' | 'faces' | 'auto:subject';
  };
  /** Upscale options */
  upscaleOptions?: {
    targetWidth?: number;
    targetHeight?: number;
  };
  /** Save to S3 after processing */
  saveToS3?: boolean;
  /** Folder for S3 storage */
  s3Folder?: string;
}

export interface ProcessedImageResult {
  /** URL of processed image */
  url: string;
  /** S3 key if saved */
  s3Key?: string;
  /** CDN URL if available */
  cdnUrl?: string;
  /** Thumbnails if generated */
  thumbnails?: {
    small: string;
    medium: string;
    large: string;
  };
  /** Operations applied */
  operationsApplied: ImageProcessingOperation[];
  /** Processing metadata */
  metadata: {
    processingTimeMs: number;
    originalUrl: string;
    width?: number;
    height?: number;
  };
}

export interface UploadImageRequest {
  /** File buffer */
  buffer: Buffer;
  /** Original filename */
  filename: string;
  /** Content type */
  contentType: string;
  /** Folder for storage */
  folder?: string;
  /** Apply AI processing after upload */
  processAfterUpload?: {
    operations: ImageProcessingOperation[];
    cropOptions?: ProcessImageRequest['cropOptions'];
  };
}

export interface UploadedImageResult {
  /** S3 key */
  key: string;
  /** Public URL */
  url: string;
  /** CDN URL if available */
  cdnUrl?: string;
  /** File size in bytes */
  size: number;
  /** Content type */
  contentType: string;
  /** Thumbnails */
  thumbnails?: {
    small: string;
    medium: string;
    large: string;
  };
  /** Processed version if requested */
  processed?: ProcessedImageResult;
}

// ═══════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════

@Injectable()
export class FunnelImageService {
  private readonly logger = new Logger(FunnelImageService.name);

  // Allowed file types for upload
  private readonly ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ];
  private readonly MAX_FILE_SIZE_MB = 10;

  // SSRF protection: Allowed domains for image processing
  private readonly ALLOWED_IMAGE_DOMAINS = [
    'images.unsplash.com',
    'images.pexels.com',
    's3.amazonaws.com',
    's3.us-east-1.amazonaws.com',
    's3.us-west-2.amazonaws.com',
    'res.cloudinary.com',
  ];

  // User-friendly file type names
  private readonly FRIENDLY_FILE_TYPES = 'JPG, PNG, WebP, and GIF';

  // Operation friendly names for error messages
  private readonly OPERATION_NAMES: Record<ImageProcessingOperation, string> = {
    background_removal: 'remove the background from',
    smart_crop: 'crop',
    enhance: 'enhance',
    upscale: 'upscale',
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly stockImageService: StockImageService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly s3StorageService: S3StorageService,
    private readonly clientIntegrationService: ClientIntegrationService,
    private readonly encryptionService: CredentialEncryptionService,
  ) {}

  /**
   * Determine visual content capabilities for a company
   */
  async getVisualContentCapabilities(
    companyId: string,
  ): Promise<VisualContentCapabilities> {
    try {
      const integrations = await this.clientIntegrationService.list(companyId);

      const hasCloudinary = integrations.some(
        (i) => i.provider === IntegrationProvider.CLOUDINARY && i.status === IntegrationStatus.ACTIVE,
      );
      const hasRunway = integrations.some(
        (i) => i.provider === IntegrationProvider.RUNWAY && i.status === IntegrationStatus.ACTIVE,
      );
      const hasOpenAI = integrations.some(
        (i) => i.provider === IntegrationProvider.OPENAI && i.status === IntegrationStatus.ACTIVE,
      );
      const hasS3 = integrations.some(
        (i) => i.provider === IntegrationProvider.AWS_S3 && i.status === IntegrationStatus.ACTIVE,
      );

      // Determine tier based on integrations
      let tier: VisualContentTier = 'free';
      if (hasRunway) {
        tier = 'enterprise';
      } else if (hasCloudinary) {
        tier = 'pro';
      }

      const capabilities: VisualContentCapabilities = {
        tier,
        hasCloudinary,
        hasRunway,
        hasOpenAI,
        hasS3,
        maxImages: tier === 'enterprise' ? 50 : tier === 'pro' ? 20 : 5,
        maxVideoDuration: hasRunway ? 10 : undefined,
        features: [],
      };

      // Build feature list
      capabilities.features.push('Stock image fallback');
      if (hasS3) {
        capabilities.features.push('Image upload', 'Custom branding images');
      }
      if (hasCloudinary) {
        capabilities.features.push(
          'AI background removal',
          'Smart cropping',
          'Image enhancement',
          'AI upscaling',
        );
      }
      if (hasRunway) {
        capabilities.features.push(
          'AI video generation',
          'Product showcase videos',
          'Animated hero sections',
        );
      }
      if (hasOpenAI) {
        capabilities.features.push('AI alt text generation', 'SEO optimization');
      }

      return capabilities;
    } catch (error) {
      this.logger.warn(`Failed to get capabilities for company ${companyId}: ${error}`);
      // Default to free tier
      return {
        tier: 'free',
        hasCloudinary: false,
        hasRunway: false,
        hasOpenAI: false,
        hasS3: false,
        maxImages: 5,
        features: ['Stock image fallback'],
      };
    }
  }

  /**
   * Resolve a hero image for a landing page
   */
  async resolveHeroImage(
    companyId: string,
    options: ImageResolutionOptions,
  ): Promise<ResolvedImage> {
    const capabilities = await this.getVisualContentCapabilities(companyId);

    // For all tiers, start with stock images
    const stockImage = this.stockImageService.getHeroImage(options.keywords);

    const resolved: ResolvedImage = {
      url: stockImage.url,
      thumbnailUrl: stockImage.thumbnailUrl,
      alt: stockImage.alt,
      width: stockImage.width,
      height: stockImage.height,
      source: 'stock',
      attribution: {
        photographer: stockImage.photographer,
        photographerUrl: stockImage.photographerUrl,
        platform: stockImage.source,
      },
    };

    // Pro tier: Enhance with Cloudinary if available
    if (capabilities.hasCloudinary && capabilities.tier !== 'free') {
      try {
        const cloudinaryCredentials = await this.getCloudinaryCredentials(companyId);
        if (cloudinaryCredentials) {
          const enhanced = await this.cloudinaryService.smartCrop(
            cloudinaryCredentials,
            stockImage.url,
            {
              aspectRatio: options.orientation === 'portrait' ? '9:16' : '16:9',
              gravity: 'auto:subject',
            },
          );
          resolved.url = enhanced.processedUrl;
          resolved.source = 'cloudinary';
          this.logger.log(`Enhanced hero image for company ${companyId}`);
        }
      } catch (error) {
        this.logger.warn(`Cloudinary enhancement failed, using stock: ${error}`);
      }
    }

    return resolved;
  }

  /**
   * Resolve multiple images for sections (features, gallery, etc.)
   */
  async resolveSectionImages(
    companyId: string,
    options: ImageResolutionOptions,
    count: number = 3,
  ): Promise<ResolvedImage[]> {
    const stockImages = this.stockImageService.getSectionImages(options.keywords, count);

    return stockImages.map((img) => ({
      url: img.url,
      thumbnailUrl: img.thumbnailUrl,
      alt: img.alt,
      width: img.width,
      height: img.height,
      source: 'stock' as const,
      attribution: {
        photographer: img.photographer,
        photographerUrl: img.photographerUrl,
        platform: img.source,
      },
    }));
  }

  /**
   * Resolve all media assets for a funnel landing page
   */
  async resolveFunnelMediaAssets(
    companyId: string,
    landingContent: {
      hero?: { suggestedImageKeywords?: string[] };
      benefits?: { benefits?: Array<{ iconSuggestion?: string }> };
    },
  ): Promise<FunnelMediaAssets> {
    const heroKeywords = landingContent.hero?.suggestedImageKeywords || ['business', 'professional'];

    const assets: FunnelMediaAssets = {};

    // Resolve hero image
    assets.hero = await this.resolveHeroImage(companyId, {
      keywords: heroKeywords,
      orientation: 'landscape',
    });

    // Resolve OG image (same as hero for now)
    assets.ogImage = assets.hero;

    // Set hero content (image for now, video requires separate call)
    assets.heroContent = {
      type: 'image',
      image: assets.hero,
    };

    return assets;
  }

  /**
   * Resolve hero content that can be image or video based on tier
   * Enterprise tier gets video support
   */
  async resolveHeroContent(
    companyId: string,
    options: ImageResolutionOptions & {
      preferVideo?: boolean;
      existingVideoUrl?: string;
    },
  ): Promise<HeroContent> {
    const capabilities = await this.getVisualContentCapabilities(companyId);

    // If video is preferred and available, use existing video
    if (options.preferVideo && options.existingVideoUrl && capabilities.hasRunway) {
      return {
        type: 'video',
        video: {
          url: options.existingVideoUrl,
          duration: capabilities.maxVideoDuration || 10,
          resolution: '1080p',
          mimeType: 'video/mp4',
          source: 'runway',
        },
        // Also include fallback image
        image: await this.resolveHeroImage(companyId, options),
      };
    }

    // Default to image
    const heroImage = await this.resolveHeroImage(companyId, options);
    return {
      type: 'image',
      image: heroImage,
    };
  }

  /**
   * Check if video hero is available for a company
   */
  async isVideoHeroAvailable(companyId: string): Promise<boolean> {
    const capabilities = await this.getVisualContentCapabilities(companyId);
    return capabilities.tier === 'enterprise' && capabilities.hasRunway;
  }

  /**
   * Generate a gradient fallback when no image is available
   */
  generateGradientFallback(primaryColor: string): string {
    // Ensure the color is a valid hex
    const color = primaryColor.startsWith('#') ? primaryColor : `#${primaryColor}`;
    return `linear-gradient(135deg, ${color}20 0%, ${color}05 50%, white 100%)`;
  }

  /**
   * Get Cloudinary credentials for a company
   */
  private async getCloudinaryCredentials(companyId: string): Promise<CloudinaryCredentials | null> {
    try {
      const integration = await this.prisma.clientIntegration.findFirst({
        where: {
          clientId: companyId,
          provider: IntegrationProvider.CLOUDINARY,
          status: IntegrationStatus.ACTIVE,
        },
      });

      if (!integration?.credentials) {
        return null;
      }

      // Decrypt credentials using CredentialEncryptionService
      const encryptedCreds = integration.credentials as unknown as EncryptedCredentials;
      const decrypted = this.encryptionService.decrypt(encryptedCreds);

      // Validate credentials structure with type guard
      if (!this.isValidCloudinaryCredentials(decrypted)) {
        this.logger.warn(`Invalid Cloudinary credentials structure for company ${companyId}`);
        return null;
      }

      return decrypted;
    } catch (error) {
      this.logger.warn(`Failed to get Cloudinary credentials: ${error}`);
      return null;
    }
  }

  /**
   * Get S3 credentials for a company
   */
  private async getS3Credentials(companyId: string): Promise<S3Credentials | null> {
    try {
      const integration = await this.prisma.clientIntegration.findFirst({
        where: {
          clientId: companyId,
          provider: IntegrationProvider.AWS_S3,
          status: IntegrationStatus.ACTIVE,
        },
      });

      if (!integration?.credentials) {
        return null;
      }

      const encryptedCreds = integration.credentials as unknown as EncryptedCredentials;
      const decrypted = this.encryptionService.decrypt(encryptedCreds);

      // Validate credentials structure with type guard
      if (!this.isValidS3Credentials(decrypted)) {
        this.logger.warn(`Invalid S3 credentials structure for company ${companyId}`);
        return null;
      }

      return decrypted;
    } catch (error) {
      this.logger.warn(`Failed to get S3 credentials: ${error}`);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SECURITY VALIDATION HELPERS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Validate companyId format to prevent injection attacks
   */
  private validateCompanyId(companyId: string): void {
    if (!companyId || typeof companyId !== 'string') {
      throw new BadRequestException('Company ID is required');
    }
    // CUID format validation (Prisma default)
    const cuidRegex = /^c[a-z0-9]{24,}$/i;
    if (!cuidRegex.test(companyId)) {
      throw new BadRequestException('Invalid company ID format');
    }
  }

  /**
   * Validate source URL to prevent SSRF attacks
   * Only allows known safe domains (stock images, S3, Cloudinary)
   */
  private validateSourceUrl(url: string): void {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new BadRequestException(
        "That URL doesn't look right. Double-check it and try again.",
      );
    }

    // Only allow HTTPS
    if (parsedUrl.protocol !== 'https:') {
      throw new BadRequestException(
        'For security, we only accept HTTPS image URLs.',
      );
    }

    // Block private/internal IPs (SSRF protection)
    const hostname = parsedUrl.hostname.toLowerCase();
    const blockedPatterns = [
      'localhost', '127.0.0.1', '0.0.0.0',
      '169.254.169.254', // AWS metadata
      /^10\./, /^172\.(1[6-9]|2[0-9]|3[01])\./, /^192\.168\./, // Private networks
    ];

    for (const pattern of blockedPatterns) {
      if (typeof pattern === 'string' && hostname.includes(pattern)) {
        throw new BadRequestException(
          'This URL points to an internal network. Please use a publicly accessible image URL.',
        );
      }
      if (pattern instanceof RegExp && pattern.test(hostname)) {
        throw new BadRequestException(
          'This URL points to an internal network. Please use a publicly accessible image URL.',
        );
      }
    }

    // Check allowed domains
    const isAllowed = this.ALLOWED_IMAGE_DOMAINS.some(domain =>
      hostname === domain || hostname.endsWith(`.${domain}`),
    );

    if (!isAllowed) {
      throw new BadRequestException(
        'We can only process images from Unsplash, Pexels, or your S3 bucket. Try uploading the image first.',
      );
    }
  }

  /**
   * Validate Cloudinary credentials structure
   */
  private isValidCloudinaryCredentials(data: unknown): data is CloudinaryCredentials {
    return (
      typeof data === 'object' &&
      data !== null &&
      typeof (data as CloudinaryCredentials).cloudName === 'string' &&
      typeof (data as CloudinaryCredentials).apiKey === 'string' &&
      typeof (data as CloudinaryCredentials).apiSecret === 'string' &&
      (data as CloudinaryCredentials).cloudName.length > 0 &&
      (data as CloudinaryCredentials).apiKey.length > 0 &&
      (data as CloudinaryCredentials).apiSecret.length > 0
    );
  }

  /**
   * Validate S3 credentials structure
   */
  private isValidS3Credentials(data: unknown): data is S3Credentials {
    return (
      typeof data === 'object' &&
      data !== null &&
      typeof (data as S3Credentials).region === 'string' &&
      typeof (data as S3Credentials).bucket === 'string' &&
      typeof (data as S3Credentials).accessKeyId === 'string' &&
      typeof (data as S3Credentials).secretAccessKey === 'string'
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // PHASE 2: CLOUDINARY PROCESSING PIPELINE
  // ═══════════════════════════════════════════════════════════════

  /**
   * Process an image through Cloudinary AI pipeline
   * Applies requested operations and optionally saves to S3
   */
  async processImage(
    companyId: string,
    request: ProcessImageRequest,
  ): Promise<ProcessedImageResult> {
    const startTime = Date.now();

    // Security validations first
    this.validateCompanyId(companyId);
    this.validateSourceUrl(request.sourceUrl);

    // Get capabilities and validate
    const capabilities = await this.getVisualContentCapabilities(companyId);
    if (!capabilities.hasCloudinary) {
      throw new BadRequestException(
        "Looks like Cloudinary isn't set up yet! Head to Settings → Integrations to add it, then come back to work your magic. ✨",
      );
    }

    const cloudinaryCredentials = await this.getCloudinaryCredentials(companyId);
    if (!cloudinaryCredentials) {
      throw new BadRequestException(
        "We couldn't find your Cloudinary credentials. Check your integration settings and make sure everything's connected.",
      );
    }

    let processedUrl = request.sourceUrl;
    let processedBuffer: Buffer | null = null;
    const appliedOperations: ImageProcessingOperation[] = [];

    // Apply each operation in sequence
    for (const operation of request.operations) {
      try {
        let result;

        switch (operation) {
          case 'background_removal':
            result = await this.cloudinaryService.removeBackground(
              cloudinaryCredentials,
              processedUrl,
            );
            break;

          case 'smart_crop':
            result = await this.cloudinaryService.smartCrop(
              cloudinaryCredentials,
              processedUrl,
              {
                aspectRatio: request.cropOptions?.aspectRatio,
                gravity: request.cropOptions?.gravity || 'auto:subject',
              },
            );
            break;

          case 'enhance':
            result = await this.cloudinaryService.enhance(
              cloudinaryCredentials,
              processedUrl,
            );
            break;

          case 'upscale':
            if (!request.upscaleOptions?.targetWidth) {
              throw new BadRequestException('Upscale requires targetWidth');
            }
            result = await this.cloudinaryService.upscale(
              cloudinaryCredentials,
              processedUrl,
              request.upscaleOptions.targetWidth,
              request.upscaleOptions.targetHeight,
            );
            break;
        }

        if (result) {
          processedUrl = result.processedUrl;
          processedBuffer = result.buffer;
          appliedOperations.push(operation);
          this.logger.log(`Applied ${operation} to image for company ${companyId}`);
        }
      } catch (error) {
        this.logger.error(`Failed to apply ${operation}: ${error}`);
        const opName = this.OPERATION_NAMES[operation] || operation;
        throw new BadRequestException(
          `Oops! We hit a snag trying to ${opName} your image. Try again, or use a different image if the issue persists.`,
        );
      }
    }

    // Build result
    const response: ProcessedImageResult = {
      url: processedUrl,
      operationsApplied: appliedOperations,
      metadata: {
        processingTimeMs: Date.now() - startTime,
        originalUrl: request.sourceUrl,
      },
    };

    // Optionally save to S3
    if (request.saveToS3 && processedBuffer) {
      const s3Credentials = await this.getS3Credentials(companyId);
      if (s3Credentials) {
        try {
          const uploadResult = await this.s3StorageService.uploadFile(
            s3Credentials,
            processedBuffer,
            `processed_${Date.now()}.webp`,
            {
              companyId,
              folder: request.s3Folder || 'funnels/processed',
              contentType: 'image/webp',
            },
          );

          response.s3Key = uploadResult.key;
          response.url = uploadResult.url;
          response.cdnUrl = uploadResult.cdnUrl;
          response.thumbnails = uploadResult.thumbnails;

          this.logger.log(`Saved processed image to S3: ${uploadResult.key}`);
        } catch (error) {
          this.logger.warn(`Failed to save processed image to S3: ${error}`);
          // Continue without S3 storage - return Cloudinary URL
        }
      }
    }

    return response;
  }

  /**
   * Upload an image to S3 with optional Cloudinary processing
   */
  async uploadImage(
    companyId: string,
    request: UploadImageRequest,
  ): Promise<UploadedImageResult> {
    // Security validation
    this.validateCompanyId(companyId);

    // Validate file
    this.validateUploadRequest(request);

    // Check S3 capability
    const s3Credentials = await this.getS3Credentials(companyId);
    if (!s3Credentials) {
      throw new BadRequestException(
        "Image storage isn't set up yet! Head to Settings → Integrations to connect AWS S3, then you're good to go.",
      );
    }

    // Upload to S3
    const uploadResult = await this.s3StorageService.uploadFile(
      s3Credentials,
      request.buffer,
      request.filename,
      {
        companyId,
        folder: request.folder || 'funnels/uploads',
        contentType: request.contentType,
      },
    );

    const result: UploadedImageResult = {
      key: uploadResult.key,
      url: uploadResult.url,
      cdnUrl: uploadResult.cdnUrl,
      size: uploadResult.size,
      contentType: uploadResult.contentType,
      thumbnails: uploadResult.thumbnails,
    };

    // Optionally process after upload
    if (request.processAfterUpload?.operations?.length) {
      try {
        const processedResult = await this.processImage(companyId, {
          sourceUrl: uploadResult.url,
          operations: request.processAfterUpload.operations,
          cropOptions: request.processAfterUpload.cropOptions,
          saveToS3: true,
          s3Folder: request.folder || 'funnels/processed',
        });
        result.processed = processedResult;
      } catch (error) {
        this.logger.warn(`Post-upload processing failed: ${error}`);
        // Return upload result without processing
      }
    }

    return result;
  }

  /**
   * Remove background from an image (convenience method)
   */
  async removeBackground(
    companyId: string,
    imageUrl: string,
    saveToS3: boolean = true,
  ): Promise<ProcessedImageResult> {
    return this.processImage(companyId, {
      sourceUrl: imageUrl,
      operations: ['background_removal'],
      saveToS3,
      s3Folder: 'funnels/no-bg',
    });
  }

  /**
   * Smart crop an image for a specific aspect ratio (convenience method)
   */
  async smartCrop(
    companyId: string,
    imageUrl: string,
    aspectRatio: '1:1' | '4:3' | '16:9' | '9:16',
    saveToS3: boolean = true,
  ): Promise<ProcessedImageResult> {
    return this.processImage(companyId, {
      sourceUrl: imageUrl,
      operations: ['smart_crop'],
      cropOptions: { aspectRatio, gravity: 'auto:subject' },
      saveToS3,
      s3Folder: 'funnels/cropped',
    });
  }

  /**
   * Enhance and optimize an image (convenience method)
   */
  async enhanceImage(
    companyId: string,
    imageUrl: string,
    saveToS3: boolean = true,
  ): Promise<ProcessedImageResult> {
    return this.processImage(companyId, {
      sourceUrl: imageUrl,
      operations: ['enhance'],
      saveToS3,
      s3Folder: 'funnels/enhanced',
    });
  }

  /**
   * Apply full processing pipeline for funnel hero images
   * Combines enhance + smart crop for best results
   */
  async processHeroImage(
    companyId: string,
    imageUrl: string,
    orientation: 'landscape' | 'portrait' | 'square' = 'landscape',
  ): Promise<ProcessedImageResult> {
    const aspectRatioMap = {
      landscape: '16:9' as const,
      portrait: '9:16' as const,
      square: '1:1' as const,
    };

    return this.processImage(companyId, {
      sourceUrl: imageUrl,
      operations: ['enhance', 'smart_crop'],
      cropOptions: {
        aspectRatio: aspectRatioMap[orientation],
        gravity: 'auto:subject',
      },
      saveToS3: true,
      s3Folder: 'funnels/hero',
    });
  }

  /**
   * Validate upload request
   */
  private validateUploadRequest(request: UploadImageRequest): void {
    if (!request.buffer || request.buffer.length === 0) {
      throw new BadRequestException(
        "Looks like the file didn't come through. Try uploading again?",
      );
    }

    if (request.buffer.length > this.MAX_FILE_SIZE_MB * 1024 * 1024) {
      throw new BadRequestException(
        `Whoa, that's a big file! Please keep it under ${this.MAX_FILE_SIZE_MB}MB.`,
      );
    }

    if (!this.ALLOWED_MIME_TYPES.includes(request.contentType)) {
      throw new BadRequestException(
        `We only accept ${this.FRIENDLY_FILE_TYPES} images. Your file doesn't match any of those formats.`,
      );
    }

    if (!request.filename) {
      throw new BadRequestException(
        "Every image needs a name! Please include a filename.",
      );
    }
  }
}
