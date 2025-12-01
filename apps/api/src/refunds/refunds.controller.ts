import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { RefundsService } from './services/refunds.service';
import { HierarchyService } from '../hierarchy/hierarchy.service';
import {
  CreateRefundDto,
  UpdateRefundDto,
  RefundQueryParams,
  RefundStatsResult,
  UpdateRefundSettingsDto,
  Refund,
  RefundSettings,
  ApproveRefundDto,
  RejectRefundDto,
} from './types/refund.types';
import { CursorPaginatedResponse } from '../common/pagination';

@Controller('refunds')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RefundsController {
  constructor(
    private readonly refundsService: RefundsService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // CRUD
  // ═══════════════════════════════════════════════════════════════

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SUPPORT')
  async create(
    @Body() dto: CreateRefundDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Refund> {
    const companyId = this.getCompanyId(user);
    return this.refundsService.create(companyId, dto, user.id);
  }

  @Get()
  async list(
    @Query() query: RefundQueryParams,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ refunds: Refund[]; total: number } | CursorPaginatedResponse<Refund>> {
    const companyId = await this.getCompanyIdForQuery(user, query.companyId);
    return this.refundsService.list(companyId, query);
  }

  @Get('stats')
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('companyId') queryCompanyId?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<RefundStatsResult> {
    const companyId = await this.getCompanyIdForQuery(user!, queryCompanyId);
    return this.refundsService.getStats(
      companyId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get(':id')
  async get(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Refund> {
    const companyId = this.getCompanyId(user);
    return this.refundsService.get(id, companyId);
  }

  // ═══════════════════════════════════════════════════════════════
  // APPROVAL WORKFLOW
  // ═══════════════════════════════════════════════════════════════

  @Post(':id/approve')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  async approve(
    @Param('id') id: string,
    @Body() dto: ApproveRefundDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Refund> {
    const companyId = this.getCompanyId(user);
    return this.refundsService.approve(id, companyId, user.id, dto);
  }

  @Post(':id/reject')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  async reject(
    @Param('id') id: string,
    @Body() dto: RejectRefundDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Refund> {
    const companyId = this.getCompanyId(user);
    return this.refundsService.reject(id, companyId, user.id, dto);
  }

  @Post(':id/process')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  async process(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Refund> {
    const companyId = this.getCompanyId(user);
    return this.refundsService.process(id, companyId, user.id);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Refund> {
    const companyId = this.getCompanyId(user);
    return this.refundsService.cancel(id, companyId, user.id);
  }

  // ═══════════════════════════════════════════════════════════════
  // SETTINGS
  // ═══════════════════════════════════════════════════════════════

  @Get('settings/current')
  async getSettings(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RefundSettings> {
    const companyId = this.getCompanyId(user);
    return this.refundsService.getSettings(companyId);
  }

  @Patch('settings/current')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async updateSettings(
    @Body() dto: UpdateRefundSettingsDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RefundSettings> {
    const companyId = this.getCompanyId(user);
    return this.refundsService.updateSettings(companyId, dto);
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get companyId for write operations (create/update/delete).
   * Requires explicit company context.
   */
  private getCompanyId(user: AuthenticatedUser): string {
    // For COMPANY scope users, the scopeId IS the companyId
    if (user.scopeType === 'COMPANY') {
      return user.scopeId;
    }
    // For other scopes, check explicit companyId or clientId
    if (user.companyId) {
      return user.companyId;
    }
    if (user.clientId) {
      return user.clientId;
    }
    throw new ForbiddenException('Company context required for this operation');
  }

  /**
   * Get companyId for query operations (list).
   * For ORGANIZATION/CLIENT scope users, allows:
   * - Passing companyId query param to filter by specific company (with validation)
   * - Returns undefined to query all accessible refunds (when no companyId passed)
   */
  private async getCompanyIdForQuery(
    user: AuthenticatedUser,
    queryCompanyId?: string,
  ): Promise<string | undefined> {
    // For COMPANY scope users, always filter by their company
    if (user.scopeType === 'COMPANY') {
      return user.scopeId;
    }

    // For users with explicit companyId/clientId, use that
    if (user.companyId) {
      return user.companyId;
    }

    // For ORGANIZATION or CLIENT scope admins
    if (user.scopeType === 'ORGANIZATION' || user.scopeType === 'CLIENT') {
      // If they passed a companyId query param, validate access first
      if (queryCompanyId) {
        const hasAccess = await this.hierarchyService.canAccessCompany(
          {
            sub: user.id,
            scopeType: user.scopeType as any,
            scopeId: user.scopeId,
            clientId: user.clientId,
            companyId: user.companyId,
          },
          queryCompanyId,
        );
        if (!hasAccess) {
          throw new ForbiddenException('Access denied to the requested company');
        }
        return queryCompanyId;
      }
      // Otherwise return undefined to allow querying all refunds they have access to
      return undefined;
    }

    throw new ForbiddenException('Unable to determine company context');
  }
}
