import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import {
  HmacAlgorithm,
  HmacConfig,
  HmacVerificationResult,
  HmacRequestData,
  HmacErrorCode,
  DEFAULT_HMAC_CONFIG,
} from './hmac.types';

/**
 * HMAC Request Signing Service
 *
 * Provides HMAC signature generation and verification for secure API requests.
 * Supports multiple algorithms (SHA256, SHA512) and timestamp validation
 * to prevent replay attacks.
 *
 * SOC2 CC6.1 Compliance - Secure API authentication
 */
@Injectable()
export class HmacService implements OnModuleInit {
  private readonly logger = new Logger(HmacService.name);
  private platformSecretKey: string | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.platformSecretKey = this.configService.get<string>('HMAC_SECRET_KEY') || null;

    if (this.platformSecretKey) {
      this.logger.log('HMAC service initialized with platform secret key');
    } else {
      this.logger.warn(
        'HMAC_SECRET_KEY not configured. HMAC verification will use company-specific keys only.',
      );
    }
  }

  /**
   * Generate HMAC signature for request data
   */
  generateSignature(
    data: HmacRequestData,
    secretKey: string,
    algorithm: HmacAlgorithm = HmacAlgorithm.SHA256,
  ): string {
    const payload = this.buildSignaturePayload(data);
    const hmac = createHmac(algorithm, secretKey);
    hmac.update(payload);
    return hmac.digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  async verifySignature(
    data: HmacRequestData,
    providedSignature: string,
    options: {
      companyId?: string;
      algorithm?: HmacAlgorithm;
      maxTimestampDrift?: number;
    } = {},
  ): Promise<HmacVerificationResult> {
    const config: HmacConfig = {
      ...DEFAULT_HMAC_CONFIG,
      ...(options.algorithm && { algorithm: options.algorithm }),
      ...(options.maxTimestampDrift && { maxTimestampDrift: options.maxTimestampDrift }),
    };

    // Validate timestamp
    const timestampResult = this.validateTimestamp(data.timestamp, config.maxTimestampDrift);
    if (!timestampResult.valid) {
      return timestampResult;
    }

    // Get secret key (company-specific or platform)
    const secretKey = await this.getSecretKey(options.companyId);
    if (!secretKey) {
      return {
        valid: false,
        error: 'HMAC secret key not configured',
        errorCode: HmacErrorCode.KEY_NOT_FOUND,
      };
    }

    // Generate expected signature
    const expectedSignature = this.generateSignature(data, secretKey, config.algorithm);

    // Use timing-safe comparison to prevent timing attacks
    const isValid = this.timingSafeCompare(providedSignature, expectedSignature);

    if (!isValid) {
      const isDev = this.configService.get<string>('NODE_ENV') === 'development';
      return {
        valid: false,
        error: 'Invalid signature',
        errorCode: HmacErrorCode.INVALID_SIGNATURE,
        // Only include computed signature in development for debugging
        ...(isDev && { computedSignature: expectedSignature }),
      };
    }

    return { valid: true };
  }

  /**
   * Validate timestamp to prevent replay attacks
   */
  validateTimestamp(timestamp: string, maxDriftSeconds: number): HmacVerificationResult {
    const requestTime = parseInt(timestamp, 10);

    if (isNaN(requestTime)) {
      return {
        valid: false,
        error: 'Invalid timestamp format',
        errorCode: HmacErrorCode.INVALID_TIMESTAMP,
      };
    }

    const now = Math.floor(Date.now() / 1000);
    const drift = Math.abs(now - requestTime);

    if (drift > maxDriftSeconds) {
      return {
        valid: false,
        error: `Timestamp expired. Request timestamp is ${drift} seconds old (max: ${maxDriftSeconds}s)`,
        errorCode: HmacErrorCode.TIMESTAMP_EXPIRED,
      };
    }

    return { valid: true };
  }

  /**
   * Get secret key for HMAC verification
   * Checks company-specific settings first, then falls back to platform key
   */
  async getSecretKey(companyId?: string): Promise<string | null> {
    // Try company-specific key first
    if (companyId) {
      try {
        const company = await this.prisma.company.findUnique({
          where: { id: companyId, deletedAt: null },
          select: { settings: true },
        });

        const settings = company?.settings as Record<string, unknown> | null;
        const companyKey = settings?.hmacSecretKey as string | undefined;

        if (companyKey) {
          return companyKey;
        }
      } catch (error) {
        this.logger.warn(`Failed to fetch company HMAC key for ${companyId}: ${error.message}`);
      }
    }

    // Fall back to platform key
    return this.platformSecretKey;
  }

  /**
   * Build the payload string for signature computation
   * Format: METHOD\nPATH\nBODY\nTIMESTAMP
   */
  private buildSignaturePayload(data: HmacRequestData): string {
    const parts = [
      data.method.toUpperCase(),
      data.path,
      data.body || '',
      data.timestamp,
    ];
    return parts.join('\n');
  }

  /**
   * Timing-safe string comparison to prevent timing attacks
   */
  private timingSafeCompare(provided: string, expected: string): boolean {
    try {
      const providedBuffer = Buffer.from(provided, 'hex');
      const expectedBuffer = Buffer.from(expected, 'hex');

      if (providedBuffer.length !== expectedBuffer.length) {
        return false;
      }

      return timingSafeEqual(providedBuffer, expectedBuffer);
    } catch {
      return false;
    }
  }

  /**
   * Check if HMAC is configured (either platform or company keys)
   */
  isConfigured(): boolean {
    return !!this.platformSecretKey;
  }

  /**
   * Get the platform secret key (for testing/admin purposes only)
   * Should not be exposed to external APIs
   */
  getPlatformKeyStatus(): { configured: boolean } {
    return { configured: !!this.platformSecretKey };
  }
}
