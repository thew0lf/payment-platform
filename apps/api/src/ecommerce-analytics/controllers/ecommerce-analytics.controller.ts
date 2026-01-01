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
import { TrackEventInput, DateRange } from '../types/ecommerce-analytics.types';

@ApiTags('E-commerce Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics/ecommerce')
export class EcommerceAnalyticsController {
  constructor(
    private readonly analyticsService: EcommerceAnalyticsService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  private async getCompanyId(user: AuthenticatedUser, queryCompanyId?: string): Promise<string> {
    if (user.scopeType === 'COMPANY') {
      return user.scopeId;
    }

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

    if (user.companyId) {
      return user.companyId;
    }

    throw new ForbiddenException('Company ID required');
  }

  private parseDateRange(startDate?: string, endDate?: string): DateRange {
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { startDate: start, endDate: end };
  }

  @Get('overview')
  @ApiOperation({ summary: 'Get e-commerce overview dashboard' })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'startDate', required: false, description: 'ISO date string' })
  @ApiQuery({ name: 'endDate', required: false, description: 'ISO date string' })
  @ApiResponse({ status: 200, description: 'Overview data retrieved' })
  async getOverview(
    @CurrentUser() user: AuthenticatedUser,
    @Query('companyId') companyId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const effectiveCompanyId = await this.getCompanyId(user, companyId);
    const dateRange = this.parseDateRange(startDate, endDate);
    return this.analyticsService.getOverview(effectiveCompanyId, dateRange);
  }

  @Get('cart')
  @ApiOperation({ summary: 'Get cart analytics' })
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
