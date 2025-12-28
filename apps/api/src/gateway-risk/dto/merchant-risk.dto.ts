import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { MerchantRiskLevel, MerchantAccountStatus, RiskAssessmentType } from '@prisma/client';

export class CreateMerchantRiskProfileDto {
  @IsString()
  clientId: string;

  @IsString()
  platformIntegrationId: string;

  @IsOptional()
  @IsString()
  mccCode?: string;

  @IsOptional()
  @IsString()
  mccDescription?: string;

  @IsOptional()
  @IsString()
  businessType?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  businessAge?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  annualVolume?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  averageTicket?: number;
}

export class UpdateMerchantRiskProfileDto {
  @IsOptional()
  @IsEnum(MerchantRiskLevel)
  riskLevel?: MerchantRiskLevel;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  riskScore?: number;

  @IsOptional()
  @IsEnum(MerchantAccountStatus)
  accountStatus?: MerchantAccountStatus;

  @IsOptional()
  @IsString()
  pricingTierId?: string;

  @IsOptional()
  @IsString()
  mccCode?: string;

  @IsOptional()
  @IsString()
  mccDescription?: string;

  @IsOptional()
  @IsString()
  businessType?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  businessAge?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  annualVolume?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  averageTicket?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  securityDeposit?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  securityDepositPaid?: number;

  @IsOptional()
  @IsBoolean()
  isHighRiskMCC?: boolean;

  @IsOptional()
  @IsBoolean()
  hasChargebackHistory?: boolean;

  @IsOptional()
  @IsBoolean()
  hasComplianceIssues?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresMonitoring?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  reviewFrequency?: number;

  @IsOptional()
  @IsString()
  internalNotes?: string;
}

export class TriggerRiskAssessmentDto {
  @IsEnum(RiskAssessmentType)
  assessmentType: RiskAssessmentType;

  @IsOptional()
  @IsBoolean()
  useAI?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ApproveRiskAssessmentDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class MerchantRiskProfileResponseDto {
  id: string;
  clientId: string;
  platformIntegrationId: string;
  riskLevel: MerchantRiskLevel;
  riskScore: number;
  accountStatus: MerchantAccountStatus;
  pricingTierId: string | null;
  mccCode: string | null;
  mccDescription: string | null;
  businessType: string | null;
  businessAge: number | null;
  annualVolume: number | null;
  averageTicket: number | null;
  totalProcessed: bigint;
  transactionCount: number;
  chargebackCount: number;
  chargebackRatio: number;
  refundRatio: number;
  reserveBalance: bigint;
  reserveHeldTotal: bigint;
  reserveReleasedTotal: bigint;
  securityDeposit: number;
  securityDepositPaid: number;
  securityDepositPaidAt: Date | null;
  isHighRiskMCC: boolean;
  hasChargebackHistory: boolean;
  hasComplianceIssues: boolean;
  requiresMonitoring: boolean;
  lastReviewDate: Date | null;
  nextReviewDate: Date | null;
  reviewFrequency: number;
  internalNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
  approvedAt: Date | null;
  approvedBy: string | null;
}

export class RiskAssessmentResponseDto {
  id: string;
  merchantRiskProfileId: string;
  assessmentType: RiskAssessmentType;
  assessmentDate: Date;
  assessedBy: string | null;
  previousRiskLevel: MerchantRiskLevel;
  newRiskLevel: MerchantRiskLevel;
  previousRiskScore: number;
  newRiskScore: number;
  factors: Record<string, unknown>;
  aiModel: string | null;
  aiConfidence: number | null;
  aiExplanation: string | null;
  reasoning: string | null;
  recommendedActions: string[];
  requiresApproval: boolean;
  approvedAt: Date | null;
  approvedBy: string | null;
  createdAt: Date;
}
