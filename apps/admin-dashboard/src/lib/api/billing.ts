/**
 * Billing API Client
 * Handles pricing plans, subscriptions, usage, and invoices
 */

import { apiClient } from '../api';

// ═══════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════

export enum PlanStatus {
  ACTIVE = 'active',
  DEPRECATED = 'deprecated',
  HIDDEN = 'hidden',
}

export enum PlanType {
  DEFAULT = 'DEFAULT',
  CUSTOM = 'CUSTOM',
  LEGACY = 'LEGACY',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  PAUSED = 'paused',
  TRIALING = 'trialing',
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  PAID = 'paid',
  VOID = 'void',
  UNCOLLECTIBLE = 'uncollectible',
}

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface PlanIncluded {
  transactions: number;
  volume: number;
  apiCalls: number;
  merchantAccounts: number;
  companies: number;
  users: number;
  vaultEntries: number;
  webhooks: number;
}

export interface PlanOverage {
  transactionPrice: number;
  volumePercent: number;
  apiCallPrice: number;
  merchantAccountPrice: number;
  companyPrice: number;
  userPrice: number;
  vaultEntryPrice: number;
}

export interface PlanLimits {
  maxCompanies?: number;
  maxUsers?: number;
  maxMerchantAccounts?: number;
  maxTransactionsPerMonth?: number;
  maxVolumePerMonth?: number;
}

export interface PricingPlan {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  billingInterval: string;
  baseCost: number;
  annualCost?: number;
  currency: string;
  sortOrder: number;
  isDefault: boolean;
  status: string;
  included: PlanIncluded;
  overage: PlanOverage;
  features: string[];
  limits?: PlanLimits | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  // New fields for plan types
  planType: PlanType | string;
  isPublic: boolean;
  clientId?: string;
  clientName?: string;  // Populated in admin queries
  basePlanId?: string;
  allowSelfUpgrade: boolean;
  allowSelfDowngrade: boolean;
  requiresApproval: boolean;
  stripeProductId?: string;
  stripePriceId?: string;
  stripeAnnualPriceId?: string;
  subscriptionCount?: number;  // Populated in admin queries
}

export interface ClientSubscription {
  id: string;
  clientId: string;
  planId: string;
  planName?: string;
  clientName?: string;  // Populated in admin queries
  clientCode?: string;  // Populated in admin queries
  status: string;
  statusReason?: string;
  statusChangedAt?: string;
  billingInterval: string;
  billingAnchorDay: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt?: string;
  canceledAt?: string;
  cancelReason?: string;
  pausedAt?: string;
  pauseReason?: string;
  paymentMethodId?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  discountPercent?: number;
  discountReason?: string;
  discountExpiresAt?: string;
  customPricing?: Partial<PlanOverage>;
  createdAt: string;
  updatedAt: string;
  plan?: PricingPlan;
}

// DTO for admin to assign a plan to a client
export interface AssignPlanToClientDto {
  clientId: string;
  planId: string;
  billingInterval?: 'monthly' | 'annual';
  customPricing?: Partial<PlanOverage>;
  discountPercent?: number;
  discountReason?: string;
  notes?: string;
}

// DTO for self-service plan change request
export interface RequestPlanChangeDto {
  targetPlanId: string;
  billingInterval?: 'monthly' | 'annual';
}

// Response for upgrade request
export interface UpgradeResponse {
  checkoutUrl?: string;
  requiresApproval?: boolean;
  message?: string;
}

export interface UsageMetric {
  used: number;
  included: number;
  remaining: number;
}

export interface UsageSummary {
  period: {
    start: string;
    end: string;
    daysRemaining: number;
  };
  usage: {
    transactions: UsageMetric;
    volume: UsageMetric;
    merchantAccounts: UsageMetric;
    companies: UsageMetric;
    teamMembers: UsageMetric;
    apiCalls: UsageMetric;
  };
  estimatedCost: {
    base: number;
    overages: number;
    total: number;
  };
  companyBreakdown: CompanyUsage[];
}

export interface CompanyUsage {
  companyId: string;
  companyName: string;
  transactionCount: number;
  transactionVolume: number;
  successfulTransactions: number;
  failedTransactions: number;
  successRate: number;
  avgTransactionSize: number;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  type: 'base' | 'transaction' | 'volume' | 'overage' | 'addon' | 'discount' | 'credit';
  breakdown?: {
    tier?: string;
    unitCount?: number;
    rate?: number;
  };
}

export interface Invoice {
  id: string;
  clientId: string;
  subscriptionId: string;
  usagePeriodId?: string;
  invoiceNumber: string;
  periodStart: string;
  periodEnd: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  lineItems: InvoiceLineItem[];
  status: string;
  dueDate: string;
  paidAt?: string;
  stripeInvoiceId?: string;
  pdfUrl?: string;
  notes?: string;
  createdAt: string;
  sentAt?: string;
}

// ═══════════════════════════════════════════════════════════════
// DTOs
// ═══════════════════════════════════════════════════════════════

export interface CreateSubscriptionDto {
  clientId: string;
  planId: string;
  billingInterval?: 'monthly' | 'annual';
  billingAnchorDay?: number;
  paymentMethodId?: string;
  trialDays?: number;
  discountPercent?: number;
  discountReason?: string;
  customPricing?: Partial<PlanOverage>;
}

export interface CreatePricingPlanDto {
  name: string;
  displayName: string;
  description?: string;
  billingInterval: string;
  baseCost: number;
  currency?: string;
  sortOrder?: number;
  isDefault?: boolean;
  included: PlanIncluded;
  overage: PlanOverage;
  features: string[];
  limits?: PlanLimits;
  metadata?: Record<string, unknown>;
}

export interface UpdatePricingPlanDto extends Partial<CreatePricingPlanDto> {
  status?: string;
}

// ═══════════════════════════════════════════════════════════════
// API CLIENT
// ═══════════════════════════════════════════════════════════════

export const billingApi = {
  // ─────────────────────────────────────────────────────────────
  // PRICING PLANS
  // ─────────────────────────────────────────────────────────────

  /**
   * Get all pricing plans
   */
  async getPlans(includeHidden: boolean = false): Promise<PricingPlan[]> {
    const params = new URLSearchParams();
    if (includeHidden) params.append('includeHidden', 'true');

    const response = await apiClient.get<PricingPlan[]>(
      `/api/billing/plans${params.toString() ? `?${params}` : ''}`
    );
    return response;
  },

  /**
   * Get a single pricing plan by ID
   */
  async getPlan(id: string): Promise<PricingPlan> {
    return apiClient.get<PricingPlan>(`/api/billing/plans/${id}`);
  },

  /**
   * Create a new pricing plan (admin only)
   */
  async createPlan(data: CreatePricingPlanDto): Promise<PricingPlan> {
    return apiClient.post<PricingPlan>('/api/billing/plans', data);
  },

  /**
   * Update a pricing plan (admin only)
   */
  async updatePlan(id: string, data: UpdatePricingPlanDto): Promise<PricingPlan> {
    return apiClient.patch<PricingPlan>(`/api/billing/plans/${id}`, data);
  },

  /**
   * Delete/archive a pricing plan (admin only)
   */
  async deletePlan(id: string): Promise<void> {
    return apiClient.delete(`/api/billing/plans/${id}`);
  },

  // ─────────────────────────────────────────────────────────────
  // CLIENT SUBSCRIPTION
  // ─────────────────────────────────────────────────────────────

  /**
   * Get current subscription for a client
   */
  async getSubscription(clientId: string): Promise<ClientSubscription> {
    return apiClient.get<ClientSubscription>(`/api/billing/subscription?clientId=${clientId}`);
  },

  /**
   * Create a new subscription
   */
  async createSubscription(data: CreateSubscriptionDto): Promise<ClientSubscription> {
    return apiClient.post<ClientSubscription>('/api/billing/subscription', data);
  },

  /**
   * Change subscription plan
   */
  async changePlan(clientId: string, planId: string): Promise<ClientSubscription> {
    return apiClient.patch<ClientSubscription>('/api/billing/subscription/plan', { clientId, planId });
  },

  /**
   * Cancel subscription
   */
  async cancelSubscription(clientId: string, reason?: string): Promise<ClientSubscription> {
    return apiClient.post<ClientSubscription>('/api/billing/subscription/cancel', { clientId, reason });
  },

  /**
   * Pause subscription
   */
  async pauseSubscription(clientId: string, reason?: string): Promise<ClientSubscription> {
    return apiClient.post<ClientSubscription>('/api/billing/subscription/pause', { clientId, reason });
  },

  /**
   * Resume paused subscription
   */
  async resumeSubscription(clientId: string): Promise<ClientSubscription> {
    return apiClient.post<ClientSubscription>('/api/billing/subscription/resume', { clientId });
  },

  // ─────────────────────────────────────────────────────────────
  // USAGE
  // ─────────────────────────────────────────────────────────────

  /**
   * Get usage summary for current period
   */
  async getUsage(clientId: string): Promise<UsageSummary> {
    return apiClient.get<UsageSummary>(`/api/billing/usage?clientId=${clientId}`);
  },

  /**
   * Get usage breakdown by company
   */
  async getUsageByCompany(clientId: string): Promise<CompanyUsage[]> {
    return apiClient.get<CompanyUsage[]>(`/api/billing/usage/by-company?clientId=${clientId}`);
  },

  // ─────────────────────────────────────────────────────────────
  // INVOICES
  // ─────────────────────────────────────────────────────────────

  /**
   * Get all invoices for a client
   */
  async getInvoices(clientId: string): Promise<Invoice[]> {
    return apiClient.get<Invoice[]>(`/api/billing/invoices?clientId=${clientId}`);
  },

  /**
   * Get a single invoice
   */
  async getInvoice(id: string): Promise<Invoice> {
    return apiClient.get<Invoice>(`/api/billing/invoices/${id}`);
  },

  /**
   * Generate invoice for a period
   */
  async generateInvoice(clientId: string, usagePeriodId: string): Promise<Invoice> {
    return apiClient.post<Invoice>('/api/billing/invoices/generate', { clientId, usagePeriodId });
  },

  /**
   * Mark invoice as paid (admin only)
   */
  async markInvoicePaid(id: string, paymentMethod?: string): Promise<Invoice> {
    return apiClient.post<Invoice>(`/api/billing/invoices/${id}/mark-paid`, { paymentMethod });
  },

  /**
   * Void an invoice (admin only)
   */
  async voidInvoice(id: string): Promise<Invoice> {
    return apiClient.post<Invoice>(`/api/billing/invoices/${id}/void`, {});
  },

  // ─────────────────────────────────────────────────────────────
  // ORG ADMIN METHODS
  // ─────────────────────────────────────────────────────────────

  /**
   * Get all plans (ORG admin view - includes all plan types)
   */
  async getAllPlansAdmin(options: { planType?: string; clientId?: string } = {}): Promise<PricingPlan[]> {
    const params = new URLSearchParams();
    if (options.planType) params.append('type', options.planType);
    if (options.clientId) params.append('clientId', options.clientId);
    const queryString = params.toString();
    return apiClient.get<PricingPlan[]>(`/api/billing/admin/plans${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * Get all subscriptions (ORG admin view)
   */
  async getAllSubscriptionsAdmin(options: { status?: string } = {}): Promise<ClientSubscription[]> {
    const params = new URLSearchParams();
    if (options.status) params.append('status', options.status);
    const queryString = params.toString();
    return apiClient.get<ClientSubscription[]>(`/api/billing/admin/subscriptions${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * Create a custom plan for a specific client (ORG admin only)
   */
  async createCustomPlan(data: CreatePricingPlanDto & { clientId: string }): Promise<PricingPlan> {
    return apiClient.post<PricingPlan>('/api/billing/plans/custom', data);
  },

  /**
   * Assign a plan to a client (ORG admin only)
   */
  async assignPlanToClient(data: AssignPlanToClientDto): Promise<ClientSubscription> {
    return apiClient.post<ClientSubscription>('/api/billing/admin/assign-plan', data);
  },

  // ─────────────────────────────────────────────────────────────
  // SELF-SERVICE PLAN CHANGES
  // ─────────────────────────────────────────────────────────────

  /**
   * Get plans available to upgrade to (self-service)
   */
  async getUpgradeablePlans(clientId: string): Promise<PricingPlan[]> {
    return apiClient.get<PricingPlan[]>(`/api/billing/plans/upgradeable?clientId=${clientId}`);
  },

  /**
   * Request a plan upgrade (returns Stripe Checkout URL or approval message)
   */
  async requestUpgrade(clientId: string, data: RequestPlanChangeDto): Promise<UpgradeResponse> {
    return apiClient.post<UpgradeResponse>('/api/billing/subscription/upgrade', { clientId, ...data });
  },

  /**
   * Request a plan downgrade (requires ORG approval)
   */
  async requestDowngrade(clientId: string, data: RequestPlanChangeDto, reason?: string): Promise<{ success: boolean; message: string }> {
    return apiClient.post('/api/billing/subscription/downgrade-request', { clientId, ...data, reason });
  },
};

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Format currency amount from cents to display string
 */
export function formatCurrency(amountInCents: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amountInCents / 100);
}

/**
 * Format large numbers with abbreviations (1K, 1M, etc.)
 */
export function formatNumber(value: number | undefined | null): string {
  if (value === undefined || value === null) return '0';
  if (value === 0) return 'Unlimited';
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toLocaleString();
}

/**
 * Get subscription status badge color
 */
export function getSubscriptionStatusColor(status: string): string {
  switch (status) {
    case SubscriptionStatus.ACTIVE:
      return 'bg-green-500/10 text-green-500 border-green-500/20';
    case SubscriptionStatus.TRIALING:
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case SubscriptionStatus.PAUSED:
      return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    case SubscriptionStatus.PAST_DUE:
      return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    case SubscriptionStatus.CANCELED:
      return 'bg-red-500/10 text-red-500 border-red-500/20';
    default:
      return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
  }
}

/**
 * Get invoice status badge color
 */
export function getInvoiceStatusColor(status: string): string {
  switch (status) {
    case InvoiceStatus.PAID:
      return 'bg-green-500/10 text-green-500 border-green-500/20';
    case InvoiceStatus.OPEN:
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case InvoiceStatus.DRAFT:
      return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
    case InvoiceStatus.VOID:
      return 'bg-red-500/10 text-red-500 border-red-500/20';
    case InvoiceStatus.UNCOLLECTIBLE:
      return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    default:
      return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
  }
}

/**
 * Feature label mapping for display
 */
export const featureLabels: Record<string, string> = {
  basicReporting: 'Basic Reporting',
  advancedAnalytics: 'Advanced Analytics',
  customReports: 'Custom Reports',
  dataExport: 'Data Export',
  tokenization: 'Tokenization (PCI)',
  fraudDetection: 'Fraud Detection',
  threeDS: '3D Secure',
  emailSupport: 'Email Support',
  chatSupport: 'Chat Support',
  phoneSupport: 'Phone Support',
  dedicatedManager: 'Dedicated Manager',
  slaGuarantee: 'SLA Guarantee',
  apiAccess: 'API Access',
  webhooks: 'Webhooks',
  multipleProviders: 'Multiple Providers',
  routingRules: 'Routing Rules',
  advancedRouting: 'Advanced Routing',
  loadBalancing: 'Load Balancing',
  failover: 'Failover',
  customBranding: 'Custom Branding',
  whiteLabel: 'White Label',
};

/**
 * Get feature label for display
 */
export function getFeatureLabel(feature: string): string {
  return featureLabels[feature] || feature;
}
