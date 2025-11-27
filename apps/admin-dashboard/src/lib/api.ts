const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://api.dev.avnz.io:3001';

let authToken: string | null = null;

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T; status: number }> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${authToken}`;
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
};
