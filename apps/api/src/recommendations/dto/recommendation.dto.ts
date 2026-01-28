import {
  IsString,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// =============================================================================
// CONFIG DTOs
// =============================================================================

export class AlsoBoughtConfigDto {
  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({ example: 'Customers Who Bought This Also Bought' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  minCoOccurrences?: number;

  @ApiPropertyOptional({ example: 90 })
  @IsNumber()
  @Min(7)
  @IsOptional()
  lookbackDays?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsNumber()
  @Min(1)
  @Max(20)
  @IsOptional()
  maxResults?: number;

  @ApiPropertyOptional({ enum: ['CAROUSEL', 'GRID'] })
  @IsString()
  @IsOptional()
  displayStyle?: 'CAROUSEL' | 'GRID';

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  useAIRanking?: boolean;

  @ApiPropertyOptional()
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  excludeCategories?: string[];

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  boostHighMargin?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  boostInStock?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  showRatings?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  showQuickAdd?: boolean;
}

export class YouMightLikeConfigDto {
  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({ example: 'Recommended For You' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ example: 'You Might Also Like' })
  @IsString()
  @IsOptional()
  titleForGuests?: string;

  @ApiPropertyOptional({ example: 8 })
  @IsNumber()
  @Min(1)
  @Max(20)
  @IsOptional()
  maxResults?: number;

  @ApiPropertyOptional({ enum: ['CAROUSEL', 'GRID'] })
  @IsString()
  @IsOptional()
  displayStyle?: 'CAROUSEL' | 'GRID';

  @ApiPropertyOptional({ example: 0.3 })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  browsingWeight?: number;

  @ApiPropertyOptional({ example: 0.4 })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  purchaseWeight?: number;

  @ApiPropertyOptional({ example: 0.3 })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  contentWeight?: number;

  @ApiPropertyOptional({ example: 0.5 })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  diversityFactor?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  excludeRecentlyViewed?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  excludePurchased?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  showPersonalizationBadge?: boolean;
}

export class FrequentlyViewedConfigDto {
  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({ example: 'Frequently Viewed Together' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  minSessionCoViews?: number;

  @ApiPropertyOptional({ example: 60 })
  @IsNumber()
  @Min(7)
  @IsOptional()
  lookbackDays?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsNumber()
  @Min(2)
  @Max(5)
  @IsOptional()
  maxBundleSize?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsNumber()
  @Min(0)
  @Max(50)
  @IsOptional()
  bundleDiscountPercent?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  showBundleSavings?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  showAddAllButton?: boolean;

  @ApiPropertyOptional({ enum: ['BUNDLE_CARDS', 'COMPACT'] })
  @IsString()
  @IsOptional()
  displayStyle?: 'BUNDLE_CARDS' | 'COMPACT';
}

export class GlobalConfigDto {
  @ApiPropertyOptional({ example: 3 })
  @IsNumber()
  @Min(1)
  @Max(5)
  @IsOptional()
  maxSectionsPerPage?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  respectInventory?: boolean;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  minRatingToShow?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  trackImpressions?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  trackClicks?: boolean;
}

export class UpdateRecommendationConfigDto {
  @ApiPropertyOptional({ type: AlsoBoughtConfigDto })
  @ValidateNested()
  @Type(() => AlsoBoughtConfigDto)
  @IsOptional()
  alsoBought?: AlsoBoughtConfigDto;

  @ApiPropertyOptional({ type: YouMightLikeConfigDto })
  @ValidateNested()
  @Type(() => YouMightLikeConfigDto)
  @IsOptional()
  youMightLike?: YouMightLikeConfigDto;

  @ApiPropertyOptional({ type: FrequentlyViewedConfigDto })
  @ValidateNested()
  @Type(() => FrequentlyViewedConfigDto)
  @IsOptional()
  frequentlyViewed?: FrequentlyViewedConfigDto;

  @ApiPropertyOptional({ type: GlobalConfigDto })
  @ValidateNested()
  @Type(() => GlobalConfigDto)
  @IsOptional()
  global?: GlobalConfigDto;
}

// =============================================================================
// TRACKING DTOs
// =============================================================================

export class TrackProductViewDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiProperty()
  @IsString()
  sessionId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({ example: 'DIRECT' })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sourceProductId?: string;

  @ApiPropertyOptional({ example: 30 })
  @IsNumber()
  @IsOptional()
  duration?: number;
}

export class TrackRecommendationClickDto {
  @ApiProperty()
  @IsString()
  impressionId: string;

  @ApiProperty()
  @IsString()
  clickedProductId: string;
}

export class TrackAddToCartDto {
  @ApiProperty()
  @IsString()
  impressionId: string;
}

// =============================================================================
// QUERY DTOs
// =============================================================================

export class GetRecommendationsQueryDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sessionId?: string;

  @ApiPropertyOptional({ example: ['ALSO_BOUGHT', 'YOU_MIGHT_LIKE'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  sections?: string[];
}
