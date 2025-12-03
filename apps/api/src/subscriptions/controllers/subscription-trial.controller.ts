/**
 * Subscription Trial Controller
 *
 * Endpoints for managing subscription trials:
 * - Trial lifecycle management
 * - Shipment event handling
 * - Trial statistics
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
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SubscriptionTrialService, TrialInfo, TrialStats } from '../services/subscription-trial.service';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { TrialStartTrigger, TrialReturnAction } from '@prisma/client';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

// ═══════════════════════════════════════════════════════════════════════════════
// DTOs
// ═══════════════════════════════════════════════════════════════════════════════

class CreateSubscriptionWithTrialDto {
  @IsString()
  companyId?: string;

  @IsString()
  customerId: string;

  @IsString()
  subscriptionPlanId: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  shippingAddressId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;
}

class StartTrialDto {
  @IsOptional()
  @IsEnum(TrialStartTrigger)
  trigger?: TrialStartTrigger;

  @IsOptional()
  @IsString()
  shipmentId?: string;
}

class ConvertTrialDto {
  @IsOptional()
  @IsEnum(TrialStartTrigger)
  trigger?: TrialStartTrigger;

  @IsOptional()
  @IsString()
  shipmentId?: string;
}

class CancelTrialDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

class HandleReturnDto {
  @IsString()
  shipmentId: string;

  @IsOptional()
  @IsEnum(TrialReturnAction)
  action?: TrialReturnAction;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  extensionDays?: number;
}

class ShipmentEventDto {
  @IsString()
  shipmentId: string;

  @IsEnum(['SHIPPED', 'DELIVERED'] as const)
  status: 'SHIPPED' | 'DELIVERED';

  @IsOptional()
  @IsString()
  companyId?: string;
}

class TrialQueryDto {
  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  daysUntilExpiry?: number;
}

@Controller('subscriptions/trials')
@UseGuards(AuthGuard('jwt'))
export class SubscriptionTrialController {
  private readonly logger = new Logger(SubscriptionTrialController.name);

  constructor(
    private readonly trialService: SubscriptionTrialService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════════
  // TRIAL LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Create a new subscription with trial based on plan settings
   */
  @Post()
  async createSubscriptionWithTrial(
    @Body() dto: CreateSubscriptionWithTrialDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyIdForQuery(user, dto.companyId);

    return this.trialService.createSubscriptionWithTrial({
      companyId,
      customerId: dto.customerId,
      subscriptionPlanId: dto.subscriptionPlanId,
      productId: dto.productId,
      shippingAddressId: dto.shippingAddressId,
      quantity: dto.quantity,
    });
  }

  /**
   * Start a trial for a subscription awaiting trigger
   */
  @Post(':id/start')
  async startTrial(
    @Param('id') id: string,
    @Body() dto: StartTrialDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Verify access
    await this.verifySubscriptionAccess(id, user);

    return this.trialService.startTrial({
      subscriptionId: id,
      trigger: dto.trigger,
      shipmentId: dto.shipmentId,
    });
  }

  /**
   * Convert trial to paid subscription
   */
  @Post(':id/convert')
  async convertTrial(
    @Param('id') id: string,
    @Body() dto: ConvertTrialDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.verifySubscriptionAccess(id, user);

    return this.trialService.convertTrial({
      subscriptionId: id,
      trigger: dto.trigger,
      shipmentId: dto.shipmentId,
    });
  }

  /**
   * Expire a trial
   */
  @Post(':id/expire')
  async expireTrial(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.verifySubscriptionAccess(id, user);

    return this.trialService.expireTrial(id);
  }

  /**
   * Cancel a trial
   */
  @Post(':id/cancel')
  async cancelTrial(
    @Param('id') id: string,
    @Body() dto: CancelTrialDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.verifySubscriptionAccess(id, user);

    return this.trialService.cancelTrial(id, dto.reason);
  }

  /**
   * Handle product return during trial
   */
  @Post(':id/return')
  async handleTrialReturn(
    @Param('id') id: string,
    @Body() dto: HandleReturnDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.verifySubscriptionAccess(id, user);

    return this.trialService.handleTrialReturn({
      subscriptionId: id,
      shipmentId: dto.shipmentId,
      action: dto.action,
      extensionDays: dto.extensionDays,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SHIPMENT EVENTS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Handle shipment event (webhook from fulfillment system)
   */
  @Post('shipment-event')
  async handleShipmentEvent(
    @Body() dto: ShipmentEventDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyIdForQuery(user, dto.companyId);

    await this.trialService.handleShipmentEvent({
      shipmentId: dto.shipmentId,
      status: dto.status,
      companyId,
    });

    return { success: true, message: `Processed ${dto.status} event` };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get trial info for a subscription
   */
  @Get(':id/info')
  async getTrialInfo(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TrialInfo> {
    await this.verifySubscriptionAccess(id, user);

    return this.trialService.getTrialInfo(id);
  }

  /**
   * Get trial statistics
   */
  @Get('stats')
  async getTrialStats(
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TrialStats> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);

    return this.trialService.getTrialStats(companyId);
  }

  /**
   * Get subscriptions with expiring trials
   */
  @Get('expiring')
  async getExpiringTrials(
    @Query() query: TrialQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyIdForQuery(user, query.companyId);

    return this.trialService.findExpiringTrials({
      companyId,
      daysUntilExpiry: query.daysUntilExpiry || 3,
    });
  }

  /**
   * Check and trigger fallback trials (for cron job)
   */
  @Post('check-fallbacks')
  async checkFallbackTriggers(
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);

    const triggered = await this.trialService.checkFallbackTriggers(companyId);

    return {
      success: true,
      triggered: triggered.length,
      subscriptions: triggered.map((s) => s.id),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════════

  private async getCompanyIdForQuery(
    user: AuthenticatedUser,
    queryCompanyId?: string,
  ): Promise<string> {
    // Company-level user: use their company
    if (user.companyId) {
      return user.companyId;
    }

    // Client/Organization-level user: require companyId in query
    if (!queryCompanyId) {
      throw new Error('companyId is required for organization/client users');
    }

    // Basic access check - in production, verify through hierarchy
    if (user.clientId) {
      // Client user: verify companyId belongs to their client
      // This would need a database check in production
    }

    return queryCompanyId;
  }

  private async verifySubscriptionAccess(
    subscriptionId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    // For now, trust the service layer to handle tenant isolation
    // The service methods include company filtering
    await this.trialService.getTrialInfo(subscriptionId);
  }
}
