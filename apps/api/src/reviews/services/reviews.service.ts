import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, ReviewStatus } from '@prisma/client';
import {
  ReviewQueryDto,
  CreateReviewDto,
  UpdateReviewDto,
  ModerateReviewDto,
  MerchantResponseDto,
  ReviewVoteDto,
  ReviewWithRelations,
  ReviewStats,
  ProductReviewSummary,
  ReviewListResponse,
} from '../review.types';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════════════════

  async findAll(
    companyId: string | undefined,
    query: ReviewQueryDto,
  ): Promise<ReviewListResponse> {
    const {
      productId,
      customerId,
      status,
      rating,
      isVerifiedPurchase,
      isFeatured,
      search,
      sortBy = 'newest',
      limit = 20,
      offset = 0,
    } = query;

    const where: Prisma.ProductReviewWhereInput = {
      deletedAt: null,
      ...(companyId && { companyId }),
      ...(productId && { productId }),
      ...(customerId && { customerId }),
      ...(status && { status }),
      ...(rating && { rating }),
      ...(isVerifiedPurchase !== undefined && { isVerifiedPurchase }),
      ...(isFeatured !== undefined && { isFeatured }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } },
          { reviewerName: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const orderBy = this.getOrderBy(sortBy);

    const [reviews, total] = await Promise.all([
      this.prisma.productReview.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
        include: {
          product: {
            select: { id: true, name: true, sku: true, images: true },
          },
          customer: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          media: {
            select: { id: true, type: true, url: true, thumbnailUrl: true },
            where: { isApproved: true },
          },
        },
      }),
      this.prisma.productReview.count({ where }),
    ]);

    return {
      reviews: reviews as ReviewWithRelations[],
      total,
      page: Math.floor(offset / limit) + 1,
      limit,
      hasMore: offset + reviews.length < total,
    };
  }

  async findById(id: string): Promise<ReviewWithRelations> {
    const review = await this.prisma.productReview.findFirst({
      where: { id, deletedAt: null },
      include: {
        product: {
          select: { id: true, name: true, sku: true, images: true },
        },
        customer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        media: {
          select: { id: true, type: true, url: true, thumbnailUrl: true },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return review as ReviewWithRelations;
  }

  async getStats(companyId: string): Promise<ReviewStats> {
    const [
      total,
      pending,
      approved,
      rejected,
      flagged,
      ratingStats,
      verifiedCount,
      respondedCount,
    ] = await Promise.all([
      this.prisma.productReview.count({ where: { companyId, deletedAt: null } }),
      this.prisma.productReview.count({ where: { companyId, status: 'PENDING', deletedAt: null } }),
      this.prisma.productReview.count({ where: { companyId, status: 'APPROVED', deletedAt: null } }),
      this.prisma.productReview.count({ where: { companyId, status: 'REJECTED', deletedAt: null } }),
      this.prisma.productReview.count({ where: { companyId, status: 'FLAGGED', deletedAt: null } }),
      this.prisma.productReview.groupBy({
        by: ['rating'],
        where: { companyId, deletedAt: null },
        _count: true,
      }),
      this.prisma.productReview.count({ where: { companyId, isVerifiedPurchase: true, deletedAt: null } }),
      this.prisma.productReview.count({ where: { companyId, merchantResponse: { not: null }, deletedAt: null } }),
    ]);

    // Calculate average rating
    const avgResult = await this.prisma.productReview.aggregate({
      where: { companyId, status: 'APPROVED', deletedAt: null },
      _avg: { rating: true },
    });

    // Build rating distribution
    const ratingDistribution = [1, 2, 3, 4, 5].map((r) => {
      const found = ratingStats.find((s) => s.rating === r);
      const count = found ? found._count : 0;
      return {
        rating: r,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      };
    });

    return {
      totalReviews: total,
      pendingReviews: pending,
      approvedReviews: approved,
      rejectedReviews: rejected,
      flaggedReviews: flagged,
      averageRating: avgResult._avg.rating || 0,
      ratingDistribution,
      verifiedPurchaseRate: total > 0 ? Math.round((verifiedCount / total) * 100) : 0,
      responseRate: total > 0 ? Math.round((respondedCount / total) * 100) : 0,
      averageResponseTime: null, // TODO: Calculate from timestamps
    };
  }

  async getProductSummary(productId: string): Promise<ProductReviewSummary> {
    const stats = await this.prisma.productReviewStats.findUnique({
      where: { productId },
    });

    if (!stats) {
      // Return empty stats if none exist
      return {
        productId,
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: [1, 2, 3, 4, 5].map((r) => ({ rating: r, count: 0 })),
        verifiedReviews: 0,
        verifiedAverageRating: 0,
        topKeywords: [],
      };
    }

    return {
      productId,
      totalReviews: stats.approvedReviews,
      averageRating: stats.averageRating,
      ratingDistribution: [
        { rating: 1, count: stats.rating1Count },
        { rating: 2, count: stats.rating2Count },
        { rating: 3, count: stats.rating3Count },
        { rating: 4, count: stats.rating4Count },
        { rating: 5, count: stats.rating5Count },
      ],
      verifiedReviews: stats.verifiedReviews,
      verifiedAverageRating: stats.verifiedAvgRating,
      topKeywords: (stats.topKeywords as string[]) || [],
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MUTATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async create(companyId: string, dto: CreateReviewDto): Promise<ReviewWithRelations> {
    // Check if product exists
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, companyId, deletedAt: null },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check for verified purchase if orderId provided
    let isVerifiedPurchase = false;
    let purchaseDate: Date | null = null;

    if (dto.orderId) {
      const order = await this.prisma.order.findFirst({
        where: {
          id: dto.orderId,
          companyId,
          customerId: dto.customerId,
          status: 'COMPLETED',
          items: { some: { productId: dto.productId } },
        },
      });

      if (order) {
        isVerifiedPurchase = true;
        purchaseDate = order.orderedAt;
      }
    }

    // Get review config for auto-approve logic
    const config = await this.prisma.reviewConfig.findUnique({
      where: { companyId },
    });

    let status: ReviewStatus = 'PENDING';
    if (config?.autoApprove) {
      if (!config.minRatingForAutoApprove || dto.rating >= config.minRatingForAutoApprove) {
        status = 'APPROVED';
      }
    }

    const review = await this.prisma.productReview.create({
      data: {
        companyId,
        productId: dto.productId,
        customerId: dto.customerId,
        orderId: dto.orderId,
        rating: dto.rating,
        title: dto.title,
        content: dto.content,
        pros: dto.pros || [],
        cons: dto.cons || [],
        reviewerName: dto.reviewerName,
        reviewerEmail: dto.reviewerEmail,
        isVerifiedPurchase,
        purchaseDate,
        status,
        source: dto.source || 'WEBSITE',
      },
      include: {
        product: {
          select: { id: true, name: true, sku: true, images: true },
        },
        customer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        media: {
          select: { id: true, type: true, url: true, thumbnailUrl: true },
        },
      },
    });

    // Update product stats if approved
    if (status === 'APPROVED') {
      await this.updateProductStats(dto.productId);
    }

    return review as ReviewWithRelations;
  }

  async update(id: string, dto: UpdateReviewDto): Promise<ReviewWithRelations> {
    const existing = await this.findById(id);

    const review = await this.prisma.productReview.update({
      where: { id },
      data: {
        rating: dto.rating,
        title: dto.title,
        content: dto.content,
        pros: dto.pros,
        cons: dto.cons,
      },
      include: {
        product: {
          select: { id: true, name: true, sku: true, images: true },
        },
        customer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        media: {
          select: { id: true, type: true, url: true, thumbnailUrl: true },
        },
      },
    });

    // Update stats if rating changed
    if (dto.rating && dto.rating !== existing.rating) {
      await this.updateProductStats(review.productId);
    }

    return review as ReviewWithRelations;
  }

  async moderate(
    id: string,
    dto: ModerateReviewDto,
    moderatedBy: string,
  ): Promise<ReviewWithRelations> {
    const existing = await this.findById(id);

    const review = await this.prisma.productReview.update({
      where: { id },
      data: {
        status: dto.status,
        moderationNotes: dto.moderationNotes,
        rejectReason: dto.rejectReason,
        moderatedAt: new Date(),
        moderatedBy,
      },
      include: {
        product: {
          select: { id: true, name: true, sku: true, images: true },
        },
        customer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        media: {
          select: { id: true, type: true, url: true, thumbnailUrl: true },
        },
      },
    });

    // Update stats when status changes
    await this.updateProductStats(review.productId);

    return review as ReviewWithRelations;
  }

  async addMerchantResponse(
    id: string,
    dto: MerchantResponseDto,
    respondedBy: string,
  ): Promise<ReviewWithRelations> {
    await this.findById(id); // Verify exists

    const review = await this.prisma.productReview.update({
      where: { id },
      data: {
        merchantResponse: dto.response,
        merchantRespondedAt: new Date(),
        merchantRespondedBy: respondedBy,
      },
      include: {
        product: {
          select: { id: true, name: true, sku: true, images: true },
        },
        customer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        media: {
          select: { id: true, type: true, url: true, thumbnailUrl: true },
        },
      },
    });

    return review as ReviewWithRelations;
  }

  async vote(
    reviewId: string,
    dto: ReviewVoteDto,
    customerId?: string,
    ipAddress?: string,
  ): Promise<{ helpfulCount: number; unhelpfulCount: number }> {
    const review = await this.findById(reviewId);

    // Check for existing vote
    const existingVote = await this.prisma.reviewVote.findFirst({
      where: {
        reviewId,
        OR: [
          ...(customerId ? [{ customerId }] : []),
          ...(ipAddress ? [{ ipAddress }] : []),
        ],
      },
    });

    if (existingVote) {
      // Update existing vote if different
      if (existingVote.isHelpful !== dto.isHelpful) {
        await this.prisma.reviewVote.update({
          where: { id: existingVote.id },
          data: { isHelpful: dto.isHelpful },
        });

        // Update counts
        if (dto.isHelpful) {
          await this.prisma.productReview.update({
            where: { id: reviewId },
            data: {
              helpfulCount: { increment: 1 },
              unhelpfulCount: { decrement: 1 },
            },
          });
        } else {
          await this.prisma.productReview.update({
            where: { id: reviewId },
            data: {
              helpfulCount: { decrement: 1 },
              unhelpfulCount: { increment: 1 },
            },
          });
        }
      }
    } else {
      // Create new vote
      await this.prisma.reviewVote.create({
        data: {
          reviewId,
          customerId,
          ipAddress,
          isHelpful: dto.isHelpful,
        },
      });

      // Update counts
      await this.prisma.productReview.update({
        where: { id: reviewId },
        data: dto.isHelpful
          ? { helpfulCount: { increment: 1 } }
          : { unhelpfulCount: { increment: 1 } },
      });
    }

    // Get updated counts
    const updated = await this.prisma.productReview.findUnique({
      where: { id: reviewId },
      select: { helpfulCount: true, unhelpfulCount: true },
    });

    return {
      helpfulCount: updated?.helpfulCount || 0,
      unhelpfulCount: updated?.unhelpfulCount || 0,
    };
  }

  async toggleFeatured(id: string): Promise<ReviewWithRelations> {
    const existing = await this.findById(id);

    const review = await this.prisma.productReview.update({
      where: { id },
      data: { isFeatured: !existing.isFeatured },
      include: {
        product: {
          select: { id: true, name: true, sku: true, images: true },
        },
        customer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        media: {
          select: { id: true, type: true, url: true, thumbnailUrl: true },
        },
      },
    });

    return review as ReviewWithRelations;
  }

  async softDelete(id: string, deletedBy: string): Promise<void> {
    const review = await this.findById(id);

    await this.prisma.productReview.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy,
      },
    });

    // Update stats
    await this.updateProductStats(review.productId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private getOrderBy(sortBy: string): Prisma.ProductReviewOrderByWithRelationInput {
    switch (sortBy) {
      case 'oldest':
        return { createdAt: 'asc' };
      case 'highest':
        return { rating: 'desc' };
      case 'lowest':
        return { rating: 'asc' };
      case 'helpful':
        return { helpfulCount: 'desc' };
      case 'newest':
      default:
        return { createdAt: 'desc' };
    }
  }

  private async updateProductStats(productId: string): Promise<void> {
    const stats = await this.prisma.productReview.aggregate({
      where: { productId, status: 'APPROVED', deletedAt: null },
      _count: true,
      _avg: { rating: true },
    });

    const verifiedStats = await this.prisma.productReview.aggregate({
      where: { productId, status: 'APPROVED', isVerifiedPurchase: true, deletedAt: null },
      _count: true,
      _avg: { rating: true },
    });

    const ratingCounts = await this.prisma.productReview.groupBy({
      by: ['rating'],
      where: { productId, status: 'APPROVED', deletedAt: null },
      _count: true,
    });

    const getRatingCount = (r: number) =>
      ratingCounts.find((c) => c.rating === r)?._count || 0;

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { companyId: true },
    });

    if (!product) return;

    await this.prisma.productReviewStats.upsert({
      where: { productId },
      create: {
        companyId: product.companyId,
        productId,
        totalReviews: stats._count,
        approvedReviews: stats._count,
        averageRating: stats._avg.rating || 0,
        rating1Count: getRatingCount(1),
        rating2Count: getRatingCount(2),
        rating3Count: getRatingCount(3),
        rating4Count: getRatingCount(4),
        rating5Count: getRatingCount(5),
        verifiedReviews: verifiedStats._count,
        verifiedAvgRating: verifiedStats._avg.rating || 0,
      },
      update: {
        totalReviews: stats._count,
        approvedReviews: stats._count,
        averageRating: stats._avg.rating || 0,
        rating1Count: getRatingCount(1),
        rating2Count: getRatingCount(2),
        rating3Count: getRatingCount(3),
        rating4Count: getRatingCount(4),
        rating5Count: getRatingCount(5),
        verifiedReviews: verifiedStats._count,
        verifiedAvgRating: verifiedStats._avg.rating || 0,
      },
    });
  }
}
