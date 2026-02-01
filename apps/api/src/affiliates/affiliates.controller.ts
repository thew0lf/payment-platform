import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AffiliatePartnersService, PartnerFilters } from './services/affiliate-partners.service';
import { AffiliateLinksService, LinkFilters } from './services/affiliate-links.service';
import { AffiliateTrackingService } from './services/affiliate-tracking.service';
import { AffiliatePayoutsService } from './services/affiliate-payouts.service';
import { AffiliateAnalyticsService, AnalyticsFilters, SubIdReportFilters } from './services/affiliate-analytics.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto, ApprovePartnerDto, RejectPartnerDto } from './dto/update-partner.dto';
import { CreateLinkDto, UpdateLinkDto } from './dto/create-link.dto';
import { ClickQueryDto } from './dto/track-click.dto';
import { ConversionQueryDto, UpdateConversionDto } from './dto/track-conversion.dto';
import {
  CreatePayoutBatchDto,
  CreateSinglePayoutDto,
  UpdatePayoutDto,
  ProcessPayoutDto,
  PayoutQueryDto,
} from './dto/payout.dto';
import { AffiliateStatus } from '@prisma/client';

@Controller('affiliates')
@UseGuards(JwtAuthGuard)
export class AffiliatesController {
  constructor(
    private readonly partnersService: AffiliatePartnersService,
    private readonly linksService: AffiliateLinksService,
    private readonly trackingService: AffiliateTrackingService,
    private readonly payoutsService: AffiliatePayoutsService,
    private readonly analyticsService: AffiliateAnalyticsService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // PARTNERS
  // ═══════════════════════════════════════════════════════════════

  @Get('partners')
  async listPartners(
    @Request() req,
    @Query('companyId') companyId?: string,
    @Query('status') status?: AffiliateStatus,
    @Query('tier') tier?: string,
    @Query('partnershipType') partnershipType?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const filters: PartnerFilters = {
      companyId,
      status,
      tier,
      partnershipType,
      search,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    };
    return this.partnersService.findAll(req.user, filters);
  }

  @Get('partners/stats')
  async getPartnerStats(
    @Request() req,
    @Query('companyId') companyId?: string,
  ) {
    return this.partnersService.getStats(req.user, { companyId });
  }

  @Get('partners/:id')
  async getPartner(@Request() req, @Param('id') id: string) {
    return this.partnersService.findById(req.user, id);
  }

  @Post('partners')
  async createPartner(@Request() req, @Body() dto: CreatePartnerDto) {
    return this.partnersService.create(req.user, dto);
  }

  @Patch('partners/:id')
  async updatePartner(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdatePartnerDto,
  ) {
    return this.partnersService.update(req.user, id, dto);
  }

  @Post('partners/:id/approve')
  async approvePartner(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: ApprovePartnerDto,
  ) {
    return this.partnersService.approve(req.user, id, dto);
  }

  @Post('partners/:id/reject')
  async rejectPartner(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: RejectPartnerDto,
  ) {
    return this.partnersService.reject(req.user, id, dto);
  }

  @Delete('partners/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivatePartner(@Request() req, @Param('id') id: string) {
    return this.partnersService.deactivate(req.user, id);
  }

  // ═══════════════════════════════════════════════════════════════
  // LINKS
  // ═══════════════════════════════════════════════════════════════

  @Get('links')
  async listLinks(
    @Request() req,
    @Query('companyId') companyId?: string,
    @Query('partnerId') partnerId?: string,
    @Query('isActive') isActive?: string,
    @Query('campaign') campaign?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const filters: LinkFilters = {
      companyId,
      partnerId,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      campaign,
      search,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    };
    return this.linksService.findAll(req.user, filters);
  }

  @Get('links/:id')
  async getLink(@Request() req, @Param('id') id: string) {
    return this.linksService.findById(req.user, id);
  }

  @Post('links')
  async createLink(@Request() req, @Body() dto: CreateLinkDto) {
    return this.linksService.create(req.user, dto);
  }

  @Patch('links/:id')
  async updateLink(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateLinkDto,
  ) {
    return this.linksService.update(req.user, id, dto);
  }

  @Delete('links/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteLink(@Request() req, @Param('id') id: string) {
    return this.linksService.delete(req.user, id);
  }

  // ═══════════════════════════════════════════════════════════════
  // CLICKS
  // ═══════════════════════════════════════════════════════════════

  @Get('clicks')
  async listClicks(@Request() req, @Query() query: ClickQueryDto) {
    return this.trackingService.getClicks(req.user, query);
  }

  @Get('clicks/queue-stats')
  async getClickQueueStats() {
    return this.trackingService.getQueueStats();
  }

  // ═══════════════════════════════════════════════════════════════
  // CONVERSIONS
  // ═══════════════════════════════════════════════════════════════

  @Get('conversions')
  async listConversions(@Request() req, @Query() query: ConversionQueryDto) {
    return this.trackingService.getConversions(req.user, query);
  }

  // ═══════════════════════════════════════════════════════════════
  // PAYOUTS
  // ═══════════════════════════════════════════════════════════════

  @Get('payouts')
  async listPayouts(@Request() req, @Query() query: PayoutQueryDto) {
    return this.payoutsService.findAll(req.user, query);
  }

  @Get('payouts/stats')
  async getPayoutStats(
    @Request() req,
    @Query('companyId') companyId?: string,
  ) {
    return this.payoutsService.getStats(req.user, { companyId });
  }

  @Get('payouts/:id')
  async getPayout(@Request() req, @Param('id') id: string) {
    return this.payoutsService.findById(req.user, id);
  }

  @Post('payouts/batch')
  async createPayoutBatch(@Request() req, @Body() dto: CreatePayoutBatchDto) {
    return this.payoutsService.createBatch(req.user, dto);
  }

  @Post('payouts')
  async createPayout(@Request() req, @Body() dto: CreateSinglePayoutDto) {
    return this.payoutsService.createSingle(req.user, dto);
  }

  @Patch('payouts/:id')
  async updatePayout(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdatePayoutDto,
  ) {
    return this.payoutsService.update(req.user, id, dto);
  }

  @Post('payouts/:id/process')
  async processPayout(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: ProcessPayoutDto,
  ) {
    return this.payoutsService.process(req.user, id, dto);
  }

  @Post('payouts/:id/approve')
  async approvePayout(@Request() req, @Param('id') id: string) {
    return this.payoutsService.approve(req.user, id);
  }

  @Post('payouts/:id/hold')
  async holdPayout(
    @Request() req,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.payoutsService.hold(req.user, id, reason);
  }

  // ═══════════════════════════════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════════════════════════════

  @Get('analytics')
  async getDashboardAnalytics(
    @Request() req,
    @Query('companyId') companyId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters: AnalyticsFilters = { companyId, startDate, endDate };
    return this.analyticsService.getDashboard(req.user, filters);
  }

  @Get('analytics/partners')
  async getPartnerPerformance(
    @Request() req,
    @Query('companyId') companyId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters: AnalyticsFilters = { companyId, startDate, endDate };
    return this.analyticsService.getPerformanceByPartner(req.user, filters);
  }

  @Get('analytics/links')
  async getLinkPerformance(
    @Request() req,
    @Query('companyId') companyId?: string,
    @Query('partnerId') partnerId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters: AnalyticsFilters = { companyId, partnerId, startDate, endDate };
    return this.analyticsService.getPerformanceByLink(req.user, filters);
  }

  @Get('analytics/time-series')
  async getTimeSeries(
    @Request() req,
    @Query('companyId') companyId?: string,
    @Query('partnerId') partnerId?: string,
    @Query('linkId') linkId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters: AnalyticsFilters = { companyId, partnerId, linkId, startDate, endDate };
    return this.analyticsService.getTimeSeries(req.user, filters);
  }

  @Get('analytics/top-performers')
  async getTopPerformers(
    @Request() req,
    @Query('companyId') companyId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters: AnalyticsFilters = { companyId, startDate, endDate };
    return this.analyticsService.getTopPerformers(req.user, filters);
  }

  // ═══════════════════════════════════════════════════════════════
  // REPORTS
  // ═══════════════════════════════════════════════════════════════

  @Get('reports/by-subid')
  async getSubIdReport(
    @Request() req,
    @Query('companyId') companyId?: string,
    @Query('partnerId') partnerId?: string,
    @Query('subIdField') subIdField?: 'subId1' | 'subId2' | 'subId3' | 'subId4' | 'subId5',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    const filters: SubIdReportFilters = {
      companyId,
      partnerId,
      subIdField: subIdField || 'subId1',
      startDate,
      endDate,
      limit: limit ? parseInt(limit, 10) : undefined,
    };
    return this.analyticsService.getSubIdReport(req.user, filters);
  }
}
