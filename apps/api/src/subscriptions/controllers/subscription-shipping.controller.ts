/**
 * Subscription Shipping Controller
 *
 * Endpoints for shipping intelligence:
 * - Rate shopping
 * - Carrier recommendations
 * - Delivery predictions
 * - Address validation
 */

import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  SubscriptionShippingService,
  ShippingRate,
  CarrierRecommendation,
  DeliveryPrediction,
  AddressValidation,
  DeliveryPreferences,
  ShippingAnalytics,
  ShippingCarrier,
  ServiceLevel,
} from '../services/subscription-shipping.service';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ═══════════════════════════════════════════════════════════════════════════════
// DTOs
// ═══════════════════════════════════════════════════════════════════════════════

class DimensionsDto {
  @IsNumber()
  length: number;

  @IsNumber()
  width: number;

  @IsNumber()
  height: number;
}

class GetRatesDto {
  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => DimensionsDto)
  dimensions?: DimensionsDto;
}

class ValidateAddressDto {
  @IsString()
  address1: string;

  @IsOptional()
  @IsString()
  address2?: string;

  @IsString()
  city: string;

  @IsString()
  state: string;

  @IsString()
  postalCode: string;

  @IsOptional()
  @IsString()
  country?: string;
}

class UpdatePreferencesDto {
  @IsOptional()
  @IsEnum(ShippingCarrier)
  preferredCarrier?: ShippingCarrier;

  @IsOptional()
  @IsEnum(ServiceLevel)
  preferredServiceLevel?: ServiceLevel;

  @IsOptional()
  @IsString()
  deliveryInstructions?: string;

  @IsOptional()
  @IsBoolean()
  signatureRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  leaveAtDoor?: boolean;

  @IsOptional()
  @IsString()
  preferredDeliveryTime?: 'MORNING' | 'AFTERNOON' | 'EVENING';

  @IsOptional()
  @IsBoolean()
  authorityToLeave?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyBySms?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyByEmail?: boolean;
}

@Controller('subscriptions/shipping')
@UseGuards(AuthGuard('jwt'))
export class SubscriptionShippingController {
  private readonly logger = new Logger(SubscriptionShippingController.name);

  constructor(
    private readonly shippingService: SubscriptionShippingService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════════
  // RATE SHOPPING
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get shipping rates for a subscription
   */
  @Post(':subscriptionId/rates')
  async getShippingRates(
    @Param('subscriptionId') subscriptionId: string,
    @Body() dto: GetRatesDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ShippingRate[]> {
    return this.shippingService.getShippingRates(subscriptionId, {
      weight: dto.weight,
      dimensions: dto.dimensions,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // CARRIER RECOMMENDATIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get carrier recommendation for a subscription
   */
  @Get(':subscriptionId/recommendation')
  async getCarrierRecommendation(
    @Param('subscriptionId') subscriptionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CarrierRecommendation> {
    return this.shippingService.getCarrierRecommendation(subscriptionId);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // DELIVERY PREDICTIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Predict delivery for next shipment
   */
  @Get(':subscriptionId/predict')
  async predictDelivery(
    @Param('subscriptionId') subscriptionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DeliveryPrediction> {
    return this.shippingService.predictDelivery(subscriptionId);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ADDRESS VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Validate a shipping address
   */
  @Post('validate-address')
  async validateAddress(
    @Body() dto: ValidateAddressDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AddressValidation> {
    return this.shippingService.validateAddress({
      address1: dto.address1,
      address2: dto.address2,
      city: dto.city,
      state: dto.state,
      postalCode: dto.postalCode,
      country: dto.country || 'US',
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // DELIVERY PREFERENCES
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get delivery preferences for customer
   */
  @Get('preferences/:customerId')
  async getDeliveryPreferences(
    @Param('customerId') customerId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DeliveryPreferences | null> {
    return this.shippingService.getDeliveryPreferences(customerId);
  }

  /**
   * Update delivery preferences for customer
   */
  @Post('preferences/:customerId')
  async updateDeliveryPreferences(
    @Param('customerId') customerId: string,
    @Body() dto: UpdatePreferencesDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DeliveryPreferences> {
    return this.shippingService.setDeliveryPreferences(customerId, dto);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get shipping analytics for company
   */
  @Get('analytics')
  async getShippingAnalytics(
    @Query('companyId') queryCompanyId: string,
    @Query('period') period: 'week' | 'month' | 'quarter',
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ShippingAnalytics> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    return this.shippingService.getShippingAnalytics(companyId, period || 'month');
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
