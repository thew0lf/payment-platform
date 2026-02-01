/**
 * Affiliate Payouts Controller
 *
 * Admin endpoints for managing affiliate payouts.
 * Provides CRUD operations, status updates, batch creation, and pending calculations.
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
import { AffiliatePayoutsService } from '../services/affiliate-payouts.service';
import {
  CreatePayoutBatchDto,
  CreateSinglePayoutDto,
  UpdatePayoutDto,
  UpdatePayoutStatusDto,
  ProcessPayoutDto,
  PayoutQueryDto,
  CalculatePendingDto,
} from '../dto/payout.dto';

@Controller('affiliates/payouts')
@UseGuards(JwtAuthGuard)
export class AffiliatePayoutsController {
  private readonly logger = new Logger(AffiliatePayoutsController.name);

  constructor(
    private readonly payoutsService: AffiliatePayoutsService,
  ) {}

  /**
   * List payouts with filters
   * GET /api/affiliates/payouts
   */
  @Get()
  async listPayouts(
    @Request() req,
    @Query() query: PayoutQueryDto,
  ) {
    return this.payoutsService.findAll(req.user, query);
  }

  /**
   * Get payout statistics
   * GET /api/affiliates/payouts/stats
   */
  @Get('stats')
  async getPayoutStats(
    @Request() req,
    @Query('companyId') companyId?: string,
  ) {
    return this.payoutsService.getStats(req.user, { companyId });
  }

  /**
   * Get pending payout summary by affiliate
   * GET /api/affiliates/payouts/pending
   */
  @Get('pending')
  async getPendingSummary(
    @Request() req,
    @Query('companyId') companyId?: string,
    @Query('includeDetails') includeDetails?: string,
  ) {
    return this.payoutsService.getPendingSummary(req.user, {
      companyId,
      includeDetails: includeDetails === 'true',
    });
  }

  /**
   * Calculate pending payouts for affiliates
   * POST /api/affiliates/payouts/calculate
   */
  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  async calculatePending(
    @Request() req,
    @Body() dto: CalculatePendingDto,
  ) {
    return this.payoutsService.calculatePending(req.user, dto);
  }

  /**
   * Create a batch of payouts for eligible partners
   * POST /api/affiliates/payouts/batch
   */
  @Post('batch')
  async createPayoutBatch(
    @Request() req,
    @Body() dto: CreatePayoutBatchDto,
  ) {
    return this.payoutsService.createBatch(req.user, dto);
  }

  /**
   * Get a single payout by ID
   * GET /api/affiliates/payouts/:id
   */
  @Get(':id')
  async getPayout(
    @Request() req,
    @Param('id') id: string,
  ) {
    return this.payoutsService.findById(req.user, id);
  }

  /**
   * Get conversions included in a payout
   * GET /api/affiliates/payouts/:id/conversions
   */
  @Get(':id/conversions')
  async getPayoutConversions(
    @Request() req,
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.payoutsService.getConversionsForPayout(req.user, id, {
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  /**
   * Create a single payout
   * POST /api/affiliates/payouts
   */
  @Post()
  async createPayout(
    @Request() req,
    @Body() dto: CreateSinglePayoutDto,
  ) {
    return this.payoutsService.createSingle(req.user, dto);
  }

  /**
   * Update payout status
   * PATCH /api/affiliates/payouts/:id/status
   */
  @Patch(':id/status')
  async updatePayoutStatus(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdatePayoutStatusDto,
  ) {
    return this.payoutsService.updateStatus(req.user, id, dto);
  }

  /**
   * Update payout details
   * PATCH /api/affiliates/payouts/:id
   */
  @Patch(':id')
  async updatePayout(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdatePayoutDto,
  ) {
    return this.payoutsService.update(req.user, id, dto);
  }

  /**
   * Process a payout (mark as processing and complete)
   * POST /api/affiliates/payouts/:id/process
   */
  @Post(':id/process')
  @HttpCode(HttpStatus.OK)
  async processPayout(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: ProcessPayoutDto,
  ) {
    return this.payoutsService.process(req.user, id, dto);
  }

  /**
   * Approve a payout for processing
   * POST /api/affiliates/payouts/:id/approve
   */
  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approvePayout(
    @Request() req,
    @Param('id') id: string,
  ) {
    return this.payoutsService.approve(req.user, id);
  }

  /**
   * Put a payout on hold
   * POST /api/affiliates/payouts/:id/hold
   */
  @Post(':id/hold')
  @HttpCode(HttpStatus.OK)
  async holdPayout(
    @Request() req,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.payoutsService.hold(req.user, id, reason);
  }

  /**
   * Cancel a payout
   * POST /api/affiliates/payouts/:id/cancel
   */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelPayout(
    @Request() req,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.payoutsService.cancel(req.user, id, reason);
  }
}
