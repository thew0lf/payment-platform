/**
 * Widget Controller
 *
 * Public endpoints for the embeddable review widget.
 * These endpoints do not require authentication.
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Ip,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { ReviewsService } from './services/reviews.service';
import { ReviewConfigService } from './services/review-config.service';
import { ReviewQueryDto, CreateReviewDto, ReviewVoteDto } from './review.types';
import { Public } from '../auth/decorators/public.decorator';

@Controller('widget/reviews')
export class WidgetController {
  constructor(
    private readonly reviewsService: ReviewsService,
    private readonly configService: ReviewConfigService,
  ) {}

  /**
   * Get public widget configuration
   * GET /api/widget/reviews/config
   */
  @Public()
  @Get('config')
  async getConfig(@Query('companyId') companyId: string) {
    if (!companyId) {
      throw new BadRequestException('companyId is required');
    }
    return this.configService.getWidgetConfig(companyId);
  }

  /**
   * Get approved reviews for a company/product (public)
   * GET /api/widget/reviews
   */
  @Public()
  @Get()
  async listReviews(@Query() query: ReviewQueryDto) {
    if (!query.companyId) {
      throw new BadRequestException('companyId is required');
    }

    // Force only approved reviews for public access
    const safeQuery: ReviewQueryDto = {
      ...query,
      status: 'APPROVED' as any,
    };

    return this.reviewsService.findAll(query.companyId, safeQuery);
  }

  /**
   * Get product review summary (public)
   * GET /api/widget/reviews/products/:productId/summary
   */
  @Public()
  @Get('products/:productId/summary')
  async getProductSummary(@Param('productId') productId: string) {
    return this.reviewsService.getProductSummary(productId);
  }

  /**
   * Submit a new review (public)
   * POST /api/widget/reviews
   */
  @Public()
  @Post()
  async submitReview(
    @Body() dto: CreateReviewDto,
    @Query('companyId') companyId: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    if (!companyId) {
      throw new BadRequestException('companyId is required');
    }

    // Check if widget is enabled and anonymous reviews are allowed
    const config = await this.configService.getConfig(companyId);
    if (!config.enabled) {
      throw new BadRequestException('Reviews are not enabled for this company');
    }

    if (!config.allowAnonymous && !dto.reviewerEmail) {
      throw new BadRequestException('Anonymous reviews are not allowed');
    }

    // Add source info
    const reviewDto: CreateReviewDto = {
      ...dto,
      source: 'WIDGET' as any,
    };

    const review = await this.reviewsService.create(companyId, reviewDto);

    // Store submission metadata
    // This could be enhanced to store IP, user agent, etc. for fraud prevention

    return {
      success: true,
      reviewId: review.id,
      status: review.status,
      message:
        review.status === 'APPROVED'
          ? 'Your review has been published!'
          : 'Your review has been submitted and is pending approval.',
    };
  }

  /**
   * Vote on a review (public)
   * POST /api/widget/reviews/:id/vote
   */
  @Public()
  @Post(':id/vote')
  async vote(
    @Param('id') id: string,
    @Body() dto: ReviewVoteDto,
    @Ip() ip: string,
  ) {
    // For public voting, use IP as identifier (no user ID)
    return this.reviewsService.vote(id, dto, null, ip);
  }
}
