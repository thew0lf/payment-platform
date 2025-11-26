import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import {
  MetricCategory,
  TimeGranularity,
  ReportFormat,
} from '../types/analytics.types';

// ═══════════════════════════════════════════════════════════════
// DTOs
// ═══════════════════════════════════════════════════════════════

class GetDashboardDto {
  companyId: string;
  startDate?: string;
  endDate?: string;
  compareWithPrevious?: boolean;
}

class GetAnalyticsDto {
  companyId: string;
  category: MetricCategory;
  startDate: string;
  endDate: string;
  granularity?: TimeGranularity;
  segments?: string[];
  compareWithPrevious?: boolean;
}

class CreateReportConfigDto {
  companyId: string;
  name: string;
  description?: string;
  metrics: MetricCategory[];
  filters: {
    dateRange: {
      startDate: string;
      endDate: string;
    };
    segments?: string[];
    products?: string[];
    channels?: string[];
  };
  schedule?: {
    frequency: 'once' | 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number;
    dayOfMonth?: number;
    time: string;
    timezone: string;
  };
  delivery: {
    format: ReportFormat;
    recipients: string[];
    includeRawData?: boolean;
    includeVisualizations?: boolean;
  };
}

class UpdateReportConfigDto {
  name?: string;
  description?: string;
  metrics?: MetricCategory[];
  filters?: CreateReportConfigDto['filters'];
  schedule?: CreateReportConfigDto['schedule'];
  delivery?: CreateReportConfigDto['delivery'];
  isActive?: boolean;
}

class GenerateReportDto {
  configId?: string;
  companyId: string;
  metrics: MetricCategory[];
  startDate: string;
  endDate: string;
  format: ReportFormat;
  includeRawData?: boolean;
}

class ExportDataDto {
  companyId: string;
  dataType: 'customers' | 'transactions' | 'messages' | 'automations' | 'all';
  startDate: string;
  endDate: string;
  format: ReportFormat;
  filters?: Record<string, unknown>;
}

@ApiTags('Analytics')
@Controller('momentum/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // ═══════════════════════════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════════════════════════

  @Get('dashboard/:companyId')
  @ApiOperation({ summary: 'Get dashboard overview' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'compareWithPrevious', required: false })
  @ApiResponse({ status: 200, description: 'Dashboard overview returned' })
  async getDashboardOverview(
    @Param('companyId') companyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('compareWithPrevious') compareWithPrevious?: string,
  ) {
    return this.analyticsService.getDashboardOverview({
      companyId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      compareWithPrevious: compareWithPrevious === 'true',
    });
  }

  @Get('realtime/:companyId')
  @ApiOperation({ summary: 'Get real-time metrics' })
  @ApiResponse({ status: 200, description: 'Real-time metrics returned' })
  async getRealTimeMetrics(@Param('companyId') companyId: string) {
    return this.analyticsService.getRealTimeMetrics(companyId);
  }

  // ═══════════════════════════════════════════════════════════════
  // CHURN ANALYTICS
  // ═══════════════════════════════════════════════════════════════

  @Get('churn/:companyId')
  @ApiOperation({ summary: 'Get churn analytics' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiQuery({ name: 'granularity', required: false, enum: TimeGranularity })
  @ApiQuery({ name: 'segments', required: false })
  @ApiResponse({ status: 200, description: 'Churn analytics returned' })
  async getChurnAnalytics(
    @Param('companyId') companyId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('granularity') granularity?: TimeGranularity,
    @Query('segments') segments?: string,
  ) {
    return this.analyticsService.getChurnAnalytics({
      companyId,
      category: MetricCategory.CHURN,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      granularity,
      segments: segments ? segments.split(',') : undefined,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // SAVE FLOW ANALYTICS
  // ═══════════════════════════════════════════════════════════════

  @Get('save-flow/:companyId')
  @ApiOperation({ summary: 'Get save flow analytics' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiQuery({ name: 'granularity', required: false, enum: TimeGranularity })
  @ApiResponse({ status: 200, description: 'Save flow analytics returned' })
  async getSaveFlowAnalytics(
    @Param('companyId') companyId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('granularity') granularity?: TimeGranularity,
  ) {
    return this.analyticsService.getSaveFlowAnalytics({
      companyId,
      category: MetricCategory.SAVE_FLOW,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      granularity,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // CUSTOMER SERVICE ANALYTICS
  // ═══════════════════════════════════════════════════════════════

  @Get('customer-service/:companyId')
  @ApiOperation({ summary: 'Get customer service (Voice AI) analytics' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiQuery({ name: 'granularity', required: false, enum: TimeGranularity })
  @ApiResponse({ status: 200, description: 'Customer service analytics returned' })
  async getCustomerServiceAnalytics(
    @Param('companyId') companyId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('granularity') granularity?: TimeGranularity,
  ) {
    return this.analyticsService.getCustomerServiceAnalytics({
      companyId,
      category: MetricCategory.CUSTOMER_SERVICE,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      granularity,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // CONTENT ANALYTICS
  // ═══════════════════════════════════════════════════════════════

  @Get('content/:companyId')
  @ApiOperation({ summary: 'Get content generation analytics' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiQuery({ name: 'granularity', required: false, enum: TimeGranularity })
  @ApiResponse({ status: 200, description: 'Content analytics returned' })
  async getContentAnalytics(
    @Param('companyId') companyId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('granularity') granularity?: TimeGranularity,
  ) {
    return this.analyticsService.getContentAnalytics({
      companyId,
      category: MetricCategory.CONTENT,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      granularity,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // DELIVERY ANALYTICS
  // ═══════════════════════════════════════════════════════════════

  @Get('delivery/:companyId')
  @ApiOperation({ summary: 'Get delivery analytics' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiQuery({ name: 'granularity', required: false, enum: TimeGranularity })
  @ApiResponse({ status: 200, description: 'Delivery analytics returned' })
  async getDeliveryAnalytics(
    @Param('companyId') companyId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('granularity') granularity?: TimeGranularity,
  ) {
    return this.analyticsService.getDeliveryAnalytics({
      companyId,
      category: MetricCategory.DELIVERY,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      granularity,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // UPSELL ANALYTICS
  // ═══════════════════════════════════════════════════════════════

  @Get('upsell/:companyId')
  @ApiOperation({ summary: 'Get upsell analytics' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiQuery({ name: 'granularity', required: false, enum: TimeGranularity })
  @ApiResponse({ status: 200, description: 'Upsell analytics returned' })
  async getUpsellAnalytics(
    @Param('companyId') companyId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('granularity') granularity?: TimeGranularity,
  ) {
    return this.analyticsService.getUpsellAnalytics({
      companyId,
      category: MetricCategory.UPSELL,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      granularity,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // REVENUE ANALYTICS
  // ═══════════════════════════════════════════════════════════════

  @Get('revenue/:companyId')
  @ApiOperation({ summary: 'Get revenue analytics' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiQuery({ name: 'granularity', required: false, enum: TimeGranularity })
  @ApiResponse({ status: 200, description: 'Revenue analytics returned' })
  async getRevenueAnalytics(
    @Param('companyId') companyId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('granularity') granularity?: TimeGranularity,
  ) {
    return this.analyticsService.getRevenueAnalytics({
      companyId,
      category: MetricCategory.REVENUE,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      granularity,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // BENCHMARKING
  // ═══════════════════════════════════════════════════════════════

  @Get('benchmarks/:companyId')
  @ApiOperation({ summary: 'Get company benchmarks against industry' })
  @ApiResponse({ status: 200, description: 'Company benchmarks returned' })
  async getCompanyBenchmarks(@Param('companyId') companyId: string) {
    return this.analyticsService.getCompanyBenchmarks(companyId);
  }

  // ═══════════════════════════════════════════════════════════════
  // REPORT MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  @Post('reports')
  @ApiOperation({ summary: 'Create a new report configuration' })
  @ApiResponse({ status: 201, description: 'Report configuration created' })
  async createReportConfig(@Body() dto: CreateReportConfigDto) {
    return this.analyticsService.createReportConfig({
      companyId: dto.companyId,
      name: dto.name,
      description: dto.description,
      metrics: dto.metrics,
      filters: {
        dateRange: {
          startDate: new Date(dto.filters.dateRange.startDate),
          endDate: new Date(dto.filters.dateRange.endDate),
        },
        segments: dto.filters.segments,
        products: dto.filters.products,
        channels: dto.filters.channels,
      },
      schedule: dto.schedule as any,
      delivery: dto.delivery,
    });
  }

  @Get('reports/:companyId')
  @ApiOperation({ summary: 'List report configurations for a company' })
  @ApiResponse({ status: 200, description: 'Report configurations returned' })
  async getReportConfigs(@Param('companyId') companyId: string) {
    return this.analyticsService.getReportConfigs(companyId);
  }

  @Post('reports/generate')
  @ApiOperation({ summary: 'Generate a report' })
  @ApiResponse({ status: 201, description: 'Report generated' })
  async generateReport(@Body() dto: GenerateReportDto) {
    return this.analyticsService.generateReport({
      configId: dto.configId,
      companyId: dto.companyId,
      metrics: dto.metrics,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      format: dto.format,
      includeRawData: dto.includeRawData,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // LEGACY ENDPOINTS (backward compatibility)
  // ═══════════════════════════════════════════════════════════════

  @Get('overview/:companyId')
  @ApiOperation({ summary: 'Get momentum overview (legacy)' })
  @ApiQuery({ name: 'dateRange', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Overview returned' })
  async getOverview(
    @Param('companyId') companyId: string,
    @Query('dateRange') dateRange?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getOverview(companyId, {
      dateRange,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('save-performance/:companyId')
  @ApiOperation({ summary: 'Get save performance metrics (legacy)' })
  @ApiQuery({ name: 'dateRange', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'groupBy', required: false })
  @ApiResponse({ status: 200, description: 'Save performance returned' })
  async getSavePerformance(
    @Param('companyId') companyId: string,
    @Query('dateRange') dateRange?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupBy') groupBy?: string,
  ) {
    return this.analyticsService.getSavePerformance(companyId, {
      dateRange,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      groupBy,
    });
  }

  @Get('voice-performance/:companyId')
  @ApiOperation({ summary: 'Get voice performance metrics (legacy)' })
  @ApiQuery({ name: 'dateRange', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'direction', required: false })
  @ApiResponse({ status: 200, description: 'Voice performance returned' })
  async getVoicePerformance(
    @Param('companyId') companyId: string,
    @Query('dateRange') dateRange?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('direction') direction?: string,
  ) {
    return this.analyticsService.getVoicePerformance(companyId, {
      dateRange,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      direction,
    });
  }

  @Get('content-performance/:companyId')
  @ApiOperation({ summary: 'Get content performance metrics (legacy)' })
  @ApiQuery({ name: 'dateRange', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiResponse({ status: 200, description: 'Content performance returned' })
  async getContentPerformance(
    @Param('companyId') companyId: string,
    @Query('dateRange') dateRange?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('type') type?: string,
  ) {
    return this.analyticsService.getContentPerformance(companyId, {
      dateRange,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      type: type as any,
    });
  }

  @Get('revenue-attribution/:companyId')
  @ApiOperation({ summary: 'Get revenue attribution (legacy)' })
  @ApiQuery({ name: 'dateRange', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Revenue attribution returned' })
  async getRevenueAttribution(
    @Param('companyId') companyId: string,
    @Query('dateRange') dateRange?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getRevenueAttribution(companyId, {
      dateRange,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }
}
