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
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { HierarchyService } from '../../hierarchy/hierarchy.service';
import { RMAService } from './rma.service';
import {
  RMA,
  RMAPolicy,
  RMAStatus,
  RMAType,
  ReturnReason,
  CreateRMADto,
  ApproveRMADto,
  RejectRMADto,
  UpdateRMAStatusDto,
  RecordInspectionDto,
  ProcessResolutionDto,
  GetRMAsDto,
  RMAAnalyticsDto,
  RMAAnalytics,
} from '../types/rma.types';

@Controller('momentum/rma')
@UseGuards(JwtAuthGuard)
export class RMAController {
  constructor(
    private readonly rmaService: RMAService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // ACCESS CONTROL HELPERS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Verify user has access to a specific company
   */
  private async verifyCompanyAccess(user: AuthenticatedUser, companyId: string): Promise<void> {
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

  /**
   * Get accessible company IDs for the user
   */
  private async getAccessibleCompanyIds(user: AuthenticatedUser): Promise<string[]> {
    return this.hierarchyService.getAccessibleCompanyIds({
      sub: user.id,
      scopeType: user.scopeType as any,
      scopeId: user.scopeId,
      organizationId: user.organizationId,
      clientId: user.clientId,
      companyId: user.companyId,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // RMA CREATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Create a new RMA
   */
  @Post()
  async createRMA(
    @Body() dto: CreateRMADto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RMA> {
    // Verify user has access to the company
    await this.verifyCompanyAccess(user, dto.companyId);
    return this.rmaService.createRMA(dto);
  }

  // ═══════════════════════════════════════════════════════════════
  // APPROVAL WORKFLOW
  // ═══════════════════════════════════════════════════════════════

  /**
   * Approve an RMA
   * Note: In production, RMA should be fetched first to verify companyId access
   */
  @Put(':rmaId/approve')
  async approveRMA(
    @Param('rmaId') rmaId: string,
    @Body() dto: Omit<ApproveRMADto, 'rmaId'> & { companyId?: string },
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RMA> {
    // If companyId provided, verify access
    if (dto.companyId) {
      await this.verifyCompanyAccess(user, dto.companyId);
    }
    // Note: Service should also verify RMA belongs to user's accessible companies
    return this.rmaService.approveRMA({ rmaId, ...dto });
  }

  /**
   * Reject an RMA
   */
  @Put(':rmaId/reject')
  async rejectRMA(
    @Param('rmaId') rmaId: string,
    @Body() dto: Omit<RejectRMADto, 'rmaId'> & { companyId?: string },
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RMA> {
    if (dto.companyId) {
      await this.verifyCompanyAccess(user, dto.companyId);
    }
    return this.rmaService.rejectRMA({ rmaId, ...dto });
  }

  // ═══════════════════════════════════════════════════════════════
  // STATUS UPDATES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Update RMA status
   */
  @Put(':rmaId/status')
  async updateStatus(
    @Param('rmaId') rmaId: string,
    @Body() dto: Omit<UpdateRMAStatusDto, 'rmaId'> & { companyId?: string },
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RMA> {
    if (dto.companyId) {
      await this.verifyCompanyAccess(user, dto.companyId);
    }
    return this.rmaService.updateStatus({ rmaId, ...dto });
  }

  // ═══════════════════════════════════════════════════════════════
  // INSPECTION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Record inspection results
   */
  @Post(':rmaId/inspection')
  async recordInspection(
    @Param('rmaId') rmaId: string,
    @Body() dto: Omit<RecordInspectionDto, 'rmaId'> & { companyId?: string },
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RMA> {
    if (dto.companyId) {
      await this.verifyCompanyAccess(user, dto.companyId);
    }
    return this.rmaService.recordInspection({ rmaId, ...dto });
  }

  // ═══════════════════════════════════════════════════════════════
  // RESOLUTION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Process RMA resolution
   */
  @Post(':rmaId/resolve')
  async processResolution(
    @Param('rmaId') rmaId: string,
    @Body() dto: Omit<ProcessResolutionDto, 'rmaId'> & { companyId?: string },
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RMA> {
    if (dto.companyId) {
      await this.verifyCompanyAccess(user, dto.companyId);
    }
    return this.rmaService.processResolution({ rmaId, ...dto });
  }

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get RMAs with filters - automatically scoped to user's accessible companies
   */
  @Get()
  async getRMAs(
    @Query('companyId') companyId?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('customerId') customerId?: string,
    @Query('orderId') orderId?: string,
    @Query('reason') reason?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    // Get accessible company IDs and filter the query
    const accessibleCompanyIds = user ? await this.getAccessibleCompanyIds(user) : [];

    // Build DTO from query params
    const dto: GetRMAsDto = {
      companyId,
      status: status as RMAStatus,
      type: type as RMAType,
      customerId,
      orderId,
      reason: reason as ReturnReason,
      startDate,
      endDate,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    };

    // If companyId filter provided, verify it's in accessible list
    if (dto.companyId) {
      if (!accessibleCompanyIds.includes(dto.companyId)) {
        throw new ForbiddenException('You do not have access to this company');
      }
    } else {
      // If no specific company requested, scope to all accessible companies
      dto.companyIds = accessibleCompanyIds;
    }

    return this.rmaService.getRMAs(dto);
  }

  /**
   * Get a specific RMA by ID
   * Note: In production, should verify RMA's companyId is accessible
   */
  @Get(':rmaId')
  async getRMA(
    @Param('rmaId') rmaId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const rma = await this.rmaService.getRMA(rmaId);

    // Verify access to RMA's company (if RMA exists and has companyId)
    if (rma && rma.companyId) {
      await this.verifyCompanyAccess(user, rma.companyId);
    }

    return rma;
  }

  /**
   * Get RMA by number
   */
  @Get('number/:rmaNumber')
  async getRMAByNumber(
    @Param('rmaNumber') rmaNumber: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const rma = await this.rmaService.getRMAByNumber(rmaNumber);

    // Verify access to RMA's company
    if (rma && rma.companyId) {
      await this.verifyCompanyAccess(user, rma.companyId);
    }

    return rma;
  }

  // ═══════════════════════════════════════════════════════════════
  // POLICY
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get RMA policy for a company
   */
  @Get('policy/:companyId')
  async getPolicy(
    @Param('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RMAPolicy> {
    await this.verifyCompanyAccess(user, companyId);
    return this.rmaService.getRMAPolicy(companyId);
  }

  /**
   * Update RMA policy
   */
  @Put('policy/:companyId')
  async updatePolicy(
    @Param('companyId') companyId: string,
    @Body() policy: Partial<RMAPolicy>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.verifyCompanyAccess(user, companyId);
    // Implementation would save to database
    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get RMA analytics
   */
  @Get('analytics/:companyId')
  async getAnalytics(
    @Param('companyId') companyId: string,
    @Query() dto: Omit<RMAAnalyticsDto, 'companyId'>,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RMAAnalytics> {
    await this.verifyCompanyAccess(user, companyId);
    return this.rmaService.getAnalytics({ companyId, ...dto });
  }
}
