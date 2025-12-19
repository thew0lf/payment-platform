import { apiRequest } from '../api';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type CompanyStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface Company {
  id: string;
  clientId: string;
  name: string;
  slug: string;
  code: string;
  domain?: string;
  logo?: string;
  timezone: string;
  currency: string;
  status: CompanyStatus;
  createdAt: string;
  updatedAt: string;
  client?: {
    id: string;
    name: string;
    code: string;
  };
  _count?: {
    customers: number;
    orders: number;
    users: number;
    products?: number;
  };
}

export interface CompanyQueryParams {
  clientId?: string;
  search?: string;
  status?: CompanyStatus;
  sortBy?: 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface CompanyStats {
  totalCompanies: number;
  activeCompanies: number;
  companiesByClient: Array<{
    clientId: string;
    clientName: string;
    count: number;
  }>;
}

export interface CreateCompanyInput {
  clientId: string;
  name: string;
  domain?: string;
  logo?: string;
  timezone?: string;
  currency?: string;
}

export interface UpdateCompanyInput {
  name?: string;
  domain?: string;
  logo?: string;
  timezone?: string;
  currency?: string;
  status?: CompanyStatus;
}

// ═══════════════════════════════════════════════════════════════
// API CLIENT
// ═══════════════════════════════════════════════════════════════

export const companiesApi = {
  // List companies
  list: async (params: CompanyQueryParams = {}): Promise<{ companies: Company[]; total: number }> => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    });
    return apiRequest.get<{ companies: Company[]; total: number }>(`/api/admin/companies?${query}`);
  },

  // Get company by ID
  get: async (id: string): Promise<Company> => {
    return apiRequest.get<Company>(`/api/admin/companies/${id}`);
  },

  // Get company stats
  getStats: async (): Promise<CompanyStats> => {
    return apiRequest.get<CompanyStats>('/api/admin/companies/stats');
  },

  // Create company
  create: async (data: CreateCompanyInput): Promise<Company> => {
    return apiRequest.post<Company>('/api/admin/companies', data);
  },

  // Update company
  update: async (id: string, data: UpdateCompanyInput): Promise<Company> => {
    return apiRequest.patch<Company>(`/api/admin/companies/${id}`, data);
  },

  // Delete company (soft delete)
  delete: async (id: string): Promise<void> => {
    return apiRequest.delete(`/api/admin/companies/${id}`);
  },
};
