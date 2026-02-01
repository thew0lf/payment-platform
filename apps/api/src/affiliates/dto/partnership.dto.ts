/**
 * Affiliate Partnership DTOs
 *
 * Data transfer objects for affiliate partnership management.
 */

import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsDateString,
  IsArray,
  Min,
  Max,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  PartnershipType,
  AffiliateStatus,
  AffiliateTier,
  AffiliatePayoutMethod,
} from '@prisma/client';
import { SocialMediaDto, PayoutDetailsDto } from './create-partner.dto';

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class PartnershipQueryDto {
  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  affiliateId?: string;

  @IsOptional()
  @IsEnum(AffiliateStatus)
  status?: AffiliateStatus;

  @IsOptional()
  @IsEnum(PartnershipType)
  partnershipType?: PartnershipType;

  @IsOptional()
  @IsEnum(AffiliateTier)
  tier?: AffiliateTier;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CREATE DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class CreatePartnershipDto {
  @IsString()
  companyId: string;

  @IsEmail()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SocialMediaDto)
  socialMedia?: SocialMediaDto;

  @IsOptional()
  @IsString()
  affiliateCode?: string;

  @IsOptional()
  @IsEnum(PartnershipType)
  partnershipType?: PartnershipType;

  @IsOptional()
  @IsEnum(AffiliateStatus)
  status?: AffiliateStatus;

  @IsOptional()
  @IsEnum(AffiliateTier)
  tier?: AffiliateTier;

  // Commission settings
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  commissionFlat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  secondTierRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  cookieDurationDays?: number;

  @IsOptional()
  @IsObject()
  customTerms?: Record<string, unknown>;

  // Payout settings
  @IsOptional()
  @IsEnum(AffiliatePayoutMethod)
  payoutMethod?: AffiliatePayoutMethod;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  payoutThreshold?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => PayoutDetailsDto)
  payoutDetails?: PayoutDetailsDto;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsBoolean()
  w9OnFile?: boolean;

  // Application notes
  @IsOptional()
  @IsString()
  applicationNotes?: string;

  // Idempotency
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UPDATE DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class UpdatePartnershipDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SocialMediaDto)
  socialMedia?: SocialMediaDto;

  @IsOptional()
  @IsEnum(PartnershipType)
  partnershipType?: PartnershipType;

  @IsOptional()
  @IsEnum(AffiliateTier)
  tier?: AffiliateTier;

  // Commission settings
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  commissionFlat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  secondTierRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  cookieDurationDays?: number;

  @IsOptional()
  @IsObject()
  customTerms?: Record<string, unknown>;

  // Payout settings
  @IsOptional()
  @IsEnum(AffiliatePayoutMethod)
  payoutMethod?: AffiliatePayoutMethod;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  payoutThreshold?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => PayoutDetailsDto)
  payoutDetails?: PayoutDetailsDto;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsBoolean()
  w9OnFile?: boolean;

  // Notes
  @IsOptional()
  @IsString()
  applicationNotes?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS CHANGE DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class UpdatePartnershipStatusDto {
  @IsEnum(AffiliateStatus)
  status: AffiliateStatus;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ApprovePartnershipDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(AffiliateTier)
  tier?: AffiliateTier;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate?: number;
}

export class RejectPartnershipDto {
  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class SuspendPartnershipDto {
  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class TerminatePartnershipDto {
  @IsString()
  reason: string;

  @IsOptional()
  @IsBoolean()
  processRemainingPayout?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BULK ACTION DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class BulkApprovePartnershipsDto {
  @IsArray()
  @IsString({ each: true })
  partnershipIds: string[];

  @IsOptional()
  @IsEnum(AffiliateTier)
  tier?: AffiliateTier;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate?: number;
}

export class BulkRejectPartnershipsDto {
  @IsArray()
  @IsString({ each: true })
  partnershipIds: string[];

  @IsString()
  reason: string;
}

export class BulkUpdateTierDto {
  @IsArray()
  @IsString({ each: true })
  partnershipIds: string[];

  @IsEnum(AffiliateTier)
  tier: AffiliateTier;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface PartnershipListResponse {
  partnerships: PartnershipWithRelations[];
  total: number;
  limit: number;
  offset: number;
}

export interface PartnershipWithRelations {
  id: string;
  companyId: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  phone: string | null;
  website: string | null;
  socialMedia: unknown;
  affiliateCode: string;
  partnershipType: PartnershipType;
  status: AffiliateStatus;
  tier: AffiliateTier;
  commissionRate: number | null;
  commissionFlat: number | null;
  secondTierRate: number | null;
  cookieDurationDays: number | null;
  payoutMethod: AffiliatePayoutMethod;
  payoutThreshold: number;
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  totalEarnings: number;
  totalPaid: number;
  currentBalance: number;
  conversionRate: number;
  approvedAt: Date | null;
  approvedBy: string | null;
  rejectionReason: string | null;
  applicationNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
  company?: {
    id: string;
    name: string;
    slug: string;
  };
  _count?: {
    links: number;
    conversions: number;
    clicks: number;
    payouts: number;
  };
}

export interface PartnershipStats {
  total: number;
  active: number;
  pending: number;
  suspended: number;
  terminated: number;
  byTier: Record<string, number>;
  byType: Record<string, number>;
  topPerformers: {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string | null;
    totalEarnings: number;
    totalConversions: number;
    conversionRate: number;
  }[];
}

export interface BulkActionResult {
  total: number;
  successful: number;
  failed: number;
  results: {
    id: string;
    success: boolean;
    error?: string;
  }[];
}
