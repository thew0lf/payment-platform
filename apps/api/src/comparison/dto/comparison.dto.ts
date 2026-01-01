import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a new product comparison
 */
export class CreateComparisonDto {
  @ApiPropertyOptional({ description: 'Site ID to associate comparison with' })
  @IsOptional()
  @IsString()
  siteId?: string;

  @ApiPropertyOptional({ description: 'Visitor ID for cross-session tracking' })
  @IsOptional()
  @IsString()
  visitorId?: string;

  @ApiPropertyOptional({
    description: 'Optional name for the comparison',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}

/**
 * DTO for adding a product to comparison
 */
export class AddToComparisonDto {
  @ApiProperty({ description: 'Product ID to add to comparison' })
  @IsString()
  productId: string;

  @ApiPropertyOptional({ description: 'Variant ID if applicable' })
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiPropertyOptional({
    description: 'Position in comparison (0-3)',
    minimum: 0,
    maximum: 3,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(3)
  position?: number;
}

/**
 * DTO for updating an item's position in the comparison
 */
export class UpdatePositionDto {
  @ApiProperty({ description: 'Comparison item ID' })
  @IsString()
  itemId: string;

  @ApiProperty({
    description: 'New position (0-3)',
    minimum: 0,
    maximum: 3,
  })
  @IsNumber()
  @Min(0)
  @Max(3)
  newPosition: number;
}

/**
 * DTO for reordering multiple items at once
 */
export class ReorderItemsDto {
  @ApiProperty({
    description: 'Array of item IDs in desired order',
    type: [String],
    maxItems: 4,
  })
  @IsString({ each: true })
  itemIds: string[];
}

/**
 * DTO for sharing a comparison
 */
export class ShareComparisonDto {
  @ApiPropertyOptional({
    description: 'Name for the shared comparison',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Number of days until the share link expires (1-30)',
    minimum: 1,
    maximum: 30,
    default: 7,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(30)
  expiresInDays?: number;
}

/**
 * DTO for updating comparison metadata
 */
export class UpdateComparisonDto {
  @ApiPropertyOptional({
    description: 'Name for the comparison',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}

/**
 * Query DTO for fetching comparisons
 */
export class ComparisonQueryDto {
  @ApiPropertyOptional({ description: 'Session token for anonymous comparisons' })
  @IsOptional()
  @IsString()
  sessionToken?: string;

  @ApiPropertyOptional({ description: 'Filter by site ID' })
  @IsOptional()
  @IsString()
  siteId?: string;

  @ApiPropertyOptional({ description: 'Include comparison items in response' })
  @IsOptional()
  @IsBoolean()
  includeItems?: boolean;
}

/**
 * DTO for accessing a shared comparison
 */
export class SharedComparisonQueryDto {
  @ApiProperty({ description: 'Share token for the comparison' })
  @IsString()
  @MinLength(32)
  @MaxLength(64)
  shareToken: string;
}

/**
 * DTO for merging comparisons (e.g., when user logs in)
 */
export class MergeComparisonsDto {
  @ApiProperty({ description: 'Source comparison ID to merge from' })
  @IsString()
  sourceComparisonId: string;
}

/**
 * DTO for duplicating a comparison
 */
export class DuplicateComparisonDto {
  @ApiPropertyOptional({
    description: 'Name for the duplicated comparison',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}
