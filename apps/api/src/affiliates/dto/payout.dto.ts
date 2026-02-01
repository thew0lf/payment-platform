import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsDate,
  IsBoolean,
  Min,
  Max,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AffiliatePayoutMethod, AffiliatePayoutStatus } from '@prisma/client';

export class PayoutPeriodDto {
  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @Type(() => Date)
  @IsDate()
  endDate: Date;
}

/**
 * DTO for updating payout status specifically
 */
export class UpdatePayoutStatusDto {
  @IsEnum(AffiliatePayoutStatus)
  status: AffiliatePayoutStatus;

  @IsOptional()
  @IsString()
  transactionRef?: string;

  @IsOptional()
  @IsString()
  failReason?: string;
}

/**
 * DTO for calculating pending payouts
 */
export class CalculatePendingDto {
  @IsString()
  companyId: string;

  @IsOptional()
  @IsString()
  partnershipId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  partnerIds?: string[];

  @IsOptional()
  @IsBoolean()
  includeHoldPeriod?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  holdPeriodDays?: number;
}

/**
 * DTO for pending payout summary response
 */
export class PendingPayoutSummaryDto {
  partnerId: string;
  partnerName: string;
  partnerEmail: string;
  affiliateCode: string;
  payoutMethod: AffiliatePayoutMethod;
  payoutThreshold: number;
  currentBalance: number;
  pendingConversions: number;
  pendingAmount: number;
  heldAmount: number;
  availableForPayout: number;
  isEligible: boolean;
  lastPayoutDate?: Date;
}

export class CreatePayoutBatchDto {
  @IsString()
  companyId: string;

  @ValidateNested()
  @Type(() => PayoutPeriodDto)
  period: PayoutPeriodDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  partnerIds?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumAmount?: number;

  // Idempotency
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class CreateSinglePayoutDto {
  @IsString()
  partnerId: string;

  @IsString()
  companyId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsEnum(AffiliatePayoutMethod)
  method?: AffiliatePayoutMethod;

  @ValidateNested()
  @Type(() => PayoutPeriodDto)
  period: PayoutPeriodDto;

  @IsOptional()
  @IsString()
  notes?: string;

  // Idempotency
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class UpdatePayoutDto {
  @IsOptional()
  @IsEnum(AffiliatePayoutStatus)
  status?: AffiliatePayoutStatus;

  @IsOptional()
  @IsString()
  transactionId?: string;

  @IsOptional()
  @IsString()
  failReason?: string;
}

export class ProcessPayoutDto {
  @IsOptional()
  @IsString()
  transactionId?: string;

  @IsOptional()
  paymentDetails?: Record<string, unknown>;
}

export class PayoutQueryDto {
  @IsOptional()
  @IsString()
  partnerId?: string;

  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  offset?: string;
}
