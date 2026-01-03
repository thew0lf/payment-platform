/**
 * Funnel Logo Service
 * Manages logo upload, processing, and AI generation for funnels.
 *
 * Tier-based capabilities:
 * - Free: Upload logo (PNG, JPG, SVG, WebP)
 * - Pro: Upload + processing (background removal, resize, format conversion)
 * - Enterprise: Upload + processing + AI generation
 */

import { Injectable, Logger, BadRequestException, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { AuditAction, AuditEntity } from '../../audit-logs/types/audit-log.types';
import { ScopeType, AIFeature, AIUsageStatus } from '@prisma/client';
import {
  S3StorageService,
  S3Credentials,
} from '../../integrations/services/providers/s3-storage.service';
import { CloudinaryService } from '../../integrations/services/providers/cloudinary.service';
import {
  BedrockService,
  BedrockCredentials,
  LogoGenerationRequest as BedrockLogoRequest,
} from '../../integrations/services/providers/bedrock.service';
import { PlatformIntegrationService } from '../../integrations/services/platform-integration.service';
import { IntegrationProvider } from '../../integrations/types/integration.types';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface LogoCapabilities {
  /** Can upload logos (all tiers) */
  canUpload: boolean;
  /** Can process logos - background removal, resize (Pro+) */
  canProcess: boolean;
  /** Can generate logos with AI (Enterprise only) */
  canGenerate: boolean;
  /** AI generations remaining this month */
  generationsRemaining?: number;
  /** Maximum file size in bytes */
  maxFileSize: number;
  /** Allowed file types */
  allowedTypes: string[];
  /** Available processing options */
  processingOptions: string[];
  /** Feature list for UI */
  features: string[];
  /** Message if limited */
  message?: string;
}

export interface UploadLogoRequest {
  /** Base64 encoded file data or Buffer */
  fileData: string | Buffer;
  /** Original filename */
  filename: string;
  /** MIME type */
  mimeType: string;
  /** Optional: Apply processing after upload */
  process?: LogoProcessingOptions;
}

export interface LogoProcessingOptions {
  /** Remove background (Pro+) */
  removeBackground?: boolean;
  /** Resize to specific dimensions */
  resize?: { width: number; height: number };
  /** Output format */
  format?: 'png' | 'webp' | 'svg';
  /** Optimize for web */
  optimize?: boolean;
}

export interface UploadedLogo {
  /** S3 key */
  key: string;
  /** Direct URL */
  url: string;
  /** CDN URL if available */
  cdnUrl?: string;
  /** File size in bytes */
  size: number;
  /** MIME type */
  mimeType: string;
  /** Dimensions */
  width?: number;
  height?: number;
}

export interface LogoGenerationRequest {
  /** Company/brand name */
  brandName: string;
  /** Industry type */
  industry: string;
  /** Style preference */
  style: 'modern' | 'classic' | 'playful' | 'elegant' | 'minimal' | 'bold';
  /** Primary brand color (hex) */
  primaryColor?: string;
  /** Secondary brand color (hex) */
  secondaryColor?: string;
  /** Include icon, text, or both */
  elements?: ('icon' | 'text' | 'abstract')[];
  /** Additional description */
  description?: string;
}

export interface GeneratedLogo {
  /** Temporary URL (expires in 1 hour) */
  url: string;
  /** Generation ID */
  id: string;
  /** Style variant */
  variant: number;
}

export interface LogoGenerationResult {
  /** Job ID for tracking */
  jobId: string;
  /** Status */
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  /** Progress (0-100) */
  progress: number;
  /** Generated logo options */
  logos?: GeneratedLogo[];
  /** Error message if failed */
  error?: string;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const LOGO_CONSTRAINTS = {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'],
  allowedExtensions: ['.png', '.jpg', '.jpeg', '.svg', '.webp'],
  maxDimensions: { width: 2000, height: 2000 },
  headerSize: { width: 400, height: 100 }, // For funnel header
  friendlyTypes: 'PNG, JPG, SVG, or WebP',
};

const MONTHLY_GENERATION_LIMIT = 50;

// Cache configuration
const CACHE_CONFIG = {
  maxSize: 100,           // Maximum entries in cache
  ttlMs: 60 * 60 * 1000,  // 1 hour TTL
  cleanupIntervalMs: 5 * 60 * 1000, // Cleanup every 5 minutes
};

interface CachedResult {
  result: LogoGenerationResult;
  expiresAt: number;
}

// ═══════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════

@Injectable()
export class FunnelLogoService implements OnModuleDestroy {
  private readonly logger = new Logger(FunnelLogoService.name);

  /** In-memory cache for generation results with TTL */
  private generationCache = new Map<string, CachedResult>();
  private cacheCleanupTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3StorageService: S3StorageService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly bedrockService: BedrockService,
    private readonly platformIntegrationService: PlatformIntegrationService,
    private readonly auditLogsService: AuditLogsService,
  ) {
    // Start cache cleanup timer
    this.startCacheCleanup();
  }

  /**
   * Cleanup resources when module is destroyed
   * Prevents memory leaks in hot reloads and module recreation
   */
  onModuleDestroy(): void {
    if (this.cacheCleanupTimer) {
      clearInterval(this.cacheCleanupTimer);
      this.cacheCleanupTimer = null;
    }
    this.generationCache.clear();
    this.logger.debug('Cleaned up logo generation cache on module destroy');
  }

  /**
   * Start periodic cache cleanup
   */
  private startCacheCleanup(): void {
    if (this.cacheCleanupTimer) return;

    this.cacheCleanupTimer = setInterval(() => {
      this.cleanupCache();
    }, CACHE_CONFIG.cleanupIntervalMs);

    // Don't prevent process exit
    this.cacheCleanupTimer.unref();
  }

  /**
   * Clean up expired cache entries and enforce size limit
   */
  private cleanupCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    // Find expired entries
    for (const [key, cached] of this.generationCache.entries()) {
      if (cached.expiresAt < now) {
        expiredKeys.push(key);
      }
    }

    // Remove expired entries
    for (const key of expiredKeys) {
      this.generationCache.delete(key);
    }

    // Enforce size limit (remove oldest entries)
    if (this.generationCache.size > CACHE_CONFIG.maxSize) {
      const entries = Array.from(this.generationCache.entries())
        .sort((a, b) => a[1].expiresAt - b[1].expiresAt);

      const toRemove = entries.slice(0, this.generationCache.size - CACHE_CONFIG.maxSize);
      for (const [key] of toRemove) {
        this.generationCache.delete(key);
      }
    }

    if (expiredKeys.length > 0) {
      this.logger.debug(`Cache cleanup: removed ${expiredKeys.length} expired entries`);
    }
  }

  /**
   * Set a value in the generation cache with TTL
   */
  private setCacheEntry(key: string, result: LogoGenerationResult): void {
    // Enforce size limit before adding
    if (this.generationCache.size >= CACHE_CONFIG.maxSize) {
      this.cleanupCache();
    }

    this.generationCache.set(key, {
      result,
      expiresAt: Date.now() + CACHE_CONFIG.ttlMs,
    });
  }

  /**
   * Get a value from the generation cache (returns null if expired)
   */
  private getCacheEntry(key: string): LogoGenerationResult | null {
    const cached = this.generationCache.get(key);
    if (!cached) return null;

    // Check if expired
    if (cached.expiresAt < Date.now()) {
      this.generationCache.delete(key);
      return null;
    }

    return cached.result;
  }

  // ═══════════════════════════════════════════════════════════════
  // CAPABILITIES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get logo capabilities based on platform integrations
   * Logo features use platform-level integrations (organization-level)
   * as a paid feature for all customers
   */
  async getLogoCapabilities(companyId: string): Promise<LogoCapabilities> {
    this.validateCompanyId(companyId);

    try {
      // Get the organization ID - logo features use platform integrations
      const organizationId = await this.platformIntegrationService.getDefaultOrganizationId();
      if (!organizationId) {
        return {
          canUpload: false,
          canProcess: false,
          canGenerate: false,
          maxFileSize: LOGO_CONSTRAINTS.maxSize,
          allowedTypes: LOGO_CONSTRAINTS.allowedTypes,
          processingOptions: [],
          features: [],
          message: 'Platform not configured. Contact support.',
        };
      }

      // Check platform-level integrations (shared with all customers)
      const s3Credentials = await this.getS3Credentials();
      const cloudinaryCredentials = await this.getCloudinaryCredentials();
      const bedrockCredentials = await this.getBedrockCredentials();

      const hasS3 = !!s3Credentials;
      const hasCloudinary = !!cloudinaryCredentials;
      const hasBedrock = !!bedrockCredentials;

      // Build capabilities based on platform integrations
      const capabilities: LogoCapabilities = {
        canUpload: hasS3,
        canProcess: hasS3 && hasCloudinary,
        canGenerate: hasS3 && hasBedrock,
        maxFileSize: LOGO_CONSTRAINTS.maxSize,
        allowedTypes: LOGO_CONSTRAINTS.allowedTypes,
        processingOptions: [],
        features: [],
      };

      // Add feature descriptions
      if (hasS3) {
        capabilities.features.push('Upload custom logo');
        capabilities.features.push('Auto-optimization for web');
      } else {
        capabilities.message =
          'Logo upload is temporarily unavailable. Please try again later.';
      }

      if (hasCloudinary) {
        capabilities.processingOptions.push(
          'removeBackground',
          'resize',
          'format',
          'optimize',
        );
        capabilities.features.push('Background removal');
        capabilities.features.push('Smart resize');
        capabilities.features.push('Format conversion');
      }

      if (hasBedrock) {
        const remaining = await this.getGenerationsRemaining(companyId);
        capabilities.generationsRemaining = remaining;
        capabilities.features.push('AI logo generation');
        capabilities.features.push(`${remaining} generations remaining`);
      }

      return capabilities;
    } catch (error) {
      this.logger.warn(`Failed to get logo capabilities: ${error}`);
      return {
        canUpload: false,
        canProcess: false,
        canGenerate: false,
        maxFileSize: LOGO_CONSTRAINTS.maxSize,
        allowedTypes: LOGO_CONSTRAINTS.allowedTypes,
        processingOptions: [],
        features: [],
        message: 'Unable to check logo capabilities. Please try again.',
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // UPLOAD (All Tiers)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Upload a logo for a funnel
   * Uses platform-level S3 storage
   */
  async uploadLogo(
    companyId: string,
    funnelId: string,
    request: UploadLogoRequest,
  ): Promise<UploadedLogo> {
    this.validateCompanyId(companyId);

    // Check capabilities
    const capabilities = await this.getLogoCapabilities(companyId);
    if (!capabilities.canUpload) {
      throw new BadRequestException(
        capabilities.message ||
          'Logo upload is temporarily unavailable. Please try again later.',
      );
    }

    // Validate file
    this.validateLogoFile(request);

    // Get platform S3 credentials
    const s3Credentials = await this.getS3Credentials();
    if (!s3Credentials) {
      throw new BadRequestException(
        'Logo upload is temporarily unavailable. Please try again later.',
      );
    }

    // Convert base64 to buffer if needed
    const buffer =
      typeof request.fileData === 'string'
        ? Buffer.from(request.fileData, 'base64')
        : request.fileData;

    // Generate unique filename with path traversal protection
    const ext = this.getExtension(request.filename);
    const safeFunnelId = this.sanitizeFilename(funnelId);
    const filename = this.sanitizeFilename(`logo_${safeFunnelId}_${Date.now()}${ext}`);

    // Upload to S3
    const result = await this.s3StorageService.uploadFile(
      s3Credentials,
      buffer,
      filename,
      {
        companyId,
        folder: `funnels/${safeFunnelId}/branding`,
        contentType: request.mimeType,
      },
    );

    this.logger.log(
      `Uploaded logo for funnel ${funnelId}: ${result.key}`,
    );

    // Apply processing if requested and available
    let finalUrl = result.cdnUrl || result.url;
    if (request.process && capabilities.canProcess) {
      const processed = await this.processLogo(companyId, finalUrl, request.process);
      finalUrl = processed.url;
    }

    // Update funnel branding
    await this.updateFunnelLogo(funnelId, companyId, finalUrl);

    // Audit log
    await this.auditLogsService.log(
      AuditAction.LOGO_UPLOADED,
      AuditEntity.FUNNEL_LOGO,
      funnelId,
      {
        scopeType: ScopeType.COMPANY,
        scopeId: companyId,
        metadata: {
          filename: request.filename,
          mimeType: request.mimeType,
          size: buffer.length,
          processed: !!request.process,
        },
      },
    );

    return {
      key: result.key,
      url: result.url,
      cdnUrl: result.cdnUrl,
      size: buffer.length,
      mimeType: request.mimeType,
    };
  }

  /**
   * Remove logo from a funnel
   */
  async removeLogo(companyId: string, funnelId: string): Promise<void> {
    this.validateCompanyId(companyId);

    // Update funnel to remove logo
    await this.updateFunnelLogo(funnelId, companyId, null);

    // Audit log
    await this.auditLogsService.log(
      AuditAction.LOGO_REMOVED,
      AuditEntity.FUNNEL_LOGO,
      funnelId,
      {
        scopeType: ScopeType.COMPANY,
        scopeId: companyId,
      },
    );

    this.logger.log(`Removed logo from funnel ${funnelId}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // PROCESSING (Pro Tier)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Process a logo with Cloudinary
   * Uses platform-level Cloudinary integration
   */
  async processLogo(
    companyId: string,
    logoUrl: string,
    options: LogoProcessingOptions,
  ): Promise<{ url: string }> {
    this.validateCompanyId(companyId);
    this.validateSourceUrl(logoUrl);

    const capabilities = await this.getLogoCapabilities(companyId);
    if (!capabilities.canProcess) {
      throw new BadRequestException(
        'Logo processing is temporarily unavailable. Please try again later.',
      );
    }

    // Get platform Cloudinary credentials
    const cloudinaryCredentials = await this.getCloudinaryCredentials();
    if (!cloudinaryCredentials) {
      throw new BadRequestException(
        'Logo processing is temporarily unavailable. Please try again later.',
      );
    }

    // Build transformation options
    const transformations: string[] = [];

    if (options.removeBackground) {
      transformations.push('e_background_removal');
    }

    if (options.resize) {
      transformations.push(
        `c_fit,w_${options.resize.width},h_${options.resize.height}`,
      );
    } else {
      // Default resize for header
      transformations.push(
        `c_fit,w_${LOGO_CONSTRAINTS.headerSize.width},h_${LOGO_CONSTRAINTS.headerSize.height}`,
      );
    }

    if (options.format) {
      transformations.push(`f_${options.format}`);
    }

    if (options.optimize) {
      transformations.push('q_auto:good');
    }

    // Use Cloudinary fetch URL
    const transformation = transformations.join(',');
    const processedUrl = `https://res.cloudinary.com/${cloudinaryCredentials.cloudName}/image/fetch/${transformation}/${encodeURIComponent(logoUrl)}`;

    // Audit log
    await this.auditLogsService.log(
      AuditAction.LOGO_PROCESSED,
      AuditEntity.FUNNEL_LOGO,
      undefined,
      {
        scopeType: ScopeType.COMPANY,
        scopeId: companyId,
        metadata: {
          transformations: transformations,
          options,
        },
      },
    );

    return { url: processedUrl };
  }

  // ═══════════════════════════════════════════════════════════════
  // AI GENERATION (Enterprise Tier)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Generate logo options with AI
   * Uses Amazon Titan Image Generator via AWS Bedrock (platform integration)
   */
  async generateLogo(
    companyId: string,
    request: LogoGenerationRequest,
    userId?: string,
  ): Promise<LogoGenerationResult> {
    this.validateCompanyId(companyId);

    const capabilities = await this.getLogoCapabilities(companyId);
    if (!capabilities.canGenerate) {
      throw new BadRequestException(
        'AI logo generation is temporarily unavailable. Please try again later.',
      );
    }

    if ((capabilities.generationsRemaining ?? 0) <= 0) {
      throw new BadRequestException(
        "You've used all your AI generations for this month. They'll reset on the 1st.",
      );
    }

    // Generate unique job ID
    const jobId = `logo_${companyId}_${Date.now()}`;

    try {
      // Get platform credentials
      const bedrockCredentials = await this.getBedrockCredentials();
      if (!bedrockCredentials) {
        throw new BadRequestException(
          'AI logo generation is temporarily unavailable. Please try again later.',
        );
      }

      const s3Credentials = await this.getS3Credentials();
      if (!s3Credentials) {
        throw new BadRequestException(
          'AI logo generation is temporarily unavailable. Please try again later.',
        );
      }

      // Mark as processing
      const processingResult: LogoGenerationResult = {
        jobId,
        status: 'PROCESSING',
        progress: 10,
      };
      this.setCacheEntry(jobId, processingResult);

      // Sanitize inputs for prompt injection protection
      const sanitizedBrandName = this.sanitizePromptInput(request.brandName);
      const sanitizedIndustry = this.sanitizePromptInput(request.industry);
      const sanitizedDescription = request.description
        ? this.sanitizePromptInput(request.description)
        : undefined;

      this.logger.log(`Starting AI logo generation for ${sanitizedBrandName} (job: ${jobId})`);

      // Map request to Bedrock format with sanitized inputs
      const bedrockRequest: BedrockLogoRequest = {
        brandName: sanitizedBrandName,
        industry: sanitizedIndustry,
        style: request.style,
        primaryColor: request.primaryColor,
        secondaryColor: request.secondaryColor,
        elements: request.elements,
        description: sanitizedDescription,
      };

      // Generate logos with Bedrock (Titan Image Generator)
      const generationResponse = await this.bedrockService.generateLogoImages(
        bedrockCredentials,
        bedrockRequest,
        4, // Generate 4 variants
      );

      // Update progress
      this.setCacheEntry(jobId, { ...processingResult, progress: 50 });

      // Upload all generated images to S3 in parallel
      const uploadPromises = generationResponse.images.map(async (image, i) => {
        const buffer = Buffer.from(image.base64Data, 'base64');
        const filename = this.sanitizeFilename(`logo_ai_${jobId}_v${i + 1}.png`);

        const uploadResult = await this.s3StorageService.uploadFile(
          s3Credentials,
          buffer,
          filename,
          {
            companyId,
            folder: `logos/generated/${this.sanitizeFilename(jobId)}`,
            contentType: 'image/png',
          },
        );

        return {
          id: `${jobId}_v${i + 1}`,
          url: uploadResult.cdnUrl || uploadResult.url,
          variant: i + 1,
        } as GeneratedLogo;
      });

      const uploadedLogos = await Promise.all(uploadPromises);

      // Record AI usage
      await this.recordAIUsage(companyId, userId, jobId);

      // Create completed result
      const completedResult: LogoGenerationResult = {
        jobId,
        status: 'COMPLETED',
        progress: 100,
        logos: uploadedLogos,
      };

      // Cache result for status lookups
      this.setCacheEntry(jobId, completedResult);

      // Audit log
      await this.auditLogsService.log(
        AuditAction.LOGO_GENERATED,
        AuditEntity.FUNNEL_LOGO,
        jobId,
        {
          scopeType: ScopeType.COMPANY,
          scopeId: companyId,
          metadata: {
            brandName: request.brandName,
            industry: request.industry,
            style: request.style,
            logoCount: uploadedLogos.length,
            modelUsed: generationResponse.modelUsed,
          },
        },
      );

      this.logger.log(`AI logo generation completed: ${uploadedLogos.length} logos (job: ${jobId})`);

      return completedResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`AI logo generation failed (job: ${jobId}): ${errorMessage}`);

      const failedResult: LogoGenerationResult = {
        jobId,
        status: 'FAILED',
        progress: 0,
        error: this.getFriendlyErrorMessage(errorMessage),
      };

      this.setCacheEntry(jobId, failedResult);

      // Re-throw BadRequestExceptions as-is
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(failedResult.error);
    }
  }

  /**
   * Check AI generation job status
   */
  async getGenerationStatus(
    companyId: string,
    jobId: string,
  ): Promise<LogoGenerationResult> {
    this.validateCompanyId(companyId);

    // Validate job ID format (should match our pattern)
    if (!jobId || !jobId.startsWith(`logo_${companyId}_`)) {
      throw new BadRequestException(
        "That job ID doesn't look right. Double-check it and try again!",
      );
    }

    const result = this.getCacheEntry(jobId);

    if (!result) {
      throw new BadRequestException(
        "Hmm, we can't find that logo job. It may have expired (they only stick around for an hour) or never existed. Try generating a fresh batch!",
      );
    }

    return result;
  }

  /**
   * Convert technical errors to user-friendly messages
   * Uses AVNZ brand voice: confident, friendly, clear
   */
  private getFriendlyErrorMessage(technicalError: string): string {
    const lowerError = technicalError.toLowerCase();

    if (lowerError.includes('throttl') || lowerError.includes('rate limit')) {
      return "Whoa there! Our AI is catching its breath from all the amazing logos it's been creating. Give it a sec and try again! ⚡";
    }

    if (lowerError.includes('credential') || lowerError.includes('access denied')) {
      return "Looks like there's a hiccup with the AI service config. Our team's on it—shoot us a message at support@avnz.io if this keeps happening.";
    }

    if (lowerError.includes('timeout')) {
      return "That one took a bit too long and timed out. Try a simpler description—sometimes less is more! ✨";
    }

    if (lowerError.includes('content') || lowerError.includes('policy')) {
      return "The AI got a little confused by something in your request. Try tweaking your brand name or description—no special characters or unusual phrases!";
    }

    return "Oops! Something went sideways while creating your logo. Mind giving it another shot? If it keeps happening, we're here to help at support@avnz.io.";
  }

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
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

  private validateLogoFile(request: UploadLogoRequest): void {
    // Validate MIME type
    if (!LOGO_CONSTRAINTS.allowedTypes.includes(request.mimeType)) {
      throw new BadRequestException(
        `We only accept ${LOGO_CONSTRAINTS.friendlyTypes} logos. Try converting your file first.`,
      );
    }

    // Validate file size
    const size =
      typeof request.fileData === 'string'
        ? Buffer.from(request.fileData, 'base64').length
        : request.fileData.length;

    if (size > LOGO_CONSTRAINTS.maxSize) {
      const maxMB = LOGO_CONSTRAINTS.maxSize / (1024 * 1024);
      throw new BadRequestException(
        `Your logo is a bit too large. Please use a file under ${maxMB}MB.`,
      );
    }

    // Validate filename
    const ext = this.getExtension(request.filename).toLowerCase();
    if (!LOGO_CONSTRAINTS.allowedExtensions.includes(ext)) {
      throw new BadRequestException(
        `That file type isn't supported. Please use ${LOGO_CONSTRAINTS.friendlyTypes}.`,
      );
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
        'For security, we only accept HTTPS URLs.',
      );
    }

    // SSRF protection - comprehensive check
    const hostname = parsedUrl.hostname.toLowerCase();

    // Check for internal/private patterns
    const blockedPatterns = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '169.254.169.254', // AWS metadata
      '::1',             // IPv6 localhost
      'metadata.google', // GCP metadata
      'metadata.azure',  // Azure metadata
    ];

    for (const pattern of blockedPatterns) {
      if (hostname.includes(pattern)) {
        throw new BadRequestException(
          'This URL points to an internal network. Please use a publicly accessible URL.',
        );
      }
    }

    // Check for private IP ranges
    if (this.isPrivateIp(hostname)) {
      throw new BadRequestException(
        'This URL points to a private network. Please use a publicly accessible URL.',
      );
    }
  }

  /**
   * Check if a hostname is a private/internal IP address
   */
  private isPrivateIp(hostname: string): boolean {
    // Check if it looks like an IP address
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);

    if (!match) {
      return false; // Not an IP, let DNS handle it
    }

    const octets = [
      parseInt(match[1], 10),
      parseInt(match[2], 10),
      parseInt(match[3], 10),
      parseInt(match[4], 10),
    ];

    // Validate octets are in range
    if (octets.some((o) => o > 255)) {
      return true; // Invalid IP, treat as private
    }

    // 10.0.0.0 - 10.255.255.255 (Class A private)
    if (octets[0] === 10) {
      return true;
    }

    // 172.16.0.0 - 172.31.255.255 (Class B private)
    if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) {
      return true;
    }

    // 192.168.0.0 - 192.168.255.255 (Class C private)
    if (octets[0] === 192 && octets[1] === 168) {
      return true;
    }

    // 127.0.0.0 - 127.255.255.255 (loopback)
    if (octets[0] === 127) {
      return true;
    }

    // 169.254.0.0 - 169.254.255.255 (link-local)
    if (octets[0] === 169 && octets[1] === 254) {
      return true;
    }

    // 0.0.0.0 - 0.255.255.255 (current network)
    if (octets[0] === 0) {
      return true;
    }

    return false;
  }

  private getExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot >= 0 ? filename.substring(lastDot) : '.png';
  }

  /**
   * Sanitize filename to prevent path traversal attacks
   * Removes directory separators and dangerous characters
   */
  private sanitizeFilename(filename: string): string {
    // Remove path traversal sequences
    let sanitized = filename
      .replace(/\.\./g, '')         // Remove ..
      .replace(/[\/\\]/g, '')       // Remove / and \
      .replace(/[\x00-\x1f]/g, '')  // Remove control characters
      .replace(/[<>:"|?*]/g, '');   // Remove Windows-invalid chars

    // Ensure it doesn't start with a dot (hidden files)
    if (sanitized.startsWith('.')) {
      sanitized = '_' + sanitized.substring(1);
    }

    // Limit length to 255 characters
    if (sanitized.length > 255) {
      const ext = this.getExtension(sanitized);
      sanitized = sanitized.substring(0, 255 - ext.length) + ext;
    }

    return sanitized || 'file';
  }

  /**
   * Sanitize AI prompt inputs to prevent prompt injection
   * Removes or escapes potentially malicious content
   */
  private sanitizePromptInput(input: string): string {
    if (!input) return '';

    // Remove common prompt injection patterns
    let sanitized = input
      // Remove system/assistant role impersonation attempts
      .replace(/\b(system|assistant|human|user)\s*:/gi, '')
      // Remove instruction override attempts
      .replace(/ignore\s+(previous|above|all)\s+instructions?/gi, '')
      .replace(/disregard\s+(previous|above|all)/gi, '')
      .replace(/forget\s+everything/gi, '')
      // Remove code/script injection attempts
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/```[\s\S]*?```/g, '')
      // Remove excessive special characters
      .replace(/[{}[\]<>]/g, '')
      // Limit repeated characters (potential DoS)
      .replace(/(.)\1{10,}/g, '$1$1$1')
      // Trim and normalize whitespace
      .trim()
      .replace(/\s+/g, ' ');

    // Limit total length
    const maxLength = 500;
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength).trim();
    }

    return sanitized;
  }

  private async updateFunnelLogo(
    funnelId: string,
    companyId: string,
    logoUrl: string | null,
  ): Promise<void> {
    const funnel = await this.prisma.funnel.findFirst({
      where: { id: funnelId, companyId },
    });

    if (!funnel) {
      throw new BadRequestException('Funnel not found');
    }

    const currentSettings = (funnel.settings as Record<string, unknown>) || {};
    const currentBranding =
      (currentSettings.branding as Record<string, unknown>) || {};

    await this.prisma.funnel.update({
      where: { id: funnelId },
      data: {
        settings: {
          ...currentSettings,
          branding: {
            ...currentBranding,
            logoUrl,
          },
        },
      },
    });
  }

  private async getGenerationsRemaining(companyId: string): Promise<number> {
    // Count generations this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const count = await this.prisma.aIUsage.count({
      where: {
        companyId,
        operation: 'LOGO_GENERATION',
        createdAt: { gte: startOfMonth },
      },
    });

    return Math.max(0, MONTHLY_GENERATION_LIMIT - count);
  }

  /**
   * Get S3 credentials from platform integration
   * Logo storage uses organization-level AWS S3 integration
   */
  private async getS3Credentials(): Promise<S3Credentials | null> {
    try {
      const organizationId = await this.platformIntegrationService.getDefaultOrganizationId();
      if (!organizationId) return null;

      const result = await this.platformIntegrationService.getCredentialsByProvider<S3Credentials>(
        organizationId,
        IntegrationProvider.AWS_S3,
      );

      if (!result?.credentials) return null;

      if (!this.isValidS3Credentials(result.credentials)) {
        this.logger.warn('S3 credentials are incomplete');
        return null;
      }

      return result.credentials;
    } catch (error) {
      this.logger.warn(`Failed to get S3 credentials: ${error}`);
      return null;
    }
  }

  /**
   * Get Cloudinary credentials from platform integration
   * Logo processing uses organization-level Cloudinary integration
   */
  private async getCloudinaryCredentials(): Promise<{ cloudName: string; apiKey: string; apiSecret: string } | null> {
    try {
      const organizationId = await this.platformIntegrationService.getDefaultOrganizationId();
      if (!organizationId) return null;

      const result = await this.platformIntegrationService.getCredentialsByProvider<{
        cloudName: string;
        apiKey: string;
        apiSecret: string;
      }>(organizationId, IntegrationProvider.CLOUDINARY);

      if (!result?.credentials) return null;

      if (!this.isValidCloudinaryCredentials(result.credentials)) {
        this.logger.warn('Cloudinary credentials are incomplete');
        return null;
      }

      return result.credentials;
    } catch (error) {
      this.logger.warn(`Failed to get Cloudinary credentials: ${error}`);
      return null;
    }
  }

  /**
   * Get Bedrock credentials from platform integration
   * AI logo generation uses organization-level AWS Bedrock integration
   */
  private async getBedrockCredentials(): Promise<BedrockCredentials | null> {
    try {
      const organizationId = await this.platformIntegrationService.getDefaultOrganizationId();
      if (!organizationId) return null;

      const result = await this.platformIntegrationService.getCredentialsByProvider<BedrockCredentials>(
        organizationId,
        IntegrationProvider.AWS_BEDROCK,
      );

      if (!result?.credentials) return null;

      if (!this.isValidBedrockCredentials(result.credentials)) {
        this.logger.warn('Bedrock credentials are incomplete');
        return null;
      }

      return result.credentials;
    } catch (error) {
      this.logger.warn(`Failed to get Bedrock credentials: ${error}`);
      return null;
    }
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

  private isValidCloudinaryCredentials(
    data: unknown,
  ): data is { cloudName: string; apiKey: string; apiSecret: string } {
    return (
      typeof data === 'object' &&
      data !== null &&
      typeof (data as { cloudName: string }).cloudName === 'string' &&
      typeof (data as { apiKey: string }).apiKey === 'string' &&
      typeof (data as { apiSecret: string }).apiSecret === 'string'
    );
  }

  private isValidBedrockCredentials(data: unknown): data is BedrockCredentials {
    return (
      typeof data === 'object' &&
      data !== null &&
      typeof (data as BedrockCredentials).region === 'string' &&
      typeof (data as BedrockCredentials).accessKeyId === 'string' &&
      typeof (data as BedrockCredentials).secretAccessKey === 'string'
    );
  }

  /**
   * Record AI usage for billing and quota tracking
   */
  private async recordAIUsage(
    companyId: string,
    userId: string | undefined,
    jobId: string,
  ): Promise<void> {
    try {
      await this.prisma.aIUsage.create({
        data: {
          companyId,
          userId: userId || 'system',
          feature: AIFeature.LOGO_GENERATION,
          operation: 'LOGO_GENERATION',
          modelId: 'amazon.titan-image-generator-v2:0',
          inputTokens: 0, // Image generation doesn't use tokens
          outputTokens: 0,
          totalTokens: 0,
          inputCost: 0,
          outputCost: 0,
          totalCost: 40, // ~$0.40 per 4 images (approximate, in cents)
          status: AIUsageStatus.SUCCESS,
          metadata: { jobId },
        },
      });
    } catch (error) {
      // Log but don't fail the generation if usage tracking fails
      this.logger.warn(`Failed to record AI usage: ${error}`);
    }
  }
}
