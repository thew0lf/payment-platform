/**
 * Affiliate Partnerships Controller
 *
 * Admin endpoints for managing affiliate partnerships.
 * Provides CRUD operations, status management, and bulk actions
 * with multi-tenant security through HierarchyService.
 *
 * Endpoints:
 * - GET    /api/affiliates/partnerships           - List partnerships with filters
 * - GET    /api/affiliates/partnerships/stats     - Get partnership statistics
 * - GET    /api/affiliates/partnerships/:id       - Get partnership by ID
 * - POST   /api/affiliates/partnerships           - Create new partnership
 * - PATCH  /api/affiliates/partnerships/:id       - Update partnership
 * - PATCH  /api/affiliates/partnerships/:id/status - Update partnership status
 * - POST   /api/affiliates/partnerships/:id/approve - Approve pending partnership
 * - POST   /api/affiliates/partnerships/:id/reject  - Reject pending partnership
 * - POST   /api/affiliates/partnerships/:id/suspend - Suspend active partnership
 * - POST   /api/affiliates/partnerships/:id/reactivate - Reactivate suspended partnership
 * - DELETE /api/affiliates/partnerships/:id       - Soft delete partnership
 */

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
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AffiliatePartnershipsService } from '../services/affiliate-partnerships.service';
import { UserContext } from '../../hierarchy/hierarchy.service';
import {
  CreatePartnershipDto,
  UpdatePartnershipDto,
  UpdatePartnershipStatusDto,
  ApprovePartnershipDto,
  RejectPartnershipDto,
  SuspendPartnershipDto,
  TerminatePartnershipDto,
  PartnershipQueryDto,
  BulkApprovePartnershipsDto,
  BulkRejectPartnershipsDto,
  BulkUpdateTierDto,
  BulkActionResult,
} from '../dto/partnership.dto';

@Controller('affiliates/partnerships')
@UseGuards(JwtAuthGuard)
export class AffiliatePartnershipsController {
  private readonly logger = new Logger(AffiliatePartnershipsController.name);

  constructor(
    private readonly partnershipsService: AffiliatePartnershipsService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════════
  // QUERY ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * List affiliate partnerships with filters and pagination
   * GET /api/affiliates/partnerships
   *
   * Multi-tenant access:
   * - ORGANIZATION: See all partnerships
   * - CLIENT: See partnerships in their client's companies
   * - COMPANY: See only their company's partnerships
   */
  @Get()
  async findAll(@Request() req, @Query() query: PartnershipQueryDto) {
    const user: UserContext = req.user;
    return this.partnershipsService.findAll(user, query);
  }

  /**
   * Get partnership statistics
   * GET /api/affiliates/partnerships/stats
   */
  @Get('stats')
  async getStats(@Request() req, @Query('companyId') companyId?: string) {
    const user: UserContext = req.user;
    return this.partnershipsService.getStats(user, companyId);
  }

  /**
   * Get a single partnership by ID
   * GET /api/affiliates/partnerships/:id
   */
  @Get(':id')
  async findById(@Request() req, @Param('id') id: string) {
    const user: UserContext = req.user;
    return this.partnershipsService.findById(user, id);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Create a new partnership
   * POST /api/affiliates/partnerships
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Request() req, @Body() dto: CreatePartnershipDto) {
    const user: UserContext = req.user;
    return this.partnershipsService.create(user, dto);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // UPDATE ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Update a partnership
   * PATCH /api/affiliates/partnerships/:id
   */
  @Patch(':id')
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdatePartnershipDto,
  ) {
    const user: UserContext = req.user;
    return this.partnershipsService.update(user, id, dto);
  }

  /**
   * Update partnership status
   * PATCH /api/affiliates/partnerships/:id/status
   */
  @Patch(':id/status')
  async updateStatus(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdatePartnershipStatusDto,
  ) {
    const user: UserContext = req.user;
    return this.partnershipsService.updateStatus(user, id, dto);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // STATUS ACTION ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Approve a pending partnership
   * POST /api/affiliates/partnerships/:id/approve
   */
  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approve(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: ApprovePartnershipDto,
  ) {
    const user: UserContext = req.user;
    return this.partnershipsService.approve(user, id, dto);
  }

  /**
   * Reject a pending partnership
   * POST /api/affiliates/partnerships/:id/reject
   */
  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  async reject(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: RejectPartnershipDto,
  ) {
    const user: UserContext = req.user;
    return this.partnershipsService.reject(user, id, dto);
  }

  /**
   * Suspend an active partnership
   * POST /api/affiliates/partnerships/:id/suspend
   */
  @Post(':id/suspend')
  @HttpCode(HttpStatus.OK)
  async suspend(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: SuspendPartnershipDto,
  ) {
    const user: UserContext = req.user;
    return this.partnershipsService.suspend(user, id, dto);
  }

  /**
   * Reactivate a suspended partnership
   * POST /api/affiliates/partnerships/:id/reactivate
   */
  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  async reactivate(@Request() req, @Param('id') id: string) {
    const user: UserContext = req.user;
    return this.partnershipsService.reactivate(user, id);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // DELETE ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Soft delete a partnership
   * DELETE /api/affiliates/partnerships/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(
    @Request() req,
    @Param('id') id: string,
    @Body() dto?: TerminatePartnershipDto,
  ) {
    const user: UserContext = req.user;
    return this.partnershipsService.softDelete(user, id, dto);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // BULK ACTION ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Bulk approve partnerships
   * POST /api/affiliates/partnerships/bulk/approve
   */
  @Post('bulk/approve')
  @HttpCode(HttpStatus.OK)
  async bulkApprove(
    @Request() req,
    @Body() dto: BulkApprovePartnershipsDto,
  ): Promise<BulkActionResult> {
    const user: UserContext = req.user;
    const results: BulkActionResult['results'] = [];

    for (const id of dto.partnershipIds) {
      try {
        await this.partnershipsService.approve(user, id, {
          tier: dto.tier,
          commissionRate: dto.commissionRate,
        });
        results.push({ id, success: true });
      } catch (error) {
        results.push({
          id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      total: dto.partnershipIds.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  /**
   * Bulk reject partnerships
   * POST /api/affiliates/partnerships/bulk/reject
   */
  @Post('bulk/reject')
  @HttpCode(HttpStatus.OK)
  async bulkReject(
    @Request() req,
    @Body() dto: BulkRejectPartnershipsDto,
  ): Promise<BulkActionResult> {
    const user: UserContext = req.user;
    const results: BulkActionResult['results'] = [];

    for (const id of dto.partnershipIds) {
      try {
        await this.partnershipsService.reject(user, id, { reason: dto.reason });
        results.push({ id, success: true });
      } catch (error) {
        results.push({
          id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      total: dto.partnershipIds.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  /**
   * Bulk update tier
   * POST /api/affiliates/partnerships/bulk/update-tier
   */
  @Post('bulk/update-tier')
  @HttpCode(HttpStatus.OK)
  async bulkUpdateTier(
    @Request() req,
    @Body() dto: BulkUpdateTierDto,
  ): Promise<BulkActionResult> {
    const user: UserContext = req.user;
    const results: BulkActionResult['results'] = [];

    for (const id of dto.partnershipIds) {
      try {
        await this.partnershipsService.update(user, id, { tier: dto.tier });
        results.push({ id, success: true });
      } catch (error) {
        results.push({
          id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      total: dto.partnershipIds.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }
}
