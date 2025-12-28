import { IsString, IsNumber, IsBoolean, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { MerchantRiskLevel } from '@prisma/client';

export class CreateGatewayPricingTierDto {
  @IsString()
  platformIntegrationId: string;

  @IsString()
  tierName: string;

  @IsEnum(MerchantRiskLevel)
  riskLevel: MerchantRiskLevel;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(1)
  transactionPercentage: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  transactionFlat: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  chargebackFee: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(1)
  reservePercentage: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  reserveHoldDays: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  applicationFee?: number;

  @IsOptional()
  @IsBoolean()
  isFounderPricing?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  setupFee?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  monthlyFee?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  monthlyMinimum?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  securityDepositMin?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  securityDepositMax?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(1)
  chargebackThreshold?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  reserveCap?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  chargebackReviewFee?: number;
}

export class UpdateGatewayPricingTierDto {
  @IsOptional()
  @IsString()
  tierName?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(1)
  transactionPercentage?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  transactionFlat?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  chargebackFee?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(1)
  reservePercentage?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  reserveHoldDays?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  applicationFee?: number;

  @IsOptional()
  @IsBoolean()
  isFounderPricing?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  setupFee?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  monthlyFee?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  monthlyMinimum?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  securityDepositMin?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  securityDepositMax?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(1)
  chargebackThreshold?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  reserveCap?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  chargebackReviewFee?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class GatewayPricingTierResponseDto {
  id: string;
  platformIntegrationId: string;
  tierName: string;
  riskLevel: MerchantRiskLevel;
  transactionPercentage: number;
  transactionFlat: number;
  chargebackFee: number;
  chargebackReviewFee: number;
  reservePercentage: number;
  reserveHoldDays: number;
  reserveCap: number | null;
  applicationFee: number;
  isFounderPricing: boolean;
  setupFee: number | null;
  monthlyFee: number | null;
  monthlyMinimum: number | null;
  securityDepositMin: number | null;
  securityDepositMax: number | null;
  chargebackThreshold: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
