const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://api.dev.avnz.io:3001';

let authToken: string | null = null;

// Get token from memory or localStorage
function getToken(): string | null {
  if (authToken) return authToken;
  if (typeof window !== 'undefined') {
    authToken = localStorage.getItem('avnz_token');
  }
  return authToken;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T; status: number }> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = getToken();
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return { data, status: response.status };
}

export const api = {
  setToken: (token: string) => {
    authToken = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('avnz_token', token);
    }
  },

  clearToken: () => {
    authToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('avnz_token');
    }
  },

  initToken: () => {
    if (typeof window !== 'undefined') {
      authToken = localStorage.getItem('avnz_token');
    }
  },

  // Auth
  login: (email: string, password: string) =>
    request<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    request('/auth/logout', { method: 'POST' }),

  getCurrentUser: () =>
    request<{ user: any }>('/auth/me'),

  // Hierarchy
  getAccessibleHierarchy: () =>
    request<{ clients: any[]; companies: any[]; departments: any[] }>('/api/hierarchy/accessible'),

  // Transactions
  getTransactions: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<{ transactions: any[]; total: number; page: number; limit: number }>(
      `/transactions${query ? `?${query}` : ''}`
    );
  },

  getTransaction: (id: string) =>
    request<{ transaction: any }>(`/transactions/${id}`),

  // Customers
  getCustomers: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<{ customers: any[]; total: number }>(`/customers${query ? `?${query}` : ''}`);
  },

  getCustomer: (id: string) =>
    request<{ customer: any }>(`/customers/${id}`),

  // Dashboard
  getDashboardMetrics: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<any>(`/dashboard/metrics${query ? `?${query}` : ''}`);
  },

  getRecentTransactions: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<{ transactions: any[] }>(`/dashboard/recent${query ? `?${query}` : ''}`);
  },

  // Dashboard Chart Data
  getChartData: (params: { days?: number; companyId?: string; clientId?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.days) query.set('days', String(params.days));
    if (params.companyId) query.set('companyId', params.companyId);
    if (params.clientId) query.set('clientId', params.clientId);
    const queryStr = query.toString();
    return request<ChartResponse>(`/api/dashboard/stats/chart${queryStr ? `?${queryStr}` : ''}`);
  },
};

// Chart data types
export interface ChartDataPoint {
  date: string;
  successful: number;
  failed: number;
  total: number;
  volume: number;
}

export interface ChartSummary {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  successRate: number;
  totalVolume: number;
  avgDailyTransactions: number;
  avgDailyVolume: number;
}

export interface ChartResponse {
  data: ChartDataPoint[];
  summary: ChartSummary;
  period: {
    start: string;
    end: string;
    days: number;
  };
}

// Export raw request function for use in other API modules
export const apiRequest = {
  get: <T>(endpoint: string) => request<T>(endpoint).then(r => r.data),
  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined }).then(r => r.data),
  patch: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }).then(r => r.data),
  delete: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined }).then(r => r.data),
};
