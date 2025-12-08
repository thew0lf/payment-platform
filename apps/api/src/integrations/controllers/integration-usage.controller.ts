import { Controller, Get, Query, UseGuards, Logger, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { IntegrationUsageService } from '../services/integration-usage.service';

@Controller('integrations/usage')
@UseGuards(JwtAuthGuard)
export class IntegrationUsageController {
  private readonly logger = new Logger(IntegrationUsageController.name);

  constructor(private readonly usageService: IntegrationUsageService) {}

  /**
   * Resolve the effective company ID from query param or authenticated user
   */
  private getEffectiveCompanyId(companyId?: string, user?: AuthenticatedUser): string {
    const effectiveCompanyId = companyId || user?.companyId;
    if (!effectiveCompanyId) {
      throw new BadRequestException('Company ID is required');
    }
    return effectiveCompanyId;
  }

  /**
   * Validate billing period format (YYYY-MM)
   */
  private validateBillingPeriod(billingPeriod?: string): void {
    if (billingPeriod && !/^\d{4}-\d{2}$/.test(billingPeriod)) {
      throw new BadRequestException('Billing period must be in YYYY-MM format');
    }
  }

  /**
   * GET /api/integrations/usage
   * Get integration usage statistics for a company
   */
  @Get()
  async getUsage(
    @Query('companyId') companyId: string,
    @Query('billingPeriod') billingPeriod?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const effectiveCompanyId = this.getEffectiveCompanyId(companyId, user);
    this.validateBillingPeriod(billingPeriod);
    return this.usageService.getUsageStats(effectiveCompanyId, billingPeriod);
  }

  /**
   * GET /api/integrations/usage/summary
   * Get summary of all integration usage for a company
   */
  @Get('summary')
  async getUsageSummary(
    @Query('companyId') companyId: string,
    @Query('billingPeriod') billingPeriod?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const effectiveCompanyId = this.getEffectiveCompanyId(companyId, user);
    this.validateBillingPeriod(billingPeriod);
    return this.usageService.getUsageSummary(effectiveCompanyId, billingPeriod);
  }

  /**
   * GET /api/integrations/usage/by-provider
   * Get usage broken down by provider
   */
  @Get('by-provider')
  async getUsageByProvider(
    @Query('companyId') companyId: string,
    @Query('billingPeriod') billingPeriod?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const effectiveCompanyId = this.getEffectiveCompanyId(companyId, user);
    this.validateBillingPeriod(billingPeriod);
    return this.usageService.getUsageByProvider(effectiveCompanyId, billingPeriod);
  }

  /**
   * GET /api/integrations/usage/history
   * Get historical usage data for charts
   */
  @Get('history')
  async getUsageHistory(
    @Query('companyId') companyId: string,
    @Query('months') months = '6',
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const effectiveCompanyId = this.getEffectiveCompanyId(companyId, user);
    const monthsNum = parseInt(months, 10);
    if (isNaN(monthsNum) || monthsNum < 1 || monthsNum > 24) {
      throw new BadRequestException('Months must be a number between 1 and 24');
    }
    return this.usageService.getUsageHistory(effectiveCompanyId, monthsNum);
  }
}
