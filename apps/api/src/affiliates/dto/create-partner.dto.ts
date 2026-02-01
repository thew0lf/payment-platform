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

export class SocialMediaDto {
  @IsOptional()
  @IsString()
  twitter?: string;

  @IsOptional()
  @IsString()
  instagram?: string;

  @IsOptional()
  @IsString()
  youtube?: string;

  @IsOptional()
  @IsString()
  tiktok?: string;

  @IsOptional()
  @IsString()
  facebook?: string;

  @IsOptional()
  @IsString()
  linkedin?: string;
}

export class PayoutDetailsDto {
  @IsOptional()
  @IsString()
  paypalEmail?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  routingNumber?: string;

  @IsOptional()
  @IsString()
  accountHolderName?: string;

  @IsOptional()
  @IsString()
  cryptoAddress?: string;

  @IsOptional()
  @IsString()
  cryptoNetwork?: string;
}

export class CreatePartnerDto {
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

  // Application notes
  @IsOptional()
  @IsString()
  applicationNotes?: string;

  // Idempotency
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
