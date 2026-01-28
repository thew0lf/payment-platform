import {
  IsString,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsArray,
  IsEnum,
  IsObject,
  ValidateNested,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Local enum definitions to avoid Prisma client import issues in Docker
export enum SubscriptionFrequencyDto {
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
  BIMONTHLY = 'BIMONTHLY',
  QUARTERLY = 'QUARTERLY',
}

// Must match Prisma UpsellType enum values
export enum UpsellTypeDto {
  BULK_DISCOUNT = 'BULK_DISCOUNT',
  SUBSCRIPTION = 'SUBSCRIPTION',
  FREE_SHIPPING_ADD = 'FREE_SHIPPING_ADD',
  FREE_GIFT_THRESHOLD = 'FREE_GIFT_THRESHOLD',
  COMPLEMENTARY = 'COMPLEMENTARY',
  BUNDLE_UPGRADE = 'BUNDLE_UPGRADE',
  PREMIUM_VERSION = 'PREMIUM_VERSION',
  SHIPPING_PROTECTION = 'SHIPPING_PROTECTION',
  WARRANTY = 'WARRANTY',
  QUANTITY_DISCOUNT = 'QUANTITY_DISCOUNT',
}

export enum UpsellUrgencyDto {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// =============================================================================
// BULK DISCOUNT DTOs
// =============================================================================

export class BulkDiscountTierDto {
  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  minQuantity: number;

  @ApiPropertyOptional({ example: 5 })
  @IsNumber()
  @IsOptional()
  maxQuantity?: number | null;

  @ApiProperty({ enum: ['PERCENTAGE', 'FIXED_AMOUNT', 'UNIT_PRICE'] })
  @IsString()
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'UNIT_PRICE';

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0)
  discountValue: number;

  @ApiProperty({ example: 'Buy 2, Save 10%' })
  @IsString()
  label: string;
}

export class CreateBulkDiscountDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiProperty({ type: [BulkDiscountTierDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkDiscountTierDto)
  tiers: BulkDiscountTierDto[];

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  stackWithOtherDiscounts?: boolean;

  @ApiPropertyOptional({ example: 30 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  maxDiscountPercent?: number;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  validFrom?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  validUntil?: string;
}

export class CalculateBulkPriceDto {
  @ApiProperty({ example: 'product-id' })
  @IsString()
  productId: string;

  @ApiProperty({ example: 3 })
  @IsNumber()
  @Min(1)
  quantity: number;
}

// =============================================================================
// SUBSCRIPTION CONFIG DTOs
// =============================================================================

export class SubscriptionDiscountTierDto {
  @ApiProperty({ enum: SubscriptionFrequencyDto })
  @IsEnum(SubscriptionFrequencyDto)
  frequency: SubscriptionFrequencyDto;

  @ApiProperty({ example: 15 })
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent: number;

  @ApiProperty({ example: 'Monthly' })
  @IsString()
  label: string;
}

export class SubscriptionEligibilityDto {
  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  requirePreviousPurchase?: boolean;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  minOrderCount?: number;

  @ApiPropertyOptional({ example: ['coffee', 'consumables'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  productCategories?: string[];
}

export class CreateSubscriptionConfigDto {
  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({ type: [SubscriptionDiscountTierDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubscriptionDiscountTierDto)
  @IsOptional()
  discountTiers?: SubscriptionDiscountTierDto[];

  @ApiPropertyOptional({ enum: SubscriptionFrequencyDto })
  @IsEnum(SubscriptionFrequencyDto)
  @IsOptional()
  defaultFrequency?: SubscriptionFrequencyDto;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  freeShippingIncluded?: boolean;

  @ApiPropertyOptional({ type: SubscriptionEligibilityDto })
  @ValidateNested()
  @Type(() => SubscriptionEligibilityDto)
  @IsOptional()
  eligibility?: SubscriptionEligibilityDto;
}

// =============================================================================
// TARGETING RULE DTOs
// =============================================================================

export class UpsellConditionsDto {
  @ApiPropertyOptional({ example: ['BUDGET_CONSCIOUS', 'REPEAT_CUSTOMER'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  segments?: string[];

  @ApiPropertyOptional({ example: 20 })
  @IsNumber()
  @IsOptional()
  cartValueMin?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsNumber()
  @IsOptional()
  cartValueMax?: number;

  @ApiPropertyOptional()
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  productCategories?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  hasProduct?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  excludeProduct?: string[];

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isNewCustomer?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  hasSubscription?: boolean;
}

export class UpsellOfferDto {
  @ApiPropertyOptional({ example: 15 })
  @IsNumber()
  @IsOptional()
  discountPercent?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  freeShipping?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  freeGift?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  bonusProduct?: string;
}

export class CreateTargetingRuleDto {
  @ApiProperty({ example: 'Budget Buyers - Bulk Discount' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiProperty({ type: UpsellConditionsDto })
  @ValidateNested()
  @Type(() => UpsellConditionsDto)
  conditions: UpsellConditionsDto;

  @ApiProperty({ enum: UpsellTypeDto })
  @IsEnum(UpsellTypeDto)
  upsellType: UpsellTypeDto;

  @ApiProperty({ type: UpsellOfferDto })
  @ValidateNested()
  @Type(() => UpsellOfferDto)
  offer: UpsellOfferDto;

  @ApiProperty({ example: 'Buy 2 and save 15%!' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ enum: UpsellUrgencyDto })
  @IsEnum(UpsellUrgencyDto)
  @IsOptional()
  urgency?: UpsellUrgencyDto;

  @ApiProperty({ example: ['CART_DRAWER', 'CHECKOUT'] })
  @IsArray()
  @IsString({ each: true })
  placements: string[];

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  maxImpressions?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  maxAcceptances?: number;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  validFrom?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  validUntil?: string;
}

export class UpdateTargetingRuleDto extends CreateTargetingRuleDto {}

// =============================================================================
// IMPRESSION DTOs
// =============================================================================

export class RecordImpressionDto {
  @ApiProperty()
  @IsString()
  cartId: string;

  @ApiProperty()
  @IsString()
  ruleId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  customerId?: string;

  @ApiProperty()
  @IsString()
  sessionId: string;

  @ApiProperty()
  @IsString()
  placement: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  variant?: string;

  @ApiProperty({ type: UpsellOfferDto })
  @ValidateNested()
  @Type(() => UpsellOfferDto)
  offer: UpsellOfferDto;
}

export class RecordAcceptanceDto {
  @ApiProperty()
  @IsString()
  impressionId: string;

  @ApiProperty({ example: 24.99 })
  @IsNumber()
  revenue: number;
}

export class RecordDeclineDto {
  @ApiProperty()
  @IsString()
  impressionId: string;
}

// =============================================================================
// QUERY DTOs
// =============================================================================

export class GetCartUpsellsQueryDto {
  @ApiPropertyOptional({ example: 3 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  maxUpsells?: number;

  @ApiPropertyOptional({ example: ['CART_DRAWER'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  placements?: string[];
}
