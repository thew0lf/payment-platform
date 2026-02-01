/**
 * Affiliate Conversion DTOs
 *
 * Data transfer objects for conversion management endpoints.
 */

import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ConversionStatus } from '@prisma/client';

/**
 * Query DTO for listing conversions
 */
export class ConversionQueryDto {
  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  partnerId?: string;

  @IsOptional()
  @IsString()
  linkId?: string;

  @IsOptional()
  @IsEnum(ConversionStatus)
  status?: ConversionStatus;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  offset?: string;
}

/**
 * DTO for recording a new conversion
 */
export class RecordConversionDto {
  @IsString()
  companyId: string;

  @IsString()
  orderId: string;

  @IsOptional()
  @IsString()
  orderNumber?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  saleAmount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsBoolean()
  isFirstPurchase?: boolean;

  // Attribution fields
  @IsOptional()
  @IsString()
  clickId?: string;

  @IsOptional()
  @IsString()
  visitorId?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsString()
  affiliateCode?: string;

  // SubIDs (copied from click for reporting)
  @IsOptional()
  @IsString()
  t1?: string;

  @IsOptional()
  @IsString()
  t2?: string;

  @IsOptional()
  @IsString()
  t3?: string;

  @IsOptional()
  @IsString()
  t4?: string;

  @IsOptional()
  @IsString()
  t5?: string;

  // Idempotency
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

/**
 * DTO for updating conversion status
 */
export class UpdateConversionStatusDto {
  @IsEnum(ConversionStatus)
  status: ConversionStatus;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  reversalAmount?: number;
}

/**
 * DTO for bulk conversion actions
 */
export class BulkConversionActionDto {
  @IsArray()
  @IsString({ each: true })
  conversionIds: string[];

  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * Query DTO for conversion statistics
 */
export class ConversionStatsQueryDto {
  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  partnerId?: string;

  @IsOptional()
  @IsString()
  linkId?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}

/**
 * Query DTO for SubID breakdown
 */
export class SubIdBreakdownQueryDto {
  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  partnerId?: string;

  @IsOptional()
  @IsString()
  linkId?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsEnum(['subId1', 'subId2', 'subId3', 'subId4', 'subId5'])
  groupBy?: 'subId1' | 'subId2' | 'subId3' | 'subId4' | 'subId5';

  @IsOptional()
  @IsString()
  limit?: string;
}

/**
 * Response type for conversion statistics
 */
export interface ConversionStatsResponse {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  reversed: number;
  totalRevenue: number;
  totalCommissions: number;
  conversionRate: number;
  averageOrderValue: number;
  averageCommission: number;
}

/**
 * Response type for SubID breakdown
 */
export interface SubIdBreakdownResponse {
  groupBy: string;
  data: SubIdBreakdownItem[];
  totals: {
    conversions: number;
    revenue: number;
    commissions: number;
  };
}

export interface SubIdBreakdownItem {
  subIdValue: string;
  conversions: number;
  revenue: number;
  commissions: number;
  conversionRate: number;
  averageOrderValue: number;
}
