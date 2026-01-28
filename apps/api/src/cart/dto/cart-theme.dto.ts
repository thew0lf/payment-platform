import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsObject,
  IsArray,
  IsEnum,
  Min,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for updating cart theme configuration
 */
export class UpdateCartThemeDto {
  @ApiPropertyOptional({ description: 'Theme preset name' })
  @IsOptional()
  @IsString()
  preset?: string;

  @ApiPropertyOptional({ description: 'Color overrides (hex format)' })
  @IsOptional()
  @IsObject()
  colors?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Layout configuration' })
  @IsOptional()
  @IsObject()
  layout?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Content configuration' })
  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Custom CSS' })
  @IsOptional()
  @IsString()
  customCss?: string;
}

/**
 * DTO for updating product catalog configuration
 */
export class UpdateProductCatalogDto {
  @ApiPropertyOptional({ description: 'Catalog mode (ALL, SELECTED, CATEGORY, TAG)' })
  @IsOptional()
  @IsString()
  mode?: string;

  @ApiPropertyOptional({ description: 'Selected product IDs for SELECTED mode' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedProductIds?: string[];

  @ApiPropertyOptional({ description: 'Category IDs for CATEGORY mode' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({ description: 'Tag IDs for TAG mode' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];

  @ApiPropertyOptional({ description: 'Sort by field' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Maximum number of products to display' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxProducts?: number | null;

  @ApiPropertyOptional({ description: 'Whether to show out of stock products' })
  @IsOptional()
  @IsBoolean()
  showOutOfStock?: boolean;

  @ApiPropertyOptional({ description: 'Whether to show prices' })
  @IsOptional()
  @IsBoolean()
  showPrices?: boolean;

  @ApiPropertyOptional({ description: 'Whether to show compare at price (strikethrough)' })
  @IsOptional()
  @IsBoolean()
  showCompareAtPrice?: boolean;
}

/**
 * DTO for reordering products in catalog
 */
export class ReorderProductsDto {
  @ApiProperty({ description: 'Array of product IDs in desired order' })
  @IsArray()
  @IsString({ each: true })
  productIds: string[];
}

/**
 * DTO for adding products to catalog
 */
export class AddProductsDto {
  @ApiProperty({ description: 'Array of product IDs to add' })
  @IsArray()
  @IsString({ each: true })
  productIds: string[];
}

/**
 * DTO for generating theme from brand colors
 */
export class GenerateThemeDto {
  @ApiProperty({ description: 'Primary brand color (hex format)', example: '#FF5733' })
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Primary color must be a valid hex color (e.g., #FF5733)' })
  primaryColor: string;

  @ApiPropertyOptional({ description: 'Color mode', enum: ['light', 'dark'], default: 'light' })
  @IsOptional()
  @IsEnum(['light', 'dark'])
  mode?: 'light' | 'dark';
}
