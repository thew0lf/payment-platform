import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { HierarchyService } from '../hierarchy/hierarchy.service';
import { SubscriptionsService } from './subscriptions.service';
import {
  Subscription,
  SubscriptionQueryDto,
  SubscriptionStats,
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  PauseSubscriptionDto,
  CancelSubscriptionDto,
} from './subscription.types';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCESS CONTROL HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Verify user has access to a specific company
   */
  private async verifyCompanyAccess(
    user: AuthenticatedUser,
    companyId: string,
  ): Promise<void> {
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
   * Get company ID for query filtering based on user scope
   */
  private async getCompanyIdForQuery(
    user: AuthenticatedUser,
    requestedCompanyId?: string,
  ): Promise<string | undefined> {
    // Company-scoped users can only see their own company
    if (user.scopeType === 'COMPANY' || user.scopeType === 'DEPARTMENT') {
      return user.companyId || user.scopeId;
    }

    // Org/Client users can filter by specific company or see all accessible
    if (requestedCompanyId) {
      await this.verifyCompanyAccess(user, requestedCompanyId);
      return requestedCompanyId;
    }

    // Return undefined to query all accessible companies
    return undefined;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * List subscriptions with filtering and pagination
   * GET /api/subscriptions
   */
  @Get()
  async list(
    @Query() query: SubscriptionQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyIdForQuery(user, query.companyId);

    // Use cursor-based pagination for large datasets
    if (query.cursor) {
      return this.subscriptionsService.findAllWithCursor(companyId, query);
    }

    // Default to offset-based pagination
    return this.subscriptionsService.findAll(companyId, query);
  }

  /**
   * Get subscription statistics
   * GET /api/subscriptions/stats
   */
  @Get('stats')
  async getStats(
    @Query('companyId') requestedCompanyId: string | undefined,
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SubscriptionStats> {
    const companyId = await this.getCompanyIdForQuery(user, requestedCompanyId);
    return this.subscriptionsService.getStats(companyId, startDate, endDate);
  }

  /**
   * Get a single subscription by ID
   * GET /api/subscriptions/:id
   */
  @Get(':id')
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Subscription> {
    // For Org/Client users, fetch unscoped and validate access
    if (user.scopeType === 'ORGANIZATION' || user.scopeType === 'CLIENT') {
      const subscription = await this.subscriptionsService.findByIdUnscoped(id);
      if (!subscription) {
        throw new ForbiddenException('Subscription not found');
      }
      await this.verifyCompanyAccess(user, subscription.companyId);
      return subscription;
    }

    // Company-scoped users get filtered results
    const companyId = user.companyId || user.scopeId;
    const subscription = await this.subscriptionsService.findById(id);

    if (subscription.companyId !== companyId) {
      throw new ForbiddenException('You do not have access to this subscription');
    }

    return subscription;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MUTATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a new subscription
   * POST /api/subscriptions
   */
  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async create(
    @Body() dto: CreateSubscriptionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Subscription> {
    await this.verifyCompanyAccess(user, dto.companyId);
    return this.subscriptionsService.create(dto);
  }

  /**
   * Update a subscription
   * PATCH /api/subscriptions/:id
   */
  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Subscription> {
    // Verify access to the subscription's company
    const existing = await this.subscriptionsService.findByIdUnscoped(id);
    if (!existing) {
      throw new ForbiddenException('Subscription not found');
    }
    await this.verifyCompanyAccess(user, existing.companyId);

    return this.subscriptionsService.update(id, dto);
  }

  /**
   * Pause a subscription
   * POST /api/subscriptions/:id/pause
   */
  @Post(':id/pause')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async pause(
    @Param('id') id: string,
    @Body() dto: PauseSubscriptionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Subscription> {
    const existing = await this.subscriptionsService.findByIdUnscoped(id);
    if (!existing) {
      throw new ForbiddenException('Subscription not found');
    }
    await this.verifyCompanyAccess(user, existing.companyId);

    return this.subscriptionsService.pause(id, dto);
  }

  /**
   * Resume a paused subscription
   * POST /api/subscriptions/:id/resume
   */
  @Post(':id/resume')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async resume(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Subscription> {
    const existing = await this.subscriptionsService.findByIdUnscoped(id);
    if (!existing) {
      throw new ForbiddenException('Subscription not found');
    }
    await this.verifyCompanyAccess(user, existing.companyId);

    return this.subscriptionsService.resume(id);
  }

  /**
   * Cancel a subscription
   * POST /api/subscriptions/:id/cancel
   */
  @Post(':id/cancel')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async cancel(
    @Param('id') id: string,
    @Body() dto: CancelSubscriptionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Subscription> {
    const existing = await this.subscriptionsService.findByIdUnscoped(id);
    if (!existing) {
      throw new ForbiddenException('Subscription not found');
    }
    await this.verifyCompanyAccess(user, existing.companyId);

    return this.subscriptionsService.cancel(id, dto);
  }
}
