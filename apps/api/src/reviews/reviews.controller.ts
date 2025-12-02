import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
  Ip,
  Headers,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { HierarchyService } from '../hierarchy/hierarchy.service';
import { ReviewsService } from './services/reviews.service';
import { ReviewConfigService } from './services/review-config.service';
import {
  ReviewQueryDto,
  CreateReviewDto,
  UpdateReviewDto,
  ModerateReviewDto,
  MerchantResponseDto,
  ReviewVoteDto,
  UpdateReviewConfigDto,
} from './review.types';

@Controller('reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReviewsController {
  constructor(
    private readonly reviewsService: ReviewsService,
    private readonly configService: ReviewConfigService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCESS CONTROL HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private async verifyCompanyAccess(
    user: AuthenticatedUser,
    companyId: string,
  ): Promise<void> {
    const hasAccess = await this.hierarchyService.canAccessCompany(
      {
        sub: user.id,
        scopeType: user.scopeType as any,
        scopeId: user.scopeId,
        organizationId: user.organizationId,
        clientId: user.clientId,
        companyId: user.companyId,
      },
      companyId,
    );

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this company');
    }
  }

  private async getCompanyIdForQuery(
    user: AuthenticatedUser,
    requestedCompanyId?: string,
  ): Promise<string | undefined> {
    if (user.scopeType === 'COMPANY' || user.scopeType === 'DEPARTMENT') {
      return user.companyId || user.scopeId;
    }

    if (requestedCompanyId) {
      await this.verifyCompanyAccess(user, requestedCompanyId);
      return requestedCompanyId;
    }

    return undefined;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REVIEW ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * List reviews with filtering and pagination
   * GET /api/reviews
   */
  @Get()
  async list(
    @Query() query: ReviewQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyIdForQuery(user, query.companyId);
    return this.reviewsService.findAll(companyId, query);
  }

  /**
   * Get review statistics
   * GET /api/reviews/stats
   */
  @Get('stats')
  async getStats(
    @Query('companyId') requestedCompanyId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyIdForQuery(user, requestedCompanyId);
    if (!companyId) {
      throw new ForbiddenException('Company ID required for stats');
    }
    return this.reviewsService.getStats(companyId);
  }

  /**
   * Get product review summary
   * GET /api/reviews/products/:productId/summary
   */
  @Get('products/:productId/summary')
  async getProductSummary(
    @Param('productId') productId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reviewsService.getProductSummary(productId);
  }

  /**
   * Get a single review by ID
   * GET /api/reviews/:id
   */
  @Get(':id')
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const review = await this.reviewsService.findById(id);
    await this.verifyCompanyAccess(user, review.companyId);
    return review;
  }

  /**
   * Create a new review
   * POST /api/reviews
   */
  @Post()
  async create(
    @Body() dto: CreateReviewDto,
    @Query('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const targetCompanyId = await this.getCompanyIdForQuery(user, companyId);
    if (!targetCompanyId) {
      throw new ForbiddenException('Company ID required');
    }
    return this.reviewsService.create(targetCompanyId, dto);
  }

  /**
   * Update a review
   * PATCH /api/reviews/:id
   */
  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateReviewDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const review = await this.reviewsService.findById(id);
    await this.verifyCompanyAccess(user, review.companyId);
    return this.reviewsService.update(id, dto);
  }

  /**
   * Moderate a review (approve/reject/flag)
   * POST /api/reviews/:id/moderate
   */
  @Post(':id/moderate')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async moderate(
    @Param('id') id: string,
    @Body() dto: ModerateReviewDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const review = await this.reviewsService.findById(id);
    await this.verifyCompanyAccess(user, review.companyId);
    return this.reviewsService.moderate(id, dto, user.id);
  }

  /**
   * Add merchant response to a review
   * POST /api/reviews/:id/respond
   */
  @Post(':id/respond')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async addResponse(
    @Param('id') id: string,
    @Body() dto: MerchantResponseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const review = await this.reviewsService.findById(id);
    await this.verifyCompanyAccess(user, review.companyId);
    return this.reviewsService.addMerchantResponse(id, dto, user.id);
  }

  /**
   * Vote on a review (helpful/not helpful)
   * POST /api/reviews/:id/vote
   */
  @Post(':id/vote')
  async vote(
    @Param('id') id: string,
    @Body() dto: ReviewVoteDto,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.reviewsService.vote(id, dto, user.id, ip);
  }

  /**
   * Toggle featured status
   * POST /api/reviews/:id/feature
   */
  @Post(':id/feature')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async toggleFeatured(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const review = await this.reviewsService.findById(id);
    await this.verifyCompanyAccess(user, review.companyId);
    return this.reviewsService.toggleFeatured(id);
  }

  /**
   * Delete a review (soft delete)
   * DELETE /api/reviews/:id
   */
  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const review = await this.reviewsService.findById(id);
    await this.verifyCompanyAccess(user, review.companyId);
    await this.reviewsService.softDelete(id, user.id);
    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIG ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get review configuration
   * GET /api/reviews/config
   */
  @Get('config/current')
  async getConfig(
    @Query('companyId') requestedCompanyId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyIdForQuery(user, requestedCompanyId);
    if (!companyId) {
      throw new ForbiddenException('Company ID required');
    }
    return this.configService.getConfig(companyId);
  }

  /**
   * Update review configuration
   * PATCH /api/reviews/config
   */
  @Patch('config/current')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async updateConfig(
    @Query('companyId') requestedCompanyId: string | undefined,
    @Body() dto: UpdateReviewConfigDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyIdForQuery(user, requestedCompanyId);
    if (!companyId) {
      throw new ForbiddenException('Company ID required');
    }
    return this.configService.updateConfig(companyId, dto);
  }

  /**
   * Get widget embed code
   * GET /api/reviews/widget/embed
   */
  @Get('widget/embed')
  async getEmbedCode(
    @Query('companyId') requestedCompanyId: string | undefined,
    @Query('productId') productId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyIdForQuery(user, requestedCompanyId);
    if (!companyId) {
      throw new ForbiddenException('Company ID required');
    }
    const embedCode = await this.configService.generateEmbedCode(companyId, productId);
    return { embedCode };
  }
}
