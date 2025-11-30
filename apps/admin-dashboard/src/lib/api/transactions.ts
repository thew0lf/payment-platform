import { apiRequest } from '../api';
import { Transaction } from '@/types/transactions';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface TransactionQueryParams {
  companyId?: string;
  clientId?: string;
  status?: string;
  type?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface TransactionListResponse {
  transactions: Transaction[];
  total: number;
}

export interface TransactionStats {
  totalCount: number;
  totalVolume: number;
  successfulCount: number;
  successfulVolume: number;
  failedCount: number;
  pendingCount: number;
  refundedCount: number;
  refundedVolume: number;
  avgTransactionValue: number;
  successRate: number;
}

// ═══════════════════════════════════════════════════════════════
// API CLIENT
// ═══════════════════════════════════════════════════════════════

export const transactionsApi = {
  // List transactions
  list: async (params: TransactionQueryParams = {}): Promise<TransactionListResponse> => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    });
    return apiRequest.get<TransactionListResponse>(`/api/transactions?${query}`);
  },

  // Get transaction by ID
  get: async (id: string): Promise<Transaction> => {
    return apiRequest.get<Transaction>(`/api/transactions/${id}`);
  },

  // Get transaction stats
  getStats: async (params?: { companyId?: string; clientId?: string }): Promise<TransactionStats> => {
    const query = new URLSearchParams();
    if (params?.companyId) query.set('companyId', params.companyId);
    if (params?.clientId) query.set('clientId', params.clientId);
    return apiRequest.get<TransactionStats>(`/api/transactions/stats?${query}`);
  },
};
