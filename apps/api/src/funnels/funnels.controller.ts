import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  Ip,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { FunnelsService, FunnelSessionsService, FunnelAnalyticsService } from './services';
import { FunnelPaymentService, FunnelCheckoutDto } from './services/funnel-payment.service';
import {
  CreateFunnelDto,
  UpdateFunnelDto,
  PublishFunnelDto,
  CreateStageDto,
  UpdateStageDto,
  ReorderStagesDto,
  CreateVariantDto,
  UpdateVariantDto,
  CreateSessionDto,
  UpdateSessionDto,
  TrackEventDto,
  FunnelQueryDto,
} from './dto/funnel.dto';

// ═══════════════════════════════════════════════════════════════
// AUTHENTICATED FUNNEL MANAGEMENT ENDPOINTS
// ═══════════════════════════════════════════════════════════════

@Controller('funnels')
@UseGuards(JwtAuthGuard)
export class FunnelsController {
  constructor(
    private readonly funnelsService: FunnelsService,
    private readonly sessionsService: FunnelSessionsService,
    private readonly analyticsService: FunnelAnalyticsService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // FUNNEL CRUD
  // ─────────────────────────────────────────────────────────────

  @Post()
  async create(
    @Body() dto: CreateFunnelDto,
    @Query('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.funnelsService.create(companyId, dto, user.id);
  }

  @Get()
  async findAll(@Query() query: FunnelQueryDto) {
    return this.funnelsService.findAll(query);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.funnelsService.findOne(id, companyId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateFunnelDto,
    @Query('companyId') companyId?: string,
  ) {
    return this.funnelsService.update(id, dto, companyId);
  }

  @Post(':id/publish')
  async publish(
    @Param('id') id: string,
    @Body() dto: PublishFunnelDto,
    @Query('companyId') companyId?: string,
  ) {
    return this.funnelsService.publish(id, dto.publish !== false, companyId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @Query('companyId') companyId?: string,
  ) {
    await this.funnelsService.delete(id, companyId);
  }

  @Post(':id/duplicate')
  async duplicate(
    @Param('id') id: string,
    @Query('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.funnelsService.duplicate(id, companyId, user.id);
  }

  // ─────────────────────────────────────────────────────────────
  // STAGE MANAGEMENT
  // ─────────────────────────────────────────────────────────────

  @Post(':funnelId/stages')
  async createStage(
    @Param('funnelId') funnelId: string,
    @Body() dto: CreateStageDto,
    @Query('companyId') companyId?: string,
  ) {
    return this.funnelsService.createStage(funnelId, dto, companyId);
  }

  @Patch(':funnelId/stages/:stageId')
  async updateStage(
    @Param('funnelId') funnelId: string,
    @Param('stageId') stageId: string,
    @Body() dto: UpdateStageDto,
    @Query('companyId') companyId?: string,
  ) {
    return this.funnelsService.updateStage(funnelId, stageId, dto, companyId);
  }

  @Delete(':funnelId/stages/:stageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteStage(
    @Param('funnelId') funnelId: string,
    @Param('stageId') stageId: string,
    @Query('companyId') companyId?: string,
  ) {
    await this.funnelsService.deleteStage(funnelId, stageId, companyId);
  }

  @Post(':funnelId/stages/reorder')
  async reorderStages(
    @Param('funnelId') funnelId: string,
    @Body() dto: ReorderStagesDto,
    @Query('companyId') companyId?: string,
  ) {
    return this.funnelsService.reorderStages(funnelId, dto, companyId);
  }

  // ─────────────────────────────────────────────────────────────
  // VARIANT MANAGEMENT
  // ─────────────────────────────────────────────────────────────

  @Post(':funnelId/variants')
  async createVariant(
    @Param('funnelId') funnelId: string,
    @Body() dto: CreateVariantDto,
    @Query('companyId') companyId?: string,
  ) {
    return this.funnelsService.createVariant(funnelId, dto, companyId);
  }

  @Patch(':funnelId/variants/:variantId')
  async updateVariant(
    @Param('funnelId') funnelId: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateVariantDto,
    @Query('companyId') companyId?: string,
  ) {
    return this.funnelsService.updateVariant(funnelId, variantId, dto, companyId);
  }

  @Delete(':funnelId/variants/:variantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteVariant(
    @Param('funnelId') funnelId: string,
    @Param('variantId') variantId: string,
    @Query('companyId') companyId?: string,
  ) {
    await this.funnelsService.deleteVariant(funnelId, variantId, companyId);
  }

  // ─────────────────────────────────────────────────────────────
  // ANALYTICS
  // ─────────────────────────────────────────────────────────────

  @Get('stats/overview')
  async getCompanyStats(@Query('companyId') companyId: string) {
    return this.analyticsService.getCompanyFunnelStats(companyId);
  }

  @Get(':id/analytics')
  async getAnalytics(
    @Param('id') id: string,
    @Query('companyId') companyId?: string,
    @Query('days') days?: string,
  ) {
    return this.analyticsService.getAnalytics(id, companyId, days ? parseInt(days, 10) : 30);
  }
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC FUNNEL SESSION ENDPOINTS (No Auth Required)
// ═══════════════════════════════════════════════════════════════

@Controller('f')
export class PublicFunnelController {
  constructor(
    private readonly funnelsService: FunnelsService,
    private readonly sessionsService: FunnelSessionsService,
    private readonly paymentService: FunnelPaymentService,
  ) {}

  // Get funnel by SEO-friendly URL (public) - /api/f/{slug}-{shortId}
  // Example: /api/f/summer-sale-x7Kq3m
  @Get(':seoSlug')
  async getFunnelBySeoSlug(@Param('seoSlug') seoSlug: string) {
    return this.funnelsService.findBySeoSlug(seoSlug);
  }

  // Start a new session
  @Post(':funnelId/sessions')
  async startSession(
    @Param('funnelId') funnelId: string,
    @Body() dto: CreateSessionDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.sessionsService.create(funnelId, dto, { ip, userAgent });
  }

  // Get session by token
  @Get('sessions/:sessionToken')
  async getSession(@Param('sessionToken') sessionToken: string) {
    return this.sessionsService.findByToken(sessionToken);
  }

  // Update session data
  @Patch('sessions/:sessionToken')
  async updateSession(
    @Param('sessionToken') sessionToken: string,
    @Body() dto: UpdateSessionDto,
  ) {
    return this.sessionsService.update(sessionToken, dto);
  }

  // Track event
  @Post('sessions/:sessionToken/events')
  async trackEvent(
    @Param('sessionToken') sessionToken: string,
    @Body() dto: TrackEventDto,
  ) {
    return this.sessionsService.trackEvent(sessionToken, dto);
  }

  // Advance to next stage
  @Post('sessions/:sessionToken/advance')
  async advanceStage(
    @Param('sessionToken') sessionToken: string,
    @Body('toStageOrder') toStageOrder: number,
  ) {
    return this.sessionsService.advanceStage(sessionToken, toStageOrder);
  }

  // Complete session (order placed)
  @Post('sessions/:sessionToken/complete')
  async completeSession(
    @Param('sessionToken') sessionToken: string,
    @Body() body: { orderId: string; totalAmount: number; currency: string },
  ) {
    return this.sessionsService.complete(
      sessionToken,
      body.orderId,
      body.totalAmount,
      body.currency,
    );
  }

  // Abandon session
  @Post('sessions/:sessionToken/abandon')
  async abandonSession(@Param('sessionToken') sessionToken: string) {
    return this.sessionsService.abandon(sessionToken);
  }

  // ─────────────────────────────────────────────────────────────
  // CHECKOUT / PAYMENT ENDPOINTS
  // ─────────────────────────────────────────────────────────────

  /**
   * Get checkout summary before processing payment
   * GET /api/f/sessions/:sessionToken/checkout
   */
  @Get('sessions/:sessionToken/checkout')
  async getCheckoutSummary(@Param('sessionToken') sessionToken: string) {
    return this.paymentService.getCheckoutSummary(sessionToken);
  }

  /**
   * Process checkout / payment
   * POST /api/f/sessions/:sessionToken/checkout
   *
   * This is the main checkout endpoint that:
   * 1. Validates the session
   * 2. Stores card temporarily (encrypted)
   * 3. Processes payment
   * 4. Creates customer if needed
   * 5. Creates order
   * 6. Vaults card if requested
   * 7. Completes funnel session
   * 8. Converts lead to customer
   */
  @Post('sessions/:sessionToken/checkout')
  async processCheckout(
    @Param('sessionToken') sessionToken: string,
    @Body() dto: Omit<FunnelCheckoutDto, 'sessionToken'>,
  ) {
    return this.paymentService.processCheckout({
      sessionToken,
      ...dto,
    });
  }
}
