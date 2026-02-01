/**
 * Affiliate Clicks Controller
 *
 * Admin API for affiliate click tracking and analytics.
 * Provides endpoints for listing clicks, viewing statistics,
 * and analyzing SubID performance.
 *
 * Authentication: JWT token required
 * Scope: Company/Client/Organization level access
 */

import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AffiliateClicksService, ClickQueryDto } from '../services/affiliate-clicks.service';
import { ClickStatus } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════
// QUERY DTOs
// ═══════════════════════════════════════════════════════════════

class ListClicksQueryDto {
  companyId?: string;
  partnerId?: string;
  linkId?: string;
  status?: string;
  // SubID filters (t1-t5)
  t1?: string;
  t2?: string;
  t3?: string;
  t4?: string;
  t5?: string;
  // Date range
  startDate?: string;
  endDate?: string;
  // Pagination
  limit?: string;
  offset?: string;
  // Sorting
  sortBy?: 'clickedAt' | 'fraudScore';
  sortOrder?: 'asc' | 'desc';
}

class ClickStatsQueryDto {
  companyId?: string;
  partnerId?: string;
  linkId?: string;
  startDate?: string;
  endDate?: string;
}

class SubIdBreakdownQueryDto {
  companyId?: string;
  partnerId?: string;
  linkId?: string;
  startDate?: string;
  endDate?: string;
  groupBy?: 'subId1' | 'subId2' | 'subId3' | 'subId4' | 'subId5';
}

// ═══════════════════════════════════════════════════════════════
// CONTROLLER
// ═══════════════════════════════════════════════════════════════

@Controller('affiliates/clicks')
@UseGuards(JwtAuthGuard)
export class AffiliateClicksController {
  private readonly logger = new Logger(AffiliateClicksController.name);

  constructor(
    private readonly clicksService: AffiliateClicksService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // LIST CLICKS
  // ═══════════════════════════════════════════════════════════════

  /**
   * List clicks with filters
   *
   * GET /api/affiliates/clicks
   *
   * Query params:
   * - companyId: Filter by company
   * - partnerId: Filter by partner
   * - linkId: Filter by link
   * - status: Filter by status (VALID, DUPLICATE, SUSPICIOUS, INVALID)
   * - t1, t2, t3, t4, t5: Filter by SubIDs
   * - startDate, endDate: Filter by date range
   * - limit, offset: Pagination
   * - sortBy: Sort field (clickedAt, fraudScore)
   * - sortOrder: Sort direction (asc, desc)
   */
  @Get()
  async listClicks(
    @Request() req,
    @Query() query: ListClicksQueryDto,
  ) {
    const filters: ClickQueryDto = {
      companyId: query.companyId,
      partnerId: query.partnerId,
      linkId: query.linkId,
      status: query.status as ClickStatus | undefined,
      t1: query.t1,
      t2: query.t2,
      t3: query.t3,
      t4: query.t4,
      t5: query.t5,
      startDate: query.startDate,
      endDate: query.endDate,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
      offset: query.offset ? parseInt(query.offset, 10) : undefined,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    };

    return this.clicksService.findAll(req.user, filters);
  }

  // ═══════════════════════════════════════════════════════════════
  // CLICK STATISTICS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get aggregated click statistics
   *
   * GET /api/affiliates/clicks/stats
   *
   * Returns:
   * - Total clicks, unique clicks, duplicates
   * - Click breakdown by device, browser, country
   * - Top performing links
   * - Conversion rate
   */
  @Get('stats')
  async getStats(
    @Request() req,
    @Query() query: ClickStatsQueryDto,
  ) {
    return this.clicksService.getStats(req.user, {
      companyId: query.companyId,
      partnerId: query.partnerId,
      linkId: query.linkId,
      startDate: query.startDate,
      endDate: query.endDate,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // SUBID BREAKDOWN
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get click breakdown by SubID
   *
   * GET /api/affiliates/clicks/by-subid
   *
   * Query params:
   * - groupBy: Which SubID to group by (subId1-subId5), defaults to subId1
   *
   * Returns breakdown of clicks, conversions, and revenue
   * grouped by the specified SubID field.
   */
  @Get('by-subid')
  async getSubIdBreakdown(
    @Request() req,
    @Query() query: SubIdBreakdownQueryDto,
  ) {
    const groupBy = query.groupBy || 'subId1';

    return this.clicksService.getStatsBySubId(
      req.user,
      {
        companyId: query.companyId,
        partnerId: query.partnerId,
        linkId: query.linkId,
        startDate: query.startDate,
        endDate: query.endDate,
      },
      groupBy,
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // GET CLICK BY ID
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get click details by ID
   *
   * GET /api/affiliates/clicks/:id
   *
   * Returns full click details including:
   * - Partner info
   * - Link info
   * - Device/browser/geo data
   * - SubID values
   * - Fraud score and reasons
   */
  @Get(':id')
  async getClick(
    @Request() req,
    @Param('id') id: string,
  ) {
    return this.clicksService.findById(req.user, id);
  }
}
