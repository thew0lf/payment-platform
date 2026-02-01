import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDateString,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

// ═══════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════

export enum ReportInterval {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export enum ReportMetric {
  CLICKS = 'clicks',
  CONVERSIONS = 'conversions',
  REVENUE = 'revenue',
  COMMISSIONS = 'commissions',
  EPC = 'epc', // Earnings per click
}

export enum ExportFormat {
  CSV = 'csv',
  EXCEL = 'excel',
  PDF = 'pdf',
}

export enum ReportType {
  OVERVIEW = 'overview',
  PERFORMANCE = 'performance',
  SUBID = 'subid',
  TRENDS = 'trends',
  TOP_AFFILIATES = 'top_affiliates',
  TOP_LINKS = 'top_links',
}

// SubID fields - both naming conventions are supported (t1-t5 and subId1-subId5)
export type SubIdField = 'subId1' | 'subId2' | 'subId3' | 'subId4' | 'subId5';
export type SubIdAlias = 't1' | 't2' | 't3' | 't4' | 't5';

// Map aliases to field names
export const SUBID_ALIAS_MAP: Record<SubIdAlias, SubIdField> = {
  t1: 'subId1',
  t2: 'subId2',
  t3: 'subId3',
  t4: 'subId4',
  t5: 'subId5',
};

// Helper to normalize SubID field names
export function normalizeSubIdField(field: string): SubIdField | null {
  if (['subId1', 'subId2', 'subId3', 'subId4', 'subId5'].includes(field)) {
    return field as SubIdField;
  }
  if (['t1', 't2', 't3', 't4', 't5'].includes(field)) {
    return SUBID_ALIAS_MAP[field as SubIdAlias];
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// QUERY DTOs
// ═══════════════════════════════════════════════════════════════

export class DateRangeQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class OverviewQueryDto extends DateRangeQueryDto {
  @IsOptional()
  @IsString()
  companyId?: string;
}

export class PerformanceQueryDto extends DateRangeQueryDto {
  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  partnerId?: string;

  @IsOptional()
  @IsString()
  linkId?: string;

  @IsOptional()
  @IsString()
  campaign?: string;

  @IsOptional()
  @IsEnum(ReportMetric)
  sortBy?: ReportMetric;

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number;
}

export class SubIdQueryDto extends DateRangeQueryDto {
  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  partnerId?: string;

  @IsString()
  groupBy: SubIdField;

  @IsOptional()
  @IsString()
  secondGroupBy?: SubIdField;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class TrendsQueryDto extends DateRangeQueryDto {
  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  partnerId?: string;

  @IsOptional()
  @IsString()
  linkId?: string;

  @IsOptional()
  @IsEnum(ReportInterval)
  interval?: ReportInterval;

  @IsOptional()
  @IsString()
  comparePrevious?: 'true' | 'false';
}

export class TopPerformersQueryDto extends DateRangeQueryDto {
  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;

  @IsOptional()
  @IsEnum(ReportMetric)
  metric?: ReportMetric;
}

export class ExportReportDto extends DateRangeQueryDto {
  @IsEnum(ReportType)
  reportType: ReportType;

  @IsEnum(ExportFormat)
  format: ExportFormat;

  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  partnerId?: string;

  @IsOptional()
  @IsString()
  linkId?: string;

  @IsOptional()
  @IsString()
  groupBy?: SubIdField;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  columns?: string[];

  @IsOptional()
  @IsString()
  filename?: string;
}

// ═══════════════════════════════════════════════════════════════
// RESPONSE DTOs
// ═══════════════════════════════════════════════════════════════

export interface PeriodMetrics {
  clicks: number;
  uniqueClicks: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
  commissions: number;
  epc: number; // Earnings per click
  averageOrderValue: number;
}

export interface ComparisonMetrics {
  current: PeriodMetrics;
  previous: PeriodMetrics;
  change: {
    clicks: number;
    clicksPercent: number;
    conversions: number;
    conversionsPercent: number;
    revenue: number;
    revenuePercent: number;
    commissions: number;
    commissionsPercent: number;
    conversionRateChange: number;
    epcChange: number;
  };
}

export interface ReportOverviewDto {
  period: {
    startDate: string;
    endDate: string;
  };
  metrics: PeriodMetrics;
  comparison?: ComparisonMetrics;
  activeAffiliates: number;
  newAffiliates: number;
  pendingPayouts: number;
  pendingPayoutsAmount: number;
}

export interface AffiliatePerformanceDto {
  partner: {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string | null;
    email: string;
    affiliateCode: string;
    tier: string;
    status: string;
  };
  metrics: PeriodMetrics;
  linksCount: number;
  topLink?: {
    id: string;
    name: string;
    revenue: number;
  };
}

export interface PerformanceReportDto {
  period: {
    startDate: string;
    endDate: string;
  };
  data: AffiliatePerformanceDto[];
  totals: PeriodMetrics;
  total: number;
  limit: number;
  offset: number;
}

export interface SubIdBreakdownItem {
  value: string;
  clicks: number;
  uniqueClicks: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
  commissions: number;
  epc: number;
  children?: SubIdBreakdownItem[];
}

export interface SubIdReportDto {
  period: {
    startDate: string;
    endDate: string;
  };
  groupBy: SubIdField;
  secondGroupBy?: SubIdField;
  data: SubIdBreakdownItem[];
  totals: PeriodMetrics;
}

export interface TrendDataPoint {
  date: string;
  label: string;
  clicks: number;
  uniqueClicks: number;
  conversions: number;
  revenue: number;
  commissions: number;
  conversionRate: number;
  epc: number;
}

export interface TrendReportDto {
  period: {
    startDate: string;
    endDate: string;
  };
  interval: ReportInterval;
  data: TrendDataPoint[];
  previousPeriod?: TrendDataPoint[];
  totals: PeriodMetrics;
  previousTotals?: PeriodMetrics;
}

export interface TopAffiliateDto {
  rank: number;
  partner: {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string | null;
    affiliateCode: string;
    tier: string;
  };
  value: number;
  metric: ReportMetric;
  clicks: number;
  conversions: number;
  revenue: number;
  commissions: number;
  conversionRate: number;
}

export interface TopLinkDto {
  rank: number;
  link: {
    id: string;
    name: string;
    trackingCode: string;
    campaign: string | null;
    destinationUrl: string;
  };
  partner: {
    id: string;
    displayName: string | null;
    affiliateCode: string;
  };
  value: number;
  metric: ReportMetric;
  clicks: number;
  conversions: number;
  revenue: number;
  commissions: number;
  conversionRate: number;
}

export interface ExportResultDto {
  filename: string;
  mimeType: string;
  data: Buffer | string;
  rowCount: number;
  generatedAt: string;
}
