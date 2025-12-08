import { apiRequest } from '../api';

export interface UsageStats {
  totalRequests: number;
  totalBaseCost: number;
  totalBillableCost: number;
  currency: string;
  billingPeriod: string;
}

export interface ProviderUsage {
  provider: string;
  requestCount: number;
  baseCost: number;
  billableCost: number;
  usageTypes: Record<string, number>;
}

export interface UsageSummary {
  currentMonth: UsageStats;
  lastMonth: UsageStats;
  byProvider: ProviderUsage[];
  topEndpoints: Array<{ endpoint: string; count: number }>;
}

export interface MonthlyUsage {
  period: string;
  requestCount: number;
  billableCost: number;
}

export const integrationUsageApi = {
  /**
   * Get usage stats for a billing period
   */
  async getUsage(companyId?: string, billingPeriod?: string): Promise<UsageStats> {
    const params = new URLSearchParams();
    if (companyId) params.append('companyId', companyId);
    if (billingPeriod) params.append('billingPeriod', billingPeriod);
    return apiRequest.get<UsageStats>(`/api/integrations/usage?${params}`);
  },

  /**
   * Get comprehensive usage summary
   */
  async getUsageSummary(companyId?: string, billingPeriod?: string): Promise<UsageSummary> {
    const params = new URLSearchParams();
    if (companyId) params.append('companyId', companyId);
    if (billingPeriod) params.append('billingPeriod', billingPeriod);
    return apiRequest.get<UsageSummary>(`/api/integrations/usage/summary?${params}`);
  },

  /**
   * Get usage by provider
   */
  async getUsageByProvider(companyId?: string, billingPeriod?: string): Promise<ProviderUsage[]> {
    const params = new URLSearchParams();
    if (companyId) params.append('companyId', companyId);
    if (billingPeriod) params.append('billingPeriod', billingPeriod);
    return apiRequest.get<ProviderUsage[]>(`/api/integrations/usage/by-provider?${params}`);
  },

  /**
   * Get usage history for charts
   */
  async getUsageHistory(companyId?: string, months = 6): Promise<MonthlyUsage[]> {
    const params = new URLSearchParams();
    if (companyId) params.append('companyId', companyId);
    params.append('months', months.toString());
    return apiRequest.get<MonthlyUsage[]>(`/api/integrations/usage/history?${params}`);
  },
};
