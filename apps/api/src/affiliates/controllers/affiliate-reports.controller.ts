/**
 * Affiliate Reports Controller
 *
 * Provides comprehensive reporting and analytics endpoints for the affiliate program.
 * Includes overview metrics, performance breakdowns, SubID analysis, trends, and exports.
 */

import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  Request,
  Res,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AffiliateReportsService } from '../services/affiliate-reports.service';
import {
  OverviewQueryDto,
  PerformanceQueryDto,
  SubIdQueryDto,
  TrendsQueryDto,
  TopPerformersQueryDto,
  ExportReportDto,
  ReportInterval,
  ReportMetric,
  ExportFormat,
  SubIdField,
} from '../dto/affiliate-reports.dto';

@Controller('affiliates/reports')
@UseGuards(JwtAuthGuard)
export class AffiliateReportsController {
  private readonly logger = new Logger(AffiliateReportsController.name);

  constructor(private readonly reportsService: AffiliateReportsService) {}

  // ═══════════════════════════════════════════════════════════════
  // OVERVIEW
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get program overview metrics
   * Includes comparison with previous period
   */
  @Get('overview')
  async getOverview(
    @Request() req,
    @Query('companyId') companyId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const query: OverviewQueryDto = { companyId, startDate, endDate };
    return this.reportsService.getOverview(req.user, query);
  }

  // ═══════════════════════════════════════════════════════════════
  // PERFORMANCE BY AFFILIATE
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get performance breakdown by affiliate
   * Sortable by various metrics
   */
  @Get('performance')
  async getPerformance(
    @Request() req,
    @Query('companyId') companyId?: string,
    @Query('partnerId') partnerId?: string,
    @Query('linkId') linkId?: string,
    @Query('campaign') campaign?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('sortBy') sortBy?: ReportMetric,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const query: PerformanceQueryDto = {
      companyId,
      partnerId,
      linkId,
      campaign,
      startDate,
      endDate,
      sortBy,
      sortOrder,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    };
    return this.reportsService.getPerformanceByAffiliate(req.user, query);
  }

  // ═══════════════════════════════════════════════════════════════
  // SUB-ID BREAKDOWN
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get performance breakdown by SubID values
   * Supports multi-level grouping (e.g., t1 then t2)
   */
  @Get('by-subid')
  async getBySubId(
    @Request() req,
    @Query('companyId') companyId?: string,
    @Query('partnerId') partnerId?: string,
    @Query('groupBy') groupBy?: SubIdField,
    @Query('secondGroupBy') secondGroupBy?: SubIdField,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    const query: SubIdQueryDto = {
      companyId,
      partnerId,
      groupBy: groupBy || 'subId1',
      secondGroupBy,
      startDate,
      endDate,
      limit: limit ? parseInt(limit, 10) : undefined,
    };
    return this.reportsService.getPerformanceBySubId(req.user, query);
  }

  // ═══════════════════════════════════════════════════════════════
  // TIME SERIES / TRENDS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get time-series trend data
   * Supports daily, weekly, monthly intervals
   */
  @Get('trends')
  async getTrends(
    @Request() req,
    @Query('companyId') companyId?: string,
    @Query('partnerId') partnerId?: string,
    @Query('linkId') linkId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('interval') interval?: ReportInterval,
    @Query('comparePrevious') comparePrevious?: 'true' | 'false',
  ) {
    const query: TrendsQueryDto = {
      companyId,
      partnerId,
      linkId,
      startDate,
      endDate,
      interval,
      comparePrevious,
    };
    return this.reportsService.getTrends(req.user, query);
  }

  // ═══════════════════════════════════════════════════════════════
  // TOP PERFORMERS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get top performing affiliates (leaderboard)
   */
  @Get('top-affiliates')
  async getTopAffiliates(
    @Request() req,
    @Query('companyId') companyId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('metric') metric?: ReportMetric,
  ) {
    const query: TopPerformersQueryDto = {
      companyId,
      startDate,
      endDate,
      limit: limit ? parseInt(limit, 10) : undefined,
      metric,
    };
    return this.reportsService.getTopAffiliates(req.user, query);
  }

  /**
   * Get top performing links
   */
  @Get('top-links')
  async getTopLinks(
    @Request() req,
    @Query('companyId') companyId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('metric') metric?: ReportMetric,
  ) {
    const query: TopPerformersQueryDto = {
      companyId,
      startDate,
      endDate,
      limit: limit ? parseInt(limit, 10) : undefined,
      metric,
    };
    return this.reportsService.getTopLinks(req.user, query);
  }

  // ═══════════════════════════════════════════════════════════════
  // EXPORT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Export report to CSV, Excel, or PDF
   */
  @Post('export')
  @HttpCode(HttpStatus.OK)
  async exportReport(
    @Request() req,
    @Body() dto: ExportReportDto,
    @Res() res: Response,
  ) {
    this.logger.log(`Exporting ${dto.reportType} report as ${dto.format}`);

    const result = await this.reportsService.exportReport(req.user, dto);

    // Set appropriate headers
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('X-Row-Count', result.rowCount.toString());
    res.setHeader('X-Generated-At', result.generatedAt);

    // Send the file
    if (Buffer.isBuffer(result.data)) {
      res.send(result.data);
    } else {
      res.send(result.data);
    }
  }

  /**
   * Export report - JSON metadata only (for preview)
   */
  @Post('export/preview')
  @HttpCode(HttpStatus.OK)
  async exportPreview(@Request() req, @Body() dto: ExportReportDto) {
    const result = await this.reportsService.exportReport(req.user, dto);

    return {
      filename: result.filename,
      mimeType: result.mimeType,
      rowCount: result.rowCount,
      generatedAt: result.generatedAt,
      // Include base64 preview for small files
      preview: result.rowCount <= 100 ? Buffer.from(result.data).toString('base64').slice(0, 1000) : null,
    };
  }
}
