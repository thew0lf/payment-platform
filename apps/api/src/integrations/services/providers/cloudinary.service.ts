import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import axios from 'axios';

export interface CloudinaryCredentials {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export interface CloudinarySettings {
  enableBackgroundRemoval?: boolean;
  enableSmartCrop?: boolean;
  enableEnhancement?: boolean;
  enableUpscaling?: boolean;
}

export interface ProcessImageOptions {
  /** S3 URL of the source image */
  sourceUrl: string;
  /** Operation to perform */
  operation: 'background_removal' | 'smart_crop' | 'enhance' | 'upscale';
  /** Additional options for the operation */
  options?: {
    /** For smart_crop: target aspect ratio */
    aspectRatio?: string;  // e.g., '1:1', '4:3', '16:9'
    /** For smart_crop: focus on faces or product */
    gravity?: 'auto' | 'face' | 'faces' | 'auto:subject';
    /** For upscale: target width */
    targetWidth?: number;
    /** For upscale: target height */
    targetHeight?: number;
  };
}

export interface ProcessImageResult {
  /** URL of the processed image (temporary Cloudinary URL) */
  processedUrl: string;
  /** Buffer of processed image (for saving back to S3) */
  buffer: Buffer;
  /** Original dimensions */
  originalDimensions: { width: number; height: number };
  /** New dimensions after processing */
  newDimensions: { width: number; height: number };
  /** Processing operation performed */
  operation: string;
}

/**
 * Cloudinary Service - IMAGE PROCESSING ONLY (not storage)
 *
 * This service is used exclusively for AI image processing features:
 * - Background removal
 * - Smart cropping (subject/face aware)
 * - Image enhancement
 * - AI upscaling
 *
 * All images are STORED in AWS S3. Cloudinary only processes images on-demand.
 * Processed images should be saved back to S3.
 */
@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  /**
   * Configure Cloudinary client
   */
  private configure(credentials: CloudinaryCredentials): void {
    cloudinary.config({
      cloud_name: credentials.cloudName,
      api_key: credentials.apiKey,
      api_secret: credentials.apiSecret,
    });
  }

  /**
   * Remove background from an image
   * Fetches from S3 URL → Processes in Cloudinary → Returns buffer for S3 upload
   */
  async removeBackground(
    credentials: CloudinaryCredentials,
    sourceUrl: string,
  ): Promise<ProcessImageResult> {
    return this.processImage(credentials, {
      sourceUrl,
      operation: 'background_removal',
    });
  }

  /**
   * Smart crop an image with AI subject detection
   */
  async smartCrop(
    credentials: CloudinaryCredentials,
    sourceUrl: string,
    options: { aspectRatio?: string; gravity?: 'auto' | 'face' | 'faces' | 'auto:subject' },
  ): Promise<ProcessImageResult> {
    return this.processImage(credentials, {
      sourceUrl,
      operation: 'smart_crop',
      options,
    });
  }

  /**
   * Enhance image (auto color/contrast correction)
   */
  async enhance(
    credentials: CloudinaryCredentials,
    sourceUrl: string,
  ): Promise<ProcessImageResult> {
    return this.processImage(credentials, {
      sourceUrl,
      operation: 'enhance',
    });
  }

  /**
   * AI Upscale image
   */
  async upscale(
    credentials: CloudinaryCredentials,
    sourceUrl: string,
    targetWidth: number,
    targetHeight?: number,
  ): Promise<ProcessImageResult> {
    return this.processImage(credentials, {
      sourceUrl,
      operation: 'upscale',
      options: { targetWidth, targetHeight },
    });
  }

  /**
   * Core processing method - processes image via Cloudinary and returns buffer
   * NOTE: This does NOT store anything in Cloudinary - it's processing only
   * Uses Cloudinary's "fetch" mode to process remote images without uploading them
   */
  async processImage(
    credentials: CloudinaryCredentials,
    request: ProcessImageOptions,
  ): Promise<ProcessImageResult> {
    this.configure(credentials);

    // Build transformation based on operation
    const transformations: any[] = [];

    switch (request.operation) {
      case 'background_removal':
        transformations.push({ effect: 'background_removal' });
        transformations.push({ format: 'png' }); // PNG for transparency
        break;

      case 'smart_crop':
        const cropOptions: any = {
          crop: 'fill',
          gravity: request.options?.gravity || 'auto:subject',
        };
        if (request.options?.aspectRatio) {
          cropOptions.aspect_ratio = request.options.aspectRatio;
        }
        transformations.push(cropOptions);
        transformations.push({ format: 'webp', quality: 'auto' });
        break;

      case 'enhance':
        transformations.push({ effect: 'improve' });
        transformations.push({ effect: 'auto_color' });
        transformations.push({ effect: 'auto_contrast' });
        transformations.push({ format: 'webp', quality: 'auto' });
        break;

      case 'upscale':
        transformations.push({
          effect: 'upscale',
          width: request.options?.targetWidth,
          height: request.options?.targetHeight,
        });
        transformations.push({ format: 'webp', quality: 'auto:best' });
        break;
    }

    try {
      // Generate Cloudinary fetch URL (processes image without storing it)
      // This uses Cloudinary's "fetch" feature - processes remote images on-the-fly
      const processedUrl = cloudinary.url(request.sourceUrl, {
        type: 'fetch',  // IMPORTANT: "fetch" mode processes remote URLs without upload
        transformation: transformations,
        secure: true,
      });

      // Download the processed image to get the buffer
      const response = await axios.get(processedUrl, {
        responseType: 'arraybuffer',
        timeout: 60000, // 60s timeout for AI processing
      });

      const buffer = Buffer.from(response.data);

      return {
        processedUrl,
        buffer,
        originalDimensions: { width: 0, height: 0 }, // Would need source image info
        newDimensions: { width: 0, height: 0 }, // Would need to parse processed image
        operation: request.operation,
      };
    } catch (error: any) {
      this.logger.error(`Cloudinary processing error: ${error.message}`, error.stack);
      throw new Error(`Failed to process image: ${error.message}`);
    }
  }

  /**
   * Test connection to Cloudinary
   */
  async testConnection(credentials: CloudinaryCredentials): Promise<{
    success: boolean;
    message: string;
    latencyMs?: number;
  }> {
    const startTime = Date.now();
    this.configure(credentials);

    try {
      // Ping Cloudinary API
      await cloudinary.api.ping();

      return {
        success: true,
        message: 'Successfully connected to Cloudinary (processing-only mode)',
        latencyMs: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        latencyMs: Date.now() - startTime,
      };
    }
  }
}
