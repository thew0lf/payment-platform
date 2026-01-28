import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsObject,
  IsArray,
  Min,
  Max,
  IsUUID,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddToCartDto {
  @ApiProperty({ description: 'Product ID to add' })
  @IsString()
  productId: string;

  @ApiPropertyOptional({ description: 'Variant ID if applicable' })
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiProperty({ description: 'Quantity to add', minimum: 1, maximum: 100 })
  @IsNumber()
  @Min(1)
  @Max(100)
  quantity: number;

  @ApiPropertyOptional({ description: 'Custom fields for the item' })
  @IsOptional()
  @IsObject()
  customFields?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Gift message' })
  @IsOptional()
  @IsString()
  giftMessage?: string;

  @ApiPropertyOptional({ description: 'Is this a gift?' })
  @IsOptional()
  @IsBoolean()
  isGift?: boolean;
}

export class UpdateCartItemDto {
  @ApiPropertyOptional({ description: 'New quantity', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  quantity?: number;

  @ApiPropertyOptional({ description: 'Custom fields' })
  @IsOptional()
  @IsObject()
  customFields?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Gift message' })
  @IsOptional()
  @IsString()
  giftMessage?: string;

  @ApiPropertyOptional({ description: 'Is this a gift?' })
  @IsOptional()
  @IsBoolean()
  isGift?: boolean;
}

export class ApplyDiscountDto {
  @ApiProperty({ description: 'Discount code to apply' })
  @IsString()
  code: string;
}

export class UpdateShippingDto {
  @ApiPropertyOptional({ description: 'Postal/ZIP code for shipping estimation' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Country code (ISO 3166-1 alpha-2)' })
  @IsOptional()
  @IsString()
  country?: string;
}

export class MergeCartsDto {
  @ApiProperty({ description: 'Source cart ID to merge from' })
  @IsString()
  sourceCartId: string;
}

export class CartQueryDto {
  @ApiPropertyOptional({ description: 'Session token for anonymous carts' })
  @IsOptional()
  @IsString()
  sessionToken?: string;

  @ApiPropertyOptional({ description: 'Filter by site ID' })
  @IsOptional()
  @IsString()
  siteId?: string;

  @ApiPropertyOptional({ description: 'Include saved for later items' })
  @IsOptional()
  @IsBoolean()
  includeSaved?: boolean;
}

export class CreateCartDto {
  @ApiPropertyOptional({ description: 'Site ID to associate cart with' })
  @IsOptional()
  @IsString()
  siteId?: string;

  @ApiPropertyOptional({ description: 'Visitor ID for cross-session tracking' })
  @IsOptional()
  @IsString()
  visitorId?: string;

  @ApiPropertyOptional({ description: 'Currency code (default: USD)' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'UTM source' })
  @IsOptional()
  @IsString()
  utmSource?: string;

  @ApiPropertyOptional({ description: 'UTM medium' })
  @IsOptional()
  @IsString()
  utmMedium?: string;

  @ApiPropertyOptional({ description: 'UTM campaign' })
  @IsOptional()
  @IsString()
  utmCampaign?: string;
}

export class SaveForLaterDto {
  @ApiProperty({ description: 'Cart item ID to save for later' })
  @IsString()
  itemId: string;
}

export class MoveToCartDto {
  @ApiProperty({ description: 'Saved item ID to move back to cart' })
  @IsString()
  savedItemId: string;

  @ApiPropertyOptional({ description: 'Quantity (default: original quantity)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;
}

/**
 * Bundle Cart DTOs
 */

export class BundleItemSelectionDto {
  @ApiProperty({ description: 'Product ID in bundle' })
  @IsString()
  productId: string;

  @ApiPropertyOptional({ description: 'Variant ID if applicable' })
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiProperty({ description: 'Quantity for this item', minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class AddBundleToCartDto {
  @ApiProperty({ description: 'Bundle ID to add' })
  @IsString()
  bundleId: string;

  @ApiPropertyOptional({ description: 'Selected items for mix-and-match bundles' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BundleItemSelectionDto)
  selectedItems?: BundleItemSelectionDto[];

  @ApiPropertyOptional({ description: 'Bundle quantity (default: 1)', minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;
}

export class RemoveBundleDto {
  @ApiProperty({ description: 'Bundle group ID to remove' })
  @IsString()
  bundleGroupId: string;
}

/**
 * Shipping Estimation DTOs
 */

export class EstimateShippingDto {
  @ApiProperty({ description: 'Country code (ISO 3166-1 alpha-2)', example: 'US' })
  @IsString()
  country: string;

  @ApiPropertyOptional({ description: 'State/Province code', example: 'CA' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ description: 'Postal/ZIP code', example: '94102' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ description: 'City name', example: 'San Francisco' })
  @IsOptional()
  @IsString()
  city?: string;
}

export class SelectShippingMethodDto {
  @ApiProperty({ description: 'Shipping rule/method ID to select' })
  @IsString()
  shippingMethodId: string;
}
