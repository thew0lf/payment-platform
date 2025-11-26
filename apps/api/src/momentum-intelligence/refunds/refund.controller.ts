import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RefundService } from './refund.service';
import {
  Refund,
  RefundPolicy,
  CreateRefundDto,
  ApproveRefundDto,
  RejectRefundDto,
  BulkRefundDto,
  GetRefundsDto,
  RefundAnalyticsDto,
  RefundAnalytics,
} from '../types/refund.types';

@Controller('momentum/refunds')
@UseGuards(JwtAuthGuard)
export class RefundController {
  constructor(private readonly refundService: RefundService) {}

  // ═══════════════════════════════════════════════════════════════
  // REFUND CREATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Create a new refund request
   */
  @Post()
  async createRefund(@Body() dto: CreateRefundDto): Promise<Refund> {
    return this.refundService.createRefund(dto);
  }

  /**
   * Create bulk refunds
   */
  @Post('bulk')
  async createBulkRefund(@Body() dto: BulkRefundDto) {
    return this.refundService.createBulkRefund(dto);
  }

  // ═══════════════════════════════════════════════════════════════
  // APPROVAL WORKFLOW
  // ═══════════════════════════════════════════════════════════════

  /**
   * Approve a refund
   */
  @Put(':refundId/approve')
  async approveRefund(
    @Param('refundId') refundId: string,
    @Body() dto: Omit<ApproveRefundDto, 'refundId'>,
  ): Promise<Refund> {
    return this.refundService.approveRefund({ refundId, ...dto });
  }

  /**
   * Reject a refund
   */
  @Put(':refundId/reject')
  async rejectRefund(
    @Param('refundId') refundId: string,
    @Body() dto: Omit<RejectRefundDto, 'refundId'>,
  ): Promise<Refund> {
    return this.refundService.rejectRefund({ refundId, ...dto });
  }

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get refunds with filters
   */
  @Get()
  async getRefunds(@Query() dto: GetRefundsDto) {
    return this.refundService.getRefunds(dto);
  }

  /**
   * Get a specific refund
   */
  @Get(':refundId')
  async getRefund(@Param('refundId') refundId: string) {
    return this.refundService.getRefund(refundId);
  }

  // ═══════════════════════════════════════════════════════════════
  // POLICY
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get refund policy for a company
   */
  @Get('policy/:companyId')
  async getPolicy(@Param('companyId') companyId: string): Promise<RefundPolicy> {
    return this.refundService.getRefundPolicy(companyId);
  }

  /**
   * Update refund policy
   */
  @Put('policy/:companyId')
  async updatePolicy(
    @Param('companyId') companyId: string,
    @Body() policy: Partial<RefundPolicy>,
  ) {
    // Implementation would save to database
    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get refund analytics
   */
  @Get('analytics/:companyId')
  async getAnalytics(
    @Param('companyId') companyId: string,
    @Query() dto: Omit<RefundAnalyticsDto, 'companyId'>,
  ): Promise<RefundAnalytics> {
    return this.refundService.getAnalytics({ companyId, ...dto });
  }
}
