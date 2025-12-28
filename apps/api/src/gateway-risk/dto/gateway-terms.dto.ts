import { IsString, IsOptional, IsEnum, IsBoolean, IsArray, IsDateString } from 'class-validator';
import { GatewayTermsVersion, MerchantRiskLevel } from '@prisma/client';

export class CreateGatewayTermsDocumentDto {
  @IsString()
  platformIntegrationId: string;

  @IsEnum(GatewayTermsVersion)
  version: GatewayTermsVersion;

  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsArray()
  @IsEnum(MerchantRiskLevel, { each: true })
  applicableRiskLevels: MerchantRiskLevel[];

  @IsDateString()
  effectiveDate: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;
}

export class UpdateGatewayTermsDocumentDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(MerchantRiskLevel, { each: true })
  applicableRiskLevels?: MerchantRiskLevel[];

  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;
}

export class AcceptGatewayTermsDto {
  @IsString()
  termsDocumentId: string;

  @IsString()
  acceptorName: string;

  @IsOptional()
  @IsString()
  acceptorTitle?: string;

  @IsString()
  acceptorEmail: string;
}

export class GatewayTermsDocumentResponseDto {
  id: string;
  platformIntegrationId: string;
  version: GatewayTermsVersion;
  title: string;
  content: string;
  summary: string | null;
  applicableRiskLevels: MerchantRiskLevel[];
  effectiveDate: Date;
  expiresAt: Date | null;
  isActive: boolean;
  isCurrent: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export class GatewayTermsAcceptanceResponseDto {
  id: string;
  termsDocumentId: string;
  clientId: string;
  acceptedAt: Date;
  acceptedBy: string;
  acceptorName: string;
  acceptorTitle: string | null;
  acceptorEmail: string;
  ipAddress: string;
  userAgent: string | null;
  acceptanceMethod: string;
  signatureHash: string | null;
  isValid: boolean;
  createdAt: Date;
}
