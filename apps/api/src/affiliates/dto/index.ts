export * from './create-partner.dto';
export * from './update-partner.dto';
export * from './create-link.dto';
export * from './track-click.dto';
export * from './payout.dto';
export * from './partnership.dto';

// track-conversion.dto exports (excluding ConversionQueryDto which is in conversion.dto)
export { TrackConversionDto, UpdateConversionDto, PostbackDto } from './track-conversion.dto';

// conversion.dto exports - primary source for ConversionQueryDto and SubIdBreakdownItem
export {
  ConversionQueryDto,
  RecordConversionDto,
  UpdateConversionStatusDto,
  BulkConversionActionDto,
  ConversionStatsQueryDto,
  SubIdBreakdownQueryDto,
  SubIdBreakdownItem,
  ConversionStatsResponse,
  SubIdBreakdownResponse,
} from './conversion.dto';

// affiliate-reports.dto exports (excluding SubIdBreakdownItem which is in conversion.dto)
export {
  SubIdField,
  SubIdAlias,
  DateRangeQueryDto,
  OverviewQueryDto,
  PerformanceQueryDto,
  SubIdQueryDto,
  TrendsQueryDto,
  TopPerformersQueryDto,
  ExportReportDto,
  PeriodMetrics,
  ComparisonMetrics,
  ReportOverviewDto,
  AffiliatePerformanceDto,
  PerformanceReportDto,
  SubIdReportDto,
  TrendDataPoint,
  TrendReportDto,
  TopAffiliateDto,
  TopLinkDto,
  ExportResultDto,
} from './affiliate-reports.dto';
