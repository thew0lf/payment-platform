import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsUUID,
  Min,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWishlistDto {
  @ApiPropertyOptional({
    description: 'Wishlist name',
    example: 'My Favorites',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Site ID to associate wishlist with' })
  @IsOptional()
  @IsString()
  siteId?: string;

  @ApiPropertyOptional({
    description: 'Make wishlist publicly shareable',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class AddToWishlistDto {
  @ApiProperty({ description: 'Product ID to add to wishlist' })
  @IsString()
  productId: string;

  @ApiPropertyOptional({ description: 'Variant ID if applicable' })
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiPropertyOptional({
    description: 'Priority/order of item (1 = highest)',
    minimum: 1,
    maximum: 1000,
    default: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  priority?: number;

  @ApiPropertyOptional({
    description: 'Personal notes about this item',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateWishlistDto {
  @ApiPropertyOptional({
    description: 'Wishlist name',
    example: 'Birthday Wishlist',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Make wishlist publicly shareable',
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class UpdateWishlistItemDto {
  @ApiPropertyOptional({
    description: 'Priority/order of item (1 = highest)',
    minimum: 1,
    maximum: 1000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  priority?: number;

  @ApiPropertyOptional({
    description: 'Personal notes about this item',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class ShareWishlistDto {
  @ApiProperty({
    description: 'Enable or disable public sharing',
    example: true,
  })
  @IsBoolean()
  isPublic: boolean;
}

export class MoveToCartDto {
  @ApiProperty({ description: 'Wishlist item ID to move to cart' })
  @IsString()
  itemId: string;

  @ApiPropertyOptional({
    description: 'Quantity to add to cart (default: 1)',
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  quantity?: number;

  @ApiPropertyOptional({
    description: 'Remove item from wishlist after adding to cart',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  removeFromWishlist?: boolean;
}

export class WishlistQueryDto {
  @ApiPropertyOptional({ description: 'Session token for anonymous wishlists' })
  @IsOptional()
  @IsString()
  sessionToken?: string;

  @ApiPropertyOptional({ description: 'Filter by site ID' })
  @IsOptional()
  @IsString()
  siteId?: string;

  @ApiPropertyOptional({ description: 'Include wishlist items in response' })
  @IsOptional()
  @IsBoolean()
  includeItems?: boolean;

  @ApiPropertyOptional({ description: 'Filter by public/private status' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class BulkMoveToCartDto {
  @ApiProperty({
    description: 'Array of wishlist item IDs to move to cart',
    example: ['item-1', 'item-2'],
  })
  @IsString({ each: true })
  itemIds: string[];

  @ApiPropertyOptional({
    description: 'Remove items from wishlist after adding to cart',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  removeFromWishlist?: boolean;
}

export class ReorderWishlistItemsDto {
  @ApiProperty({
    description: 'Array of item IDs in the desired order',
    example: ['item-3', 'item-1', 'item-2'],
  })
  @IsString({ each: true })
  itemIds: string[];
}
