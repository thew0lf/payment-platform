/**
 * Affiliate Conversions Controller
 *
 * Admin endpoints for managing affiliate conversions.
 * Handles conversion listing, status updates, approval workflows, and reporting.
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AffiliateConversionsService, ConversionFilters } from '../services/affiliate-conversions.service';
import { UserContext } from '../../hierarchy/hierarchy.service';
import {
  ConversionQueryDto,
  RecordConversionDto,
  UpdateConversionStatusDto,
  BulkConversionActionDto,
  ConversionStatsQueryDto,
  SubIdBreakdownQueryDto,
} from '../dto/conversion.dto';

@Controller('affiliates/conversions')
@UseGuards(JwtAuthGuard)
export class AffiliateConversionsController {
  private readonly logger = new Logger(AffiliateConversionsController.name);

  constructor(
    private readonly conversionsService: AffiliateConversionsService,
  ) {}

  /**
   * List conversions with filters
   * GET /api/affiliates/conversions
   */
  @Get()
  async listConversions(
    @Request() req,
    @Query() query: ConversionQueryDto,
  ) {
    const user: UserContext = req.user;
    const filters: ConversionFilters = {
      companyId: query.companyId,
      partnerId: query.partnerId,
      linkId: query.linkId,
      status: query.status as any,
      startDate: query.startDate,
      endDate: query.endDate,
      search: query.search,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
      offset: query.offset ? parseInt(query.offset, 10) : undefined,
    };
    return this.conversionsService.findAll(user, filters);
  }

  /**
   * Get aggregated conversion statistics
   * GET /api/affiliates/conversions/stats
   */
  @Get('stats')
  async getConversionStats(
    @Request() req,
    @Query() query: ConversionStatsQueryDto,
  ) {
    const user: UserContext = req.user;
    return this.conversionsService.getStats(user, {
      companyId: query.companyId,
      partnerId: query.partnerId,
      linkId: query.linkId,
      startDate: query.startDate,
      endDate: query.endDate,
    });
  }

  /**
   * Get conversion breakdown by SubID
   * GET /api/affiliates/conversions/by-subid
   */
  @Get('by-subid')
  async getConversionsBySubId(
    @Request() req,
    @Query() query: SubIdBreakdownQueryDto,
  ) {
    const user: UserContext = req.user;
    return this.conversionsService.getStatsBySubId(user, {
      companyId: query.companyId,
      partnerId: query.partnerId,
      linkId: query.linkId,
      startDate: query.startDate,
      endDate: query.endDate,
      groupBy: query.groupBy || 'subId1',
      limit: query.limit ? parseInt(query.limit, 10) : 50,
    });
  }

  /**
   * Get a single conversion by ID
   * GET /api/affiliates/conversions/:id
   */
  @Get(':id')
  async getConversion(
    @Request() req,
    @Param('id') id: string,
  ) {
    const user: UserContext = req.user;
    return this.conversionsService.findById(user, id);
  }

  /**
   * Record a new conversion (internal use)
   * POST /api/affiliates/conversions
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async recordConversion(
    @Request() req,
    @Body() dto: RecordConversionDto,
  ) {
    const user: UserContext = req.user;
    return this.conversionsService.recordConversion(user, dto);
  }

  /**
   * Update conversion status (approve/reject)
   * PATCH /api/affiliates/conversions/:id/status
   */
  @Patch(':id/status')
  async updateConversionStatus(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateConversionStatusDto,
  ) {
    const user: UserContext = req.user;
    return this.conversionsService.updateStatus(user, id, dto.status, dto.reason);
  }

  /**
   * Approve a pending conversion
   * POST /api/affiliates/conversions/:id/approve
   */
  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approveConversion(
    @Request() req,
    @Param('id') id: string,
  ) {
    const user: UserContext = req.user;
    return this.conversionsService.approve(user, id);
  }

  /**
   * Reject a pending conversion
   * POST /api/affiliates/conversions/:id/reject
   */
  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectConversion(
    @Request() req,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    const user: UserContext = req.user;
    return this.conversionsService.reject(user, id, reason);
  }

  /**
   * Reverse an approved conversion
   * POST /api/affiliates/conversions/:id/reverse
   */
  @Post(':id/reverse')
  @HttpCode(HttpStatus.OK)
  async reverseConversion(
    @Request() req,
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Body('amount') amount?: number,
  ) {
    const user: UserContext = req.user;
    return this.conversionsService.reverse(user, id, reason, amount);
  }

  /**
   * Bulk approve conversions
   * POST /api/affiliates/conversions/bulk/approve
   */
  @Post('bulk/approve')
  @HttpCode(HttpStatus.OK)
  async bulkApprove(
    @Request() req,
    @Body() dto: BulkConversionActionDto,
  ) {
    const user: UserContext = req.user;
    return this.conversionsService.bulkApprove(user, dto.conversionIds);
  }

  /**
   * Bulk reject conversions
   * POST /api/affiliates/conversions/bulk/reject
   */
  @Post('bulk/reject')
  @HttpCode(HttpStatus.OK)
  async bulkReject(
    @Request() req,
    @Body() dto: BulkConversionActionDto,
  ) {
    const user: UserContext = req.user;
    return this.conversionsService.bulkReject(user, dto.conversionIds, dto.reason);
  }

  /**
   * Get conversions pending approval (ready to be approved based on hold period)
   * GET /api/affiliates/conversions/pending-approval
   */
  @Get('pending-approval')
  async getPendingApproval(
    @Request() req,
    @Query('companyId') companyId?: string,
  ) {
    const user: UserContext = req.user;
    return this.conversionsService.getPendingApproval(user, { companyId });
  }
}
