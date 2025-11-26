// ═══════════════════════════════════════════════════════════════════════════════
// MOMENTUM INTELLIGENCE™ - Analytics Dashboard Types
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────────────────────

export enum MetricType {
  COUNT = 'count',
  SUM = 'sum',
  AVERAGE = 'average',
  PERCENTAGE = 'percentage',
  RATE = 'rate',
  RATIO = 'ratio',
}

export enum TimeGranularity {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
}

export enum MetricCategory {
  CHURN = 'churn',
  SAVE_FLOW = 'save_flow',
  CUSTOMER_SERVICE = 'customer_service',
  CONTENT = 'content',
  DELIVERY = 'delivery',
  UPSELL = 'upsell',
  REVENUE = 'revenue',
  ENGAGEMENT = 'engagement',
}

export enum ReportFormat {
  JSON = 'json',
  CSV = 'csv',
  PDF = 'pdf',
  EXCEL = 'excel',
}

export enum ReportFrequency {
  ONCE = 'once',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

// ─────────────────────────────────────────────────────────────────────────────────
// CORE INTERFACES
// ─────────────────────────────────────────────────────────────────────────────────

export interface MetricValue {
  value: number;
  previousValue?: number;
  change?: number;
  changePercent?: number;
  trend: 'up' | 'down' | 'stable';
}

export interface TrendData {
  timestamp: Date;
  value: number;
  label?: string;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

// ─────────────────────────────────────────────────────────────────────────────────
// DASHBOARD OVERVIEW
// ─────────────────────────────────────────────────────────────────────────────────

export interface DashboardOverview {
  companyId: string;
  period: DateRange;
  generatedAt: Date;

  // Key Performance Indicators
  kpis: {
    totalRevenueSaved: MetricValue;
    customersRetained: MetricValue;
    churnRate: MetricValue;
    saveRate: MetricValue;
    averageCustomerLifetimeValue: MetricValue;
    netPromoterScore: MetricValue;
  };

  // Quick Stats
  quickStats: {
    activeSubscriptions: number;
    atRiskCustomers: number;
    pendingSaveFlows: number;
    scheduledMessages: number;
    openUpsellOpportunities: number;
  };

  // Trend Summaries
  trends: {
    churnTrend: TrendData[];
    revenueTrend: TrendData[];
    saveTrend: TrendData[];
    engagementTrend: TrendData[];
  };

  // Alerts
  alerts: DashboardAlert[];
}

export interface DashboardAlert {
  id: string;
  type: 'warning' | 'critical' | 'info' | 'success';
  category: MetricCategory;
  title: string;
  message: string;
  metric?: string;
  threshold?: number;
  currentValue?: number;
  actionUrl?: string;
  createdAt: Date;
  acknowledgedAt?: Date;
}

// ─────────────────────────────────────────────────────────────────────────────────
// CHURN ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────────

export interface ChurnAnalytics {
  companyId: string;
  period: DateRange;

  // Overall Metrics
  overview: {
    totalChurned: MetricValue;
    churnRate: MetricValue;
    voluntaryChurnRate: MetricValue;
    involuntaryChurnRate: MetricValue;
    revenueChurned: MetricValue;
    averageTimeToChurn: MetricValue; // days
  };

  // Churn by Reason
  churnByReason: Array<{
    reason: string;
    count: number;
    percentage: number;
    revenueImpact: number;
  }>;

  // Churn by Segment
  churnBySegment: Array<{
    segment: string;
    count: number;
    rate: number;
    previousRate: number;
    trend: 'up' | 'down' | 'stable';
  }>;

  // Churn Cohort Analysis
  cohortAnalysis: Array<{
    cohort: string; // e.g., "2024-01" for January 2024 signups
    month0: number; // Retention rate at month 0
    month1: number;
    month2: number;
    month3: number;
    month6: number;
    month12: number;
  }>;

  // Predictive Metrics
  predictions: {
    expectedChurnNext30Days: number;
    highRiskCustomerCount: number;
    estimatedRevenueAtRisk: number;
    churnProbabilityDistribution: Array<{
      range: string; // e.g., "0-10%", "10-20%"
      customerCount: number;
    }>;
  };

  // Time Series
  dailyChurn: TrendData[];
  weeklyChurn: TrendData[];
  monthlyChurn: TrendData[];
}

// ─────────────────────────────────────────────────────────────────────────────────
// SAVE FLOW ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────────

export interface SaveFlowAnalytics {
  companyId: string;
  period: DateRange;

  // Overall Performance
  overview: {
    totalSaveAttempts: MetricValue;
    successfulSaves: MetricValue;
    overallSaveRate: MetricValue;
    revenueSaved: MetricValue;
    averageSaveValue: MetricValue;
    averageTimeToSave: MetricValue; // minutes
  };

  // Stage Performance
  stagePerformance: Array<{
    stageName: string;
    stageOrder: number;
    entriesCount: number;
    completionRate: number;
    averageDuration: number; // seconds
    dropoffRate: number;
    saveRate: number;
  }>;

  // Offer Performance
  offerPerformance: Array<{
    offerId: string;
    offerName: string;
    offerType: string;
    timesPresented: number;
    timesAccepted: number;
    acceptanceRate: number;
    revenueImpact: number;
    averageDiscount: number;
  }>;

  // Save by Reason
  savesByReason: Array<{
    cancellationReason: string;
    totalAttempts: number;
    successfulSaves: number;
    saveRate: number;
    topSuccessfulOffer: string;
  }>;

  // Save by Customer Segment
  savesBySegment: Array<{
    segment: string;
    attempts: number;
    saves: number;
    saveRate: number;
    averageValue: number;
  }>;

  // Funnel Metrics
  funnel: {
    started: number;
    reasonCaptured: number;
    offersPresented: number;
    offerAccepted: number;
    saved: number;
    conversionRate: number;
  };

  // Time Series
  dailySaves: TrendData[];
  weeklySaves: TrendData[];
}

// ─────────────────────────────────────────────────────────────────────────────────
// CUSTOMER SERVICE ANALYTICS (Voice AI)
// ─────────────────────────────────────────────────────────────────────────────────

export interface CustomerServiceAnalytics {
  companyId: string;
  period: DateRange;

  // Call Metrics
  callMetrics: {
    totalCalls: MetricValue;
    averageCallDuration: MetricValue; // seconds
    averageWaitTime: MetricValue; // seconds
    firstCallResolutionRate: MetricValue;
    callAbandonmentRate: MetricValue;
    callbackRate: MetricValue;
  };

  // Voice AI Performance
  voiceAIMetrics: {
    aiHandledCalls: MetricValue;
    aiResolutionRate: MetricValue;
    aiToHumanEscalationRate: MetricValue;
    averageAIConfidence: MetricValue;
    customerSatisfactionScore: MetricValue;
  };

  // Intent Distribution
  intentDistribution: Array<{
    intent: string;
    count: number;
    percentage: number;
    resolutionRate: number;
    averageHandleTime: number;
  }>;

  // Sentiment Analysis
  sentimentAnalysis: {
    positive: number;
    neutral: number;
    negative: number;
    averageSentimentScore: number;
    sentimentTrend: TrendData[];
  };

  // Escalation Reasons
  escalationReasons: Array<{
    reason: string;
    count: number;
    percentage: number;
    averageHandleTimeAfterEscalation: number;
  }>;

  // Peak Hours Analysis
  peakHoursAnalysis: Array<{
    hour: number;
    callVolume: number;
    averageWaitTime: number;
    resolutionRate: number;
  }>;

  // Time Series
  dailyCalls: TrendData[];
  hourlyDistribution: TrendData[];
}

// ─────────────────────────────────────────────────────────────────────────────────
// CONTENT ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────────

export interface ContentAnalytics {
  companyId: string;
  period: DateRange;

  // Generation Metrics
  generationMetrics: {
    totalContentGenerated: MetricValue;
    averageGenerationTime: MetricValue; // ms
    contentApprovalRate: MetricValue;
    averageContentScore: MetricValue;
  };

  // Content by Type
  contentByType: Array<{
    type: string;
    count: number;
    averageScore: number;
    approvalRate: number;
    averageEngagement: number;
  }>;

  // Template Performance
  templatePerformance: Array<{
    templateId: string;
    templateName: string;
    usageCount: number;
    averageEngagement: number;
    conversionRate: number;
    averageScore: number;
  }>;

  // Personalization Impact
  personalizationMetrics: {
    personalizedVsGeneric: {
      personalized: { engagement: number; conversion: number };
      generic: { engagement: number; conversion: number };
    };
    topPersonalizationVariables: Array<{
      variable: string;
      impactScore: number;
      usageCount: number;
    }>;
  };

  // A/B Test Results
  abTestResults: Array<{
    testId: string;
    testName: string;
    variants: Array<{
      variantId: string;
      variantName: string;
      sampleSize: number;
      conversionRate: number;
      confidenceLevel: number;
      isWinner: boolean;
    }>;
    status: 'running' | 'completed' | 'stopped';
    startDate: Date;
    endDate?: Date;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────────
// DELIVERY ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────────

export interface DeliveryAnalytics {
  companyId: string;
  period: DateRange;

  // Overall Metrics
  overview: {
    totalMessagesSent: MetricValue;
    totalDelivered: MetricValue;
    deliveryRate: MetricValue;
    openRate: MetricValue;
    clickRate: MetricValue;
    conversionRate: MetricValue;
    unsubscribeRate: MetricValue;
    bounceRate: MetricValue;
    complaintRate: MetricValue;
  };

  // Channel Performance
  channelPerformance: Array<{
    channel: string;
    sent: number;
    delivered: number;
    deliveryRate: number;
    opened: number;
    openRate: number;
    clicked: number;
    clickRate: number;
    converted: number;
    conversionRate: number;
    cost: number;
    costPerConversion: number;
  }>;

  // Automation Performance
  automationPerformance: Array<{
    automationId: string;
    automationName: string;
    enrollments: number;
    completionRate: number;
    conversionRate: number;
    averageTimeToComplete: number; // hours
    revenueGenerated: number;
  }>;

  // Send Time Analysis
  sendTimeAnalysis: Array<{
    hour: number;
    dayOfWeek: number;
    messagesSent: number;
    openRate: number;
    clickRate: number;
    conversionRate: number;
    optimalScore: number;
  }>;

  // Engagement Heatmap
  engagementHeatmap: Array<{
    dayOfWeek: number;
    hour: number;
    engagementScore: number;
  }>;

  // Time Series
  dailyDelivery: TrendData[];
  weeklyEngagement: TrendData[];
}

// ─────────────────────────────────────────────────────────────────────────────────
// UPSELL ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────────

export interface UpsellAnalytics {
  companyId: string;
  period: DateRange;

  // Overall Performance
  overview: {
    totalOpportunities: MetricValue;
    opportunitiesPresented: MetricValue;
    conversions: MetricValue;
    conversionRate: MetricValue;
    revenueGenerated: MetricValue;
    averageOrderValue: MetricValue;
    averageUplift: MetricValue; // percentage increase
  };

  // Opportunity Performance
  opportunityPerformance: Array<{
    type: string;
    opportunities: number;
    presented: number;
    converted: number;
    conversionRate: number;
    revenue: number;
    averageValue: number;
  }>;

  // Product Performance
  productPerformance: Array<{
    productId: string;
    productName: string;
    timesRecommended: number;
    timesPurchased: number;
    conversionRate: number;
    revenue: number;
    averageDiscount: number;
  }>;

  // Customer Segment Performance
  segmentPerformance: Array<{
    segment: string;
    opportunities: number;
    conversions: number;
    conversionRate: number;
    averageOrderValue: number;
    totalRevenue: number;
  }>;

  // Trigger Performance
  triggerPerformance: Array<{
    trigger: string;
    timesTriggered: number;
    conversions: number;
    conversionRate: number;
    averageTimeToConvert: number; // hours
  }>;

  // Time Series
  dailyUpsells: TrendData[];
  weeklyRevenue: TrendData[];
}

// ─────────────────────────────────────────────────────────────────────────────────
// REVENUE ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────────

export interface RevenueAnalytics {
  companyId: string;
  period: DateRange;

  // Revenue Overview
  overview: {
    totalRevenue: MetricValue;
    recurringRevenue: MetricValue;
    newRevenue: MetricValue;
    expansionRevenue: MetricValue;
    churnedRevenue: MetricValue;
    netRevenueRetention: MetricValue;
    grossRevenueRetention: MetricValue;
    averageRevenuePerUser: MetricValue;
  };

  // Revenue Breakdown
  revenueBreakdown: {
    byProduct: Array<{
      productId: string;
      productName: string;
      revenue: number;
      percentage: number;
      growth: number;
    }>;
    bySegment: Array<{
      segment: string;
      revenue: number;
      percentage: number;
      customerCount: number;
      averageRevenuePerCustomer: number;
    }>;
    byChannel: Array<{
      channel: string;
      revenue: number;
      percentage: number;
      acquisitionCost: number;
      roi: number;
    }>;
  };

  // Momentum Intelligence Impact
  momentumImpact: {
    revenueSavedFromChurn: number;
    revenueFromUpsells: number;
    revenueFromRetention: number;
    totalMomentumRevenue: number;
    roiMultiplier: number;
  };

  // Time Series
  dailyRevenue: TrendData[];
  monthlyRevenue: TrendData[];
  mrrTrend: TrendData[];
}

// ─────────────────────────────────────────────────────────────────────────────────
// REPORT CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

export interface ReportConfig {
  id: string;
  companyId: string;
  name: string;
  description?: string;

  // Report Content
  metrics: MetricCategory[];
  customMetrics?: Array<{
    name: string;
    formula: string;
    format: MetricType;
  }>;

  // Filters
  filters: {
    dateRange: DateRange;
    segments?: string[];
    products?: string[];
    channels?: string[];
  };

  // Scheduling
  schedule?: {
    frequency: ReportFrequency;
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
    time: string; // HH:mm
    timezone: string;
  };

  // Delivery
  delivery: {
    format: ReportFormat;
    recipients: string[];
    includeRawData?: boolean;
    includeVisualizations?: boolean;
  };

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastGeneratedAt?: Date;
  isActive: boolean;
}

export interface GeneratedReport {
  id: string;
  configId: string;
  companyId: string;
  name: string;
  format: ReportFormat;
  period: DateRange;
  generatedAt: Date;
  fileUrl?: string;
  fileSize?: number;
  status: 'generating' | 'completed' | 'failed';
  error?: string;
  data?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────────────────────────────────────────────

export interface GetDashboardDto {
  companyId: string;
  startDate?: Date;
  endDate?: Date;
  compareWithPrevious?: boolean;
}

export interface GetAnalyticsDto {
  companyId: string;
  category: MetricCategory;
  startDate: Date;
  endDate: Date;
  granularity?: TimeGranularity;
  segments?: string[];
  compareWithPrevious?: boolean;
}

export interface CreateReportConfigDto {
  companyId: string;
  name: string;
  description?: string;
  metrics: MetricCategory[];
  filters: ReportConfig['filters'];
  schedule?: ReportConfig['schedule'];
  delivery: ReportConfig['delivery'];
}

export interface GenerateReportDto {
  configId?: string;
  companyId: string;
  metrics: MetricCategory[];
  startDate: Date;
  endDate: Date;
  format: ReportFormat;
  includeRawData?: boolean;
}

export interface ExportDataDto {
  companyId: string;
  dataType: 'customers' | 'transactions' | 'messages' | 'automations' | 'all';
  startDate: Date;
  endDate: Date;
  format: ReportFormat;
  filters?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────────
// REAL-TIME METRICS
// ─────────────────────────────────────────────────────────────────────────────────

export interface RealTimeMetrics {
  companyId: string;
  timestamp: Date;

  // Live Counters
  activeUsers: number;
  activeSaveFlows: number;
  activeVoiceCalls: number;
  pendingMessages: number;

  // Today's Performance
  todayStats: {
    newSubscriptions: number;
    cancellations: number;
    saveAttempts: number;
    successfulSaves: number;
    messagessSent: number;
    upsellConversions: number;
    revenue: number;
  };

  // Alerts
  activeAlerts: DashboardAlert[];

  // Recent Events
  recentEvents: Array<{
    type: string;
    description: string;
    timestamp: Date;
    customerId?: string;
    value?: number;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────────
// BENCHMARKING
// ─────────────────────────────────────────────────────────────────────────────────

export interface BenchmarkData {
  category: MetricCategory;
  metric: string;
  companyValue: number;
  industryAverage: number;
  industryMedian: number;
  industryTop25: number;
  percentileRank: number;
  trend: 'above' | 'at' | 'below';
}

export interface CompanyBenchmarks {
  companyId: string;
  industry: string;
  companySize: string;
  generatedAt: Date;
  benchmarks: BenchmarkData[];
}
