import { apiRequest } from '../api';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type SiteStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface Site {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  code: string;
  domain?: string;
  subdomain?: string;
  logo?: string;
  favicon?: string;
  description?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  timezone?: string;
  currency?: string;
  locale?: string;
  isDefault: boolean;
  status: SiteStatus;
  createdAt: string;
  updatedAt: string;
  company?: {
    id: string;
    name: string;
    code: string;
    client?: {
      id: string;
      name: string;
      code: string;
    };
  };
  _count?: {
    funnels: number;
    landingPages: number;
  };
}

export interface SiteQueryParams {
  companyId?: string;
  search?: string;
  status?: SiteStatus;
  sortBy?: 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface SiteStats {
  totalSites: number;
  activeSites: number;
  sitesByCompany: Array<{
    companyId: string;
    companyName: string;
    count: number;
  }>;
}

export interface CreateSiteInput {
  companyId: string;
  name: string;
  domain?: string;
  subdomain?: string;
  logo?: string;
  favicon?: string;
  description?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  timezone?: string;
  currency?: string;
  locale?: string;
  isDefault?: boolean;
}

export interface UpdateSiteInput {
  name?: string;
  domain?: string;
  subdomain?: string;
  logo?: string;
  favicon?: string;
  description?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  timezone?: string;
  currency?: string;
  locale?: string;
  isDefault?: boolean;
  status?: SiteStatus;
}

// ═══════════════════════════════════════════════════════════════
// API CLIENT
// ═══════════════════════════════════════════════════════════════

export const sitesApi = {
  // List sites
  list: async (params: SiteQueryParams = {}): Promise<{ sites: Site[]; total: number }> => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    });
    return apiRequest.get<{ sites: Site[]; total: number }>(`/api/admin/sites?${query}`);
  },

  // Get site by ID
  get: async (id: string): Promise<Site> => {
    return apiRequest.get<Site>(`/api/admin/sites/${id}`);
  },

  // Get site stats
  getStats: async (companyId?: string): Promise<SiteStats> => {
    const query = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.get<SiteStats>(`/api/admin/sites/stats${query}`);
  },

  // Create site
  create: async (data: CreateSiteInput): Promise<Site> => {
    return apiRequest.post<Site>('/api/admin/sites', data);
  },

  // Update site
  update: async (id: string, data: UpdateSiteInput): Promise<Site> => {
    return apiRequest.patch<Site>(`/api/admin/sites/${id}`, data);
  },

  // Set site as default
  setDefault: async (id: string): Promise<Site> => {
    return apiRequest.post<Site>(`/api/admin/sites/${id}/set-default`, {});
  },

  // Delete site (soft delete)
  delete: async (id: string): Promise<void> => {
    return apiRequest.delete(`/api/admin/sites/${id}`);
  },
};
