import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { EcommerceAnalyticsService } from '../services/ecommerce-analytics.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { HierarchyService } from '../../hierarchy/hierarchy.service';
import { ScopeType } from '@prisma/client';
import { TrackEventInput, DateRange, TimeGrouping } from '../types/ecommerce-analytics.types';

/**
 * E-commerce Analytics Controller
 *
 * Provides analytics endpoints for the admin dashboard:
 * - Overview metrics (cart, recovery, funnel)
 * - Cart abandonment time series
 * - Recovery metrics by channel
 * - Cart value distribution
 * - Funnel drop-off analysis
 *
 * All endpoints require authentication and respect hierarchy access control.
 */
@ApiTags('E-commerce Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/ecommerce-analytics')
export class EcommerceAnalyticsController {
  constructor(
    private readonly analyticsService: EcommerceAnalyticsService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Get company ID for analytics queries
   * Validates hierarchy access for ORG/CLIENT users
   */
  private async getCompanyId(user: AuthenticatedUser, queryCompanyId?: string): Promise<string> {
    // COMPANY users are always scoped to their company
    if (user.scopeType === 'COMPANY') {
      return user.scopeId;
    }

    // ORG/CLIENT users can specify a company via query param
    if (queryCompanyId) {
      const hasAccess = await this.hierarchyService.canAccessCompany(
        {
          sub: user.id,
          scopeType: user.scopeType as ScopeType,
          scopeId: user.scopeId,
          organizationId: user.organizationId,
          clientId: user.clientId,
          companyId: user.companyId,
        },
        queryCompanyId,
      );
      if (!hasAccess) {
        throw new ForbiddenException('Access denied to this company');
      }
      return queryCompanyId;
    }

    // Fall back to user's default company if set
    if (user.companyId) {
      return user.companyId;
    }

    throw new ForbiddenException('Company ID required for analytics');
  }

  /**
   * Parse date range from query params with defaults
   * Default: last 30 days
   */
  private parseDateRange(startDate?: string, endDate?: string): DateRange {
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { startDate: start, endDate: end };
  }

  /**
   * Parse and validate groupBy parameter
   */
  private parseGroupBy(groupBy?: string): TimeGrouping {
    if (groupBy === 'week' || groupBy === 'month') {
      return groupBy;
    }
    return 'day';
  }

  // ============================================================================
  // Admin Analytics Endpoints
  // ============================================================================

  @Get('overview')
  @ApiOperation({
    summary: 'Get e-commerce overview metrics',
    description: 'Returns combined cart, recovery, and funnel metrics for the admin dashboard',
  })
  @ApiQuery({ name: 'companyId', required: false, description: 'Company ID (optional for ORG/CLIENT users)' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO string), default: 30 days ago' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO string), default: now' })
  @ApiResponse({ status: 200, description: 'Overview metrics retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Access denied to company' })
  async getOverview(
    @CurrentUser() user: AuthenticatedUser,
    @Query('companyId') companyId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const effectiveCompanyId = await this.getCompanyId(user, companyId);
    const dateRange = this.parseDateRange(startDate, endDate);
    return this.analyticsService.getAdminOverview(effectiveCompanyId, dateRange);
  }

  @Get('abandonment')
  @ApiOperation({
    summary: 'Get cart abandonment time series',
    description: 'Returns abandonment rate over time grouped by day/week/month',
  })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'groupBy', required: false, enum: ['day', 'week', 'month'], description: 'Time grouping (default: day)' })
  @ApiResponse({ status: 200, description: 'Abandonment time series retrieved' })
  async getAbandonment(
    @CurrentUser() user: AuthenticatedUser,
    @Query('companyId') companyId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupBy') groupBy?: string,
  ) {
    const effectiveCompanyId = await this.getCompanyId(user, companyId);
    const dateRange = this.parseDateRange(startDate, endDate);
    const timeGrouping = this.parseGroupBy(groupBy);
    return this.analyticsService.getAbandonmentTimeSeries(effectiveCompanyId, dateRange, timeGrouping);
  }

  @Get('recovery')
  @ApiOperation({
    summary: 'Get cart recovery metrics by channel',
    description: 'Returns recovery success rates broken down by channel (email, sms, etc.)',
  })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'groupBy', required: false, enum: ['day', 'week', 'month'] })
  @ApiResponse({ status: 200, description: 'Recovery metrics retrieved' })
  async getRecovery(
    @CurrentUser() user: AuthenticatedUser,
    @Query('companyId') companyId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupBy') groupBy?: string,
  ) {
    const effectiveCompanyId = await this.getCompanyId(user, companyId);
    const dateRange = this.parseDateRange(startDate, endDate);
    const timeGrouping = this.parseGroupBy(groupBy);
    return this.analyticsService.getRecoveryAnalytics(effectiveCompanyId, dateRange, timeGrouping);
  }

  @Get('cart-values')
  @ApiOperation({
    summary: 'Get cart value distribution',
    description: 'Returns carts broken down by value ranges with statistics',
  })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Cart value distribution retrieved' })
  async getCartValues(
    @CurrentUser() user: AuthenticatedUser,
    @Query('companyId') companyId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const effectiveCompanyId = await this.getCompanyId(user, companyId);
    const dateRange = this.parseDateRange(startDate, endDate);
    return this.analyticsService.getCartValueDistribution(effectiveCompanyId, dateRange);
  }

  @Get('funnel-drop-off')
  @ApiOperation({
    summary: 'Get funnel drop-off analytics',
    description: 'Returns where users abandon during the funnel journey',
  })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'funnelId', required: false, description: 'Filter by specific funnel' })
  @ApiResponse({ status: 200, description: 'Funnel drop-off analytics retrieved' })
  async getFunnelDropOff(
    @CurrentUser() user: AuthenticatedUser,
    @Query('companyId') companyId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('funnelId') funnelId?: string,
  ) {
    const effectiveCompanyId = await this.getCompanyId(user, companyId);
    const dateRange = this.parseDateRange(startDate, endDate);
    return this.analyticsService.getFunnelDropoff(effectiveCompanyId, dateRange, funnelId);
  }

  // ============================================================================
  // Existing Analytics Endpoints (preserved for backward compatibility)
  // ============================================================================

  @Get('cart')
  @ApiOperation({ summary: 'Get detailed cart analytics' })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'siteId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Cart analytics retrieved' })
  async getCartAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Query('companyId') companyId?: string,
    @Query('siteId') siteId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const effectiveCompanyId = await this.getCompanyId(user, companyId);
    const dateRange = this.parseDateRange(startDate, endDate);
    return this.analyticsService.getCartAnalytics(effectiveCompanyId, dateRange, siteId);
  }

  @Get('wishlist')
  @ApiOperation({ summary: 'Get wishlist analytics' })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'siteId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Wishlist analytics retrieved' })
  async getWishlistAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Query('companyId') companyId?: string,
    @Query('siteId') siteId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const effectiveCompanyId = await this.getCompanyId(user, companyId);
    const dateRange = this.parseDateRange(startDate, endDate);
    return this.analyticsService.getWishlistAnalytics(effectiveCompanyId, dateRange, siteId);
  }

  @Get('comparison')
  @ApiOperation({ summary: 'Get comparison analytics' })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'siteId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Comparison analytics retrieved' })
  async getComparisonAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Query('companyId') companyId?: string,
    @Query('siteId') siteId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const effectiveCompanyId = await this.getCompanyId(user, companyId);
    const dateRange = this.parseDateRange(startDate, endDate);
    return this.analyticsService.getComparisonAnalytics(effectiveCompanyId, dateRange, siteId);
  }

  @Get('cross-site-sessions')
  @ApiOperation({ summary: 'Get cross-site session analytics' })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Session analytics retrieved' })
  async getCrossSiteSessionAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Query('companyId') companyId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const effectiveCompanyId = await this.getCompanyId(user, companyId);
    const dateRange = this.parseDateRange(startDate, endDate);
    return this.analyticsService.getCrossSiteSessionAnalytics(effectiveCompanyId, dateRange);
  }

  @Get('ecommerce-overview')
  @ApiOperation({ summary: 'Get combined e-commerce overview (legacy)' })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Overview data retrieved' })
  async getLegacyOverview(
    @CurrentUser() user: AuthenticatedUser,
    @Query('companyId') companyId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const effectiveCompanyId = await this.getCompanyId(user, companyId);
    const dateRange = this.parseDateRange(startDate, endDate);
    return this.analyticsService.getOverview(effectiveCompanyId, dateRange);
  }

  @Post('events')
  @ApiOperation({ summary: 'Track analytics event' })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiResponse({ status: 201, description: 'Event tracked' })
  async trackEvent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: TrackEventInput,
    @Query('companyId') companyId?: string,
  ) {
    const effectiveCompanyId = await this.getCompanyId(user, companyId);
    await this.analyticsService.trackEvent(effectiveCompanyId, input);
    return { success: true };
  }
}
