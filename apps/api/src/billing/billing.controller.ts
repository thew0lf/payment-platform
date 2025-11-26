import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { PricingPlanService } from './services/pricing-plan.service';
import { SubscriptionService } from './services/subscription.service';
import { UsageTrackingService } from './services/usage-tracking.service';
import { InvoiceService } from './services/invoice.service';
import {
  CreateSubscriptionDto,
  RecordUsageEventDto,
  PricingPlan,
  ClientSubscription,
  UsageSummary,
  Invoice,
} from './types/billing.types';

@Controller('billing')
export class BillingController {
  constructor(
    private readonly planService: PricingPlanService,
    private readonly subscriptionService: SubscriptionService,
    private readonly usageService: UsageTrackingService,
    private readonly invoiceService: InvoiceService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // PLANS
  // ═══════════════════════════════════════════════════════════════

  @Get('plans')
  async getPlans(@Query('includeHidden') includeHidden?: string): Promise<PricingPlan[]> {
    return this.planService.findAll(includeHidden === 'true');
  }

  @Get('plans/:id')
  async getPlan(@Param('id') id: string): Promise<PricingPlan> {
    return this.planService.findById(id);
  }

  // ═══════════════════════════════════════════════════════════════
  // SUBSCRIPTION
  // ═══════════════════════════════════════════════════════════════

  @Get('subscription')
  async getSubscription(@Query('clientId') clientId: string): Promise<ClientSubscription> {
    return this.subscriptionService.findByClientId(clientId);
  }

  @Post('subscription')
  async createSubscription(
    @Body() dto: CreateSubscriptionDto & { clientId: string },
  ): Promise<ClientSubscription> {
    const { clientId, ...createDto } = dto;
    return this.subscriptionService.create(clientId, createDto);
  }

  @Patch('subscription/plan')
  async changePlan(
    @Body() body: { clientId: string; planId: string },
  ): Promise<ClientSubscription> {
    return this.subscriptionService.changePlan(body.clientId, body.planId);
  }

  @Post('subscription/cancel')
  async cancelSubscription(
    @Body() body: { clientId: string; reason?: string },
  ): Promise<ClientSubscription> {
    return this.subscriptionService.cancel(body.clientId, body.reason);
  }

  @Post('subscription/pause')
  async pauseSubscription(
    @Body() body: { clientId: string; reason?: string },
  ): Promise<ClientSubscription> {
    return this.subscriptionService.pause(body.clientId, body.reason);
  }

  @Post('subscription/resume')
  async resumeSubscription(
    @Body() body: { clientId: string },
  ): Promise<ClientSubscription> {
    return this.subscriptionService.resume(body.clientId);
  }

  // ═══════════════════════════════════════════════════════════════
  // USAGE
  // ═══════════════════════════════════════════════════════════════

  @Get('usage')
  async getUsage(@Query('clientId') clientId: string): Promise<UsageSummary> {
    return this.usageService.getUsageSummary(clientId);
  }

  @Get('usage/by-company')
  async getUsageByCompany(@Query('clientId') clientId: string) {
    const period = await this.usageService.getActiveUsagePeriod(clientId);
    return this.usageService.getUsageByCompany(period.id);
  }

  @Post('usage/record')
  async recordUsage(
    @Body() dto: RecordUsageEventDto & { clientId: string },
  ): Promise<{ success: boolean }> {
    const { clientId, ...eventDto } = dto;
    await this.usageService.recordEvent(clientId, eventDto);
    return { success: true };
  }

  @Post('usage/close-period')
  async closePeriod(
    @Body() body: { periodId: string },
  ): Promise<{ success: boolean }> {
    await this.usageService.closePeriod(body.periodId);
    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════════
  // INVOICES
  // ═══════════════════════════════════════════════════════════════

  @Get('invoices')
  async getInvoices(@Query('clientId') clientId: string): Promise<Invoice[]> {
    return this.invoiceService.findByClientId(clientId);
  }

  @Get('invoices/:id')
  async getInvoice(@Param('id') id: string): Promise<Invoice> {
    return this.invoiceService.findById(id);
  }

  @Post('invoices/generate')
  async generateInvoice(
    @Body() body: { clientId: string; usagePeriodId: string },
  ): Promise<Invoice> {
    return this.invoiceService.generateInvoice(body.clientId, body.usagePeriodId);
  }

  @Post('invoices/:id/mark-paid')
  async markInvoicePaid(
    @Param('id') id: string,
    @Body() body: { paymentMethod?: string },
  ): Promise<Invoice> {
    return this.invoiceService.markPaid(id, body.paymentMethod);
  }

  @Post('invoices/:id/void')
  async voidInvoice(@Param('id') id: string): Promise<Invoice> {
    return this.invoiceService.voidInvoice(id);
  }
}
