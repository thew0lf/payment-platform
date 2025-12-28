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
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { HierarchyService } from '../hierarchy/hierarchy.service';
import { PricingPlanService } from './services/pricing-plan.service';
import { SubscriptionService } from './services/subscription.service';
import { UsageTrackingService } from './services/usage-tracking.service';
import { InvoiceService } from './services/invoice.service';
import {
  CreateSubscriptionDto,
  CreatePricingPlanDto,
  UpdatePricingPlanDto,
  RequestPlanChangeDto,
  AssignPlanToClientDto,
  RecordUsageEventDto,
  PricingPlan,
  ClientSubscription,
  UsageSummary,
  Invoice,
  PlanType,
} from './types/billing.types';

@Controller('billing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BillingController {
  constructor(
    private readonly planService: PricingPlanService,
    private readonly subscriptionService: SubscriptionService,
    private readonly usageService: UsageTrackingService,
    private readonly invoiceService: InvoiceService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  /**
   * Verify user has access to a specific client (billing is at client level)
   */
  private async verifyClientAccess(user: AuthenticatedUser, clientId: string): Promise<void> {
    // Organization users can access all clients
    if (user.scopeType === 'ORGANIZATION') {
      return;
    }

    // Client-level users can only access their own client
    if (user.scopeType === 'CLIENT' && user.clientId === clientId) {
      return;
    }

    // Company-level users can access their parent client
    if ((user.scopeType === 'COMPANY' || user.scopeType === 'DEPARTMENT') && user.clientId === clientId) {
      return;
    }

    throw new ForbiddenException('You do not have access to this client billing data');
  }

  // ═══════════════════════════════════════════════════════════════
  // PLANS - Client View (public default plans + their custom plans)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get available plans for a client (public default plans + any custom plans for their client)
   */
  @Get('plans')
  async getPlans(
    @Query('includeHidden') includeHidden?: string,
    @Query('clientId') clientId?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<PricingPlan[]> {
    // For clients, show public plans + their custom plans
    if (clientId && user) {
      await this.verifyClientAccess(user, clientId);
      return this.planService.findAvailableForClient(clientId, includeHidden === 'true');
    }
    // For ORG or public view, show all public plans
    return this.planService.findAll(includeHidden === 'true');
  }

  @Get('plans/:id')
  async getPlan(@Param('id') id: string): Promise<PricingPlan> {
    return this.planService.findById(id);
  }

  /**
   * Get plans that a client can upgrade to (self-service)
   */
  @Get('plans/upgradeable')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async getUpgradeablePlans(
    @Query('clientId') clientId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PricingPlan[]> {
    await this.verifyClientAccess(user, clientId);
    return this.planService.findUpgradeablePlans(clientId);
  }

  // ═══════════════════════════════════════════════════════════════
  // PLANS - ORG Admin Management (CRUD for all plans)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get all plans (ORG admin view - includes all plan types)
   */
  @Get('admin/plans')
  @Roles('SUPER_ADMIN')
  async getAllPlansAdmin(
    @CurrentUser() user: AuthenticatedUser,
    @Query('type') planType?: string,
    @Query('clientId') clientId?: string,
  ): Promise<PricingPlan[]> {
    if (user.scopeType !== 'ORGANIZATION') {
      throw new ForbiddenException('Only organization admins can access all plans');
    }
    return this.planService.findAllAdmin({
      planType: planType as PlanType,
      clientId,
    });
  }

  /**
   * Get all clients subscriptions (ORG admin view)
   */
  @Get('admin/subscriptions')
  @Roles('SUPER_ADMIN')
  async getAllSubscriptionsAdmin(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
  ): Promise<ClientSubscription[]> {
    if (user.scopeType !== 'ORGANIZATION') {
      throw new ForbiddenException('Only organization admins can view all subscriptions');
    }
    return this.subscriptionService.findAll({ status });
  }

  @Post('plans')
  @Roles('SUPER_ADMIN')
  async createPlan(
    @Body() dto: CreatePricingPlanDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PricingPlan> {
    if (user.scopeType !== 'ORGANIZATION') {
      throw new ForbiddenException('Only organization admins can manage pricing plans');
    }
    return this.planService.create(dto);
  }

  /**
   * Create a custom plan for a specific client
   */
  @Post('plans/custom')
  @Roles('SUPER_ADMIN')
  async createCustomPlan(
    @Body() dto: CreatePricingPlanDto & { clientId: string },
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PricingPlan> {
    if (user.scopeType !== 'ORGANIZATION') {
      throw new ForbiddenException('Only organization admins can create custom plans');
    }
    return this.planService.create({
      ...dto,
      planType: PlanType.CUSTOM,
      isPublic: false,
    });
  }

  @Patch('plans/:id')
  @Roles('SUPER_ADMIN')
  async updatePlan(
    @Param('id') id: string,
    @Body() dto: UpdatePricingPlanDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PricingPlan> {
    if (user.scopeType !== 'ORGANIZATION') {
      throw new ForbiddenException('Only organization admins can manage pricing plans');
    }
    return this.planService.update(id, dto);
  }

  @Delete('plans/:id')
  @Roles('SUPER_ADMIN')
  async deletePlan(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    if (user.scopeType !== 'ORGANIZATION') {
      throw new ForbiddenException('Only organization admins can manage pricing plans');
    }
    await this.planService.delete(id);
    return { success: true };
  }

  /**
   * Assign a plan to a client (ORG admin only)
   */
  @Post('admin/assign-plan')
  @Roles('SUPER_ADMIN')
  async assignPlanToClient(
    @Body() dto: AssignPlanToClientDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ClientSubscription> {
    if (user.scopeType !== 'ORGANIZATION') {
      throw new ForbiddenException('Only organization admins can assign plans to clients');
    }
    return this.subscriptionService.assignPlan(dto);
  }

  // ═══════════════════════════════════════════════════════════════
  // SELF-SERVICE PLAN CHANGES (Client-initiated)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Request a plan upgrade (self-service via Stripe Checkout)
   * Returns a Stripe Checkout session URL
   */
  @Post('subscription/upgrade')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async requestUpgrade(
    @Body() dto: RequestPlanChangeDto & { clientId: string },
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ checkoutUrl: string } | { requiresApproval: boolean; message: string }> {
    const { clientId, ...changeDto } = dto;
    await this.verifyClientAccess(user, clientId);
    return this.subscriptionService.requestUpgrade(clientId, changeDto);
  }

  /**
   * Request a plan downgrade (requires ORG approval)
   */
  @Post('subscription/downgrade-request')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async requestDowngrade(
    @Body() dto: RequestPlanChangeDto & { clientId: string; reason?: string },
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ success: boolean; message: string }> {
    const { clientId, reason, ...changeDto } = dto;
    await this.verifyClientAccess(user, clientId);
    return this.subscriptionService.requestDowngrade(clientId, changeDto, reason);
  }

  // ═══════════════════════════════════════════════════════════════
  // SUBSCRIPTION
  // ═══════════════════════════════════════════════════════════════

  @Get('subscription')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async getSubscription(
    @Query('clientId') clientId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ClientSubscription> {
    await this.verifyClientAccess(user, clientId);
    return this.subscriptionService.findByClientId(clientId);
  }

  @Post('subscription')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async createSubscription(
    @Body() dto: CreateSubscriptionDto & { clientId: string },
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ClientSubscription> {
    const { clientId, ...createDto } = dto;
    await this.verifyClientAccess(user, clientId);
    return this.subscriptionService.create(clientId, createDto);
  }

  @Patch('subscription/plan')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async changePlan(
    @Body() body: { clientId: string; planId: string },
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ClientSubscription> {
    await this.verifyClientAccess(user, body.clientId);
    return this.subscriptionService.changePlan(body.clientId, body.planId);
  }

  @Post('subscription/cancel')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async cancelSubscription(
    @Body() body: { clientId: string; reason?: string },
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ClientSubscription> {
    await this.verifyClientAccess(user, body.clientId);
    return this.subscriptionService.cancel(body.clientId, body.reason);
  }

  @Post('subscription/pause')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async pauseSubscription(
    @Body() body: { clientId: string; reason?: string },
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ClientSubscription> {
    await this.verifyClientAccess(user, body.clientId);
    return this.subscriptionService.pause(body.clientId, body.reason);
  }

  @Post('subscription/resume')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async resumeSubscription(
    @Body() body: { clientId: string },
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ClientSubscription> {
    await this.verifyClientAccess(user, body.clientId);
    return this.subscriptionService.resume(body.clientId);
  }

  // ═══════════════════════════════════════════════════════════════
  // USAGE
  // ═══════════════════════════════════════════════════════════════

  @Get('usage')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async getUsage(
    @Query('clientId') clientId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UsageSummary> {
    await this.verifyClientAccess(user, clientId);
    return this.usageService.getUsageSummary(clientId);
  }

  @Get('usage/by-company')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async getUsageByCompany(
    @Query('clientId') clientId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.verifyClientAccess(user, clientId);
    const period = await this.usageService.getActiveUsagePeriod(clientId);
    return this.usageService.getUsageByCompany(period.id);
  }

  @Post('usage/record')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async recordUsage(
    @Body() dto: RecordUsageEventDto & { clientId: string },
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    const { clientId, ...eventDto } = dto;
    await this.verifyClientAccess(user, clientId);
    await this.usageService.recordEvent(clientId, eventDto);
    return { success: true };
  }

  @Post('usage/close-period')
  @Roles('SUPER_ADMIN')
  async closePeriod(
    @Body() body: { periodId: string },
  ): Promise<{ success: boolean }> {
    // Only super admins can close billing periods
    await this.usageService.closePeriod(body.periodId);
    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════════
  // INVOICES
  // ═══════════════════════════════════════════════════════════════

  @Get('invoices')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async getInvoices(
    @Query('clientId') clientId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Invoice[]> {
    await this.verifyClientAccess(user, clientId);
    return this.invoiceService.findByClientId(clientId);
  }

  @Get('invoices/:id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async getInvoice(@Param('id') id: string): Promise<Invoice> {
    // Note: Service should validate client access on the returned invoice
    return this.invoiceService.findById(id);
  }

  @Post('invoices/generate')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async generateInvoice(
    @Body() body: { clientId: string; usagePeriodId: string },
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Invoice> {
    await this.verifyClientAccess(user, body.clientId);
    return this.invoiceService.generateInvoice(body.clientId, body.usagePeriodId);
  }

  @Post('invoices/:id/mark-paid')
  @Roles('SUPER_ADMIN')
  async markInvoicePaid(
    @Param('id') id: string,
    @Body() body: { paymentMethod?: string },
  ): Promise<Invoice> {
    // Only super admins can mark invoices as paid
    return this.invoiceService.markPaid(id, body.paymentMethod);
  }

  @Post('invoices/:id/void')
  @Roles('SUPER_ADMIN')
  async voidInvoice(@Param('id') id: string): Promise<Invoice> {
    // Only super admins can void invoices
    return this.invoiceService.voidInvoice(id);
  }
}
