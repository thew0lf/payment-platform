/**
 * Terms & Conditions Management Types
 * AI-powered T&C generation and summarization
 */

// =============================================================================
// ENUMS
// =============================================================================

export enum TermsType {
  TERMS_OF_SERVICE = 'TERMS_OF_SERVICE',
  PRIVACY_POLICY = 'PRIVACY_POLICY',
  REFUND_POLICY = 'REFUND_POLICY',
  SHIPPING_POLICY = 'SHIPPING_POLICY',
  SUBSCRIPTION_TERMS = 'SUBSCRIPTION_TERMS',
  COOKIE_POLICY = 'COOKIE_POLICY',
  ACCEPTABLE_USE = 'ACCEPTABLE_USE',
  DATA_PROCESSING = 'DATA_PROCESSING',
  SLA = 'SLA',
  CUSTOM = 'CUSTOM',
}

export enum TermsStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  SUPERSEDED = 'SUPERSEDED',
}

export enum ReadabilityLevel {
  SIMPLE = 'SIMPLE',
  STANDARD = 'STANDARD',
  TECHNICAL = 'TECHNICAL',
  LEGAL = 'LEGAL',
}

export enum SummaryFormat {
  BULLET_POINTS = 'BULLET_POINTS',
  FAQ = 'FAQ',
  PLAIN_LANGUAGE = 'PLAIN_LANGUAGE',
  KEY_POINTS = 'KEY_POINTS',
  COMPARISON = 'COMPARISON',
}

export enum ComplianceFramework {
  GDPR = 'GDPR',
  CCPA = 'CCPA',
  HIPAA = 'HIPAA',
  PCI_DSS = 'PCI_DSS',
  SOC2 = 'SOC2',
  FTC = 'FTC',
  CAN_SPAM = 'CAN_SPAM',
  COPPA = 'COPPA',
}

// =============================================================================
// TERMS DOCUMENT TYPES
// =============================================================================

export interface TermsDocument {
  id: string;
  companyId: string;

  type: TermsType;
  title: string;
  version: string;
  status: TermsStatus;

  content: TermsContent;

  metadata: TermsMetadata;

  compliance: ComplianceInfo;

  summaries: TermsSummary[];

  history: TermsVersion[];

  analytics: TermsAnalyticsData;

  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  effectiveDate?: Date;
  expirationDate?: Date;
}

export interface TermsContent {
  fullText: string;
  htmlFormatted?: string;
  markdownFormatted?: string;

  sections: TermsSection[];

  readabilityScore: number;
  wordCount: number;
  estimatedReadTime: number;

  language: string;
  translations?: Record<string, {
    fullText: string;
    sections: TermsSection[];
  }>;
}

export interface TermsSection {
  id: string;
  title: string;
  content: string;
  order: number;

  subsections?: TermsSection[];

  keyPoints?: string[];

  relatedFAQs?: string[];

  complianceNotes?: string[];
}

export interface TermsMetadata {
  author?: string;
  lastModifiedBy?: string;
  reviewedBy?: string;
  approvedBy?: string;
  approvedAt?: Date;

  legalReviewRequired: boolean;
  legalReviewStatus?: 'pending' | 'in_review' | 'approved' | 'changes_requested';
  legalReviewNotes?: string;

  tags?: string[];
  internalNotes?: string;

  externalUrl?: string;

  generatedBy?: 'human' | 'ai' | 'hybrid';
  aiModel?: string;
  aiPromptVersion?: string;
}

export interface ComplianceInfo {
  frameworks: ComplianceFramework[];

  jurisdictions: string[];

  requirements: ComplianceRequirement[];

  lastAuditDate?: Date;
  nextAuditDate?: Date;

  certifications?: string[];

  dataRetention?: {
    period: number;
    unit: 'days' | 'months' | 'years';
    description: string;
  };
}

export interface ComplianceRequirement {
  framework: ComplianceFramework;
  requirement: string;
  section: string;
  status: 'met' | 'partial' | 'not_met' | 'not_applicable';
  notes?: string;
}

export interface TermsSummary {
  id: string;
  format: SummaryFormat;
  level: ReadabilityLevel;

  content: string;

  keyPoints?: string[];

  faqs?: {
    question: string;
    answer: string;
    section?: string;
  }[];

  importantDates?: {
    description: string;
    date?: string;
    duration?: string;
  }[];

  userRights?: string[];
  userObligations?: string[];

  createdAt: Date;
  language: string;
}

export interface TermsVersion {
  version: string;
  publishedAt: Date;
  effectiveDate: Date;

  changesSummary: string;
  changedSections: string[];

  status: TermsStatus;

  documentSnapshot?: string;

  notificationSent?: boolean;
  notificationDate?: Date;
}

export interface TermsAnalyticsData {
  totalViews: number;
  uniqueViews: number;
  avgTimeOnPage: number;

  acceptanceRate: number;
  totalAcceptances: number;

  sectionViews: Record<string, number>;

  searchQueries: {
    query: string;
    count: number;
  }[];

  faqClicks: Record<string, number>;
}

// =============================================================================
// TERMS ACCEPTANCE TYPES
// =============================================================================

export interface TermsAcceptance {
  id: string;
  termsDocumentId: string;
  termsVersion: string;

  customerId: string;
  userId?: string;

  acceptedAt: Date;
  acceptanceMethod: 'checkbox' | 'click' | 'signature' | 'verbal' | 'implicit';

  ipAddress?: string;
  userAgent?: string;

  metadata?: {
    location?: string;
    deviceType?: string;
    channel?: string;
  };

  withdrawnAt?: Date;
  withdrawalReason?: string;
}

// =============================================================================
// AI GENERATION TYPES
// =============================================================================

export interface TermsGenerationConfig {
  companyId: string;

  businessContext: BusinessContext;

  generationOptions: GenerationOptions;

  complianceRequirements: ComplianceRequirements;

  customizations: TermsCustomizations;
}

export interface BusinessContext {
  companyName: string;
  industry: string;
  businessModel: 'subscription' | 'ecommerce' | 'saas' | 'marketplace' | 'service';

  productsServices: string[];
  targetAudience: string[];

  operatingCountries: string[];
  headquarters: string;

  dataCollected: string[];
  thirdPartyServices: string[];

  paymentMethods: string[];

  contactInfo: {
    email: string;
    address?: string;
    phone?: string;
  };
}

export interface GenerationOptions {
  termsTypes: TermsType[];

  readabilityLevel: ReadabilityLevel;
  tone: 'formal' | 'professional' | 'friendly' | 'casual';

  includeSummaries: boolean;
  summaryFormats: SummaryFormat[];

  includeTranslations: boolean;
  targetLanguages?: string[];

  generateFAQs: boolean;

  maxLength?: number;
}

export interface ComplianceRequirements {
  frameworks: ComplianceFramework[];

  specificRequirements?: string[];

  ageRestrictions?: {
    minimumAge: number;
    verificationRequired: boolean;
  };

  dataProtection: {
    allowDataDeletion: boolean;
    allowDataExport: boolean;
    consentRequired: boolean;
    cookieConsent: boolean;
  };

  subscriptionTerms?: {
    freeTrialDays?: number;
    cancellationPolicy: string;
    refundPolicy: string;
    autoRenewal: boolean;
  };
}

export interface TermsCustomizations {
  requiredSections?: string[];
  excludedSections?: string[];

  customClauses?: {
    title: string;
    content: string;
    placement: 'beginning' | 'end' | 'after_section';
    afterSection?: string;
  }[];

  brandVoice?: {
    keywords: string[];
    avoidWords: string[];
    examples: string[];
  };

  existingTermsToIncorporate?: string;
}

export interface GeneratedTerms {
  document: TermsDocument;

  suggestions: {
    section: string;
    suggestion: string;
    reason: string;
    priority: 'low' | 'medium' | 'high';
  }[];

  complianceGaps: {
    framework: ComplianceFramework;
    gap: string;
    recommendation: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }[];

  readabilityAnalysis: {
    score: number;
    grade: string;
    improvements: string[];
  };
}

// =============================================================================
// DTOs
// =============================================================================

export interface CreateTermsDto {
  companyId: string;
  type: TermsType;
  title: string;

  content?: {
    fullText: string;
    sections?: Omit<TermsSection, 'id'>[];
  };

  generateWithAI?: boolean;
  generationConfig?: Omit<TermsGenerationConfig, 'companyId'>;

  effectiveDate?: string;

  compliance?: {
    frameworks: ComplianceFramework[];
    jurisdictions: string[];
  };

  metadata?: {
    tags?: string[];
    internalNotes?: string;
  };
}

export interface UpdateTermsDto {
  termsId: string;

  title?: string;
  content?: {
    fullText?: string;
    sections?: Omit<TermsSection, 'id'>[];
  };

  status?: TermsStatus;
  effectiveDate?: string;

  compliance?: {
    frameworks?: ComplianceFramework[];
    jurisdictions?: string[];
  };

  createNewVersion?: boolean;
  changesSummary?: string;
}

export interface PublishTermsDto {
  termsId: string;
  effectiveDate: string;
  notifyUsers: boolean;
  notificationMessage?: string;
  notificationChannels?: ('email' | 'in_app' | 'sms')[];
}

export interface GenerateSummaryDto {
  termsId: string;
  format: SummaryFormat;
  level: ReadabilityLevel;
  language?: string;

  focusSections?: string[];
  maxLength?: number;
}

export interface GenerateTermsDto {
  companyId: string;
  config: Omit<TermsGenerationConfig, 'companyId'>;
}

export interface RecordAcceptanceDto {
  termsDocumentId: string;
  customerId: string;
  userId?: string;
  acceptanceMethod: 'checkbox' | 'click' | 'signature' | 'verbal' | 'implicit';
  metadata?: {
    location?: string;
    deviceType?: string;
    channel?: string;
  };
}

export interface GetTermsDto {
  companyId: string;
  type?: TermsType;
  status?: TermsStatus;
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
}

export interface GetAcceptancesDto {
  termsDocumentId?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface TermsAnalyticsDto {
  companyId: string;
  termsId?: string;
  startDate: string;
  endDate: string;
}

// =============================================================================
// ANALYTICS TYPES
// =============================================================================

export interface TermsAnalytics {
  period: {
    start: Date;
    end: Date;
  };

  overview: {
    totalDocuments: number;
    activeDocuments: number;
    totalViews: number;
    totalAcceptances: number;
    avgAcceptanceRate: number;
    avgReadTime: number;
  };

  byType: {
    type: TermsType;
    documents: number;
    views: number;
    acceptances: number;
    acceptanceRate: number;
  }[];

  viewTrends: {
    date: string;
    views: number;
    uniqueViews: number;
    acceptances: number;
  }[];

  sectionEngagement: {
    section: string;
    views: number;
    avgTimeSpent: number;
    dropOffRate: number;
  }[];

  searchAnalytics: {
    query: string;
    count: number;
    resultClicks: number;
  }[];

  complianceStatus: {
    framework: ComplianceFramework;
    status: 'compliant' | 'partial' | 'non_compliant';
    lastChecked: Date;
    issues: number;
  }[];

  userFeedback?: {
    clarityScore: number;
    helpfulnessScore: number;
    commonQuestions: string[];
    improvementSuggestions: string[];
  };
}

// =============================================================================
// CUSTOMER-FACING TYPES
// =============================================================================

export interface CustomerTermsView {
  id: string;
  type: TermsType;
  title: string;
  version: string;
  effectiveDate: Date;

  summary: TermsSummary;

  sections: {
    id: string;
    title: string;
    content: string;
    keyPoints: string[];
  }[];

  faqs?: {
    question: string;
    answer: string;
  }[];

  acceptanceRequired: boolean;
  previouslyAccepted?: boolean;
  acceptedAt?: Date;
}

export interface TermsSearchResult {
  termsId: string;
  termsTitle: string;
  sectionId: string;
  sectionTitle: string;
  excerpt: string;
  relevanceScore: number;
}
