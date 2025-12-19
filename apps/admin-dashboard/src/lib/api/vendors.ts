import { apiRequest } from '../api';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type VendorStatus = 'PENDING_VERIFICATION' | 'VERIFIED' | 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
export type VendorTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
export type VendorType = 'SUPPLIER' | 'DROPSHIPPER' | 'WHITE_LABEL' | 'AFFILIATE';
export type ConnectionStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
export type ProductSyncMode = 'MANUAL' | 'AUTO_ALL' | 'AUTO_SELECTED';

export interface Vendor {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  code: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  businessName?: string;
  taxId?: string;
  website?: string;
  logo?: string;
  description?: string;
  vendorType: VendorType;
  status: VendorStatus;
  tier: VendorTier;
  isVerified: boolean;
  verifiedAt?: string;
  totalOrders: number;
  completionRate: number;
  averageRating: number;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  vendorCompanies?: VendorCompany[];
  _count?: {
    vendorCompanies: number;
    clientConnections: number;
  };
}

export interface VendorCompany {
  id: string;
  vendorId: string;
  name: string;
  slug: string;
  code: string;
  domain?: string;
  logo?: string;
  timezone?: string;
  currency?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  capabilities: string[];
  productCategories: string[];
  defaultLeadTimeDays: number;
  status: string;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  vendor?: Vendor;
  _count?: {
    products: number;
    clientConnections: number;
  };
}

export interface VendorConnection {
  id: string;
  vendorId: string;
  vendorCompanyId: string;
  companyId: string;
  status: ConnectionStatus;
  customPricing: Record<string, unknown>;
  terms: Record<string, unknown>;
  creditLimit: number;
  paymentTerms?: string;
  syncMode: ProductSyncMode;
  autoSyncEnabled: boolean;
  approvedAt?: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
  vendor?: Partial<Vendor>;
  vendorCompany?: Partial<VendorCompany>;
  company?: {
    id: string;
    name: string;
    code: string;
  };
  _count?: {
    syncedProducts: number;
    orders: number;
  };
}

export interface VendorProduct {
  id: string;
  vendorCompanyId: string;
  sku: string;
  name: string;
  description?: string;
  wholesalePrice: number;
  retailPrice: number;
  currency: string;
  stockQuantity: number;
  lowStockThreshold: number;
  weight?: number;
  dimensions: Record<string, unknown>;
  images: string[];
  categories: string[];
  leadTimeDays?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  vendorCompany?: Partial<VendorCompany>;
  _count?: {
    syncedProducts: number;
    orderItems: number;
  };
}

export interface VendorStats {
  totalVendors: number;
  activeVendors: number;
  pendingVerification: number;
  byTier: Record<VendorTier, number>;
  byType: Record<VendorType, number>;
}

// Query params
export interface VendorQueryParams {
  search?: string;
  status?: VendorStatus;
  tier?: VendorTier;
  vendorType?: VendorType;
  isVerified?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface VendorCompanyQueryParams {
  vendorId?: string;
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ConnectionQueryParams {
  vendorId?: string;
  vendorCompanyId?: string;
  companyId?: string;
  status?: ConnectionStatus;
  limit?: number;
  offset?: number;
}

export interface VendorProductQueryParams {
  vendorCompanyId: string;
  search?: string;
  isActive?: boolean;
  categories?: string[];
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Create/Update DTOs
export interface CreateVendorInput {
  name: string;
  slug: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  businessName?: string;
  taxId?: string;
  website?: string;
  description?: string;
  vendorType?: VendorType;
  settings?: Record<string, unknown>;
}

export interface UpdateVendorInput {
  name?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  businessName?: string;
  taxId?: string;
  website?: string;
  logo?: string;
  description?: string;
  status?: VendorStatus;
  tier?: VendorTier;
  vendorType?: VendorType;
  settings?: Record<string, unknown>;
}

export interface CreateVendorCompanyInput {
  vendorId: string;
  name: string;
  slug: string;
  domain?: string;
  timezone?: string;
  currency?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  capabilities?: string[];
  productCategories?: string[];
  defaultLeadTimeDays?: number;
  settings?: Record<string, unknown>;
}

export interface UpdateVendorCompanyInput {
  name?: string;
  domain?: string;
  logo?: string;
  timezone?: string;
  currency?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  capabilities?: string[];
  productCategories?: string[];
  status?: string;
  defaultLeadTimeDays?: number;
  settings?: Record<string, unknown>;
}

export interface CreateVendorProductInput {
  vendorCompanyId: string;
  sku: string;
  name: string;
  description?: string;
  wholesalePrice: number;
  retailPrice: number;
  currency?: string;
  stockQuantity?: number;
  lowStockThreshold?: number;
  weight?: number;
  dimensions?: Record<string, unknown>;
  images?: string[];
  categories?: string[];
  leadTimeDays?: number;
  isActive?: boolean;
}

export interface CreateConnectionInput {
  vendorId: string;
  vendorCompanyId: string;
  companyId: string;
  customPricing?: Record<string, unknown>;
  terms?: Record<string, unknown>;
  creditLimit?: number;
  paymentTerms?: string;
  syncMode?: ProductSyncMode;
  autoSyncEnabled?: boolean;
}

export interface UpdateConnectionInput {
  status?: ConnectionStatus;
  customPricing?: Record<string, unknown>;
  terms?: Record<string, unknown>;
  creditLimit?: number;
  paymentTerms?: string;
  syncMode?: ProductSyncMode;
  autoSyncEnabled?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// API CLIENT - VENDORS
// ═══════════════════════════════════════════════════════════════

export const vendorsApi = {
  // List vendors
  list: async (params: VendorQueryParams = {}): Promise<{ items: Vendor[]; total: number }> => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    });
    return apiRequest.get<{ items: Vendor[]; total: number }>(`/api/admin/vendors?${query}`);
  },

  // Get vendor by ID
  get: async (id: string): Promise<Vendor> => {
    return apiRequest.get<Vendor>(`/api/admin/vendors/${id}`);
  },

  // Get vendor stats
  getStats: async (): Promise<VendorStats> => {
    return apiRequest.get<VendorStats>('/api/admin/vendors/stats');
  },

  // Create vendor
  create: async (data: CreateVendorInput): Promise<Vendor> => {
    return apiRequest.post<Vendor>('/api/admin/vendors', data);
  },

  // Update vendor
  update: async (id: string, data: UpdateVendorInput): Promise<Vendor> => {
    return apiRequest.patch<Vendor>(`/api/admin/vendors/${id}`, data);
  },

  // Verify vendor
  verify: async (id: string, isVerified: boolean): Promise<Vendor> => {
    return apiRequest.post<Vendor>(`/api/admin/vendors/${id}/verify`, { isVerified });
  },

  // Delete vendor (soft delete)
  delete: async (id: string): Promise<void> => {
    return apiRequest.delete(`/api/admin/vendors/${id}`);
  },
};

// ═══════════════════════════════════════════════════════════════
// API CLIENT - VENDOR COMPANIES
// ═══════════════════════════════════════════════════════════════

export const vendorCompaniesApi = {
  // List vendor companies
  list: async (params: VendorCompanyQueryParams = {}): Promise<{ items: VendorCompany[]; total: number }> => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    });
    return apiRequest.get<{ items: VendorCompany[]; total: number }>(`/api/admin/vendor-companies?${query}`);
  },

  // Get by vendor
  listByVendor: async (vendorId: string): Promise<VendorCompany[]> => {
    return apiRequest.get<VendorCompany[]>(`/api/admin/vendor-companies/vendor/${vendorId}`);
  },

  // Get vendor company by ID
  get: async (id: string): Promise<VendorCompany> => {
    return apiRequest.get<VendorCompany>(`/api/admin/vendor-companies/${id}`);
  },

  // Create vendor company
  create: async (data: CreateVendorCompanyInput): Promise<VendorCompany> => {
    return apiRequest.post<VendorCompany>('/api/admin/vendor-companies', data);
  },

  // Update vendor company
  update: async (id: string, data: UpdateVendorCompanyInput): Promise<VendorCompany> => {
    return apiRequest.patch<VendorCompany>(`/api/admin/vendor-companies/${id}`, data);
  },

  // Delete vendor company (soft delete)
  delete: async (id: string): Promise<void> => {
    return apiRequest.delete(`/api/admin/vendor-companies/${id}`);
  },
};

// ═══════════════════════════════════════════════════════════════
// API CLIENT - VENDOR CONNECTIONS
// ═══════════════════════════════════════════════════════════════

export const vendorConnectionsApi = {
  // List connections
  list: async (params: ConnectionQueryParams = {}): Promise<{ items: VendorConnection[]; total: number }> => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    });
    return apiRequest.get<{ items: VendorConnection[]; total: number }>(`/api/admin/vendor-connections?${query}`);
  },

  // Get connections by company
  listByCompany: async (companyId: string): Promise<VendorConnection[]> => {
    return apiRequest.get<VendorConnection[]>(`/api/admin/vendor-connections/company/${companyId}`);
  },

  // Get connection by ID
  get: async (id: string): Promise<VendorConnection> => {
    return apiRequest.get<VendorConnection>(`/api/admin/vendor-connections/${id}`);
  },

  // Create connection
  create: async (data: CreateConnectionInput): Promise<VendorConnection> => {
    return apiRequest.post<VendorConnection>('/api/admin/vendor-connections', data);
  },

  // Update connection
  update: async (id: string, data: UpdateConnectionInput): Promise<VendorConnection> => {
    return apiRequest.patch<VendorConnection>(`/api/admin/vendor-connections/${id}`, data);
  },

  // Approve/reject connection
  approve: async (id: string, approved: boolean): Promise<VendorConnection> => {
    return apiRequest.post<VendorConnection>(`/api/admin/vendor-connections/${id}/approve`, { approved });
  },

  // Delete connection
  delete: async (id: string): Promise<void> => {
    return apiRequest.delete(`/api/admin/vendor-connections/${id}`);
  },
};

// ═══════════════════════════════════════════════════════════════
// API CLIENT - VENDOR PRODUCTS
// ═══════════════════════════════════════════════════════════════

export const vendorProductsApi = {
  // List products
  list: async (params: VendorProductQueryParams): Promise<{ items: VendorProduct[]; total: number }> => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach((v) => query.append(key, v));
        } else {
          query.set(key, String(value));
        }
      }
    });
    return apiRequest.get<{ items: VendorProduct[]; total: number }>(`/api/admin/vendor-products?${query}`);
  },

  // Get product by ID
  get: async (id: string): Promise<VendorProduct> => {
    return apiRequest.get<VendorProduct>(`/api/admin/vendor-products/${id}`);
  },

  // Create product
  create: async (data: Partial<VendorProduct>): Promise<VendorProduct> => {
    return apiRequest.post<VendorProduct>('/api/admin/vendor-products', data);
  },

  // Update product
  update: async (id: string, data: Partial<VendorProduct>): Promise<VendorProduct> => {
    return apiRequest.patch<VendorProduct>(`/api/admin/vendor-products/${id}`, data);
  },

  // Update stock
  updateStock: async (id: string, quantity: number): Promise<VendorProduct> => {
    return apiRequest.patch<VendorProduct>(`/api/admin/vendor-products/${id}/stock`, { quantity });
  },

  // Delete product
  delete: async (id: string): Promise<void> => {
    return apiRequest.delete(`/api/admin/vendor-products/${id}`);
  },
};
