import { apiRequest } from '../api';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type SubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'CANCELED' | 'EXPIRED';
export type BillingInterval = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface Subscription {
  id: string;
  companyId: string;
  customerId: string;

  // Plan details
  planName: string;
  planAmount: number;
  currency: string;
  interval: BillingInterval;

  // Billing cycle
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingDate: string | null;

  // Trial
  trialStart: string | null;
  trialEnd: string | null;

  // Shipping
  shippingAddressId: string | null;
  shippingPreferences: Record<string, unknown>;

  // Status
  status: SubscriptionStatus;
  canceledAt: string | null;
  cancelReason: string | null;
  pausedAt: string | null;
  pauseResumeAt: string | null;

  // Metadata
  metadata: Record<string, unknown>;

  // Timestamps
  createdAt: string;
  updatedAt: string;

  // Relations (optional, loaded when needed)
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  ordersCount?: number;
}

export interface SubscriptionStats {
  totalSubscriptions: number;
  activeSubscriptions: number;
  pausedSubscriptions: number;
  canceledSubscriptions: number;
  expiredSubscriptions: number;

  // Revenue metrics
  monthlyRecurringRevenue: number;
  averageSubscriptionValue: number;

  // By interval breakdown
  byInterval: {
    interval: BillingInterval;
    count: number;
    revenue: number;
  }[];

  // Upcoming renewals
  renewingThisWeek: number;
  renewingThisMonth: number;
}

export interface SubscriptionQueryParams {
  // Filters
  status?: SubscriptionStatus;
  interval?: BillingInterval;
  customerId?: string;
  search?: string;

  // Date filters
  startDate?: string;
  endDate?: string;

  // Billing date filters
  billingBefore?: string;
  billingAfter?: string;

  // Pagination (offset-based)
  limit?: number;
  offset?: number;

  // Cursor-based pagination
  cursor?: string;
}

export interface CreateSubscriptionInput {
  customerId: string;
  planName: string;
  planAmount: number;
  currency?: string;
  interval: BillingInterval;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  nextBillingDate?: string;
  trialDays?: number;
  shippingAddressId?: string;
  shippingPreferences?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface UpdateSubscriptionInput {
  planName?: string;
  planAmount?: number;
  interval?: BillingInterval;
  nextBillingDate?: string;
  shippingAddressId?: string;
  shippingPreferences?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface PauseSubscriptionInput {
  reason?: string;
  resumeAt?: string;
}

export interface CancelSubscriptionInput {
  reason?: string;
  cancelImmediately?: boolean;
}

export interface SubscriptionCursorPaginatedResponse {
  items: Subscription[];
  pagination: {
    nextCursor: string | null;
    prevCursor: string | null;
    hasMore: boolean;
    count: number;
    estimatedTotal?: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// API CLIENT
// ═══════════════════════════════════════════════════════════════

export const subscriptionsApi = {
  // List subscriptions (offset-based pagination)
  list: async (params: SubscriptionQueryParams = {}): Promise<{ subscriptions: Subscription[]; total: number }> => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    });
    return apiRequest.get<{ subscriptions: Subscription[]; total: number }>(`/api/subscriptions?${query}`);
  },

  // List subscriptions with cursor-based pagination (scalable for large datasets)
  listWithCursor: async (params: SubscriptionQueryParams = {}): Promise<SubscriptionCursorPaginatedResponse> => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    });
    return apiRequest.get<SubscriptionCursorPaginatedResponse>(`/api/subscriptions?${query}`);
  },

  // Get subscription by ID
  get: async (id: string): Promise<Subscription> => {
    return apiRequest.get<Subscription>(`/api/subscriptions/${id}`);
  },

  // Get subscription stats
  getStats: async (startDate?: string, endDate?: string): Promise<SubscriptionStats> => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    return apiRequest.get<SubscriptionStats>(`/api/subscriptions/stats?${params}`);
  },

  // Create subscription
  create: async (data: CreateSubscriptionInput): Promise<Subscription> => {
    return apiRequest.post<Subscription>('/api/subscriptions', data);
  },

  // Update subscription
  update: async (id: string, data: UpdateSubscriptionInput): Promise<Subscription> => {
    return apiRequest.patch<Subscription>(`/api/subscriptions/${id}`, data);
  },

  // Pause subscription
  pause: async (id: string, data?: PauseSubscriptionInput): Promise<Subscription> => {
    return apiRequest.post<Subscription>(`/api/subscriptions/${id}/pause`, data || {});
  },

  // Resume subscription
  resume: async (id: string): Promise<Subscription> => {
    return apiRequest.post<Subscription>(`/api/subscriptions/${id}/resume`);
  },

  // Cancel subscription
  cancel: async (id: string, data?: CancelSubscriptionInput): Promise<Subscription> => {
    return apiRequest.post<Subscription>(`/api/subscriptions/${id}/cancel`, data || {});
  },
};
