import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
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

export class UpdatePartnerDto {
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
  @IsEnum(AffiliateStatus)
  status?: AffiliateStatus;

  @IsOptional()
  @IsEnum(AffiliateTier)
  tier?: AffiliateTier;

  // Commission settings
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  commissionFlat?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  secondTierRate?: number;

  @IsOptional()
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

  // Approval fields
  @IsOptional()
  @IsString()
  applicationNotes?: string;

  @IsOptional()
  @IsString()
  rejectionReason?: string;

  // Idempotency
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class ApprovePartnerDto {
  @IsOptional()
  @IsString()
  applicationNotes?: string;

  @IsOptional()
  @IsEnum(AffiliateTier)
  tier?: AffiliateTier;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate?: number;
}

export class RejectPartnerDto {
  @IsString()
  rejectionReason: string;
}
