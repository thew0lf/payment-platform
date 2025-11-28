import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsEnum,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductCategory, ProductStatus, RoastLevel } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════
// CREATE PRODUCT DTO
// ═══════════════════════════════════════════════════════════════

export class CreateProductDto {
  @IsString()
  @MaxLength(100)
  sku: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  slug?: string;

  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsEnum(ProductCategory)
  category: ProductCategory;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  subcategory?: string;

  // Coffee-specific
  @IsOptional()
  @IsEnum(RoastLevel)
  roastLevel?: RoastLevel;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  origin?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  flavorNotes?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(50)
  process?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  altitude?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  varietal?: string;

  // Sizing
  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  weightUnit?: string;

  // Pricing
  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  compareAtPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  // Inventory
  @IsOptional()
  @IsBoolean()
  trackInventory?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lowStockThreshold?: number;

  // Status
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  // Media
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  // SEO
  @IsOptional()
  @IsString()
  @MaxLength(100)
  metaTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  metaDescription?: string;
}

// ═══════════════════════════════════════════════════════════════
// UPDATE PRODUCT DTO
// ═══════════════════════════════════════════════════════════════

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsEnum(ProductCategory)
  category?: ProductCategory;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  subcategory?: string;

  @IsOptional()
  @IsEnum(RoastLevel)
  roastLevel?: RoastLevel;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  origin?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  flavorNotes?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  compareAtPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @IsOptional()
  @IsBoolean()
  trackInventory?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lowStockThreshold?: number;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  metaTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  metaDescription?: string;
}

// ═══════════════════════════════════════════════════════════════
// STOCK DTOS
// ═══════════════════════════════════════════════════════════════

export class UpdateStockDto {
  @IsNumber()
  @Min(0)
  quantity: number;
}

export class AdjustStockDto {
  @IsNumber()
  adjustment: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}

// ═══════════════════════════════════════════════════════════════
// QUERY DTO
// ═══════════════════════════════════════════════════════════════

export class ProductQueryDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  inStock?: boolean;

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
}
