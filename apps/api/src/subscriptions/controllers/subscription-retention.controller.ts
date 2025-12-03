/**
 * Subscription Retention Controller
 *
 * Endpoints for subscription retention:
 * - Cancellation flow with offers
 * - Win-back campaigns
 * - Retention statistics
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
  SubscriptionRetentionService,
  CancellationReason,
  RetentionOfferType,
  InitiateCancellationResult,
  RetentionOffer,
  WinBackCampaign,
  CancellationFlowConfig,
  RetentionStats,
} from '../services/subscription-retention.service';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsArray,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

// ═══════════════════════════════════════════════════════════════════════════════
// DTOs
// ═══════════════════════════════════════════════════════════════════════════════

class InitiateCancellationDto {
  @IsString()
  subscriptionId: string;

  @IsOptional()
  @IsEnum(CancellationReason)
  reason?: CancellationReason;

  @IsOptional()
  @IsString()
  feedback?: string;
}

class AcceptOfferDto {
  @IsString()
  offerId: string;

  @IsString()
  subscriptionId: string;
}

class DeclineOfferDto {
  @IsString()
  offerId: string;
}

class CreateWinBackCampaignDto {
  @IsOptional()
  @IsString()
  companyId?: string;

  @IsString()
  name: string;

  @IsArray()
  @IsEnum(CancellationReason, { each: true })
  targetReasons: CancellationReason[];

  @Type(() => Number)
  @IsInt()
  @Min(1)
  minDaysSinceCancellation: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxDaysSinceCancellation: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetPlanIds?: string[];

  @IsEnum(RetentionOfferType)
  offerType: RetentionOfferType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  discountPct?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  freePeriods?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  offerValidDays: number;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;
}

class ConfigureCancellationFlowDto {
  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsBoolean()
  showReasonSelector?: boolean;

  @IsOptional()
  @IsBoolean()
  showRetentionOffers?: boolean;

  @IsOptional()
  @IsBoolean()
  showPauseOption?: boolean;

  @IsOptional()
  @IsBoolean()
  showDownsellOption?: boolean;

  @IsOptional()
  @IsBoolean()
  showDiscountOption?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pauseMaxDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  discountPct?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  discountDurationCycles?: number;
}

class SendWinBackOfferDto {
  @IsString()
  subscriptionId: string;
}

@Controller('subscriptions/retention')
@UseGuards(AuthGuard('jwt'))
export class SubscriptionRetentionController {
  private readonly logger = new Logger(SubscriptionRetentionController.name);

  constructor(
    private readonly retentionService: SubscriptionRetentionService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════════
  // CANCELLATION FLOW
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Initiate cancellation flow - returns retention offers
   */
  @Post('initiate-cancellation')
  async initiateCancellation(
    @Body() dto: InitiateCancellationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<InitiateCancellationResult> {
    return this.retentionService.initiateCancellation({
      subscriptionId: dto.subscriptionId,
      reason: dto.reason,
      feedback: dto.feedback,
    });
  }

  /**
   * Accept a retention offer
   */
  @Post('offers/accept')
  async acceptOffer(
    @Body() dto: AcceptOfferDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.retentionService.acceptOffer({
      offerId: dto.offerId,
      subscriptionId: dto.subscriptionId,
    });
  }

  /**
   * Decline a retention offer
   */
  @Post('offers/decline')
  async declineOffer(
    @Body() dto: DeclineOfferDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    await this.retentionService.declineOffer(dto.offerId);
    return { success: true };
  }

  /**
   * Get pending offers for a subscription
   */
  @Get('offers/:subscriptionId')
  async getPendingOffers(
    @Param('subscriptionId') subscriptionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RetentionOffer[]> {
    return this.retentionService.getPendingOffers(subscriptionId);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // WIN-BACK CAMPAIGNS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Create a win-back campaign
   */
  @Post('winback/campaigns')
  async createWinBackCampaign(
    @Body() dto: CreateWinBackCampaignDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WinBackCampaign> {
    const companyId = await this.getCompanyIdForQuery(user, dto.companyId);

    return this.retentionService.createWinBackCampaign({
      companyId,
      name: dto.name,
      targetReasons: dto.targetReasons,
      minDaysSinceCancellation: dto.minDaysSinceCancellation,
      maxDaysSinceCancellation: dto.maxDaysSinceCancellation,
      targetPlanIds: dto.targetPlanIds,
      offerType: dto.offerType,
      discountPct: dto.discountPct,
      freePeriods: dto.freePeriods,
      offerValidDays: dto.offerValidDays,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
    });
  }

  /**
   * Get win-back campaigns
   */
  @Get('winback/campaigns')
  async getWinBackCampaigns(
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WinBackCampaign[]> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    return this.retentionService.getWinBackCampaigns(companyId);
  }

  /**
   * Activate a win-back campaign
   */
  @Post('winback/campaigns/:id/activate')
  async activateWinBackCampaign(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WinBackCampaign> {
    return this.retentionService.activateWinBackCampaign(id);
  }

  /**
   * Send win-back offer to a subscription
   */
  @Post('winback/campaigns/:id/send')
  async sendWinBackOffer(
    @Param('id') campaignId: string,
    @Body() dto: SendWinBackOfferDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RetentionOffer> {
    return this.retentionService.sendWinBackOffer(campaignId, dto.subscriptionId);
  }

  /**
   * Accept a win-back offer
   */
  @Post('winback/offers/:offerId/accept')
  async acceptWinBackOffer(
    @Param('offerId') offerId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.retentionService.acceptWinBackOffer(offerId);
  }

  /**
   * Find eligible subscriptions for a campaign
   */
  @Get('winback/campaigns/:id/eligible')
  async getEligibleSubscriptions(
    @Param('id') campaignId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const campaigns = await this.retentionService.getWinBackCampaigns(
      user.companyId || '',
    );
    const campaign = campaigns.find((c) => c.id === campaignId);

    if (!campaign) {
      return { eligible: [] };
    }

    const eligible = await this.retentionService.findWinBackEligible(campaign);
    return {
      eligible: eligible.map((sub) => ({
        id: sub.id,
        customerId: sub.customerId,
        planId: sub.subscriptionPlanId,
        canceledAt: sub.canceledAt,
      })),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // CANCELLATION FLOW CONFIG
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get cancellation flow configuration
   */
  @Get('config')
  async getCancellationFlowConfig(
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CancellationFlowConfig> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    return this.retentionService.getCancellationFlowConfig(companyId);
  }

  /**
   * Configure cancellation flow
   */
  @Patch('config')
  async configureCancellationFlow(
    @Body() dto: ConfigureCancellationFlowDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CancellationFlowConfig> {
    const companyId = await this.getCompanyIdForQuery(user, dto.companyId);

    return this.retentionService.configureCancellationFlow(companyId, {
      showReasonSelector: dto.showReasonSelector,
      showRetentionOffers: dto.showRetentionOffers,
      showPauseOption: dto.showPauseOption,
      showDownsellOption: dto.showDownsellOption,
      showDiscountOption: dto.showDiscountOption,
      pauseMaxDays: dto.pauseMaxDays,
      discountPct: dto.discountPct,
      discountDurationCycles: dto.discountDurationCycles,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // STATISTICS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get retention statistics
   */
  @Get('stats')
  async getRetentionStats(
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RetentionStats> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    return this.retentionService.getRetentionStats(companyId);
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
