import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metrics')
  async getMetrics(
    @Request() req,
    @Query('companyId') companyId?: string,
    @Query('clientId') clientId?: string,
  ) {
    return this.dashboardService.getMetrics(req.user, { companyId, clientId });
  }

  @Get('providers')
  async getProviderMetrics(
    @Request() req,
    @Query('companyId') companyId?: string,
  ) {
    return this.dashboardService.getProviderMetrics(req.user, { companyId });
  }

  @Get('transactions/recent')
  async getRecentTransactions(
    @Request() req,
    @Query('companyId') companyId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.dashboardService.getRecentTransactions(req.user, {
      companyId,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('stats/chart')
  async getChartData(
    @Request() req,
    @Query('days') days?: string,
    @Query('companyId') companyId?: string,
    @Query('clientId') clientId?: string,
  ) {
    return this.dashboardService.getChartData(
      req.user,
      days ? parseInt(days, 10) : 30,
      { companyId, clientId },
    );
  }

  @Get('badges')
  async getBadgeCounts(
    @Request() req,
    @Query('companyId') companyId?: string,
    @Query('clientId') clientId?: string,
  ) {
    return this.dashboardService.getBadgeCounts(req.user, { companyId, clientId });
  }
}
