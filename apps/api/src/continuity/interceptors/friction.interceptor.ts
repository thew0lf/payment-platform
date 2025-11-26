import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { ContinuityService } from '../continuity.service';
import { FrictionLevel } from '../interfaces/continuity.interfaces';

export const FRICTION_AMOUNT_KEY = 'friction_amount_field';
export const FRICTION_RESPONSE_KEY = 'include_friction_response';

interface FrictionMetadata {
  level: FrictionLevel;
  requiresConfirmation: boolean;
  requiresStepUpAuth: boolean;
  oneClickEligible: boolean;
  reason: string;
}

/**
 * FrictionInterceptor
 *
 * Dynamically evaluates and applies appropriate friction levels to transactions.
 * Based on Chase Hughes' Friction Calibration principle - reducing friction for
 * legitimate actions while adding it where it prevents errors.
 *
 * Usage:
 * @UseInterceptors(FrictionInterceptor)
 * @SetMetadata('friction_amount_field', 'amount') // Field containing transaction amount
 * @SetMetadata('include_friction_response', true) // Include friction info in response
 */
@Injectable()
export class FrictionInterceptor implements NestInterceptor {
  private readonly logger = new Logger(FrictionInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly continuityService: ContinuityService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // Get field name containing amount
    const amountField = this.reflector.get<string>(
      FRICTION_AMOUNT_KEY,
      context.getHandler(),
    ) ?? 'amount';

    // Get whether to include friction in response
    const includeFriction = this.reflector.get<boolean>(
      FRICTION_RESPONSE_KEY,
      context.getHandler(),
    ) ?? false;

    // Extract amount from request
    const amount = this.extractAmount(request, amountField);

    // If no amount, skip friction calculation
    if (amount === null) {
      return next.handle();
    }

    // Extract user context for friction calculation
    const isReturningUser = this.isReturningUser(request);
    const riskScore = this.extractRiskScore(request);

    // Calculate friction
    const frictionResult = this.continuityService.calculateFriction({
      amount,
      riskScore,
      isReturningUser,
    });

    this.logger.log(
      `Friction calculated for amount ${amount}: ${frictionResult.level} (${frictionResult.reason})`,
    );

    // Attach friction metadata to request for downstream use
    request.frictionMetadata = frictionResult;

    // Handle based on friction level
    if (frictionResult.requiresStepUpAuth) {
      request.requiresStepUpAuth = true;
    }

    return next.handle().pipe(
      map(data => {
        // Include friction info in response if configured
        if (includeFriction && data && typeof data === 'object') {
          return {
            ...data,
            _friction: this.formatFrictionResponse(frictionResult),
          };
        }
        return data;
      }),
    );
  }

  /**
   * Extract amount from request body, query, or params
   */
  private extractAmount(request: any, field: string): number | null {
    // Try body first
    if (request.body && typeof request.body[field] === 'number') {
      return request.body[field];
    }

    // Try query params
    if (request.query && request.query[field]) {
      const parsed = parseFloat(request.query[field]);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }

    // Try route params
    if (request.params && request.params[field]) {
      const parsed = parseFloat(request.params[field]);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }

    return null;
  }

  /**
   * Determine if user is returning based on request context
   */
  private isReturningUser(request: any): boolean {
    // Check for user object (from auth)
    if (request.user?.previousTransactions > 0) {
      return true;
    }

    // Check for returning user header
    if (request.headers['x-returning-user'] === 'true') {
      return true;
    }

    // Check for stored payment method indicator
    if (request.body?.savedPaymentMethodId) {
      return true;
    }

    return false;
  }

  /**
   * Extract risk score from request
   */
  private extractRiskScore(request: any): number {
    // From fraud detection header
    const headerScore = request.headers['x-risk-score'];
    if (headerScore) {
      const parsed = parseFloat(headerScore);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
        return parsed;
      }
    }

    // From user object
    if (request.user?.riskScore !== undefined) {
      return request.user.riskScore;
    }

    // Default to medium risk for unknown
    return 30;
  }

  /**
   * Format friction response for API output
   */
  private formatFrictionResponse(friction: FrictionMetadata): {
    level: string;
    actions: string[];
    message: string;
  } {
    const actions: string[] = [];

    if (friction.oneClickEligible) {
      actions.push('one_click_available');
    }
    if (friction.requiresConfirmation) {
      actions.push('confirmation_required');
    }
    if (friction.requiresStepUpAuth) {
      actions.push('step_up_auth_required');
    }

    const messages: Record<FrictionLevel, string> = {
      [FrictionLevel.NONE]: 'Quick checkout available',
      [FrictionLevel.LOW]: 'Standard checkout',
      [FrictionLevel.MEDIUM]: 'Please confirm your payment',
      [FrictionLevel.HIGH]: 'Additional verification required for your security',
    };

    return {
      level: friction.level,
      actions,
      message: messages[friction.level],
    };
  }
}

/**
 * Decorator to specify field containing transaction amount
 */
export function FrictionAmountField(fieldName: string) {
  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(FRICTION_AMOUNT_KEY, fieldName, descriptor.value);
    return descriptor;
  };
}

/**
 * Decorator to include friction info in response
 */
export function IncludeFrictionResponse() {
  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(FRICTION_RESPONSE_KEY, true, descriptor.value);
    return descriptor;
  };
}
