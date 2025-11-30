import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsArray,
  IsObject,
  Min,
  Max,
  IsEmail,
  IsUrl,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  VendorStatus,
  VendorTier,
  VendorType,
  ConnectionStatus,
  ProductSyncMode,
  EntityStatus,
} from '@prisma/client';

// =============================================================================
// VENDOR DTOs
// =============================================================================

export class CreateVendorDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  slug: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  businessName?: string;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(VendorType)
  vendorType?: VendorType;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}

export class UpdateVendorDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  businessName?: string;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(VendorStatus)
  status?: VendorStatus;

  @IsOptional()
  @IsEnum(VendorTier)
  tier?: VendorTier;

  @IsOptional()
  @IsEnum(VendorType)
  vendorType?: VendorType;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}

export class VerifyVendorDto {
  @IsBoolean()
  isVerified: boolean;
}

// =============================================================================
// VENDOR COMPANY DTOs
// =============================================================================

export class CreateVendorCompanyDto {
  @IsString()
  vendorId: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  slug: string;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  capabilities?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productCategories?: string[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(30)
  defaultLeadTimeDays?: number;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}

export class UpdateVendorCompanyDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  capabilities?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productCategories?: string[];

  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(30)
  defaultLeadTimeDays?: number;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}

// =============================================================================
// VENDOR CONNECTION DTOs
// =============================================================================

export class CreateConnectionDto {
  @IsString()
  vendorId: string;

  @IsString()
  vendorCompanyId: string;

  @IsString()
  companyId: string;

  @IsOptional()
  @IsObject()
  customPricing?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  terms?: Record<string, unknown>;

  @IsOptional()
  @IsNumber()
  @Min(0)
  creditLimit?: number;

  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @IsOptional()
  @IsEnum(ProductSyncMode)
  syncMode?: ProductSyncMode;

  @IsOptional()
  @IsBoolean()
  autoSyncEnabled?: boolean;
}

export class UpdateConnectionDto {
  @IsOptional()
  @IsEnum(ConnectionStatus)
  status?: ConnectionStatus;

  @IsOptional()
  @IsObject()
  customPricing?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  terms?: Record<string, unknown>;

  @IsOptional()
  @IsNumber()
  @Min(0)
  creditLimit?: number;

  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @IsOptional()
  @IsEnum(ProductSyncMode)
  syncMode?: ProductSyncMode;

  @IsOptional()
  @IsBoolean()
  autoSyncEnabled?: boolean;
}

export class ApproveConnectionDto {
  @IsBoolean()
  approved: boolean;
}

// =============================================================================
// VENDOR PRODUCT DTOs
// =============================================================================

export class CreateVendorProductDto {
  @IsString()
  vendorCompanyId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  sku: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  wholesalePrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  retailPrice?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lowStockThreshold?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @IsOptional()
  @IsObject()
  dimensions?: { length: number; width: number; height: number; unit: string };

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  leadTimeDays?: number;
}

export class UpdateVendorProductDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  wholesalePrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  retailPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lowStockThreshold?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @IsOptional()
  @IsObject()
  dimensions?: { length: number; width: number; height: number; unit: string };

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  leadTimeDays?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// =============================================================================
// MARKETPLACE REVIEW DTOs
// =============================================================================

export class CreateReviewDto {
  @IsString()
  vendorId: string;

  @IsString()
  vendorCompanyId: string;

  @IsString()
  companyId: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  content?: string;

  @IsOptional()
  @IsBoolean()
  verifiedPurchase?: boolean;
}

export class RespondToReviewDto {
  @IsString()
  @MaxLength(2000)
  response: string;
}
