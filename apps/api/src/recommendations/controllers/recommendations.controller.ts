import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { ProductRecommendationService } from '../services/product-recommendation.service';
import {
  UpdateRecommendationConfigDto,
  TrackProductViewDto,
  TrackRecommendationClickDto,
  TrackAddToCartDto,
  GetRecommendationsQueryDto,
} from '../dto/recommendation.dto';

@ApiTags('Recommendations')
@Controller()
export class RecommendationsController {
  constructor(
    private readonly recommendationService: ProductRecommendationService,
  ) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS
  // ==========================================================================

  @Get('products/:productId/recommendations')
  @ApiOperation({ summary: 'Get recommendations for a product page' })
  async getProductRecommendations(
    @Param('productId') productId: string,
    @Query('companyId') companyId: string,
    @Query() query: GetRecommendationsQueryDto,
  ) {
    return this.recommendationService.getProductPageRecommendations(
      productId,
      companyId,
      query.customerId,
      query.sessionId,
    );
  }

  @Get('products/:productId/recommendations/also-bought')
  @ApiOperation({ summary: 'Get "Customers Also Bought" recommendations' })
  async getAlsoBoughtRecommendations(
    @Param('productId') productId: string,
    @Query('companyId') companyId: string,
  ) {
    const config = await this.recommendationService.getRecommendationConfig(companyId);
    return this.recommendationService.getAlsoBoughtRecommendations(
      productId,
      companyId,
      config.alsoBought,
    );
  }

  @Get('products/:productId/recommendations/you-might-like')
  @ApiOperation({ summary: 'Get "You Might Like" recommendations' })
  async getYouMightLikeRecommendations(
    @Param('productId') productId: string,
    @Query('companyId') companyId: string,
    @Query('customerId') customerId?: string,
    @Query('sessionId') sessionId?: string,
  ) {
    const config = await this.recommendationService.getRecommendationConfig(companyId);
    return this.recommendationService.getYouMightLikeRecommendations(
      productId,
      companyId,
      customerId,
      sessionId,
      config.youMightLike,
    );
  }

  @Get('products/:productId/recommendations/frequently-viewed')
  @ApiOperation({ summary: 'Get "Frequently Viewed Together" recommendations' })
  async getFrequentlyViewedRecommendations(
    @Param('productId') productId: string,
    @Query('companyId') companyId: string,
  ) {
    const config = await this.recommendationService.getRecommendationConfig(companyId);
    return this.recommendationService.getFrequentlyViewedRecommendations(
      productId,
      companyId,
      config.frequentlyViewed,
    );
  }

  // ==========================================================================
  // TRACKING ENDPOINTS (Public)
  // ==========================================================================

  @Post('recommendations/view')
  @ApiOperation({ summary: 'Track a product view' })
  async trackProductView(
    @Body() dto: TrackProductViewDto,
    @Query('companyId') companyId: string,
  ) {
    await this.recommendationService.trackProductView({
      productId: dto.productId,
      companyId,
      sessionId: dto.sessionId,
      customerId: dto.customerId,
      source: dto.source,
      sourceProductId: dto.sourceProductId,
      duration: dto.duration,
    });
    return { success: true };
  }

  @Post('recommendations/click')
  @ApiOperation({ summary: 'Track recommendation click' })
  async trackClick(@Body() dto: TrackRecommendationClickDto) {
    await this.recommendationService.trackRecommendationClick(
      dto.impressionId,
      dto.clickedProductId,
    );
    return { success: true };
  }

  @Post('recommendations/add-to-cart')
  @ApiOperation({ summary: 'Track add to cart from recommendation' })
  async trackAddToCart(@Body() dto: TrackAddToCartDto) {
    await this.recommendationService.trackRecommendationAddToCart(dto.impressionId);
    return { success: true };
  }

  // ==========================================================================
  // ADMIN ENDPOINTS
  // ==========================================================================

  @Get('admin/recommendations/config')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get recommendation configuration' })
  async getConfig(@CurrentUser() user: AuthenticatedUser) {
    const companyId = this.getCompanyId(user);
    return this.recommendationService.getRecommendationConfig(companyId);
  }

  @Put('admin/recommendations/config')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update recommendation configuration' })
  async updateConfig(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateRecommendationConfigDto,
  ) {
    const companyId = this.getCompanyId(user);
    return this.recommendationService.updateRecommendationConfig(
      companyId,
      dto as unknown as Partial<import('../types/recommendation.types').RecommendationConfigData>,
    );
  }

  @Get('admin/recommendations/preview/:productId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Preview recommendations for a product (admin)' })
  async previewRecommendations(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
  ) {
    const companyId = this.getCompanyId(user);
    return this.recommendationService.getProductPageRecommendations(
      productId,
      companyId,
    );
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private getCompanyId(user: AuthenticatedUser): string {
    if (user.scopeType === 'COMPANY') {
      return user.scopeId;
    }
    if (user.companyId) {
      return user.companyId;
    }
    throw new ForbiddenException('Company context required for this operation');
  }
}
