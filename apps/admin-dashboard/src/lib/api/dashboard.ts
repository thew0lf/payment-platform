import { apiRequest } from '../api';
import { Transaction } from '@/types/transactions';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface DashboardMetrics {
  revenue: {
    total: number;
    change: number;
    period: string;
  };
  transactions: {
    total: number;
    change: number;
    successful: number;
    failed: number;
  };
  subscriptions: {
    active: number;
    change: number;
    churnRate: number;
  };
  customers: {
    total: number;
    change: number;
    active: number;
  };
}

export interface ProviderMetrics {
  providerId: string;
  providerName: string;
  providerType: string;
  status: 'healthy' | 'degraded' | 'down';
  volume: number;
  transactionCount: number;
  successRate: number;
  averageFee: number;
}

export interface ChartDataPoint {
  date: string;
  successful: number;
  failed: number;
  total: number;
  volume: number;
}

export interface ChartResponse {
  data: ChartDataPoint[];
  summary: {
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    successRate: number;
    totalVolume: number;
    avgDailyTransactions: number;
    avgDailyVolume: number;
  };
  period: {
    start: string;
    end: string;
    days: number;
  };
}

export interface BadgeCounts {
  orders: number;
  fulfillment: number;
  lowStock: number;
}

export interface RoutingStats {
  totalSaved: number;
  period: string;
  rules: Array<{
    name: string;
    description: string;
    saved: number;
  }>;
}

// ═══════════════════════════════════════════════════════════════
// API CLIENT
// ═══════════════════════════════════════════════════════════════

export const dashboardApi = {
  // Get dashboard metrics
  getMetrics: async (params?: { companyId?: string; clientId?: string }): Promise<DashboardMetrics> => {
    const query = new URLSearchParams();
    if (params?.companyId) query.set('companyId', params.companyId);
    if (params?.clientId) query.set('clientId', params.clientId);
    return apiRequest.get<DashboardMetrics>(`/api/dashboard/metrics?${query}`);
  },

  // Get provider metrics
  getProviders: async (companyId?: string): Promise<ProviderMetrics[]> => {
    const query = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.get<ProviderMetrics[]>(`/api/dashboard/providers${query}`);
  },

  // Get recent transactions
  getRecentTransactions: async (params?: { companyId?: string; limit?: number }): Promise<Transaction[]> => {
    const query = new URLSearchParams();
    if (params?.companyId) query.set('companyId', params.companyId);
    if (params?.limit) query.set('limit', String(params.limit));
    return apiRequest.get<Transaction[]>(`/api/dashboard/transactions/recent?${query}`);
  },

  // Get chart data
  getChartData: async (params?: { days?: number; companyId?: string; clientId?: string }): Promise<ChartResponse> => {
    const query = new URLSearchParams();
    if (params?.days) query.set('days', String(params.days));
    if (params?.companyId) query.set('companyId', params.companyId);
    if (params?.clientId) query.set('clientId', params.clientId);
    return apiRequest.get<ChartResponse>(`/api/dashboard/stats/chart?${query}`);
  },

  // Get badge counts
  getBadges: async (params?: { companyId?: string; clientId?: string }): Promise<BadgeCounts> => {
    const query = new URLSearchParams();
    if (params?.companyId) query.set('companyId', params.companyId);
    if (params?.clientId) query.set('clientId', params.clientId);
    return apiRequest.get<BadgeCounts>(`/api/dashboard/badges?${query}`);
  },

  // Get routing stats
  getRoutingStats: async (params?: { companyId?: string; clientId?: string }): Promise<RoutingStats> => {
    const query = new URLSearchParams();
    if (params?.companyId) query.set('companyId', params.companyId);
    if (params?.clientId) query.set('clientId', params.clientId);
    return apiRequest.get<RoutingStats>(`/api/dashboard/routing/stats?${query}`);
  },
};
