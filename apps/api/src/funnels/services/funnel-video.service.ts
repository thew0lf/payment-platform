/**
 * Funnel Video Service
 * Manages AI-generated video content for funnels using Runway integration.
 *
 * Phase 3: Enterprise tier video generation
 * - Job queue for async video generation
 * - S3 storage with CDN delivery
 * - Progress tracking and status updates
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../../prisma/prisma.service';
import {
  RunwayService,
  RunwayCredentials,
  RunwaySettings,
  VideoGenerationRequest,
  VideoGenerationResult,
} from '../../integrations/services/providers/runway.service';
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

export type VideoJobStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED';

export interface VideoJob {
  /** Unique job ID */
  id: string;
  /** Company that owns this job */
  companyId: string;
  /** Current status */
  status: VideoJobStatus;
  /** Runway task ID when processing */
  runwayTaskId?: string;
  /** Progress (0-100) */
  progress: number;
  /** Request parameters */
  request: GenerateHeroVideoRequest;
  /** Result when complete */
  result?: GeneratedVideoResult;
  /** Error message if failed */
  error?: string;
  /** Timestamps */
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface GenerateHeroVideoRequest {
  /** Source image URL (from S3 or stock) */
  sourceImageUrl: string;
  /** Motion prompt (optional) */
  prompt?: string;
  /** Video orientation */
  orientation?: 'landscape' | 'portrait' | 'square';
  /** Duration in seconds */
  duration?: 5 | 10;
  /** Quality preset */
  quality?: 'fast' | 'standard' | 'high';
  /** Folder for S3 storage */
  folder?: string;
}

export interface GeneratedVideoResult {
  /** S3 key */
  key: string;
  /** Direct S3 URL */
  url: string;
  /** CDN URL if available */
  cdnUrl?: string;
  /** Duration in seconds */
  duration: number;
  /** Resolution */
  resolution: string;
  /** MIME type */
  mimeType: string;
  /** File size in bytes */
  size: number;
  /** Credits used for generation */
  creditsUsed: number;
  /** Runway task ID */
  runwayTaskId: string;
  /** Poster image (first frame) */
  posterUrl?: string;
}

export interface VideoCapabilities {
  /** Whether video generation is available */
  available: boolean;
  /** Maximum video duration */
  maxDuration: number;
  /** Available quality presets */
  qualities: string[];
  /** Credits remaining (if known) */
  creditsRemaining?: number;
  /** Message if not available */
  message?: string;
}

// ═══════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════

@Injectable()
export class FunnelVideoService {
  private readonly logger = new Logger(FunnelVideoService.name);

  /**
   * MVP Job Store
   * TODO: Production improvements needed:
   * - Replace with Redis/BullMQ for distributed job queue
   * - Add PostgreSQL persistence for job history
   * - Implement dead letter queue for failed jobs
   * - Add job retry mechanism with exponential backoff
   * - Support horizontal scaling with Redis-based coordination
   */
  private jobs: Map<string, VideoJob> = new Map();
  private jobsByCompany: Map<string, Set<string>> = new Map();

  // SSRF protection: Allowed domains for source images
  private readonly ALLOWED_IMAGE_DOMAINS = [
    'images.unsplash.com',
    'images.pexels.com',
    's3.amazonaws.com',
    's3.us-east-1.amazonaws.com',
    's3.us-west-2.amazonaws.com',
    'res.cloudinary.com',
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly runwayService: RunwayService,
    private readonly s3StorageService: S3StorageService,
    private readonly clientIntegrationService: ClientIntegrationService,
    private readonly encryptionService: CredentialEncryptionService,
  ) {}

  /**
   * Check video generation capabilities for a company
   */
  async getVideoCapabilities(companyId: string): Promise<VideoCapabilities> {
    try {
      const integrations = await this.clientIntegrationService.list(companyId);

      const hasRunway = integrations.some(
        (i) =>
          i.provider === IntegrationProvider.RUNWAY &&
          i.status === IntegrationStatus.ACTIVE,
      );

      const hasS3 = integrations.some(
        (i) =>
          i.provider === IntegrationProvider.AWS_S3 &&
          i.status === IntegrationStatus.ACTIVE,
      );

      if (!hasRunway) {
        return {
          available: false,
          maxDuration: 0,
          qualities: [],
          message:
            'Ready to create stunning AI videos? Upgrade to Enterprise tier to unlock Runway video generation! 🎬',
        };
      }

      if (!hasS3) {
        return {
          available: false,
          maxDuration: 0,
          qualities: [],
          message:
            'Almost there! Just need to connect your storage. Head to Integrations → AWS S3 to get set up.',
        };
      }

      // Test Runway connection and get credits
      const runwayCredentials = await this.getRunwayCredentials(companyId);
      if (runwayCredentials) {
        const test = await this.runwayService.testConnection(runwayCredentials);
        if (test.success) {
          return {
            available: true,
            maxDuration: 10,
            qualities: ['fast', 'standard', 'high'],
            creditsRemaining: test.creditsRemaining,
          };
        }
      }

      return {
        available: false,
        maxDuration: 0,
        qualities: [],
        message: 'Unable to connect to Runway. Check your API credentials.',
      };
    } catch (error) {
      this.logger.warn(
        `Failed to get video capabilities for ${companyId}: ${error}`,
      );
      return {
        available: false,
        maxDuration: 0,
        qualities: [],
        message: 'Failed to check video capabilities.',
      };
    }
  }

  /**
   * Queue a hero video generation job
   */
  async queueHeroVideo(
    companyId: string,
    request: GenerateHeroVideoRequest,
  ): Promise<VideoJob> {
    // Validate company ID
    this.validateCompanyId(companyId);

    // Validate source URL (SSRF protection)
    this.validateSourceUrl(request.sourceImageUrl);

    // Check capabilities
    const capabilities = await this.getVideoCapabilities(companyId);
    if (!capabilities.available) {
      throw new BadRequestException(
        capabilities.message ||
          "Video generation isn't available. Upgrade to Enterprise tier to unlock AI video creation.",
      );
    }

    // Create job
    const jobId = this.generateJobId();
    const job: VideoJob = {
      id: jobId,
      companyId,
      status: 'QUEUED',
      progress: 0,
      request,
      createdAt: new Date(),
    };

    this.jobs.set(jobId, job);

    // Add to secondary index for O(1) company lookup
    if (!this.jobsByCompany.has(companyId)) {
      this.jobsByCompany.set(companyId, new Set());
    }
    this.jobsByCompany.get(companyId)!.add(jobId);

    this.logger.log(
      `Queued video generation job ${jobId} for company ${companyId}`,
    );

    // Start processing asynchronously (fire and forget)
    this.processVideoJob(jobId).catch((error) => {
      this.logger.error(`Failed to process video job ${jobId}: ${error}`);
    });

    return job;
  }

  /**
   * Get job status
   */
  async getJobStatus(
    companyId: string,
    jobId: string,
  ): Promise<VideoJob | null> {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    // Verify company access
    if (job.companyId !== companyId) {
      return null; // Don't reveal job exists to other companies
    }

    // If processing, check Runway status
    if (job.status === 'PROCESSING' && job.runwayTaskId) {
      try {
        const runwayCredentials = await this.getRunwayCredentials(companyId);
        if (runwayCredentials) {
          const status = await this.runwayService.getTaskStatus(
            runwayCredentials,
            job.runwayTaskId,
          );
          job.progress = status.progress || job.progress;
        }
      } catch {
        // Ignore errors, just return cached progress
      }
    }

    return job;
  }

  /**
   * Cancel a pending or processing job
   */
  async cancelJob(companyId: string, jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job || job.companyId !== companyId) {
      return false;
    }

    if (job.status === 'QUEUED' || job.status === 'PROCESSING') {
      // Cancel Runway task if running
      if (job.runwayTaskId) {
        try {
          const runwayCredentials = await this.getRunwayCredentials(companyId);
          if (runwayCredentials) {
            await this.runwayService.cancelTask(
              runwayCredentials,
              job.runwayTaskId,
            );
          }
        } catch {
          // Ignore cancellation errors
        }
      }

      job.status = 'CANCELLED';
      job.completedAt = new Date();
      this.logger.log(`Cancelled video job ${jobId}`);
      return true;
    }

    return false;
  }

  /**
   * List all jobs for a company
   * Uses secondary index for O(1) lookup
   */
  async listJobs(companyId: string): Promise<VideoJob[]> {
    const jobIds = this.jobsByCompany.get(companyId);
    if (!jobIds || jobIds.size === 0) {
      return [];
    }

    const jobs: VideoJob[] = [];
    for (const jobId of jobIds) {
      const job = this.jobs.get(jobId);
      if (job) {
        jobs.push(job);
      }
    }

    return jobs.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Process a video generation job
   */
  private async processVideoJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'QUEUED') return;

    job.status = 'PROCESSING';
    job.startedAt = new Date();

    try {
      const runwayCredentials = await this.getRunwayCredentials(job.companyId);
      const s3Credentials = await this.getS3Credentials(job.companyId);

      if (!runwayCredentials || !s3Credentials) {
        throw new Error('Missing required credentials');
      }

      // Map quality to Runway model
      const modelMap: Record<string, 'gen3a_turbo' | 'gen3a' | 'gen4'> = {
        fast: 'gen3a_turbo',
        standard: 'gen3a',
        high: 'gen4',
      };

      // Map orientation to aspect ratio
      const aspectRatioMap: Record<string, '16:9' | '9:16' | '1:1'> = {
        landscape: '16:9',
        portrait: '9:16',
        square: '1:1',
      };

      const request: VideoGenerationRequest = {
        imageUrl: job.request.sourceImageUrl,
        prompt:
          job.request.prompt ||
          'Subtle elegant motion, professional product showcase, cinematic quality',
        model: modelMap[job.request.quality || 'standard'],
        duration: job.request.duration || 5,
        aspectRatio: aspectRatioMap[job.request.orientation || 'landscape'],
      };

      // Start generation
      const task = await this.runwayService.generateVideo(
        runwayCredentials,
        {}, // Use default settings
        request,
      );

      job.runwayTaskId = task.taskId;
      job.progress = 10;

      // Wait for completion (with progress updates)
      const result = await this.waitForVideoCompletion(
        runwayCredentials,
        job,
      );

      // Upload to S3
      const s3Result = await this.s3StorageService.uploadFile(
        s3Credentials,
        result.buffer,
        `video_${Date.now()}.mp4`,
        {
          companyId: job.companyId,
          folder: job.request.folder || 'funnels/videos',
          contentType: 'video/mp4',
        },
      );

      job.status = 'SUCCEEDED';
      job.progress = 100;
      job.completedAt = new Date();
      job.result = {
        key: s3Result.key,
        url: s3Result.url,
        cdnUrl: s3Result.cdnUrl,
        duration: result.duration,
        resolution: result.resolution,
        mimeType: 'video/mp4',
        size: result.buffer.length,
        creditsUsed: result.creditsUsed,
        runwayTaskId: result.taskId,
      };

      this.logger.log(`Completed video job ${jobId}: ${s3Result.key}`);
    } catch (error: unknown) {
      job.status = 'FAILED';
      job.error =
        error instanceof Error ? error.message : 'Video generation failed';
      job.completedAt = new Date();
      this.logger.error(
        `Video job ${jobId} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Wait for video completion with progress updates
   */
  private async waitForVideoCompletion(
    credentials: RunwayCredentials,
    job: VideoJob,
    maxWaitMs: number = 300000, // 5 minutes
    pollIntervalMs: number = 5000, // 5 seconds
  ): Promise<VideoGenerationResult> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      // Check if cancelled
      if (job.status === 'CANCELLED') {
        throw new Error('Job was cancelled');
      }

      const status = await this.runwayService.getTaskStatus(
        credentials,
        job.runwayTaskId!,
      );

      // Update progress
      job.progress = Math.min(10 + (status.progress || 0) * 0.9, 99);

      if (status.status === 'SUCCEEDED' && status.videoUrl) {
        // Download the video
        const videoResponse = await axios.get(status.videoUrl, {
          responseType: 'arraybuffer',
        });

        return {
          buffer: Buffer.from(videoResponse.data),
          mimeType: 'video/mp4',
          duration: status.metadata?.duration || 5,
          resolution: status.metadata?.resolution || '1080p',
          creditsUsed: status.metadata?.creditsUsed || 0,
          taskId: job.runwayTaskId!,
        };
      }

      if (status.status === 'FAILED') {
        throw new Error(status.error || 'Video generation failed');
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error('Video generation timed out');
  }

  /**
   * Get Runway credentials for a company
   */
  private async getRunwayCredentials(
    companyId: string,
  ): Promise<RunwayCredentials | null> {
    try {
      const integration = await this.prisma.clientIntegration.findFirst({
        where: {
          clientId: companyId,
          provider: IntegrationProvider.RUNWAY,
          status: IntegrationStatus.ACTIVE,
        },
      });

      if (!integration?.credentials) {
        return null;
      }

      const encryptedCreds =
        integration.credentials as unknown as EncryptedCredentials;
      const decrypted = this.encryptionService.decrypt(encryptedCreds);

      if (!this.isValidRunwayCredentials(decrypted)) {
        return null;
      }

      return decrypted;
    } catch (error) {
      this.logger.warn(`Failed to get Runway credentials: ${error}`);
      return null;
    }
  }

  /**
   * Get S3 credentials for a company
   */
  private async getS3Credentials(
    companyId: string,
  ): Promise<S3Credentials | null> {
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

      const encryptedCreds =
        integration.credentials as unknown as EncryptedCredentials;
      const decrypted = this.encryptionService.decrypt(encryptedCreds);

      if (!this.isValidS3Credentials(decrypted)) {
        return null;
      }

      return decrypted;
    } catch (error) {
      this.logger.warn(`Failed to get S3 credentials: ${error}`);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // VALIDATION HELPERS
  // ═══════════════════════════════════════════════════════════════

  private validateCompanyId(companyId: string): void {
    if (!companyId || typeof companyId !== 'string') {
      throw new BadRequestException('Company ID is required');
    }
    const cuidRegex = /^c[a-z0-9]{24,}$/i;
    if (!cuidRegex.test(companyId)) {
      throw new BadRequestException('Invalid company ID format');
    }
  }

  private validateSourceUrl(url: string): void {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new BadRequestException(
        "That URL doesn't look right. Double-check it and try again.",
      );
    }

    if (parsedUrl.protocol !== 'https:') {
      throw new BadRequestException(
        'For security, we only accept HTTPS image URLs.',
      );
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    const blockedPatterns = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '169.254.169.254',
    ];

    for (const pattern of blockedPatterns) {
      if (hostname.includes(pattern)) {
        throw new BadRequestException(
          'This URL points to an internal network. Please use a publicly accessible image URL.',
        );
      }
    }

    const isAllowed = this.ALLOWED_IMAGE_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
    );

    if (!isAllowed) {
      throw new BadRequestException(
        'We can only process images from Unsplash, Pexels, or your S3 bucket. Try uploading the image first.',
      );
    }
  }

  private isValidRunwayCredentials(data: unknown): data is RunwayCredentials {
    return (
      typeof data === 'object' &&
      data !== null &&
      typeof (data as RunwayCredentials).apiKey === 'string' &&
      (data as RunwayCredentials).apiKey.length > 0
    );
  }

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

  private generateJobId(): string {
    return `vj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
