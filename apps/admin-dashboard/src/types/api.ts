export interface ApiResponse<T> {
  data: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
  details?: Record<string, unknown>;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Cursor-based pagination types
export interface CursorPaginationParams {
  cursor?: string;
  limit?: number;
  direction?: 'forward' | 'backward';
}

export interface CursorPaginationMeta {
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
  count: number;
  estimatedTotal?: number;
}

export interface CursorPaginatedResponse<T> {
  items: T[];
  pagination: CursorPaginationMeta;
}

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

export interface RoutingSavings {
  totalSaved: number;
  period: string;
  rules: Array<{
    name: string;
    description: string;
    saved: number;
    transactionCount: number;
  }>;
}
