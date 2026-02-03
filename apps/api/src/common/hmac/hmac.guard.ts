import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { HmacService } from './hmac.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import {
  REQUIRE_HMAC_METADATA_KEY,
  HMAC_OPTIONS_METADATA_KEY,
  SKIP_HMAC_METADATA_KEY,
} from './hmac.decorator';
import {
  DEFAULT_HMAC_CONFIG,
  HmacErrorCode,
  HmacViolation,
  RequireHmacOptions,
} from './hmac.types';
import { AuditAction } from '../../audit-logs/types/audit-log.types';
import { DataClassification } from '@prisma/client';

/**
 * HMAC Guard
 *
 * Verifies HMAC signatures on incoming requests to protect against
 * request tampering and replay attacks.
 *
 * Required headers:
 * - X-Signature: HMAC signature of the request
 * - X-Timestamp: Unix timestamp (seconds) of when request was signed
 * - X-Key-Id: (optional) Company-specific key identifier
 *
 * SOC2 CC6.1 Compliance - Secure API authentication
 */
@Injectable()
export class HmacGuard implements CanActivate {
  private readonly logger = new Logger(HmacGuard.name);

  constructor(
    private readonly hmacService: HmacService,
    private readonly reflector: Reflector,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if HMAC is required for this route
    const requireHmac = this.reflector.getAllAndOverride<boolean>(REQUIRE_HMAC_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requireHmac) {
      return true; // HMAC not required
    }

    // Check if HMAC should be skipped for this specific route
    const skipHmac = this.reflector.getAllAndOverride<boolean>(SKIP_HMAC_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipHmac) {
      return true;
    }

    // Get HMAC options
    const options =
      this.reflector.getAllAndOverride<RequireHmacOptions>(HMAC_OPTIONS_METADATA_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || {};

    const request = context.switchToHttp().getRequest<Request>();

    // Extract required headers
    const signature = this.getHeader(request, DEFAULT_HMAC_CONFIG.signatureHeader);
    const timestamp = this.getHeader(request, DEFAULT_HMAC_CONFIG.timestampHeader);
    const keyId = this.getHeader(request, DEFAULT_HMAC_CONFIG.keyIdHeader);

    // Validate required headers present
    if (!signature) {
      await this.logViolation(request, HmacErrorCode.MISSING_SIGNATURE, timestamp, signature);
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Missing X-Signature header',
        code: HmacErrorCode.MISSING_SIGNATURE,
      });
    }

    if (!timestamp) {
      await this.logViolation(request, HmacErrorCode.MISSING_TIMESTAMP, timestamp, signature);
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Missing X-Timestamp header',
        code: HmacErrorCode.MISSING_TIMESTAMP,
      });
    }

    // Build request data for verification
    const requestData = {
      method: request.method,
      path: request.originalUrl || request.url,
      body: this.getRequestBody(request),
      timestamp,
    };

    // Determine company ID for key lookup
    const companyId = options.allowCompanyKeys ? this.extractCompanyId(request, keyId) : undefined;

    // Verify signature
    const result = await this.hmacService.verifySignature(requestData, signature, {
      companyId,
      algorithm: options.algorithm,
      maxTimestampDrift: options.maxTimestampDrift,
    });

    if (!result.valid) {
      await this.logViolation(request, result.errorCode!, timestamp, signature);
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        message: result.error,
        code: result.errorCode,
      });
    }

    return true;
  }

  /**
   * Get header value (case-insensitive)
   */
  private getHeader(request: Request, name: string): string | undefined {
    const value = request.headers[name.toLowerCase()];
    return Array.isArray(value) ? value[0] : value;
  }

  /**
   * Get request body as string for signature computation
   */
  private getRequestBody(request: Request): string {
    // For GET/DELETE requests, there's no body
    if (!request.body || Object.keys(request.body).length === 0) {
      return '';
    }

    // If body is already a string, use it directly
    if (typeof request.body === 'string') {
      return request.body;
    }

    // Otherwise, stringify it
    return JSON.stringify(request.body);
  }

  /**
   * Extract company ID from request context
   */
  private extractCompanyId(request: Request, keyId?: string): string | undefined {
    // First try the key ID header
    if (keyId) {
      return keyId;
    }

    // Try query parameter
    const queryCompanyId = request.query.companyId as string | undefined;
    if (queryCompanyId) {
      return queryCompanyId;
    }

    // Try x-company-id header (used by cart API)
    const headerCompanyId = this.getHeader(request, 'x-company-id');
    if (headerCompanyId) {
      return headerCompanyId;
    }

    return undefined;
  }

  /**
   * Log HMAC violation to audit logs
   */
  private async logViolation(
    request: Request,
    errorCode: HmacErrorCode,
    providedTimestamp?: string,
    providedSignature?: string,
  ): Promise<void> {
    const clientIp = this.extractClientIp(request);

    const violation: HmacViolation = {
      ip: clientIp,
      path: request.originalUrl || request.url,
      method: request.method,
      errorCode,
      userAgent: request.headers['user-agent'],
      timestamp: new Date(),
      providedTimestamp,
      providedSignature: providedSignature ? `${providedSignature.substring(0, 16)}...` : undefined,
    };

    this.logger.warn(
      `HMAC verification failed: ${errorCode} for ${request.method} ${violation.path} from ${clientIp}`,
    );

    try {
      await this.auditLogsService.log(
        AuditAction.API_ABUSE_DETECTED,
        'System',
        clientIp,
        {
          metadata: {
            type: 'HMAC_VIOLATION',
            ...violation,
          },
          dataClassification: DataClassification.INTERNAL,
        },
      );
    } catch (error) {
      this.logger.error(`Failed to log HMAC violation: ${error.message}`);
    }
  }

  /**
   * Extract client IP from request
   */
  private extractClientIp(request: Request): string {
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0];
      return ips.trim();
    }

    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    return request.ip || request.socket?.remoteAddress || '0.0.0.0';
  }
}
