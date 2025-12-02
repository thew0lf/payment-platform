/**
 * Review Types
 *
 * TypeScript types and DTOs for the Product Reviews & Ratings system.
 */

import { ReviewStatus, ReviewSource } from '@prisma/client';
import { IsOptional, IsString, IsNumber, IsEnum, IsBoolean, IsArray, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

// Re-export Prisma enums
export { ReviewStatus, ReviewSource };

// ═══════════════════════════════════════════════════════════════════════════
// QUERY DTOs
// ═══════════════════════════════════════════════════════════════════════════

export class ReviewQueryDto {
  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsEnum(ReviewStatus)
  status?: ReviewStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isVerifiedPurchase?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isFeatured?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy?: 'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful';

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

  @IsOptional()
  @IsString()
  cursor?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CREATE/UPDATE DTOs
// ═══════════════════════════════════════════════════════════════════════════

export class CreateReviewDto {
  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pros?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cons?: string[];

  @IsOptional()
  @IsString()
  reviewerName?: string;

  @IsOptional()
  @IsString()
  reviewerEmail?: string;

  @IsOptional()
  @IsEnum(ReviewSource)
  source?: ReviewSource;
}

export class UpdateReviewDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pros?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cons?: string[];
}

export class ModerateReviewDto {
  @IsEnum(ReviewStatus)
  status: ReviewStatus;

  @IsOptional()
  @IsString()
  moderationNotes?: string;

  @IsOptional()
  @IsString()
  rejectReason?: string;
}

export class MerchantResponseDto {
  @IsString()
  response: string;
}

export class ReviewVoteDto {
  @IsBoolean()
  isHelpful: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG DTOs
// ═══════════════════════════════════════════════════════════════════════════

export class UpdateReviewConfigDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  autoApprove?: boolean;

  @IsOptional()
  @IsBoolean()
  requireVerifiedPurchase?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  minRatingForAutoApprove?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  moderationKeywords?: string[];

  @IsOptional()
  @IsBoolean()
  showVerifiedBadge?: boolean;

  @IsOptional()
  @IsBoolean()
  showReviewerName?: boolean;

  @IsOptional()
  @IsBoolean()
  showReviewDate?: boolean;

  @IsOptional()
  @IsBoolean()
  allowAnonymous?: boolean;

  @IsOptional()
  @IsString()
  sortDefault?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minReviewLength?: number;

  @IsOptional()
  @IsNumber()
  @Max(10000)
  maxReviewLength?: number;

  @IsOptional()
  @IsBoolean()
  allowMedia?: boolean;

  @IsOptional()
  @IsNumber()
  @Max(10)
  maxMediaPerReview?: number;

  @IsOptional()
  @IsBoolean()
  allowProsAndCons?: boolean;

  @IsOptional()
  @IsBoolean()
  sendReviewRequest?: boolean;

  @IsOptional()
  @IsNumber()
  reviewRequestDelay?: number;

  @IsOptional()
  @IsString()
  widgetTheme?: string;

  @IsOptional()
  @IsString()
  widgetPrimaryColor?: string;

  @IsOptional()
  @IsBoolean()
  enableRichSnippets?: boolean;

  @IsOptional()
  @IsBoolean()
  incentiveEnabled?: boolean;

  @IsOptional()
  @IsString()
  incentiveType?: string;

  @IsOptional()
  @IsString()
  incentiveValue?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ReviewWithRelations {
  id: string;
  companyId: string;
  productId: string;
  customerId: string | null;
  orderId: string | null;
  rating: number;
  title: string | null;
  content: string | null;
  pros: string[];
  cons: string[];
  reviewerName: string | null;
  isVerifiedPurchase: boolean;
  status: ReviewStatus;
  helpfulCount: number;
  unhelpfulCount: number;
  merchantResponse: string | null;
  merchantRespondedAt: Date | null;
  isFeatured: boolean;
  isPinned: boolean;
  createdAt: Date;
  product?: {
    id: string;
    name: string;
    sku: string;
    images: any;
  };
  customer?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  media?: {
    id: string;
    type: string;
    url: string;
    thumbnailUrl: string | null;
  }[];
}

export interface ReviewStats {
  totalReviews: number;
  pendingReviews: number;
  approvedReviews: number;
  rejectedReviews: number;
  flaggedReviews: number;
  averageRating: number;
  ratingDistribution: {
    rating: number;
    count: number;
    percentage: number;
  }[];
  verifiedPurchaseRate: number;
  responseRate: number;
  averageResponseTime: number | null;
}

export interface ProductReviewSummary {
  productId: string;
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    rating: number;
    count: number;
  }[];
  verifiedReviews: number;
  verifiedAverageRating: number;
  topKeywords: string[];
}

export interface ReviewListResponse {
  reviews: ReviewWithRelations[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
