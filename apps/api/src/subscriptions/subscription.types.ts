/**
 * Subscription Types
 *
 * Types for customer product subscriptions (recurring orders).
 * NOT to be confused with ClientSubscription (platform billing).
 */

// Re-export Prisma enums to ensure type compatibility
import {
  SubscriptionStatus as PrismaSubscriptionStatus,
  BillingInterval as PrismaBillingInterval,
} from '@prisma/client';
import { IsOptional, IsString, IsNumber, IsEnum, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';

export const SubscriptionStatus = PrismaSubscriptionStatus;
export type SubscriptionStatus = PrismaSubscriptionStatus;

export const BillingInterval = PrismaBillingInterval;
export type BillingInterval = PrismaBillingInterval;

export interface Subscription {
  id: string;
  companyId: string;
  customerId: string;

  // Plan details
  planName: string;
  planAmount: number;
  currency: string;
  interval: BillingInterval;

  // Billing cycle
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  nextBillingDate: Date | null;

  // Trial
  trialStart: Date | null;
  trialEnd: Date | null;

  // Shipping
  shippingAddressId: string | null;
  shippingPreferences: Record<string, any>;

  // Status
  status: SubscriptionStatus;
  canceledAt: Date | null;
  cancelReason: string | null;
  pausedAt: Date | null;
  pauseResumeAt: Date | null;

  // Metadata
  metadata: Record<string, any>;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Relations (optional, loaded when needed)
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  ordersCount?: number;
}

// ═══════════════════════════════════════════════════════════════
// QUERY DTO (with validation decorators for NestJS)
// ═══════════════════════════════════════════════════════════════

export class SubscriptionQueryDto {
  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsEnum(PrismaSubscriptionStatus)
  status?: SubscriptionStatus;

  @IsOptional()
  @IsEnum(PrismaBillingInterval)
  interval?: BillingInterval;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  billingBefore?: string;

  @IsOptional()
  @IsString()
  billingAfter?: string;

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

// Keep interface for backward compatibility
export interface SubscriptionQueryParams {
  // Filters
  status?: SubscriptionStatus;
  interval?: BillingInterval;
  customerId?: string;
  search?: string;

  // Date filters
  startDate?: string;
  endDate?: string;

  // Billing date filters
  billingBefore?: string; // Next billing date before this date
  billingAfter?: string;  // Next billing date after this date

  // Pagination (offset-based)
  limit?: number;
  offset?: number;

  // Cursor-based pagination
  cursor?: string;
}

export interface SubscriptionStats {
  totalSubscriptions: number;
  activeSubscriptions: number;
  pausedSubscriptions: number;
  canceledSubscriptions: number;
  pastDueSubscriptions: number;
  expiredSubscriptions: number;

  // Revenue metrics
  monthlyRecurringRevenue: number;
  averageSubscriptionValue: number;

  // By interval breakdown
  byInterval: {
    interval: BillingInterval;
    count: number;
    revenue: number;
  }[];

  // Upcoming renewals
  renewingThisWeek: number;
  renewingThisMonth: number;
}

export interface CreateSubscriptionDto {
  companyId: string;
  customerId: string;
  planName: string;
  planAmount: number;
  currency?: string;
  interval: BillingInterval;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  nextBillingDate?: Date;
  trialDays?: number;
  shippingAddressId?: string;
  shippingPreferences?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface UpdateSubscriptionDto {
  planName?: string;
  planAmount?: number;
  interval?: BillingInterval;
  nextBillingDate?: Date;
  shippingAddressId?: string;
  shippingPreferences?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface PauseSubscriptionDto {
  reason?: string;
  resumeAt?: Date;
}

export interface CancelSubscriptionDto {
  reason?: string;
  cancelImmediately?: boolean; // If false, cancel at period end
}
