const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://api.dev.avnz.io:3001';

// Get token directly from localStorage to avoid stale cache issues
function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('avnz_token');
  }
  return null;
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

  // Handle empty responses (e.g., 204 No Content from DELETE)
  const contentLength = response.headers.get('content-length');
  if (response.status === 204 || contentLength === '0') {
    return { data: undefined as T, status: response.status };
  }

  // Try to parse JSON, but handle empty body gracefully
  const text = await response.text();
  const data = text ? JSON.parse(text) : undefined;
  return { data, status: response.status };
}

export const api = {
  // ═══════════════════════════════════════════════════════════════════════════
  // AUTHENTICATION FLOW
  // ═══════════════════════════════════════════════════════════════════════════
  // Token management is handled by auth-context.tsx which supports:
  //   1. Auth0 (Primary) - Enterprise SSO via @auth0/auth0-react
  //   2. Local Auth (Backup) - Email/password fallback
  //
  // Both providers store tokens in localStorage under 'avnz_token' key.
  // The getToken() function reads directly from localStorage to ensure
  // fresh tokens are used on every API request.
  //
  // DO NOT modify token storage without reviewing auth-context.tsx
  // ═══════════════════════════════════════════════════════════════════════════

  // Auth
  login: (email: string, password: string) =>
    request<{ user: any; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    request('/api/auth/logout', { method: 'POST' }),

  getCurrentUser: () =>
    request<{ user: any }>('/api/auth/me'),

  // Hierarchy
  getAccessibleHierarchy: () =>
    request<{ clients: any[]; companies: any[]; departments: any[] }>('/api/hierarchy/accessible'),

  // Transactions
  getTransactions: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<{ transactions: any[]; total: number; page: number; limit: number }>(
      `/api/transactions${query ? `?${query}` : ''}`
    );
  },

  getTransaction: (id: string) =>
    request<{ transaction: any }>(`/api/transactions/${id}`),

  // Customers
  getCustomers: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<{ customers: any[]; total: number }>(`/api/customers${query ? `?${query}` : ''}`);
  },

  getCustomer: (id: string) =>
    request<{ customer: any }>(`/api/customers/${id}`),

  // Dashboard
  getDashboardMetrics: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<any>(`/api/dashboard/metrics${query ? `?${query}` : ''}`);
  },

  getRecentTransactions: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<{ transactions: any[] }>(`/api/dashboard/recent${query ? `?${query}` : ''}`);
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
// apiRequest can be called directly (defaults to GET), or with options for other methods
export async function apiRequest<T>(
  endpoint: string,
  options?: { method?: string; body?: string }
): Promise<T> {
  const opts: RequestInit = {};
  if (options?.method) opts.method = options.method;
  // Body should already be JSON.stringify'd by the caller
  if (options?.body) opts.body = options.body;
  const { data } = await request<T>(endpoint, opts);
  return data;
}

// Also export object-style API for files using apiRequest.get(), apiRequest.post(), etc.
apiRequest.get = <T>(endpoint: string) => request<T>(endpoint).then(r => r.data);
apiRequest.post = <T>(endpoint: string, body?: unknown) =>
  request<T>(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined }).then(r => r.data);
apiRequest.put = <T>(endpoint: string, body?: unknown) =>
  request<T>(endpoint, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }).then(r => r.data);
apiRequest.patch = <T>(endpoint: string, body?: unknown) =>
  request<T>(endpoint, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }).then(r => r.data);
apiRequest.delete = <T>(endpoint: string, body?: unknown) =>
  request<T>(endpoint, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined }).then(r => r.data);

// File upload method (uses FormData, doesn't set Content-Type to let browser set multipart boundary)
apiRequest.upload = async <T>(endpoint: string, formData: FormData): Promise<T> => {
  const token = getToken();
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  // Note: Don't set Content-Type for FormData - browser sets it with correct boundary
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Upload failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  return response.json();
};

// Create apiClient object for subscription-plans and billing modules
export const apiClient = {
  get: <T>(endpoint: string) => request<T>(endpoint).then(r => r.data),
  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined }).then(r => r.data),
  put: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }).then(r => r.data),
  patch: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }).then(r => r.data),
  delete: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined }).then(r => r.data),
};
