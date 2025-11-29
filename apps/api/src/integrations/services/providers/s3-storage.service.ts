import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

export interface S3Credentials {
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  cloudfrontDomain?: string;
  keyPrefix?: string;
}

export interface S3Settings {
  maxFileSizeMB?: number;
  allowedMimeTypes?: string;
  generateThumbnails?: boolean;
}

export interface UploadOptions {
  companyId: string;
  folder?: string;
  filename?: string;
  contentType?: string;
  metadata?: Record<string, string>;
  isPublic?: boolean;
}

export interface UploadResult {
  key: string;
  url: string;
  cdnUrl?: string;
  size: number;
  contentType: string;
  thumbnails?: {
    small: string;
    medium: string;
    large: string;
  };
}

export interface ImageProcessingOptions {
  resize?: {
    width?: number;
    height?: number;
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  };
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
}

const THUMBNAIL_SIZES = {
  small: { width: 150, height: 150 },
  medium: { width: 400, height: 400 },
  large: { width: 800, height: 800 },
};

@Injectable()
export class S3StorageService {
  private readonly logger = new Logger(S3StorageService.name);
  private clientCache = new Map<string, S3Client>();

  /**
   * Get or create an S3 client for the given credentials
   */
  private getClient(credentials: S3Credentials): S3Client {
    const cacheKey = `${credentials.region}:${credentials.bucket}:${credentials.accessKeyId}`;

    if (!this.clientCache.has(cacheKey)) {
      const client = new S3Client({
        region: credentials.region,
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
        },
      });
      this.clientCache.set(cacheKey, client);
    }

    return this.clientCache.get(cacheKey)!;
  }

  /**
   * Generate S3 key for a file
   */
  private generateKey(
    credentials: S3Credentials,
    options: UploadOptions,
    originalFilename: string,
  ): string {
    const prefix = credentials.keyPrefix || 'products/';
    const folder = options.folder || '';
    const ext = path.extname(originalFilename);
    const filename = options.filename || `${uuidv4()}${ext}`;

    return `${prefix}${options.companyId}/${folder}${folder ? '/' : ''}${filename}`.replace(/\/+/g, '/');
  }

  /**
   * Get public URL for a key
   */
  private getUrl(credentials: S3Credentials, key: string): string {
    if (credentials.cloudfrontDomain) {
      return `https://${credentials.cloudfrontDomain}/${key}`;
    }
    return `https://${credentials.bucket}.s3.${credentials.region}.amazonaws.com/${key}`;
  }

  /**
   * Validate file before upload
   */
  private validateFile(
    buffer: Buffer,
    contentType: string,
    settings?: S3Settings,
  ): void {
    const maxSize = (settings?.maxFileSizeMB || 10) * 1024 * 1024;
    if (buffer.length > maxSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed (${settings?.maxFileSizeMB || 10}MB)`,
      );
    }

    const allowedTypes = (settings?.allowedMimeTypes || 'image/jpeg,image/png,image/webp,image/gif')
      .split(',')
      .map(t => t.trim());

    if (!allowedTypes.includes(contentType)) {
      throw new BadRequestException(
        `File type ${contentType} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
      );
    }
  }

  /**
   * Process image (resize, convert format)
   */
  private async processImage(
    buffer: Buffer,
    options: ImageProcessingOptions,
  ): Promise<Buffer> {
    let pipeline = sharp(buffer);

    if (options.resize) {
      pipeline = pipeline.resize({
        width: options.resize.width,
        height: options.resize.height,
        fit: options.resize.fit || 'cover',
        withoutEnlargement: true,
      });
    }

    switch (options.format) {
      case 'jpeg':
        pipeline = pipeline.jpeg({ quality: options.quality || 85 });
        break;
      case 'png':
        pipeline = pipeline.png({ quality: options.quality || 85 });
        break;
      case 'webp':
        pipeline = pipeline.webp({ quality: options.quality || 85 });
        break;
      case 'avif':
        pipeline = pipeline.avif({ quality: options.quality || 80 });
        break;
    }

    return pipeline.toBuffer();
  }

  /**
   * Generate thumbnails for an image
   */
  private async generateThumbnails(
    credentials: S3Credentials,
    buffer: Buffer,
    baseKey: string,
  ): Promise<Record<string, string>> {
    const client = this.getClient(credentials);
    const thumbnails: Record<string, string> = {};
    const ext = path.extname(baseKey);
    const baseName = baseKey.replace(ext, '');

    for (const [size, dimensions] of Object.entries(THUMBNAIL_SIZES)) {
      try {
        const thumbnailBuffer = await this.processImage(buffer, {
          resize: { ...dimensions, fit: 'cover' },
          format: 'webp',
          quality: 80,
        });

        const thumbnailKey = `${baseName}_${size}.webp`;

        await client.send(new PutObjectCommand({
          Bucket: credentials.bucket,
          Key: thumbnailKey,
          Body: thumbnailBuffer,
          ContentType: 'image/webp',
          CacheControl: 'public, max-age=31536000',
        }));

        thumbnails[size] = this.getUrl(credentials, thumbnailKey);
      } catch (error: any) {
        this.logger.warn(`Failed to generate ${size} thumbnail: ${error.message}`);
      }
    }

    return thumbnails;
  }

  /**
   * Upload a file to S3
   */
  async uploadFile(
    credentials: S3Credentials,
    buffer: Buffer,
    originalFilename: string,
    options: UploadOptions,
    settings?: S3Settings,
  ): Promise<UploadResult> {
    const contentType = options.contentType || this.getContentType(originalFilename);

    // Validate file
    this.validateFile(buffer, contentType, settings);

    const client = this.getClient(credentials);
    const key = this.generateKey(credentials, options, originalFilename);

    // Process image if applicable
    let uploadBuffer = buffer;
    const isImage = contentType.startsWith('image/');
    let finalContentType = contentType;

    if (isImage && contentType !== 'image/gif') {
      // Optimize image - convert to webp
      uploadBuffer = await this.processImage(buffer, {
        quality: 85,
        format: 'webp',
      });
      finalContentType = 'image/webp';
    }

    // Upload main file
    await client.send(new PutObjectCommand({
      Bucket: credentials.bucket,
      Key: key,
      Body: uploadBuffer,
      ContentType: finalContentType,
      CacheControl: 'public, max-age=31536000',
      Metadata: {
        ...options.metadata,
        originalFilename,
        companyId: options.companyId,
        uploadedAt: new Date().toISOString(),
      },
    }));

    const result: UploadResult = {
      key,
      url: this.getUrl(credentials, key),
      cdnUrl: credentials.cloudfrontDomain
        ? `https://${credentials.cloudfrontDomain}/${key}`
        : undefined,
      size: uploadBuffer.length,
      contentType: finalContentType,
    };

    // Generate thumbnails if enabled and is image
    if (isImage && (settings?.generateThumbnails !== false)) {
      result.thumbnails = await this.generateThumbnails(credentials, buffer, key) as {
        small: string;
        medium: string;
        large: string;
      };
    }

    return result;
  }

  /**
   * Get a signed URL for private file access
   */
  async getSignedDownloadUrl(
    credentials: S3Credentials,
    key: string,
    expiresInSeconds: number = 3600,
  ): Promise<string> {
    const client = this.getClient(credentials);

    const command = new GetObjectCommand({
      Bucket: credentials.bucket,
      Key: key,
    });

    return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(credentials: S3Credentials, key: string): Promise<void> {
    const client = this.getClient(credentials);

    await client.send(new DeleteObjectCommand({
      Bucket: credentials.bucket,
      Key: key,
    }));

    // Also delete thumbnails if they exist
    const ext = path.extname(key);
    const baseName = key.replace(ext, '');

    for (const size of Object.keys(THUMBNAIL_SIZES)) {
      try {
        await client.send(new DeleteObjectCommand({
          Bucket: credentials.bucket,
          Key: `${baseName}_${size}.webp`,
        }));
      } catch {
        // Ignore if thumbnail doesn't exist
      }
    }
  }

  /**
   * List files in a folder
   */
  async listFiles(
    credentials: S3Credentials,
    companyId: string,
    folder?: string,
    maxKeys: number = 100,
  ): Promise<{ key: string; url: string; size: number; lastModified: Date }[]> {
    const client = this.getClient(credentials);
    const prefix = `${credentials.keyPrefix || 'products/'}${companyId}/${folder || ''}`;

    const response = await client.send(new ListObjectsV2Command({
      Bucket: credentials.bucket,
      Prefix: prefix,
      MaxKeys: maxKeys,
    }));

    return (response.Contents || []).map(obj => ({
      key: obj.Key!,
      url: this.getUrl(credentials, obj.Key!),
      size: obj.Size || 0,
      lastModified: obj.LastModified || new Date(),
    }));
  }

  /**
   * Check if a file exists
   */
  async fileExists(credentials: S3Credentials, key: string): Promise<boolean> {
    const client = this.getClient(credentials);

    try {
      await client.send(new HeadObjectCommand({
        Bucket: credentials.bucket,
        Key: key,
      }));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Copy a file to a new location
   */
  async copyFile(
    credentials: S3Credentials,
    sourceKey: string,
    destinationKey: string,
  ): Promise<string> {
    const client = this.getClient(credentials);

    await client.send(new CopyObjectCommand({
      Bucket: credentials.bucket,
      CopySource: `${credentials.bucket}/${sourceKey}`,
      Key: destinationKey,
    }));

    return this.getUrl(credentials, destinationKey);
  }

  /**
   * Get content type from filename
   */
  private getContentType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.avif': 'image/avif',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Test connection to S3
   */
  async testConnection(credentials: S3Credentials): Promise<{
    success: boolean;
    message: string;
    latencyMs?: number;
  }> {
    const startTime = Date.now();
    const client = this.getClient(credentials);

    try {
      // Try to list objects (limited to 1) to verify bucket access
      await client.send(new ListObjectsV2Command({
        Bucket: credentials.bucket,
        MaxKeys: 1,
      }));

      return {
        success: true,
        message: `Successfully connected to S3 bucket: ${credentials.bucket}`,
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
