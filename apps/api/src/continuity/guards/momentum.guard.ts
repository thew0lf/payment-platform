import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ContinuityService } from '../continuity.service';

export const MOMENTUM_THRESHOLD_KEY = 'momentum_threshold';
export const SKIP_MOMENTUM_CHECK_KEY = 'skip_momentum_check';

/**
 * MomentumGuard
 *
 * Ensures behavioral momentum isn't broken during payment flows.
 * Based on Chase Hughes' NCI principle of maintaining psychological continuity.
 *
 * Usage:
 * @UseGuards(MomentumGuard)
 * @SetMetadata('momentum_threshold', 30) // Optional: set custom threshold
 */
@Injectable()
export class MomentumGuard implements CanActivate {
  private readonly logger = new Logger(MomentumGuard.name);
  private readonly defaultThreshold = 20; // Minimum momentum score to proceed
  private readonly graceTimeoutMs = 300000; // 5 minutes grace period

  constructor(
    private readonly reflector: Reflector,
    private readonly continuityService: ContinuityService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if momentum check should be skipped
    const skipCheck = this.reflector.get<boolean>(
      SKIP_MOMENTUM_CHECK_KEY,
      context.getHandler(),
    );
    if (skipCheck) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const sessionId = this.extractSessionId(request);

    // No session = new flow, allow through
    if (!sessionId) {
      return true;
    }

    const flowState = this.continuityService.getFlowState(sessionId);

    // No existing flow = allow through
    if (!flowState) {
      return true;
    }

    // Check if within grace period
    const now = new Date();
    const timeSinceLastActivity = now.getTime() - flowState.lastActivityAt.getTime();

    if (timeSinceLastActivity > this.graceTimeoutMs) {
      this.logger.warn(
        `Flow ${sessionId} exceeded grace timeout (${timeSinceLastActivity}ms > ${this.graceTimeoutMs}ms)`,
      );
      this.continuityService.abandonFlow(sessionId);
      throw new HttpException(
        {
          statusCode: HttpStatus.REQUEST_TIMEOUT,
          message: 'Session expired due to inactivity',
          code: 'MOMENTUM_TIMEOUT',
          suggestion: 'Please start a new payment flow',
        },
        HttpStatus.REQUEST_TIMEOUT,
      );
    }

    // Get custom threshold or use default
    const threshold = this.reflector.get<number>(
      MOMENTUM_THRESHOLD_KEY,
      context.getHandler(),
    ) ?? this.defaultThreshold;

    // Check momentum score
    if (flowState.momentumScore < threshold) {
      this.logger.warn(
        `Flow ${sessionId} has low momentum (${flowState.momentumScore} < ${threshold})`,
      );

      // Don't block, but log warning - we want to optimize, not prevent transactions
      // In production, this could trigger re-engagement flows
    }

    return true;
  }

  /**
   * Extract session ID from request
   * Checks headers, query params, and body
   */
  private extractSessionId(request: Request): string | null {
    // Check header first (preferred method)
    const headerSessionId = request.headers['x-continuity-session'] as string;
    if (headerSessionId) {
      return headerSessionId;
    }

    // Check query parameter
    const querySessionId = request.query['sessionId'] as string;
    if (querySessionId) {
      return querySessionId;
    }

    // Check body
    const bodySessionId = (request.body as any)?.sessionId;
    if (bodySessionId) {
      return bodySessionId;
    }

    return null;
  }
}

/**
 * Decorator to set custom momentum threshold
 */
export function MomentumThreshold(threshold: number) {
  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(MOMENTUM_THRESHOLD_KEY, threshold, descriptor.value);
    return descriptor;
  };
}

/**
 * Decorator to skip momentum check
 */
export function SkipMomentumCheck() {
  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(SKIP_MOMENTUM_CHECK_KEY, true, descriptor.value);
    return descriptor;
  };
}
