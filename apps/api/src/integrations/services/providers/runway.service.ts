/**
 * Runway Service - AI Video Generation
 * Generates cinematic product videos from images using Runway Gen-3/Gen-4 models.
 * Videos are downloaded and saved to S3.
 */

import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

export interface RunwayCredentials {
  apiKey: string;
  apiVersion?: string;
}

export interface RunwaySettings {
  defaultModel?: 'gen3a_turbo' | 'gen3a' | 'gen4' | 'gen4_turbo';
  defaultDuration?: 5 | 10;
  defaultResolution?: '720p' | '1080p' | '4k';
  defaultAspectRatio?: '16:9' | '9:16' | '1:1';
}

export interface VideoGenerationRequest {
  /** URL of the source image (must be publicly accessible, e.g., S3 with CloudFront) */
  imageUrl: string;
  /** Text prompt describing desired motion/action */
  prompt?: string;
  /** Model to use for generation */
  model?: 'gen3a_turbo' | 'gen3a' | 'gen4' | 'gen4_turbo';
  /** Video duration in seconds */
  duration?: 5 | 10;
  /** Output resolution */
  resolution?: '720p' | '1080p' | '4k';
  /** Output aspect ratio */
  aspectRatio?: '16:9' | '9:16' | '1:1';
  /** Seed for reproducibility */
  seed?: number;
}

export interface VideoGenerationResponse {
  /** Runway task ID for tracking */
  taskId: string;
  /** Current status */
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  /** Download URL when complete (temporary - download immediately) */
  videoUrl?: string;
  /** Progress percentage (0-100) */
  progress?: number;
  /** Error message if failed */
  error?: string;
  /** Generation metadata */
  metadata?: {
    model: string;
    duration: number;
    resolution: string;
    creditsUsed: number;
  };
}

export interface VideoGenerationResult {
  /** Video as buffer (downloaded from Runway) */
  buffer: Buffer;
  /** MIME type */
  mimeType: string;
  /** Duration in seconds */
  duration: number;
  /** Resolution */
  resolution: string;
  /** Credits used for this generation */
  creditsUsed: number;
  /** Runway task ID */
  taskId: string;
}

@Injectable()
export class RunwayService {
  private readonly logger = new Logger(RunwayService.name);
  private readonly baseUrl = 'https://api.dev.runwayml.com/v1';

  /**
   * Create authenticated Axios client for Runway API
   */
  private createClient(credentials: RunwayCredentials): AxiosInstance {
    return axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${credentials.apiKey}`,
        'Content-Type': 'application/json',
        'X-Runway-Version': credentials.apiVersion || '2024-11-06',
      },
    });
  }

  /**
   * Generate video from a product image
   */
  async generateVideo(
    credentials: RunwayCredentials,
    settings: RunwaySettings,
    request: VideoGenerationRequest,
  ): Promise<VideoGenerationResponse> {
    const client = this.createClient(credentials);

    try {
      const response = await client.post('/image_to_video', {
        model: request.model || settings.defaultModel || 'gen3a_turbo',
        promptImage: request.imageUrl,
        promptText: request.prompt || 'Subtle product motion, professional showcase',
        duration: request.duration || settings.defaultDuration || 5,
        ratio: this.mapAspectRatio(
          request.aspectRatio || settings.defaultAspectRatio || '16:9',
        ),
        seed: request.seed,
      });

      return {
        taskId: response.data.id,
        status: 'PENDING',
        progress: 0,
      };
    } catch (error: any) {
      this.logger.error(`Video generation failed: ${error.message}`);
      throw new Error(
        `Runway video generation failed: ${error.response?.data?.error || error.message}`,
      );
    }
  }

  /**
   * Check the status of a video generation task
   */
  async getTaskStatus(
    credentials: RunwayCredentials,
    taskId: string,
  ): Promise<VideoGenerationResponse> {
    const client = this.createClient(credentials);

    try {
      const response = await client.get(`/tasks/${taskId}`);
      const task = response.data;

      return {
        taskId: task.id,
        status: this.mapStatus(task.status),
        videoUrl: task.output?.[0] || undefined,
        progress: task.progress || 0,
        error: task.failure || undefined,
        metadata:
          task.status === 'SUCCEEDED'
            ? {
                model: task.model,
                duration: task.duration,
                resolution: task.resolution,
                creditsUsed: task.creditsUsed || 0,
              }
            : undefined,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get task status: ${error.message}`);
      throw new Error(`Failed to get Runway task status: ${error.message}`);
    }
  }

  /**
   * Wait for video generation to complete and download the result
   */
  async waitForCompletion(
    credentials: RunwayCredentials,
    taskId: string,
    maxWaitMs: number = 300000, // 5 minutes default
    pollIntervalMs: number = 5000, // 5 seconds
  ): Promise<VideoGenerationResult> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const status = await this.getTaskStatus(credentials, taskId);

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
          taskId: taskId,
        };
      }

      if (status.status === 'FAILED') {
        throw new Error(
          `Video generation failed: ${status.error || 'Unknown error'}`,
        );
      }

      // Wait before polling again
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error('Video generation timed out');
  }

  /**
   * Generate video and immediately download (convenience method)
   */
  async generateAndDownload(
    credentials: RunwayCredentials,
    settings: RunwaySettings,
    request: VideoGenerationRequest,
  ): Promise<VideoGenerationResult> {
    const task = await this.generateVideo(credentials, settings, request);
    return this.waitForCompletion(credentials, task.taskId);
  }

  /**
   * Cancel a running video generation task
   */
  async cancelTask(
    credentials: RunwayCredentials,
    taskId: string,
  ): Promise<void> {
    const client = this.createClient(credentials);

    try {
      await client.delete(`/tasks/${taskId}`);
      this.logger.log(`Cancelled Runway task: ${taskId}`);
    } catch (error: any) {
      this.logger.warn(`Failed to cancel task ${taskId}: ${error.message}`);
    }
  }

  /**
   * Test connection to Runway API
   */
  async testConnection(credentials: RunwayCredentials): Promise<{
    success: boolean;
    message: string;
    latencyMs: number;
    creditsRemaining?: number;
  }> {
    const startTime = Date.now();
    const client = this.createClient(credentials);

    try {
      // Get organization info to verify credentials and check credits
      const response = await client.get('/organization');

      return {
        success: true,
        message: `Connected to Runway API (${response.data.tier || 'active'})`,
        latencyMs: Date.now() - startTime,
        creditsRemaining: response.data.credits,
      };
    } catch (error: any) {
      const statusCode = error.response?.status;
      const errorMessage = error.response?.data?.error || error.message;

      // Provide specific error messages based on status code
      let message = errorMessage;
      if (statusCode === 401) {
        message = 'Invalid API key. Check your Runway API key in the developer portal.';
      } else if (statusCode === 403) {
        message = 'API key does not have permission to access this resource.';
      } else if (statusCode === 404) {
        message = 'Runway API endpoint not found. API may have changed.';
      }

      return {
        success: false,
        message,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Map aspect ratio to Runway format
   */
  private mapAspectRatio(ratio: string): string {
    const mapping: Record<string, string> = {
      '16:9': '1280:768',
      '9:16': '768:1280',
      '1:1': '1024:1024',
    };
    return mapping[ratio] || '1280:768';
  }

  /**
   * Map Runway status to our status enum
   */
  private mapStatus(status: string): VideoGenerationResponse['status'] {
    const mapping: Record<string, VideoGenerationResponse['status']> = {
      PENDING: 'PENDING',
      RUNNING: 'RUNNING',
      SUCCEEDED: 'SUCCEEDED',
      FAILED: 'FAILED',
      THROTTLED: 'PENDING',
    };
    return mapping[status] || 'PENDING';
  }
}
