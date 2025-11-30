import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsNumber,
  Min,
  MaxLength,
  MinLength,
  IsArray,
  ValidateNested,
  IsObject,
  ArrayMinSize,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PartialType, OmitType } from '@nestjs/mapped-types';

// DTO for variant options map (e.g., { "Size": "Large", "Color": "Red" })
export class VariantOptionsMapDto {
  [key: string]: string;
}

// DTO for creating a product variant
export class CreateVariantDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  sku: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  barcode?: string;

  @IsObject()
  options: Record<string, string>;

  // Pricing (optional - overrides product if set)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => value !== undefined ? parseFloat(value) : undefined)
  price?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => value !== undefined ? parseFloat(value) : undefined)
  compareAtPrice?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => value !== undefined ? parseFloat(value) : undefined)
  costPrice?: number;

  // Physical
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => value !== undefined ? parseFloat(value) : undefined)
  weight?: number;

  // Inventory
  @IsBoolean()
  @IsOptional()
  trackInventory?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  inventoryQuantity?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  lowStockThreshold?: number;

  // Status
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

// DTO for updating a product variant
export class UpdateVariantDto extends PartialType(CreateVariantDto) {}

// DTO for bulk creating variants
export class BulkCreateVariantsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  @ArrayMinSize(1)
  variants: CreateVariantDto[];
}

// DTO for bulk updating variants
export class BulkUpdateVariantDto {
  @IsString()
  id: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => value !== undefined ? parseFloat(value) : undefined)
  price?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => value !== undefined ? parseFloat(value) : undefined)
  compareAtPrice?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  inventoryQuantity?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

export class BulkUpdateVariantsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateVariantDto)
  @ArrayMinSize(1)
  variants: BulkUpdateVariantDto[];
}

// DTO for generating variant matrix
export class GenerateVariantsDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  optionIds: string[];

  @IsString()
  @IsOptional()
  skuPrefix?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => value !== undefined ? parseFloat(value) : undefined)
  defaultPrice?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  defaultInventory?: number;

  @IsBoolean()
  @IsOptional()
  trackInventory?: boolean;
}

// DTO for variant inventory update
export class UpdateInventoryDto {
  @IsInt()
  quantity: number;

  @IsString()
  @IsOptional()
  reason?: string;
}

// DTO for reordering variants
export class ReorderVariantsDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  variantIds: string[];
}
