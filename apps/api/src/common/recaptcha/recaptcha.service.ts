import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  RecaptchaVerifyOptions,
  RecaptchaVerifyResult,
  RecaptchaApiResponse,
  RecaptchaConfig,
} from './recaptcha.types';

/**
 * reCAPTCHA v3 Service
 *
 * Provides invisible fraud protection for checkout and other sensitive actions.
 * Uses Google reCAPTCHA v3 which returns a score from 0.0 to 1.0.
 *
 * SOC2/PCI-DSS Compliance:
 * - Logs suspicious activity for audit trail
 * - Never logs sensitive card data
 * - Configurable thresholds for fraud detection
 *
 * @example
 * const result = await recaptchaService.verify({
 *   token: 'reCAPTCHA-token-from-frontend',
 *   action: 'checkout',
 *   remoteIp: clientIpAddress,
 * });
 *
 * if (!result.success || result.isSuspicious) {
 *   // Block the request
 * }
 */
@Injectable()
export class RecaptchaService {
  private readonly logger = new Logger(RecaptchaService.name);
  private readonly config: RecaptchaConfig;
  private readonly VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

  constructor(private readonly configService: ConfigService) {
    this.config = {
      secretKey: this.configService.get<string>('RECAPTCHA_SECRET_KEY', ''),
      scoreThreshold: parseFloat(
        this.configService.get<string>('RECAPTCHA_THRESHOLD', '0.3'),
      ),
      enabled:
        this.configService.get<string>('RECAPTCHA_ENABLED', 'true') === 'true' &&
        !!this.configService.get<string>('RECAPTCHA_SECRET_KEY', ''),
    };

    if (this.config.enabled) {
      this.logger.log(
        `reCAPTCHA enabled with threshold: ${this.config.scoreThreshold}`,
      );
    } else {
      this.logger.warn(
        'reCAPTCHA is disabled. Set RECAPTCHA_SECRET_KEY to enable fraud protection.',
      );
    }
  }

  /**
   * Check if reCAPTCHA verification is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get the current score threshold
   */
  getScoreThreshold(): number {
    return this.config.scoreThreshold;
  }

  /**
   * Verify a reCAPTCHA token
   *
   * @param options - Verification options including token and action
   * @returns Verification result with score and suspicious flag
   */
  async verify(options: RecaptchaVerifyOptions): Promise<RecaptchaVerifyResult> {
    // If reCAPTCHA is disabled, pass all requests
    if (!this.config.enabled) {
      this.logger.debug('reCAPTCHA disabled, skipping verification');
      return {
        success: true,
        score: 1.0,
        isSuspicious: false,
      };
    }

    // Validate token is provided
    if (!options.token) {
      this.logger.warn('reCAPTCHA token missing');
      return {
        success: false,
        score: 0,
        isSuspicious: true,
        failureReason: 'Missing reCAPTCHA token',
      };
    }

    try {
      // Build request body
      const params = new URLSearchParams({
        secret: this.config.secretKey,
        response: options.token,
      });

      if (options.remoteIp) {
        params.append('remoteip', options.remoteIp);
      }

      // Call Google reCAPTCHA API
      const response = await fetch(this.VERIFY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        this.logger.error(
          `reCAPTCHA API returned status ${response.status}`,
        );
        return {
          success: false,
          score: 0,
          isSuspicious: true,
          failureReason: `reCAPTCHA API error: ${response.status}`,
        };
      }

      const data: RecaptchaApiResponse = await response.json();

      // Check if verification was successful
      if (!data.success) {
        this.logger.warn(
          `reCAPTCHA verification failed: ${data['error-codes']?.join(', ')}`,
        );
        return {
          success: false,
          score: 0,
          isSuspicious: true,
          failureReason: 'reCAPTCHA verification failed',
          errorCodes: data['error-codes'],
        };
      }

      const score = data.score ?? 0;
      const isSuspicious = score < this.config.scoreThreshold;

      // Validate action if provided
      if (options.action && data.action && data.action !== options.action) {
        this.logger.warn(
          `reCAPTCHA action mismatch: expected "${options.action}", got "${data.action}"`,
        );
        return {
          success: false,
          score,
          action: data.action,
          isSuspicious: true,
          failureReason: 'Action mismatch - potential token reuse',
        };
      }

      if (isSuspicious) {
        this.logger.warn(
          `reCAPTCHA score below threshold: ${score} < ${this.config.scoreThreshold}`,
        );
      } else {
        this.logger.debug(`reCAPTCHA verification passed with score: ${score}`);
      }

      return {
        success: true,
        score,
        action: data.action,
        isSuspicious,
        failureReason: isSuspicious
          ? `Score ${score.toFixed(2)} below threshold ${this.config.scoreThreshold}`
          : undefined,
      };
    } catch (error) {
      this.logger.error(
        `reCAPTCHA verification error: ${(error as Error).message}`,
      );
      // On network errors, we could either block or allow
      // Being conservative here - treat as suspicious
      return {
        success: false,
        score: 0,
        isSuspicious: true,
        failureReason: `reCAPTCHA verification error: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Convenience method to verify and check if request should be blocked
   *
   * @param token - The reCAPTCHA token from frontend
   * @param action - Expected action name
   * @param remoteIp - Client IP address
   * @returns true if request should be blocked, false if allowed
   */
  async shouldBlock(
    token: string,
    action?: string,
    remoteIp?: string,
  ): Promise<{ blocked: boolean; result: RecaptchaVerifyResult }> {
    const result = await this.verify({ token, action, remoteIp });
    const blocked = !result.success || result.isSuspicious;
    return { blocked, result };
  }
}
