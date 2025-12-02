/**
 * Subscription Rebill Service
 *
 * Handles automated recurring billing for subscriptions with stored payment methods.
 * Only processes subscriptions that use token-based providers (Payflow, NMI, Stripe, etc.)
 * NOT for redirect-based providers like PayPal REST.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentProcessingService } from '../../payments/services/payment-processing.service';
import {
  TransactionRequest,
  TransactionType,
  PaymentProviderType,
} from '../../payments/types/payment.types';
import { RebillStatus, SubscriptionStatus, BillingInterval } from '@prisma/client';

// Dunning configuration - retry schedule for failed payments
const DUNNING_CONFIG = {
  maxRetries: 3,
  retryIntervals: [
    1 * 24 * 60 * 60 * 1000, // 1 day after first failure
    3 * 24 * 60 * 60 * 1000, // 3 days after second failure
    7 * 24 * 60 * 60 * 1000, // 7 days after third failure
  ],
};

// Provider types that support tokenization (stored cards)
const TOKEN_BASED_PROVIDERS: PaymentProviderType[] = [
  PaymentProviderType.PAYFLOW,
  PaymentProviderType.NMI,
  PaymentProviderType.STRIPE,
  PaymentProviderType.AUTHORIZE_NET,
  PaymentProviderType.BRAINTREE,
];

interface RebillResult {
  subscriptionId: string;
  rebillId: string;
  success: boolean;
  transactionId?: string;
  errorCode?: string;
  errorMessage?: string;
}

@Injectable()
export class SubscriptionRebillService {
  private readonly logger = new Logger(SubscriptionRebillService.name);
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentProcessingService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Main scheduled job - runs every hour to process due rebills
   * Uses locking to prevent concurrent execution
   */
  @Cron(CronExpression.EVERY_HOUR)
  async processScheduledRebills(): Promise<void> {
    if (this.isProcessing) {
      this.logger.warn('Rebill job already running, skipping this cycle');
      return;
    }

    this.isProcessing = true;
    const startTime = Date.now();

    try {
      this.logger.log('Starting subscription rebill processing...');

      // Process new rebills (subscriptions due for billing)
      const newResults = await this.processNewRebills();

      // Process retry rebills (failed payments due for retry)
      const retryResults = await this.processRetryRebills();

      const duration = Date.now() - startTime;
      this.logger.log(
        `Rebill processing complete: ${newResults.length} new, ${retryResults.length} retries in ${duration}ms`,
      );

      // Emit summary event
      this.eventEmitter.emit('subscription.rebill.batch_complete', {
        newProcessed: newResults.length,
        retriesProcessed: retryResults.length,
        successCount: [...newResults, ...retryResults].filter((r) => r.success).length,
        failureCount: [...newResults, ...retryResults].filter((r) => !r.success).length,
        durationMs: duration,
      });
    } catch (error) {
      this.logger.error('Rebill job failed:', error);
      this.eventEmitter.emit('subscription.rebill.batch_error', { error: (error as Error).message });
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process subscriptions that are due for billing and haven't been processed yet
   */
  private async processNewRebills(): Promise<RebillResult[]> {
    const now = new Date();
    const results: RebillResult[] = [];

    // Find active subscriptions due for billing with stored payment methods
    const dueSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        deletedAt: null,
        nextBillingDate: { lte: now },
        paymentVaultId: { not: null },
        paymentProviderId: { not: null },
        // Exclude subscriptions that already have a pending rebill for this period
        NOT: {
          rebillAttempts: {
            some: {
              status: { in: [RebillStatus.PENDING, RebillStatus.PROCESSING] },
            },
          },
        },
      },
      include: {
        paymentVault: true,
        paymentProvider: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      take: 100, // Process in batches of 100
    });

    this.logger.log(`Found ${dueSubscriptions.length} subscriptions due for billing`);

    for (const subscription of dueSubscriptions) {
      // Skip redirect-based providers (PayPal REST handles its own recurring billing)
      const providerType = subscription.paymentProvider?.type as PaymentProviderType;
      if (!providerType || !TOKEN_BASED_PROVIDERS.includes(providerType)) {
        this.logger.debug(
          `Skipping subscription ${subscription.id} - provider ${providerType} is not token-based`,
        );
        continue;
      }

      // Validate payment vault has required data
      if (!subscription.paymentVault?.gatewayPaymentId) {
        this.logger.warn(
          `Subscription ${subscription.id} has no gateway payment ID, skipping`,
        );
        continue;
      }

      try {
        const result = await this.processRebill(subscription);
        results.push(result);
      } catch (error) {
        this.logger.error(`Error processing subscription ${subscription.id}:`, error);
        results.push({
          subscriptionId: subscription.id,
          rebillId: '',
          success: false,
          errorMessage: (error as Error).message,
        });
      }
    }

    return results;
  }

  /**
   * Process failed rebills that are due for retry
   */
  private async processRetryRebills(): Promise<RebillResult[]> {
    const now = new Date();
    const results: RebillResult[] = [];

    // Find failed rebills that are due for retry
    const retryRebills = await this.prisma.subscriptionRebill.findMany({
      where: {
        status: RebillStatus.FAILED,
        retriesRemaining: { gt: 0 },
        nextRetryAt: { lte: now },
      },
      include: {
        subscription: {
          include: {
            paymentVault: true,
            paymentProvider: true,
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            company: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      take: 50, // Process retries in smaller batches
    });

    this.logger.log(`Found ${retryRebills.length} rebills due for retry`);

    for (const rebill of retryRebills) {
      if (rebill.subscription.status !== SubscriptionStatus.ACTIVE) {
        // Subscription was canceled/paused, mark rebill as skipped
        await this.prisma.subscriptionRebill.update({
          where: { id: rebill.id },
          data: {
            status: RebillStatus.SKIPPED,
            processedAt: now,
          },
        });
        continue;
      }

      try {
        const result = await this.retryRebill(rebill);
        results.push(result);
      } catch (error) {
        this.logger.error(`Error retrying rebill ${rebill.id}:`, error);
        results.push({
          subscriptionId: rebill.subscriptionId,
          rebillId: rebill.id,
          success: false,
          errorMessage: (error as Error).message,
        });
      }
    }

    return results;
  }

  /**
   * Process a single subscription rebill
   */
  private async processRebill(subscription: any): Promise<RebillResult> {
    const now = new Date();

    // Calculate billing period
    const billingPeriodStart = subscription.currentPeriodEnd;
    const billingPeriodEnd = this.calculateNextPeriodEnd(
      billingPeriodStart,
      subscription.interval as BillingInterval,
    );

    // Create rebill record
    const rebill = await this.prisma.subscriptionRebill.create({
      data: {
        subscriptionId: subscription.id,
        billingPeriodStart,
        billingPeriodEnd,
        amount: subscription.planAmount,
        currency: subscription.currency,
        status: RebillStatus.PROCESSING,
        scheduledAt: subscription.nextBillingDate,
        retriesRemaining: DUNNING_CONFIG.maxRetries,
      },
    });

    try {
      // Build transaction request
      const transactionRequest: TransactionRequest = {
        referenceId: `SUB-${subscription.id}-${rebill.id}`,
        customerId: subscription.customerId,
        type: TransactionType.SALE,
        amount: Number(subscription.planAmount) * 100, // Convert to cents
        currency: subscription.currency,
        token: subscription.paymentVault.gatewayPaymentId,
        isRecurring: true,
        recurringType: 'subsequent',
        description: `Subscription: ${subscription.planName}`,
        metadata: {
          subscriptionId: subscription.id,
          rebillId: rebill.id,
          billingPeriodStart: billingPeriodStart.toISOString(),
          billingPeriodEnd: billingPeriodEnd.toISOString(),
        },
      };

      // Process payment
      const paymentResult = await this.paymentService.sale(transactionRequest, {
        companyId: subscription.companyId,
        providerId: subscription.paymentProviderId,
      });

      if (paymentResult.success) {
        // Payment succeeded - update rebill and subscription
        await this.handleSuccessfulRebill(
          subscription,
          rebill,
          paymentResult.transactionId,
          billingPeriodStart,
          billingPeriodEnd,
        );

        this.eventEmitter.emit('subscription.rebill.success', {
          subscriptionId: subscription.id,
          rebillId: rebill.id,
          transactionId: paymentResult.transactionId,
          amount: subscription.planAmount,
          customerId: subscription.customerId,
        });

        return {
          subscriptionId: subscription.id,
          rebillId: rebill.id,
          success: true,
          transactionId: paymentResult.transactionId,
        };
      } else {
        // Payment failed - schedule retry
        await this.handleFailedRebill(
          rebill,
          paymentResult.errorCode || 'UNKNOWN',
          paymentResult.errorMessage || 'Payment declined',
          paymentResult.rawResponse,
          1, // First attempt
        );

        this.eventEmitter.emit('subscription.rebill.failed', {
          subscriptionId: subscription.id,
          rebillId: rebill.id,
          errorCode: paymentResult.errorCode,
          errorMessage: paymentResult.errorMessage,
          attemptNumber: 1,
          retriesRemaining: DUNNING_CONFIG.maxRetries - 1,
        });

        return {
          subscriptionId: subscription.id,
          rebillId: rebill.id,
          success: false,
          errorCode: paymentResult.errorCode,
          errorMessage: paymentResult.errorMessage,
        };
      }
    } catch (error) {
      // Unexpected error - mark as failed and schedule retry
      await this.handleFailedRebill(
        rebill,
        'SYSTEM_ERROR',
        (error as Error).message,
        null,
        1,
      );

      throw error;
    }
  }

  /**
   * Retry a previously failed rebill
   */
  private async retryRebill(rebill: any): Promise<RebillResult> {
    const subscription = rebill.subscription;
    const attemptNumber = rebill.attemptNumber + 1;

    // Update rebill status to processing
    await this.prisma.subscriptionRebill.update({
      where: { id: rebill.id },
      data: {
        status: RebillStatus.PROCESSING,
        attemptNumber,
      },
    });

    try {
      // Build transaction request
      const transactionRequest: TransactionRequest = {
        referenceId: `SUB-${subscription.id}-${rebill.id}-R${attemptNumber}`,
        customerId: subscription.customerId,
        type: TransactionType.SALE,
        amount: Number(rebill.amount) * 100, // Convert to cents
        currency: rebill.currency,
        token: subscription.paymentVault.gatewayPaymentId,
        isRecurring: true,
        recurringType: 'subsequent',
        description: `Subscription: ${subscription.planName} (Retry ${attemptNumber})`,
        metadata: {
          subscriptionId: subscription.id,
          rebillId: rebill.id,
          attemptNumber: String(attemptNumber),
          billingPeriodStart: rebill.billingPeriodStart.toISOString(),
          billingPeriodEnd: rebill.billingPeriodEnd.toISOString(),
        },
      };

      // Process payment
      const paymentResult = await this.paymentService.sale(transactionRequest, {
        companyId: subscription.companyId,
        providerId: subscription.paymentProviderId,
      });

      if (paymentResult.success) {
        // Payment succeeded
        await this.handleSuccessfulRebill(
          subscription,
          rebill,
          paymentResult.transactionId,
          rebill.billingPeriodStart,
          rebill.billingPeriodEnd,
        );

        this.eventEmitter.emit('subscription.rebill.success', {
          subscriptionId: subscription.id,
          rebillId: rebill.id,
          transactionId: paymentResult.transactionId,
          amount: rebill.amount,
          customerId: subscription.customerId,
          attemptNumber,
        });

        return {
          subscriptionId: subscription.id,
          rebillId: rebill.id,
          success: true,
          transactionId: paymentResult.transactionId,
        };
      } else {
        // Payment failed again
        await this.handleFailedRebill(
          rebill,
          paymentResult.errorCode || 'UNKNOWN',
          paymentResult.errorMessage || 'Payment declined',
          paymentResult.rawResponse,
          attemptNumber,
        );

        this.eventEmitter.emit('subscription.rebill.failed', {
          subscriptionId: subscription.id,
          rebillId: rebill.id,
          errorCode: paymentResult.errorCode,
          errorMessage: paymentResult.errorMessage,
          attemptNumber,
          retriesRemaining: rebill.retriesRemaining - 1,
        });

        return {
          subscriptionId: subscription.id,
          rebillId: rebill.id,
          success: false,
          errorCode: paymentResult.errorCode,
          errorMessage: paymentResult.errorMessage,
        };
      }
    } catch (error) {
      await this.handleFailedRebill(
        rebill,
        'SYSTEM_ERROR',
        (error as Error).message,
        null,
        attemptNumber,
      );

      throw error;
    }
  }

  /**
   * Handle successful rebill - update subscription and create transaction record
   */
  private async handleSuccessfulRebill(
    subscription: any,
    rebill: any,
    transactionId: string,
    billingPeriodStart: Date,
    billingPeriodEnd: Date,
  ): Promise<void> {
    const now = new Date();

    await this.prisma.$transaction([
      // Update rebill status
      this.prisma.subscriptionRebill.update({
        where: { id: rebill.id },
        data: {
          status: RebillStatus.SUCCESS,
          transactionId,
          processedAt: now,
          retriesRemaining: 0,
          nextRetryAt: null,
        },
      }),

      // Update subscription billing dates
      this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          currentPeriodStart: billingPeriodStart,
          currentPeriodEnd: billingPeriodEnd,
          nextBillingDate: billingPeriodEnd,
          updatedAt: now,
        },
      }),
    ]);

    this.logger.log(
      `Subscription ${subscription.id} rebill succeeded. Next billing: ${billingPeriodEnd.toISOString()}`,
    );
  }

  /**
   * Handle failed rebill - schedule retry or mark as exhausted
   */
  private async handleFailedRebill(
    rebill: any,
    errorCode: string,
    errorMessage: string,
    providerResponse: any,
    attemptNumber: number,
  ): Promise<void> {
    const now = new Date();
    const retriesRemaining = rebill.retriesRemaining - 1;

    if (retriesRemaining > 0) {
      // Schedule retry
      const retryIndex = Math.min(attemptNumber - 1, DUNNING_CONFIG.retryIntervals.length - 1);
      const retryDelay = DUNNING_CONFIG.retryIntervals[retryIndex];
      const nextRetryAt = new Date(now.getTime() + retryDelay);

      await this.prisma.subscriptionRebill.update({
        where: { id: rebill.id },
        data: {
          status: RebillStatus.FAILED,
          failureCode: errorCode,
          failureReason: errorMessage,
          providerResponse: providerResponse || undefined,
          attemptNumber,
          retriesRemaining,
          nextRetryAt,
          processedAt: now,
        },
      });

      this.logger.warn(
        `Rebill ${rebill.id} failed (attempt ${attemptNumber}). ` +
        `Retries remaining: ${retriesRemaining}. Next retry: ${nextRetryAt.toISOString()}`,
      );
    } else {
      // All retries exhausted - mark subscription as past due
      await this.prisma.$transaction([
        this.prisma.subscriptionRebill.update({
          where: { id: rebill.id },
          data: {
            status: RebillStatus.EXHAUSTED,
            failureCode: errorCode,
            failureReason: errorMessage,
            providerResponse: providerResponse || undefined,
            attemptNumber,
            retriesRemaining: 0,
            nextRetryAt: null,
            processedAt: now,
          },
        }),

        // Update subscription to past_due status
        this.prisma.subscription.update({
          where: { id: rebill.subscriptionId },
          data: {
            status: 'PAST_DUE' as any, // Will need to add this status
            metadata: {
              ...(rebill.subscription?.metadata || {}),
              lastFailureReason: errorMessage,
              lastFailureCode: errorCode,
              failedAt: now.toISOString(),
            },
            updatedAt: now,
          },
        }),
      ]);

      this.logger.error(
        `Rebill ${rebill.id} exhausted all retries. Subscription ${rebill.subscriptionId} marked as past_due.`,
      );

      // Emit exhausted event for notification/escalation
      this.eventEmitter.emit('subscription.rebill.exhausted', {
        subscriptionId: rebill.subscriptionId,
        rebillId: rebill.id,
        errorCode,
        errorMessage,
        totalAttempts: attemptNumber,
      });
    }
  }

  /**
   * Calculate the next billing period end date
   */
  private calculateNextPeriodEnd(start: Date, interval: BillingInterval): Date {
    const end = new Date(start);

    switch (interval) {
      case 'DAILY':
        end.setDate(end.getDate() + 1);
        break;
      case 'WEEKLY':
        end.setDate(end.getDate() + 7);
        break;
      case 'BIWEEKLY':
        end.setDate(end.getDate() + 14);
        break;
      case 'MONTHLY':
        end.setMonth(end.getMonth() + 1);
        break;
      case 'QUARTERLY':
        end.setMonth(end.getMonth() + 3);
        break;
      case 'YEARLY':
        end.setFullYear(end.getFullYear() + 1);
        break;
      default:
        end.setMonth(end.getMonth() + 1);
    }

    return end;
  }

  /**
   * Manually trigger rebill for a specific subscription (admin use)
   */
  async triggerManualRebill(subscriptionId: string): Promise<RebillResult> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        paymentVault: true,
        paymentProvider: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    if (!subscription.paymentVaultId || !subscription.paymentProviderId) {
      throw new Error(`Subscription ${subscriptionId} has no stored payment method`);
    }

    return this.processRebill(subscription);
  }

  /**
   * Get rebill history for a subscription
   */
  async getRebillHistory(
    subscriptionId: string,
    limit: number = 10,
  ): Promise<any[]> {
    return this.prisma.subscriptionRebill.findMany({
      where: { subscriptionId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        transaction: {
          select: {
            id: true,
            transactionNumber: true,
            status: true,
            amount: true,
          },
        },
      },
    });
  }

  /**
   * Get rebill statistics for a company
   */
  async getRebillStats(companyId: string, days: number = 30): Promise<{
    totalAttempts: number;
    successfulRebills: number;
    failedRebills: number;
    exhaustedRebills: number;
    successRate: number;
    totalRevenue: number;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await this.prisma.subscriptionRebill.groupBy({
      by: ['status'],
      where: {
        subscription: { companyId },
        createdAt: { gte: startDate },
      },
      _count: { _all: true },
      _sum: { amount: true },
    });

    const statusMap = stats.reduce(
      (acc, item) => {
        acc[item.status] = {
          count: item._count._all,
          amount: Number(item._sum.amount || 0),
        };
        return acc;
      },
      {} as Record<string, { count: number; amount: number }>,
    );

    const successful = statusMap[RebillStatus.SUCCESS]?.count || 0;
    const failed = statusMap[RebillStatus.FAILED]?.count || 0;
    const exhausted = statusMap[RebillStatus.EXHAUSTED]?.count || 0;
    const totalAttempts = successful + failed + exhausted;

    return {
      totalAttempts,
      successfulRebills: successful,
      failedRebills: failed,
      exhaustedRebills: exhausted,
      successRate: totalAttempts > 0 ? (successful / totalAttempts) * 100 : 0,
      totalRevenue: statusMap[RebillStatus.SUCCESS]?.amount || 0,
    };
  }
}
