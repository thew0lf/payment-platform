import { apiRequest } from '../api';

// ═══════════════════════════════════════════════════════════════
// PAYMENT PAGES API CLIENT
// ═══════════════════════════════════════════════════════════════

// Types
export interface PaymentPage {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  customDomain?: string;
  type: PaymentPageType;
  status: PaymentPageStatus;
  themeId?: string;
  theme?: CheckoutPageTheme;

  // Branding
  logoUrl?: string;
  faviconUrl?: string;
  brandColor?: string;

  // Content
  title?: string;
  description?: string;
  headline?: string;
  subheadline?: string;

  // Configuration (JSON)
  paymentConfig: Record<string, unknown>;
  acceptedGateways: Record<string, unknown>;
  customerFieldsConfig: Record<string, unknown>;

  // URLs
  successUrl?: string;
  cancelUrl?: string;
  webhookUrl?: string;

  // Settings
  aiInsightsEnabled: boolean;
  conversionTracking: boolean;

  // A/B Testing
  isVariant: boolean;
  variantName?: string;
  variantWeight?: number;

  // Timestamps
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CheckoutPageTheme {
  id: string;
  name: string;
  category: ThemeCategory;
  isSystem: boolean;
  previewUrl?: string;
  thumbnail?: string;
  styles: Record<string, unknown>;
}

export type PaymentPageType = 'CHECKOUT' | 'SUBSCRIPTION' | 'DONATION' | 'INVOICE';
export type PaymentPageStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type ThemeCategory = 'MINIMAL' | 'MODERN' | 'ENTERPRISE' | 'LUXURY' | 'FRIENDLY' | 'DARK' | 'SPEED' | 'TRUST' | 'CUSTOM';

export interface PaymentPageStats {
  total: number;
  published: number;
  draft: number;
  archived: number;
  totalSessions: number;
  completedSessions: number;
  conversionRate: number;
  totalRevenue: number;
}

export interface PaymentPageSession {
  id: string;
  pageId: string;
  sessionToken: string;
  status: SessionStatus;
  customerEmail?: string;
  customerName?: string;
  total: number;
  currency: string;
  completedAt?: string;
  createdAt: string;
}

export type SessionStatus = 'PENDING' | 'PROCESSING' | 'REQUIRES_ACTION' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'EXPIRED' | 'ABANDONED';

export interface PaymentPageFilters {
  search?: string;
  status?: PaymentPageStatus;
  type?: PaymentPageType;
  themeId?: string;
}

export interface CreatePaymentPageInput {
  name: string;
  slug: string;
  type: PaymentPageType;
  themeId?: string;
  paymentConfig: Record<string, unknown>;
  acceptedGateways: Record<string, unknown>;
  customerFieldsConfig: Record<string, unknown>;
  logoUrl?: string;
  faviconUrl?: string;
  brandColor?: string;
  title?: string;
  description?: string;
  headline?: string;
  subheadline?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface UpdatePaymentPageInput extends Partial<CreatePaymentPageInput> {
  status?: PaymentPageStatus;
}

// Preview data returned from the API
export interface PaymentPagePreview {
  id: string;
  companyCode: string;
  companyName: string;
  companyLogo?: string;
  // Page info
  name: string;
  slug: string;
  type: PaymentPageType;
  status: PaymentPageStatus;
  // Branding
  logoUrl?: string;
  faviconUrl?: string;
  brandColor?: string;
  // Content
  title?: string;
  description?: string;
  headline?: string;
  subheadline?: string;
  // Theme
  theme?: {
    id: string;
    name: string;
    category: ThemeCategory;
    styles: Record<string, unknown>;
  };
  customStyles?: Record<string, unknown>;
  // Payment config
  paymentConfig: Record<string, unknown>;
  acceptedGateways: Record<string, unknown>;
  customerFieldsConfig: Record<string, unknown>;
  // Shipping/Tax
  shippingEnabled?: boolean;
  shippingConfig?: Record<string, unknown>;
  taxEnabled?: boolean;
  taxConfig?: Record<string, unknown>;
  // Discounts
  discountsEnabled?: boolean;
  // Terms
  termsUrl?: string;
  privacyUrl?: string;
  refundPolicyUrl?: string;
  customTermsText?: string;
  requireTermsAccept?: boolean;
  // Success/Cancel
  successUrl?: string;
  cancelUrl?: string;
  successMessage?: string;
  // SEO
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  noIndex?: boolean;
  // Security
  allowedDomains?: string[];
  cspPolicy?: string;
  // Preview metadata
  isPreview: boolean;
  previewGeneratedAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─────────────────────────────────────────────────────────────
// Payment Pages API
// ─────────────────────────────────────────────────────────────

export const paymentPagesApi = {
  // List payment pages
  async list(
    companyId?: string,
    filters?: PaymentPageFilters,
    page = 1,
    pageSize = 20,
  ): Promise<PaginatedResponse<PaymentPage>> {
    const params = new URLSearchParams();
    if (companyId) params.set('companyId', companyId);
    if (filters?.search) params.set('search', filters.search);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.type) params.set('type', filters.type);
    if (filters?.themeId) params.set('themeId', filters.themeId);
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));

    return apiRequest.get<PaginatedResponse<PaymentPage>>(`/api/payment-pages?${params.toString()}`);
  },

  // Get payment page stats
  async getStats(companyId?: string): Promise<PaymentPageStats> {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.get<PaymentPageStats>(`/api/payment-pages/stats${params}`);
  },

  // Get single payment page
  async getById(id: string, companyId?: string): Promise<PaymentPage> {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.get<PaymentPage>(`/api/payment-pages/${id}${params}`);
  },

  // Create payment page
  async create(data: CreatePaymentPageInput, companyId?: string): Promise<PaymentPage> {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.post<PaymentPage>(`/api/payment-pages${params}`, data);
  },

  // Update payment page
  async update(id: string, data: UpdatePaymentPageInput, companyId?: string): Promise<PaymentPage> {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.patch<PaymentPage>(`/api/payment-pages/${id}${params}`, data);
  },

  // Publish payment page
  async publish(id: string, companyId?: string): Promise<PaymentPage> {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.post<PaymentPage>(`/api/payment-pages/${id}/publish${params}`);
  },

  // Archive payment page
  async archive(id: string, companyId?: string): Promise<PaymentPage> {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.post<PaymentPage>(`/api/payment-pages/${id}/archive${params}`);
  },

  // Duplicate payment page
  async duplicate(id: string, name: string, slug: string, companyId?: string): Promise<PaymentPage> {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.post<PaymentPage>(`/api/payment-pages/${id}/duplicate${params}`, { name, slug });
  },

  // Delete payment page
  async delete(id: string, companyId?: string): Promise<void> {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.delete<void>(`/api/payment-pages/${id}${params}`);
  },

  // Get preview data for a payment page (any status)
  async getPreview(id: string, companyId?: string): Promise<PaymentPagePreview> {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.get<PaymentPagePreview>(`/api/payment-pages/${id}/preview${params}`);
  },

  // Get sessions for a payment page
  async getSessions(
    pageId: string,
    status?: SessionStatus,
    page = 1,
    pageSize = 20,
  ): Promise<PaginatedResponse<PaymentPageSession>> {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));

    return apiRequest.get<PaginatedResponse<PaymentPageSession>>(
      `/api/payment-pages/${pageId}/sessions?${params.toString()}`,
    );
  },
};

// ─────────────────────────────────────────────────────────────
// Themes API
// ─────────────────────────────────────────────────────────────

export const themesApi = {
  // List themes
  async list(companyId?: string, category?: ThemeCategory, search?: string): Promise<CheckoutPageTheme[]> {
    const params = new URLSearchParams();
    if (companyId) params.set('companyId', companyId);
    if (category) params.set('category', category);
    if (search) params.set('search', search);

    return apiRequest.get<CheckoutPageTheme[]>(`/api/payment-pages/themes?${params.toString()}`);
  },

  // Get theme by ID
  async getById(id: string): Promise<CheckoutPageTheme> {
    return apiRequest.get<CheckoutPageTheme>(`/api/payment-pages/themes/${id}`);
  },

  // Create custom theme
  async create(data: Partial<CheckoutPageTheme>, companyId?: string): Promise<CheckoutPageTheme> {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.post<CheckoutPageTheme>(`/api/payment-pages/themes${params}`, data);
  },

  // Update theme
  async update(id: string, data: Partial<CheckoutPageTheme>): Promise<CheckoutPageTheme> {
    return apiRequest.patch<CheckoutPageTheme>(`/api/payment-pages/themes/${id}`, data);
  },

  // Delete custom theme
  async delete(id: string): Promise<void> {
    return apiRequest.delete<void>(`/api/payment-pages/themes/${id}`);
  },

  // Seed system themes
  async seedSystemThemes(): Promise<{ created: number }> {
    return apiRequest.post<{ created: number }>('/api/payment-pages/themes/seed-system');
  },
};

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

export const PAGE_TYPES: Record<PaymentPageType, { label: string; description: string }> = {
  CHECKOUT: { label: 'Checkout', description: 'One-time payment for products or services' },
  SUBSCRIPTION: { label: 'Subscription', description: 'Recurring payments and memberships' },
  DONATION: { label: 'Donation', description: 'Accept charitable contributions' },
  INVOICE: { label: 'Invoice', description: 'Send and collect invoice payments' },
};

export const PAGE_STATUSES: Record<PaymentPageStatus, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'bg-zinc-500/10 text-zinc-400' },
  PUBLISHED: { label: 'Published', color: 'bg-green-500/10 text-green-400' },
  ARCHIVED: { label: 'Archived', color: 'bg-yellow-500/10 text-yellow-400' },
};

export const THEME_CATEGORIES: Record<ThemeCategory, { label: string; description: string }> = {
  MINIMAL: { label: 'Minimal', description: 'Clean, distraction-free design' },
  MODERN: { label: 'Modern', description: 'Contemporary with smooth animations' },
  ENTERPRISE: { label: 'Enterprise', description: 'Professional B2B focused' },
  LUXURY: { label: 'Luxury', description: 'Premium high-end aesthetics' },
  FRIENDLY: { label: 'Friendly', description: 'Approachable and warm' },
  DARK: { label: 'Dark', description: 'Dark mode optimized' },
  SPEED: { label: 'Speed', description: 'Ultra-fast checkout flow' },
  TRUST: { label: 'Trust', description: 'Security badges and trust signals' },
  CUSTOM: { label: 'Custom', description: 'Your custom theme' },
};

// ─────────────────────────────────────────────────────────────
// Custom Domains Types
// ─────────────────────────────────────────────────────────────

export interface DnsInstruction {
  host: string;
  type: 'CNAME' | 'TXT';
  value: string;
  ttl: number;
}

export interface DnsInstructions {
  cname: DnsInstruction;
  verification: DnsInstruction;
}

export interface PaymentPageDomain {
  id: string;
  domain: string;
  isVerified: boolean;
  verificationToken: string | null;
  verifiedAt: string | null;
  sslStatus: 'PENDING' | 'PROVISIONING' | 'ACTIVE' | 'FAILED';
  sslExpiresAt: string | null;
  cnameTarget: string | null;
  defaultPageId: string | null;
  defaultPage?: {
    id: string;
    name: string;
    slug: string;
  };
  dnsInstructions: DnsInstructions;
  createdAt: string;
}

export interface CreateDomainInput {
  domain: string;
  defaultPageId?: string;
}

export interface UpdateDomainInput {
  defaultPageId?: string | null;
}

export interface DomainVerificationResult {
  success: boolean;
  cnameVerified: boolean;
  txtVerified: boolean;
  errors: string[];
  domain: PaymentPageDomain;
}

export interface SslStatusResult {
  status: string;
  expiresAt: string | null;
  domain: string;
  isActive: boolean;
}

// ─────────────────────────────────────────────────────────────
// Domains API
// ─────────────────────────────────────────────────────────────

export const domainsApi = {
  // List all custom domains
  async list(companyId?: string): Promise<PaymentPageDomain[]> {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.get<PaymentPageDomain[]>(`/api/payment-pages/domains${params}`);
  },

  // Get domain by ID
  async getById(id: string, companyId?: string): Promise<PaymentPageDomain> {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.get<PaymentPageDomain>(`/api/payment-pages/domains/${id}${params}`);
  },

  // Add a new custom domain
  async create(data: CreateDomainInput, companyId?: string): Promise<PaymentPageDomain> {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.post<PaymentPageDomain>(`/api/payment-pages/domains${params}`, data);
  },

  // Update domain settings
  async update(id: string, data: UpdateDomainInput, companyId?: string): Promise<PaymentPageDomain> {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.patch<PaymentPageDomain>(`/api/payment-pages/domains/${id}${params}`, data);
  },

  // Remove a custom domain
  async delete(id: string, companyId?: string): Promise<void> {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.delete<void>(`/api/payment-pages/domains/${id}${params}`);
  },

  // Verify domain DNS configuration
  async verify(id: string, companyId?: string): Promise<DomainVerificationResult> {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.post<DomainVerificationResult>(`/api/payment-pages/domains/${id}/verify${params}`);
  },

  // Regenerate verification token
  async regenerateToken(id: string, companyId?: string): Promise<PaymentPageDomain> {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.post<PaymentPageDomain>(`/api/payment-pages/domains/${id}/regenerate-token${params}`);
  },

  // Check SSL certificate status
  async checkSsl(id: string, companyId?: string): Promise<SslStatusResult> {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.get<SslStatusResult>(`/api/payment-pages/domains/${id}/ssl${params}`);
  },
};

// ─────────────────────────────────────────────────────────────
// SSL Status Labels
// ─────────────────────────────────────────────────────────────

export const SSL_STATUSES: Record<string, { label: string; color: string; description: string }> = {
  PENDING: { label: 'Pending', color: 'bg-zinc-500/10 text-zinc-400', description: 'Waiting for domain verification' },
  PROVISIONING: { label: 'Provisioning', color: 'bg-blue-500/10 text-blue-400', description: 'SSL certificate being issued' },
  ACTIVE: { label: 'Active', color: 'bg-green-500/10 text-green-400', description: 'SSL certificate is active' },
  FAILED: { label: 'Failed', color: 'bg-red-500/10 text-red-400', description: 'SSL provisioning failed' },
};

// ─────────────────────────────────────────────────────────────
// AI Insights Types
// ─────────────────────────────────────────────────────────────

export type InsightType = 'success' | 'warning' | 'suggestion' | 'critical';
export type InsightCategory =
  | 'conversion'
  | 'abandonment'
  | 'performance'
  | 'pricing'
  | 'ux'
  | 'security'
  | 'mobile'
  | 'payment_methods';
export type InsightImpact = 'high' | 'medium' | 'low';

export interface PageInsight {
  type: InsightType;
  category: InsightCategory;
  title: string;
  description: string;
  impact: InsightImpact;
  metric?: {
    current: number;
    benchmark: number;
    unit: string;
  };
  recommendations: string[];
}

export interface ConversionMetrics {
  totalSessions: number;
  completedSessions: number;
  conversionRate: number;
  averageOrderValue: number;
  totalRevenue: number;
  abandonmentRate: number;
  averageTimeToComplete: number;
}

export interface ConversionFunnel {
  stage: string;
  count: number;
  percentage: number;
  dropOff: number;
}

export interface InsightsSummary {
  pageId: string;
  pageName: string;
  period: string;
  metrics: ConversionMetrics;
  funnel: ConversionFunnel[];
  insights: PageInsight[];
  score: number;
  generatedAt: string;
}

export interface CompanyInsightsSummary {
  totalPages: number;
  averageScore: number;
  topPerformer: {
    pageId: string;
    pageName: string;
    score: number;
  } | null;
  needsAttention: Array<{
    pageId: string;
    pageName: string;
    score: number;
  }>;
  totalRevenue: number;
  totalConversions: number;
  overallConversionRate: number;
}

// ─────────────────────────────────────────────────────────────
// Insights API
// ─────────────────────────────────────────────────────────────

export const insightsApi = {
  // Get insights for a specific payment page
  async getPageInsights(pageId: string, periodDays = 30, companyId?: string): Promise<InsightsSummary> {
    const params = new URLSearchParams();
    params.set('periodDays', String(periodDays));
    if (companyId) params.set('companyId', companyId);

    return apiRequest.get<InsightsSummary>(
      `/api/payment-pages/insights/${pageId}?${params.toString()}`,
    );
  },

  // Get company-wide insights summary
  async getCompanySummary(periodDays = 30, companyId?: string): Promise<CompanyInsightsSummary> {
    const params = new URLSearchParams();
    params.set('periodDays', String(periodDays));
    if (companyId) params.set('companyId', companyId);

    return apiRequest.get<CompanyInsightsSummary>(
      `/api/payment-pages/insights/summary?${params.toString()}`,
    );
  },
};

// ─────────────────────────────────────────────────────────────
// Insight Display Helpers
// ─────────────────────────────────────────────────────────────

export const INSIGHT_TYPES: Record<InsightType, { label: string; color: string; icon: string }> = {
  success: { label: 'Success', color: 'bg-green-500/10 text-green-400 border-green-500/20', icon: 'CheckCircle' },
  warning: { label: 'Warning', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', icon: 'AlertTriangle' },
  suggestion: { label: 'Suggestion', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: 'Lightbulb' },
  critical: { label: 'Critical', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: 'XCircle' },
};

export const INSIGHT_CATEGORIES: Record<InsightCategory, { label: string; description: string }> = {
  conversion: { label: 'Conversion', description: 'Metrics related to checkout completion' },
  abandonment: { label: 'Abandonment', description: 'Cart and checkout abandonment patterns' },
  performance: { label: 'Performance', description: 'Page loading and response times' },
  pricing: { label: 'Pricing', description: 'Price optimization and discount effectiveness' },
  ux: { label: 'User Experience', description: 'Checkout flow and usability' },
  security: { label: 'Security', description: 'Trust signals and security perception' },
  mobile: { label: 'Mobile', description: 'Mobile device optimization' },
  payment_methods: { label: 'Payment Methods', description: 'Payment option performance' },
};

export const INSIGHT_IMPACTS: Record<InsightImpact, { label: string; color: string }> = {
  high: { label: 'High Impact', color: 'text-red-400' },
  medium: { label: 'Medium Impact', color: 'text-yellow-400' },
  low: { label: 'Low Impact', color: 'text-zinc-400' },
};
