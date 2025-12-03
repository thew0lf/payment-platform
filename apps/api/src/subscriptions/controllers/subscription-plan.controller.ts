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
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../auth/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { HierarchyService } from '../../hierarchy/hierarchy.service';
import { SubscriptionPlanService } from '../services/subscription-plan.service';
import {
  SubscriptionPlan,
  SubscriptionPlanScope,
  SubscriptionPlanQueryDto,
  SubscriptionPlanStats,
  CreateSubscriptionPlanDto,
  UpdateSubscriptionPlanDto,
  ProductSubscriptionPlan,
  AttachPlanToProductDto,
  UpdateProductPlanDto,
} from '../types/subscription-plan.types';

@Controller('subscription-plans')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionPlanController {
  constructor(
    private readonly planService: SubscriptionPlanService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════════
  // ACCESS CONTROL HELPERS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Verify user can access plans at a given scope
   */
  private async verifyScopeAccess(
    user: AuthenticatedUser,
    scope: SubscriptionPlanScope,
    scopeId: string,
  ): Promise<void> {
    switch (scope) {
      case SubscriptionPlanScope.ORGANIZATION:
        if (user.scopeType !== 'ORGANIZATION' || user.organizationId !== scopeId) {
          throw new ForbiddenException('You do not have access to organization-level plans');
        }
        break;

      case SubscriptionPlanScope.CLIENT:
        if (user.scopeType === 'ORGANIZATION') {
          // Org users can access any client
          return;
        }
        if (user.clientId !== scopeId) {
          throw new ForbiddenException('You do not have access to this client\'s plans');
        }
        break;

      case SubscriptionPlanScope.COMPANY:
        const hasAccess = await this.hierarchyService.canAccessCompany(
          {
            sub: user.id,
            scopeType: user.scopeType as any,
            scopeId: user.scopeId,
            organizationId: user.organizationId,
            clientId: user.clientId,
            companyId: user.companyId,
          },
          scopeId,
        );
        if (!hasAccess) {
          throw new ForbiddenException('You do not have access to this company\'s plans');
        }
        break;
    }
  }

  /**
   * Verify user can create/modify plans at a given scope
   */
  private async verifyPlanManagementAccess(
    user: AuthenticatedUser,
    scope: SubscriptionPlanScope,
    scopeId: string,
  ): Promise<void> {
    // First verify read access
    await this.verifyScopeAccess(user, scope, scopeId);

    // Then verify write access based on role
    const adminRoles = ['SUPER_ADMIN', 'ADMIN'];
    if (!adminRoles.includes(user.role)) {
      throw new ForbiddenException('Only admins can manage subscription plans');
    }
  }

  /**
   * Get scope parameters from user context
   */
  private getScopeParamsFromUser(user: AuthenticatedUser): {
    organizationId?: string;
    clientId?: string;
    companyId?: string;
  } {
    switch (user.scopeType) {
      case 'ORGANIZATION':
        return { organizationId: user.organizationId };
      case 'CLIENT':
        return { clientId: user.clientId };
      case 'COMPANY':
      case 'DEPARTMENT':
        return { companyId: user.companyId || user.scopeId };
      default:
        return {};
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * List subscription plans with filtering and pagination
   * GET /api/subscription-plans
   */
  @Get()
  async list(
    @Query() query: SubscriptionPlanQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Build query based on user scope
    const scopeParams = this.getScopeParamsFromUser(user);
    const mergedQuery = { ...query, ...scopeParams };

    // If user specified a scope, verify access
    if (query.scope && (query.organizationId || query.clientId || query.companyId)) {
      const scopeId = query.organizationId || query.clientId || query.companyId;
      if (scopeId) {
        await this.verifyScopeAccess(user, query.scope, scopeId);
      }
    }

    // Use cursor-based pagination for large datasets
    if (query.cursor) {
      return this.planService.findAllWithCursor(mergedQuery);
    }

    // Default to offset-based pagination
    return this.planService.findAll(mergedQuery);
  }

  /**
   * Get plans available for a specific company
   * GET /api/subscription-plans/available/:companyId
   */
  @Get('available/:companyId')
  async getAvailableForCompany(
    @Param('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SubscriptionPlan[]> {
    await this.verifyScopeAccess(user, SubscriptionPlanScope.COMPANY, companyId);
    return this.planService.findAvailableForCompany(companyId);
  }

  /**
   * Get subscription plan statistics
   * GET /api/subscription-plans/stats
   */
  @Get('stats')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async getStats(
    @Query('scope') scope: SubscriptionPlanScope | undefined,
    @Query('scopeId') scopeId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SubscriptionPlanStats> {
    // If specific scope requested, verify access
    if (scope && scopeId) {
      await this.verifyScopeAccess(user, scope, scopeId);
    }

    return this.planService.getStats(scope, scopeId);
  }

  /**
   * Get plans attached to a product
   * GET /api/subscription-plans/product/:productId
   */
  @Get('product/:productId')
  async getProductPlans(
    @Param('productId') productId: string,
  ): Promise<ProductSubscriptionPlan[]> {
    return this.planService.findByProduct(productId);
  }

  /**
   * Get a single subscription plan by ID
   * GET /api/subscription-plans/:id
   */
  @Get(':id')
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SubscriptionPlan> {
    const plan = await this.planService.findById(id);

    // Verify user has access to this plan's scope
    const scopeId = plan.organizationId || plan.clientId || plan.companyId;
    if (scopeId) {
      await this.verifyScopeAccess(user, plan.scope, scopeId);
    }

    return plan;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // MUTATIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Create a new subscription plan
   * POST /api/subscription-plans
   */
  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN')
  async create(
    @Body() dto: CreateSubscriptionPlanDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SubscriptionPlan> {
    // Get scope ID from DTO
    const scopeId = dto.organizationId || dto.clientId || dto.companyId;
    if (!scopeId) {
      throw new BadRequestException('Scope ID is required');
    }

    // Verify user can manage plans in this scope
    await this.verifyPlanManagementAccess(user, dto.scope, scopeId);

    return this.planService.create(dto, user.id);
  }

  /**
   * Update a subscription plan
   * PATCH /api/subscription-plans/:id
   */
  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionPlanDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SubscriptionPlan> {
    const existing = await this.planService.findById(id);

    // Verify user can manage plans in this scope
    const scopeId = existing.organizationId || existing.clientId || existing.companyId;
    if (scopeId) {
      await this.verifyPlanManagementAccess(user, existing.scope, scopeId);
    }

    return this.planService.update(id, dto, user.id);
  }

  /**
   * Publish a draft plan (make it active)
   * POST /api/subscription-plans/:id/publish
   */
  @Post(':id/publish')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async publish(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SubscriptionPlan> {
    const existing = await this.planService.findById(id);

    const scopeId = existing.organizationId || existing.clientId || existing.companyId;
    if (scopeId) {
      await this.verifyPlanManagementAccess(user, existing.scope, scopeId);
    }

    return this.planService.publish(id, user.id);
  }

  /**
   * Archive a plan
   * POST /api/subscription-plans/:id/archive
   */
  @Post(':id/archive')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async archive(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SubscriptionPlan> {
    const existing = await this.planService.findById(id);

    const scopeId = existing.organizationId || existing.clientId || existing.companyId;
    if (scopeId) {
      await this.verifyPlanManagementAccess(user, existing.scope, scopeId);
    }

    return this.planService.archive(id, user.id);
  }

  /**
   * Duplicate a plan
   * POST /api/subscription-plans/:id/duplicate
   */
  @Post(':id/duplicate')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async duplicate(
    @Param('id') id: string,
    @Body('newName') newName: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SubscriptionPlan> {
    if (!newName) {
      throw new BadRequestException('newName is required');
    }

    const existing = await this.planService.findById(id);

    const scopeId = existing.organizationId || existing.clientId || existing.companyId;
    if (scopeId) {
      await this.verifyPlanManagementAccess(user, existing.scope, scopeId);
    }

    return this.planService.duplicate(id, newName, user.id);
  }

  /**
   * Delete a subscription plan
   * DELETE /api/subscription-plans/:id
   */
  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    const existing = await this.planService.findById(id);

    const scopeId = existing.organizationId || existing.clientId || existing.companyId;
    if (scopeId) {
      await this.verifyPlanManagementAccess(user, existing.scope, scopeId);
    }

    await this.planService.delete(id, user.id);
    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PRODUCT-PLAN ASSIGNMENTS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Attach a plan to a product
   * POST /api/subscription-plans/products/attach
   */
  @Post('products/attach')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async attachToProduct(
    @Body() dto: AttachPlanToProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProductSubscriptionPlan> {
    // Verify access to the plan
    const plan = await this.planService.findById(dto.planId);
    const scopeId = plan.organizationId || plan.clientId || plan.companyId;
    if (scopeId) {
      await this.verifyScopeAccess(user, plan.scope, scopeId);
    }

    return this.planService.attachToProduct(dto);
  }

  /**
   * Update a product-plan assignment
   * PATCH /api/subscription-plans/products/:productId/:planId
   */
  @Patch('products/:productId/:planId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async updateProductPlan(
    @Param('productId') productId: string,
    @Param('planId') planId: string,
    @Body() dto: UpdateProductPlanDto,
  ): Promise<ProductSubscriptionPlan> {
    return this.planService.updateProductPlan(productId, planId, dto);
  }

  /**
   * Detach a plan from a product
   * DELETE /api/subscription-plans/products/:productId/:planId
   */
  @Delete('products/:productId/:planId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async detachFromProduct(
    @Param('productId') productId: string,
    @Param('planId') planId: string,
  ): Promise<{ success: boolean }> {
    await this.planService.detachFromProduct(productId, planId);
    return { success: true };
  }
}
