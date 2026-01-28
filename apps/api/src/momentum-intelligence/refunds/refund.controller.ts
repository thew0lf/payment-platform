import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ScopeType } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { HierarchyService } from '../../hierarchy/hierarchy.service';
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
  constructor(
    private readonly refundService: RefundService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════

  private async getCompanyId(
    user: AuthenticatedUser,
    queryCompanyId?: string,
  ): Promise<string> {
    // COMPANY scoped users use their own company
    if (user.scopeType === 'COMPANY') {
      return user.scopeId;
    }

    // Use companyId from user context if available
    if (user.companyId) {
      return user.companyId;
    }

    // CLIENT/ORG users need to specify or have access
    if (queryCompanyId) {
      const canAccess = await this.hierarchyService.canAccessCompany(
        {
          sub: user.id,
          scopeType: user.scopeType as ScopeType,
          scopeId: user.scopeId,
          clientId: user.clientId,
          companyId: user.companyId,
        },
        queryCompanyId,
      );
      if (!canAccess) {
        throw new ForbiddenException(
          "Hmm, you don't have access to that company. Double-check your permissions or try a different one.",
        );
      }
      return queryCompanyId;
    }

    throw new BadRequestException(
      'Company ID is required. Please select a company or provide companyId parameter.',
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // REFUND CREATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Create a new refund request
   */
  @Post()
  async createRefund(
    @Body() dto: CreateRefundDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Refund> {
    const companyId = await this.getCompanyId(user, queryCompanyId || dto.companyId);
    return this.refundService.createRefund({ ...dto, companyId });
  }

  /**
   * Create bulk refunds
   */
  @Post('bulk')
  async createBulkRefund(
    @Body() dto: BulkRefundDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId || dto.companyId);
    return this.refundService.createBulkRefund({ ...dto, companyId });
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
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Refund> {
    // Validate company access
    await this.getCompanyId(user, queryCompanyId);
    return this.refundService.approveRefund({ refundId, ...dto });
  }

  /**
   * Reject a refund
   */
  @Put(':refundId/reject')
  async rejectRefund(
    @Param('refundId') refundId: string,
    @Body() dto: Omit<RejectRefundDto, 'refundId'>,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Refund> {
    // Validate company access
    await this.getCompanyId(user, queryCompanyId);
    return this.refundService.rejectRefund({ refundId, ...dto });
  }

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get refunds with filters
   */
  @Get()
  async getRefunds(
    @Query() dto: GetRefundsDto,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId || dto.companyId);
    return this.refundService.getRefunds({ ...dto, companyId });
  }

  /**
   * Get a specific refund
   */
  @Get(':refundId')
  async getRefund(
    @Param('refundId') refundId: string,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Validate company access
    await this.getCompanyId(user, queryCompanyId);
    return this.refundService.getRefund(refundId);
  }

  // ═══════════════════════════════════════════════════════════════
  // POLICY
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get refund policy for a company
   */
  @Get('policy/:companyId')
  async getPolicy(
    @Param('companyId') paramCompanyId: string,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RefundPolicy> {
    const companyId = await this.getCompanyId(user, queryCompanyId || paramCompanyId);
    return this.refundService.getRefundPolicy(companyId);
  }

  /**
   * Update refund policy
   */
  @Put('policy/:companyId')
  async updatePolicy(
    @Param('companyId') paramCompanyId: string,
    @Body() policy: Partial<RefundPolicy>,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyId(user, queryCompanyId || paramCompanyId);
    // Implementation would save to database
    return { success: true, companyId };
  }

  // ═══════════════════════════════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get refund analytics
   */
  @Get('analytics/:companyId')
  async getAnalytics(
    @Param('companyId') paramCompanyId: string,
    @Query('companyId') queryCompanyId: string,
    @Query() dto: Omit<RefundAnalyticsDto, 'companyId'>,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RefundAnalytics> {
    const companyId = await this.getCompanyId(user, queryCompanyId || paramCompanyId);
    return this.refundService.getAnalytics({ companyId, ...dto });
  }
}
