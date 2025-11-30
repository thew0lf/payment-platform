import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsEnum,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import { BundleType, BundlePricing, AdjustmentType } from '@prisma/client';

export class BundleItemInput {
  @IsString()
  productId: string;

  @IsString()
  @IsOptional()
  variantId?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  quantity?: number;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsNumber()
  @IsOptional()
  priceOverride?: number;
}

export class CreateBundleDto {
  @IsString()
  productId: string;

  @IsEnum(BundleType)
  @IsOptional()
  type?: BundleType;

  @IsEnum(BundlePricing)
  @IsOptional()
  pricingStrategy?: BundlePricing;

  @IsEnum(AdjustmentType)
  @IsOptional()
  discountType?: AdjustmentType;

  @IsNumber()
  @IsOptional()
  discountValue?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  minItems?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  maxItems?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BundleItemInput)
  @IsOptional()
  items?: BundleItemInput[];
}

export class UpdateBundleDto extends PartialType(CreateBundleDto) {
  // Exclude productId from updates - bundles are tied to their product
  productId?: never;
}

export class AddBundleItemDto {
  @IsString()
  productId: string;

  @IsString()
  @IsOptional()
  variantId?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  quantity?: number;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsNumber()
  @IsOptional()
  priceOverride?: number;
}

export class UpdateBundleItemDto {
  @IsNumber()
  @IsOptional()
  @Min(1)
  quantity?: number;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsNumber()
  @IsOptional()
  priceOverride?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  sortOrder?: number;
}

export class ReorderBundleItemsDto {
  @IsArray()
  @IsString({ each: true })
  itemIds: string[];
}
