/**
 * Subscription Plan Types
 *
 * Types for reusable subscription plan templates.
 * Plans can be created at Organization, Client, or Company level.
 */

import {
  SubscriptionPlanScope as PrismaSubscriptionPlanScope,
  SubscriptionPlanStatus as PrismaSubscriptionPlanStatus,
  TrialStartTrigger as PrismaTrialStartTrigger,
  TrialReturnAction as PrismaTrialReturnAction,
  PartialShipmentAction as PrismaPartialShipmentAction,
  BackorderAction as PrismaBackorderAction,
  ShippingCostAction as PrismaShippingCostAction,
  GiftDurationType as PrismaGiftDurationType,
  SubscriptionBundleType as PrismaSubscriptionBundleType,
  BillingInterval as PrismaBillingInterval,
} from '@prisma/client';
import { IsOptional, IsString, IsNumber, IsBoolean, IsArray, IsEnum, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// ═══════════════════════════════════════════════════════════════════════════════
// RE-EXPORT ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

export const SubscriptionPlanScope = PrismaSubscriptionPlanScope;
export type SubscriptionPlanScope = PrismaSubscriptionPlanScope;

export const SubscriptionPlanStatus = PrismaSubscriptionPlanStatus;
export type SubscriptionPlanStatus = PrismaSubscriptionPlanStatus;

export const TrialStartTrigger = PrismaTrialStartTrigger;
export type TrialStartTrigger = PrismaTrialStartTrigger;

export const TrialReturnAction = PrismaTrialReturnAction;
export type TrialReturnAction = PrismaTrialReturnAction;

export const PartialShipmentAction = PrismaPartialShipmentAction;
export type PartialShipmentAction = PrismaPartialShipmentAction;

export const BackorderAction = PrismaBackorderAction;
export type BackorderAction = PrismaBackorderAction;

export const ShippingCostAction = PrismaShippingCostAction;
export type ShippingCostAction = PrismaShippingCostAction;

export const GiftDurationType = PrismaGiftDurationType;
export type GiftDurationType = PrismaGiftDurationType;

export const SubscriptionBundleType = PrismaSubscriptionBundleType;
export type SubscriptionBundleType = PrismaSubscriptionBundleType;

export const BillingInterval = PrismaBillingInterval;
export type BillingInterval = PrismaBillingInterval;

// ═══════════════════════════════════════════════════════════════════════════════
// LOYALTY TIER TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface LoyaltyTier {
  afterRebills: number;
  discountPct: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUBSCRIPTION PLAN INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

export interface SubscriptionPlan {
  id: string;

  // Ownership
  scope: SubscriptionPlanScope;
  organizationId: string | null;
  clientId: string | null;
  companyId: string | null;

  // Identification
  name: string;
  displayName: string;
  description: string | null;
  shortDescription: string | null;

  // Pricing
  basePriceMonthly: number;
  basePriceAnnual: number | null;
  annualDiscountPct: number | null;
  currency: string;

  // Billing
  availableIntervals: BillingInterval[];
  defaultInterval: BillingInterval;

  // Trial
  trialEnabled: boolean;
  trialDays: number | null;
  trialIncludesShipment: boolean;
  trialStartTrigger: TrialStartTrigger;
  trialConversionTrigger: TrialStartTrigger;
  trialWaitForDelivery: boolean;
  trialExtendDaysPostDelivery: number | null;
  trialNoTrackingFallbackDays: number | null;
  trialReturnAction: TrialReturnAction;
  trialReturnExtendDays: number | null;

  // Recurring
  recurringEnabled: boolean;
  recurringIntervalDays: number | null;
  recurringIncludesShipment: boolean;
  recurringTrigger: TrialStartTrigger;
  recurringWaitForDelivery: boolean;
  recurringExtendDaysPostDelivery: number | null;

  // Shipment-aware billing
  partialShipmentAction: PartialShipmentAction;
  backorderAction: BackorderAction;
  shippingCostAction: ShippingCostAction;
  gracePeriodDays: number | null;

  // Pause & Skip
  pauseEnabled: boolean;
  pauseMaxDuration: number | null;
  skipEnabled: boolean;
  skipMaxPerYear: number | null;

  // Quantity
  includedQuantity: number;
  maxQuantity: number | null;
  quantityChangeProrate: boolean;

  // Loyalty
  loyaltyEnabled: boolean;
  loyaltyTiers: LoyaltyTier[] | null;
  loyaltyStackable: boolean;

  // Price lock & early renewal
  priceLockEnabled: boolean;
  priceLockCycles: number | null;
  earlyRenewalEnabled: boolean;
  earlyRenewalProrate: boolean;

  // Retention
  downsellPlanId: string | null;
  winbackEnabled: boolean;
  winbackDiscountPct: number | null;
  winbackTrialDays: number | null;

  // Gifting
  giftingEnabled: boolean;
  giftDurationDefault: GiftDurationType;
  giftFixedCycles: number | null;

  // Bundle
  bundleType: SubscriptionBundleType | null;
  bundleMinProducts: number | null;
  bundleMaxProducts: number | null;

  // Notifications
  notifyRenewalEnabled: boolean;
  notifyRenewalDaysBefore: number | null;

  // Display
  sortOrder: number;
  isPublic: boolean;
  isFeatured: boolean;
  badgeText: string | null;
  features: string[];

  // Metadata
  metadata: Record<string, unknown>;

  // Status
  status: SubscriptionPlanStatus;
  publishedAt: Date | null;
  archivedAt: Date | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;

  // Soft delete
  deletedAt: Date | null;
  deletedBy: string | null;

  // Relations
  downsellPlan?: SubscriptionPlan | null;
  productPlansCount?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class CreateSubscriptionPlanDto {
  @IsEnum(PrismaSubscriptionPlanScope)
  scope!: SubscriptionPlanScope;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  companyId?: string;

  @IsString()
  name!: string;

  @IsString()
  displayName!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  basePriceMonthly!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  basePriceAnnual?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  annualDiscountPct?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(PrismaBillingInterval, { each: true })
  availableIntervals?: BillingInterval[];

  @IsOptional()
  @IsEnum(PrismaBillingInterval)
  defaultInterval?: BillingInterval;

  // Trial settings
  @IsOptional()
  @IsBoolean()
  trialEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  trialDays?: number;

  @IsOptional()
  @IsBoolean()
  trialIncludesShipment?: boolean;

  @IsOptional()
  @IsEnum(PrismaTrialStartTrigger)
  trialStartTrigger?: TrialStartTrigger;

  @IsOptional()
  @IsEnum(PrismaTrialStartTrigger)
  trialConversionTrigger?: TrialStartTrigger;

  @IsOptional()
  @IsBoolean()
  trialWaitForDelivery?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  trialExtendDaysPostDelivery?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  trialNoTrackingFallbackDays?: number;

  @IsOptional()
  @IsEnum(PrismaTrialReturnAction)
  trialReturnAction?: TrialReturnAction;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  trialReturnExtendDays?: number;

  // Recurring settings
  @IsOptional()
  @IsBoolean()
  recurringEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  recurringIntervalDays?: number;

  @IsOptional()
  @IsBoolean()
  recurringIncludesShipment?: boolean;

  @IsOptional()
  @IsEnum(PrismaTrialStartTrigger)
  recurringTrigger?: TrialStartTrigger;

  @IsOptional()
  @IsBoolean()
  recurringWaitForDelivery?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  recurringExtendDaysPostDelivery?: number;

  // Shipment settings
  @IsOptional()
  @IsEnum(PrismaPartialShipmentAction)
  partialShipmentAction?: PartialShipmentAction;

  @IsOptional()
  @IsEnum(PrismaBackorderAction)
  backorderAction?: BackorderAction;

  @IsOptional()
  @IsEnum(PrismaShippingCostAction)
  shippingCostAction?: ShippingCostAction;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  gracePeriodDays?: number;

  // Pause & Skip
  @IsOptional()
  @IsBoolean()
  pauseEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pauseMaxDuration?: number;

  @IsOptional()
  @IsBoolean()
  skipEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  skipMaxPerYear?: number;

  // Quantity
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  includedQuantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  maxQuantity?: number;

  @IsOptional()
  @IsBoolean()
  quantityChangeProrate?: boolean;

  // Loyalty
  @IsOptional()
  @IsBoolean()
  loyaltyEnabled?: boolean;

  @IsOptional()
  @IsArray()
  loyaltyTiers?: LoyaltyTier[];

  @IsOptional()
  @IsBoolean()
  loyaltyStackable?: boolean;

  // Price lock & early renewal
  @IsOptional()
  @IsBoolean()
  priceLockEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  priceLockCycles?: number;

  @IsOptional()
  @IsBoolean()
  earlyRenewalEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  earlyRenewalProrate?: boolean;

  // Retention
  @IsOptional()
  @IsString()
  downsellPlanId?: string;

  @IsOptional()
  @IsBoolean()
  winbackEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  winbackDiscountPct?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  winbackTrialDays?: number;

  // Gifting
  @IsOptional()
  @IsBoolean()
  giftingEnabled?: boolean;

  @IsOptional()
  @IsEnum(PrismaGiftDurationType)
  giftDurationDefault?: GiftDurationType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  giftFixedCycles?: number;

  // Bundle
  @IsOptional()
  @IsEnum(PrismaSubscriptionBundleType)
  bundleType?: SubscriptionBundleType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  bundleMinProducts?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  bundleMaxProducts?: number;

  // Notifications
  @IsOptional()
  @IsBoolean()
  notifyRenewalEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  notifyRenewalDaysBefore?: number;

  // Display
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsString()
  badgeText?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class UpdateSubscriptionPlanDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  basePriceMonthly?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  basePriceAnnual?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  annualDiscountPct?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(PrismaBillingInterval, { each: true })
  availableIntervals?: BillingInterval[];

  @IsOptional()
  @IsEnum(PrismaBillingInterval)
  defaultInterval?: BillingInterval;

  // All the same optional fields as Create but all optional
  @IsOptional()
  @IsBoolean()
  trialEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  trialDays?: number;

  @IsOptional()
  @IsBoolean()
  trialIncludesShipment?: boolean;

  @IsOptional()
  @IsEnum(PrismaTrialStartTrigger)
  trialStartTrigger?: TrialStartTrigger;

  @IsOptional()
  @IsEnum(PrismaTrialStartTrigger)
  trialConversionTrigger?: TrialStartTrigger;

  @IsOptional()
  @IsBoolean()
  trialWaitForDelivery?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  trialExtendDaysPostDelivery?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  trialNoTrackingFallbackDays?: number;

  @IsOptional()
  @IsEnum(PrismaTrialReturnAction)
  trialReturnAction?: TrialReturnAction;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  trialReturnExtendDays?: number;

  @IsOptional()
  @IsBoolean()
  recurringEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  recurringIntervalDays?: number;

  @IsOptional()
  @IsBoolean()
  recurringIncludesShipment?: boolean;

  @IsOptional()
  @IsEnum(PrismaTrialStartTrigger)
  recurringTrigger?: TrialStartTrigger;

  @IsOptional()
  @IsBoolean()
  recurringWaitForDelivery?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  recurringExtendDaysPostDelivery?: number;

  @IsOptional()
  @IsEnum(PrismaPartialShipmentAction)
  partialShipmentAction?: PartialShipmentAction;

  @IsOptional()
  @IsEnum(PrismaBackorderAction)
  backorderAction?: BackorderAction;

  @IsOptional()
  @IsEnum(PrismaShippingCostAction)
  shippingCostAction?: ShippingCostAction;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  gracePeriodDays?: number;

  @IsOptional()
  @IsBoolean()
  pauseEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pauseMaxDuration?: number;

  @IsOptional()
  @IsBoolean()
  skipEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  skipMaxPerYear?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  includedQuantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  maxQuantity?: number;

  @IsOptional()
  @IsBoolean()
  quantityChangeProrate?: boolean;

  @IsOptional()
  @IsBoolean()
  loyaltyEnabled?: boolean;

  @IsOptional()
  @IsArray()
  loyaltyTiers?: LoyaltyTier[];

  @IsOptional()
  @IsBoolean()
  loyaltyStackable?: boolean;

  @IsOptional()
  @IsBoolean()
  priceLockEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  priceLockCycles?: number;

  @IsOptional()
  @IsBoolean()
  earlyRenewalEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  earlyRenewalProrate?: boolean;

  @IsOptional()
  @IsString()
  downsellPlanId?: string;

  @IsOptional()
  @IsBoolean()
  winbackEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  winbackDiscountPct?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  winbackTrialDays?: number;

  @IsOptional()
  @IsBoolean()
  giftingEnabled?: boolean;

  @IsOptional()
  @IsEnum(PrismaGiftDurationType)
  giftDurationDefault?: GiftDurationType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  giftFixedCycles?: number;

  @IsOptional()
  @IsEnum(PrismaSubscriptionBundleType)
  bundleType?: SubscriptionBundleType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  bundleMinProducts?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  bundleMaxProducts?: number;

  @IsOptional()
  @IsBoolean()
  notifyRenewalEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  notifyRenewalDaysBefore?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsString()
  badgeText?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @IsOptional()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsEnum(PrismaSubscriptionPlanStatus)
  status?: SubscriptionPlanStatus;
}

export class SubscriptionPlanQueryDto {
  @IsOptional()
  @IsEnum(PrismaSubscriptionPlanScope)
  scope?: SubscriptionPlanScope;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsEnum(PrismaSubscriptionPlanStatus)
  status?: SubscriptionPlanStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeArchived?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number;

  @IsOptional()
  @IsString()
  cursor?: string;
}

export interface SubscriptionPlanStats {
  totalPlans: number;
  activePlans: number;
  draftPlans: number;
  archivedPlans: number;
  byScope: {
    scope: SubscriptionPlanScope;
    count: number;
  }[];
  totalProductAssignments: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCT SUBSCRIPTION PLAN TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProductSubscriptionPlan {
  id: string;
  productId: string;
  planId: string;
  overridePriceMonthly: number | null;
  overridePriceAnnual: number | null;
  overrideTrialDays: number | null;
  isDefault: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  plan?: SubscriptionPlan;
}

export class AttachPlanToProductDto {
  @IsString()
  productId!: string;

  @IsString()
  planId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  overridePriceMonthly?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  overridePriceAnnual?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  overrideTrialDays?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sortOrder?: number;
}

export class UpdateProductPlanDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  overridePriceMonthly?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  overridePriceAnnual?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  overrideTrialDays?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sortOrder?: number;
}
