/**
 * Subscription Gifting Controller
 *
 * Endpoints for gift subscription management:
 * - Purchase gifts
 * - Redeem gifts
 * - Manage gift delivery
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Query,
  Param,
  Body,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  SubscriptionGiftingService,
  GiftSubscription,
  GiftDeliveryMethod,
  GiftStats,
} from '../services/subscription-gifting.service';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsEmail,
  IsInt,
  Min,
  Max,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ═══════════════════════════════════════════════════════════════════════════════
// DTOs
// ═══════════════════════════════════════════════════════════════════════════════

class PurchaseGiftDto {
  @IsOptional()
  @IsString()
  companyId?: string;

  @IsString()
  planId: string;

  @IsString()
  purchaserId: string;

  @IsEmail()
  purchaserEmail: string;

  @IsString()
  purchaserName: string;

  @IsEmail()
  recipientEmail: string;

  @IsString()
  recipientName: string;

  @IsOptional()
  @IsString()
  recipientPhone?: string;

  @IsOptional()
  @IsString()
  giftMessage?: string;

  @IsEnum(GiftDeliveryMethod)
  deliveryMethod: GiftDeliveryMethod;

  @IsOptional()
  @IsDateString()
  scheduledDeliveryDate?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  durationMonths: number;

  @IsOptional()
  @IsString()
  currency?: string;
}

class CreateCustomerDto {
  @IsEmail()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

class RedeemGiftDto {
  @IsString()
  giftCode: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateCustomerDto)
  createCustomer?: CreateCustomerDto;

  @IsOptional()
  @IsString()
  shippingAddressId?: string;
}

class LookupGiftDto {
  @IsString()
  giftCode: string;
}

class UpdateRecipientDto {
  @IsEmail()
  recipientEmail: string;

  @IsString()
  recipientName: string;
}

class ExtendExpirationDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  additionalDays: number;
}

class RefundGiftDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

@Controller('subscriptions/gifts')
@UseGuards(AuthGuard('jwt'))
export class SubscriptionGiftingController {
  private readonly logger = new Logger(SubscriptionGiftingController.name);

  constructor(
    private readonly giftingService: SubscriptionGiftingService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════════
  // GIFT PURCHASE
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Purchase a gift subscription
   */
  @Post()
  async purchaseGift(
    @Body() dto: PurchaseGiftDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<GiftSubscription> {
    const companyId = await this.getCompanyIdForQuery(user, dto.companyId);

    return this.giftingService.purchaseGift({
      companyId,
      planId: dto.planId,
      purchaserId: dto.purchaserId,
      purchaserEmail: dto.purchaserEmail,
      purchaserName: dto.purchaserName,
      recipientEmail: dto.recipientEmail,
      recipientName: dto.recipientName,
      recipientPhone: dto.recipientPhone,
      giftMessage: dto.giftMessage,
      deliveryMethod: dto.deliveryMethod,
      scheduledDeliveryDate: dto.scheduledDeliveryDate
        ? new Date(dto.scheduledDeliveryDate)
        : undefined,
      durationMonths: dto.durationMonths,
      currency: dto.currency,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // GIFT REDEMPTION
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Look up a gift by code (public - no auth required for preview)
   */
  @Post('lookup')
  async lookupGift(@Body() dto: LookupGiftDto) {
    const result = await this.giftingService.lookupGift(dto.giftCode);

    if (!result) {
      return { found: false };
    }

    return {
      found: true,
      gift: {
        id: result.gift.id,
        status: result.gift.status,
        recipientName: result.gift.recipientName,
        purchaserName: result.gift.purchaserName,
        giftMessage: result.gift.giftMessage,
        durationMonths: result.gift.durationMonths,
        expiresAt: result.gift.expiresAt,
      },
      plan: {
        id: result.plan.id,
        name: result.plan.name,
        description: result.plan.description,
      },
    };
  }

  /**
   * Redeem a gift subscription
   */
  @Post('redeem')
  async redeemGift(
    @Body() dto: RedeemGiftDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.giftingService.redeemGift({
      giftCode: dto.giftCode,
      customerId: dto.customerId,
      createCustomer: dto.createCustomer,
      shippingAddressId: dto.shippingAddressId,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // GIFT MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get a gift by ID
   */
  @Get(':id')
  async getGift(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<GiftSubscription | null> {
    return this.giftingService.getGift(id);
  }

  /**
   * Resend gift notification
   */
  @Post(':id/resend')
  async resendGift(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<GiftSubscription> {
    return this.giftingService.resendGift(id);
  }

  /**
   * Update recipient info
   */
  @Patch(':id/recipient')
  async updateRecipient(
    @Param('id') id: string,
    @Body() dto: UpdateRecipientDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<GiftSubscription> {
    return this.giftingService.updateRecipient(
      id,
      dto.recipientEmail,
      dto.recipientName,
    );
  }

  /**
   * Extend gift expiration
   */
  @Post(':id/extend')
  async extendExpiration(
    @Param('id') id: string,
    @Body() dto: ExtendExpirationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<GiftSubscription> {
    return this.giftingService.extendExpiration(id, dto.additionalDays);
  }

  /**
   * Refund a gift
   */
  @Post(':id/refund')
  async refundGift(
    @Param('id') id: string,
    @Body() dto: RefundGiftDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<GiftSubscription> {
    return this.giftingService.refundGift(id, dto.reason);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get gifts purchased by a customer
   */
  @Get('purchased/:purchaserId')
  async getGiftsPurchasedBy(
    @Param('purchaserId') purchaserId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<GiftSubscription[]> {
    return this.giftingService.getGiftsPurchasedBy(purchaserId);
  }

  /**
   * Get gifts for a recipient
   */
  @Get('recipient/:email')
  async getGiftsForRecipient(
    @Param('email') email: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<GiftSubscription[]> {
    return this.giftingService.getGiftsForRecipient(email);
  }

  /**
   * Get pending gifts
   */
  @Get('pending')
  async getPendingGifts(
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<GiftSubscription[]> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    return this.giftingService.getPendingGifts(companyId);
  }

  /**
   * Get expiring gifts
   */
  @Get('expiring')
  async getExpiringGifts(
    @Query('companyId') queryCompanyId: string,
    @Query('daysUntilExpiry') daysUntilExpiry: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<GiftSubscription[]> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    return this.giftingService.getExpiringGifts(
      companyId,
      daysUntilExpiry ? parseInt(daysUntilExpiry, 10) : 7,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // STATISTICS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get gift statistics
   */
  @Get('stats')
  async getGiftStats(
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<GiftStats> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    return this.giftingService.getGiftStats(companyId);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SCHEDULED TASKS (Admin only)
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Process scheduled deliveries (cron job endpoint)
   */
  @Post('tasks/process-scheduled')
  async processScheduledDeliveries(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ processed: number }> {
    const processed = await this.giftingService.processScheduledDeliveries();
    return { processed };
  }

  /**
   * Expire old gifts (cron job endpoint)
   */
  @Post('tasks/expire-old')
  async expireOldGifts(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ expired: number }> {
    const expired = await this.giftingService.expireOldGifts();
    return { expired };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════════

  private async getCompanyIdForQuery(
    user: AuthenticatedUser,
    queryCompanyId?: string,
  ): Promise<string> {
    if (user.companyId) {
      return user.companyId;
    }

    if (!queryCompanyId) {
      throw new Error('companyId is required for organization/client users');
    }

    return queryCompanyId;
  }
}
