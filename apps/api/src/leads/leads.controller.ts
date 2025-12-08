import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { LeadCaptureService } from './services/lead-capture.service';
import {
  CaptureFieldDto,
  CaptureFieldsDto,
  UpdateLeadDto,
  LeadQueryDto,
  ConvertLeadDto,
  AbandonLeadDto,
} from './dto/lead.dto';

@Controller('leads')
export class LeadsController {
  constructor(private leadCaptureService: LeadCaptureService) {}

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC ENDPOINTS (for funnel frontend)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Capture a single field (called on field blur)
   * POST /api/leads/capture/field
   */
  @Post('capture/field')
  async captureField(@Body() dto: CaptureFieldDto) {
    return this.leadCaptureService.captureField(dto);
  }

  /**
   * Capture multiple fields at once
   * POST /api/leads/capture/fields
   */
  @Post('capture/fields')
  async captureFields(@Body() dto: CaptureFieldsDto) {
    return this.leadCaptureService.captureFields(dto);
  }

  /**
   * Get lead by session token (for funnel to check existing data)
   * GET /api/leads/session/:sessionToken
   */
  @Get('session/:sessionToken')
  async getLeadBySession(@Param('sessionToken') sessionToken: string) {
    return this.leadCaptureService.getLeadBySession(sessionToken);
  }

  /**
   * Update cart from session data
   * POST /api/leads/session/:sessionToken/cart
   */
  @Post('session/:sessionToken/cart')
  async updateCart(@Param('sessionToken') sessionToken: string) {
    return this.leadCaptureService.updateCartFromSession(sessionToken);
  }

  /**
   * Mark lead as abandoned (called on exit/timeout)
   * POST /api/leads/session/:sessionToken/abandon
   */
  @Post('session/:sessionToken/abandon')
  async abandon(
    @Param('sessionToken') sessionToken: string,
    @Body() dto: AbandonLeadDto,
  ) {
    return this.leadCaptureService.markAbandoned(sessionToken, dto.reason);
  }

  // ═══════════════════════════════════════════════════════════════
  // AUTHENTICATED ENDPOINTS (for admin dashboard)
  // ═══════════════════════════════════════════════════════════════

  /**
   * List leads for company
   * GET /api/leads
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Query() query: LeadQueryDto,
    @Query('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const targetCompanyId = companyId || user.companyId;
    if (!targetCompanyId) {
      return { leads: [], total: 0 };
    }

    return this.leadCaptureService.findLeads(targetCompanyId, {
      status: query.status,
      source: query.source,
      funnelId: query.funnelId,
      search: query.search,
      minEngagement: query.minEngagement,
      minIntent: query.minIntent,
      limit: query.limit,
      offset: query.offset,
      orderBy: query.orderBy,
      order: query.order,
    });
  }

  /**
   * Get lead statistics
   * GET /api/leads/stats
   */
  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getStats(
    @Query('companyId') companyId: string,
    @Query('funnelId') funnelId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const targetCompanyId = companyId || user.companyId;
    if (!targetCompanyId) {
      return null;
    }

    return this.leadCaptureService.getLeadStats(targetCompanyId, funnelId);
  }

  /**
   * Get single lead by ID
   * GET /api/leads/:id
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    return this.leadCaptureService.getLeadById(id);
  }

  /**
   * Update lead
   * PATCH /api/leads/:id
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.leadCaptureService.updateLead(id, dto);
  }

  /**
   * Recalculate lead scores
   * POST /api/leads/:id/scores
   */
  @Post(':id/scores')
  @UseGuards(JwtAuthGuard)
  async updateScores(@Param('id') id: string) {
    return this.leadCaptureService.updateScores(id);
  }

  /**
   * Convert lead to customer
   * POST /api/leads/:id/convert
   */
  @Post(':id/convert')
  @UseGuards(JwtAuthGuard)
  async convert(@Param('id') id: string, @Body() dto: ConvertLeadDto) {
    return this.leadCaptureService.convertToCustomer(id, dto.customerId, dto.orderId);
  }
}
