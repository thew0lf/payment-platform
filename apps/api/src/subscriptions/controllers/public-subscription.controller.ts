import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions.service';

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC SUBSCRIPTION DTOs
// ═══════════════════════════════════════════════════════════════════════════════

class LookupSubscriptionsDto {
  email!: string;
}

class CustomerActionDto {
  email!: string;
  subscriptionId!: string;
}

class PauseSubscriptionDto extends CustomerActionDto {
  reason?: string;
  resumeDate?: string;
}

class CancelSubscriptionDto extends CustomerActionDto {
  reason?: string;
  feedback?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC SUBSCRIPTION INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface PublicSubscription {
  id: string;
  status: string;
  planName: string;
  planDisplayName?: string;
  productName?: string;
  productImageUrl?: string;
  amount: number;
  currency: string;
  interval: string;
  nextBillingDate: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  canceledAt: string | null;
  pausedUntil: string | null;
  createdAt: string;
  canPause: boolean;
  canCancel: boolean;
  canResume: boolean;
}

/**
 * Public Subscription Controller
 * Allows customers to view and manage their subscriptions without authentication
 * Uses email verification for access control
 */
@Controller('subscriptions/public')
export class PublicSubscriptionController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  /**
   * Get all subscriptions for a customer by email
   * POST /api/subscriptions/public/my-subscriptions
   */
  @Post('my-subscriptions')
  async getMySubscriptions(
    @Body() dto: LookupSubscriptionsDto,
  ): Promise<{ subscriptions: PublicSubscription[]; total: number }> {
    if (!dto.email) {
      throw new BadRequestException('Email is required');
    }

    // Find customer by email
    const customer = await this.prisma.customer.findFirst({
      where: {
        email: dto.email.toLowerCase().trim(),
        deletedAt: null,
      },
    });

    if (!customer) {
      // Return empty for security (don't reveal if email exists)
      return { subscriptions: [], total: 0 };
    }

    // Get subscriptions for this customer
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        customerId: customer.id,
        deletedAt: null,
      },
      include: {
        subscriptionPlan: true,
        items: {
          where: { isActive: true },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true, // JSON array of image URLs
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const publicSubscriptions = subscriptions.map((sub) => this.toPublicSubscription(sub));

    return {
      subscriptions: publicSubscriptions,
      total: publicSubscriptions.length,
    };
  }

  /**
   * Get a single subscription by ID (with email verification)
   * POST /api/subscriptions/public/lookup
   */
  @Post('lookup')
  async lookupSubscription(
    @Body() dto: CustomerActionDto,
  ): Promise<PublicSubscription> {
    if (!dto.email || !dto.subscriptionId) {
      throw new BadRequestException('Email and subscriptionId are required');
    }

    const subscription = await this.verifyOwnership(dto.email, dto.subscriptionId);
    return this.toPublicSubscription(subscription);
  }

  /**
   * Pause a subscription (customer self-service)
   * POST /api/subscriptions/public/pause
   */
  @Post('pause')
  async pauseSubscription(
    @Body() dto: PauseSubscriptionDto,
  ): Promise<PublicSubscription> {
    const subscription = await this.verifyOwnership(dto.email, dto.subscriptionId);

    // Check if subscription can be paused
    if (!this.canPause(subscription)) {
      throw new BadRequestException('This subscription cannot be paused');
    }

    // Check plan allows pausing
    if (!subscription.subscriptionPlan?.pauseEnabled) {
      throw new BadRequestException('This subscription plan does not allow pausing');
    }

    // Calculate pause end date
    let pauseResumeAt: Date | null = null;
    if (dto.resumeDate) {
      pauseResumeAt = new Date(dto.resumeDate);
    } else if (subscription.subscriptionPlan?.pauseMaxDuration) {
      pauseResumeAt = new Date();
      pauseResumeAt.setDate(pauseResumeAt.getDate() + subscription.subscriptionPlan.pauseMaxDuration);
    }

    const updated = await this.prisma.subscription.update({
      where: { id: dto.subscriptionId },
      data: {
        status: 'PAUSED',
        pausedAt: new Date(),
        pauseResumeAt,
        pauseReason: dto.reason,
      },
      include: {
        subscriptionPlan: true,
        items: {
          where: { isActive: true },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
              },
            },
          },
        },
      },
    });

    return this.toPublicSubscription(updated);
  }

  /**
   * Resume a paused subscription (customer self-service)
   * POST /api/subscriptions/public/resume
   */
  @Post('resume')
  async resumeSubscription(
    @Body() dto: CustomerActionDto,
  ): Promise<PublicSubscription> {
    const subscription = await this.verifyOwnership(dto.email, dto.subscriptionId);

    if (subscription.status !== 'PAUSED') {
      throw new BadRequestException('This subscription is not paused');
    }

    const updated = await this.prisma.subscription.update({
      where: { id: dto.subscriptionId },
      data: {
        status: 'ACTIVE',
        pausedAt: null,
        pauseResumeAt: null,
        pauseReason: null,
      },
      include: {
        subscriptionPlan: true,
        items: {
          where: { isActive: true },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
              },
            },
          },
        },
      },
    });

    return this.toPublicSubscription(updated);
  }

  /**
   * Cancel a subscription (customer self-service)
   * POST /api/subscriptions/public/cancel
   */
  @Post('cancel')
  async cancelSubscription(
    @Body() dto: CancelSubscriptionDto,
  ): Promise<PublicSubscription> {
    const subscription = await this.verifyOwnership(dto.email, dto.subscriptionId);

    if (!this.canCancel(subscription)) {
      throw new BadRequestException('This subscription cannot be canceled');
    }

    const updated = await this.prisma.subscription.update({
      where: { id: dto.subscriptionId },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
        cancelReason: dto.reason ? `${dto.reason}${dto.feedback ? ` - ${dto.feedback}` : ''}` : dto.feedback,
      },
      include: {
        subscriptionPlan: true,
        items: {
          where: { isActive: true },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
              },
            },
          },
        },
      },
    });

    return this.toPublicSubscription(updated);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════════

  private async verifyOwnership(email: string, subscriptionId: string): Promise<any> {
    const customer = await this.prisma.customer.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        deletedAt: null,
      },
    });

    if (!customer) {
      throw new NotFoundException('Subscription not found');
    }

    const subscription = await this.prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        customerId: customer.id,
        deletedAt: null,
      },
      include: {
        subscriptionPlan: true,
        items: {
          where: { isActive: true },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
              },
            },
          },
        },
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return subscription;
  }

  private canPause(subscription: any): boolean {
    return ['ACTIVE', 'TRIALING'].includes(subscription.status);
  }

  private canCancel(subscription: any): boolean {
    return ['ACTIVE', 'TRIALING', 'PAUSED', 'PAST_DUE'].includes(subscription.status);
  }

  private canResume(subscription: any): boolean {
    return subscription.status === 'PAUSED';
  }

  private toPublicSubscription(subscription: any): PublicSubscription {
    const plan = subscription.subscriptionPlan;
    // Get primary product from items (if any)
    const primaryItem = subscription.items?.[0];
    const primaryProduct = primaryItem?.product;

    // Parse images JSON array - it's stored as JSON array of URLs
    const imagesArray = primaryProduct?.images;
    const firstImageUrl = Array.isArray(imagesArray) ? imagesArray[0] : null;

    return {
      id: subscription.id,
      status: subscription.status,
      planName: plan?.name || subscription.planName || 'Unknown',
      planDisplayName: plan?.displayName,
      productName: primaryProduct?.name,
      productImageUrl: firstImageUrl,
      amount: Number(subscription.planAmount) || 0,
      currency: subscription.currency || 'USD',
      interval: subscription.interval || 'MONTHLY',
      nextBillingDate: subscription.nextBillingDate?.toISOString() || null,
      currentPeriodStart: subscription.currentPeriodStart?.toISOString() || subscription.createdAt.toISOString(),
      currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() || null,
      trialEndsAt: subscription.trialEnd?.toISOString() || null,
      canceledAt: subscription.canceledAt?.toISOString() || null,
      pausedUntil: subscription.pauseResumeAt?.toISOString() || null,
      createdAt: subscription.createdAt.toISOString(),
      canPause: this.canPause(subscription) && plan?.pauseEnabled,
      canCancel: this.canCancel(subscription),
      canResume: this.canResume(subscription),
    };
  }
}
