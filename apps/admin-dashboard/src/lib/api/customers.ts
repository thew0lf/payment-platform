import { apiRequest } from '../api';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type CustomerStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface CustomerAddress {
  id: string;
  type: 'SHIPPING' | 'BILLING' | 'BOTH';
  isDefault: boolean;
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface Customer {
  id: string;
  companyId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  metadata: Record<string, unknown>;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
  addresses?: CustomerAddress[];
  _count?: {
    orders: number;
    subscriptions: number;
    transactions: number;
  };
  _stats?: {
    totalSpent: number;
    averageOrderValue: number;
    orderCount: number;
    firstOrderDate?: string;
    lastOrderDate?: string;
  };
}

export interface CustomerNote {
  id: string;
  customerId: string;
  userId: string;
  content: string;
  type: 'INTERNAL' | 'CUSTOMER_SERVICE' | 'SYSTEM';
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CustomerTag {
  id: string;
  name: string;
  color: string;
  description?: string;
}

export interface CustomerQueryParams {
  search?: string;
  status?: CustomerStatus;
  tags?: string[];
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  cursor?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CustomerCursorPaginatedResponse {
  items: Customer[];
  pagination: {
    nextCursor: string | null;
    prevCursor: string | null;
    hasMore: boolean;
    count: number;
    estimatedTotal?: number;
  };
}

export interface CreateCustomerInput {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateCustomerInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  status?: CustomerStatus;
  metadata?: Record<string, unknown>;
}

export interface CreateAddressInput {
  type: 'SHIPPING' | 'BILLING' | 'BOTH';
  isDefault?: boolean;
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface CustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  newCustomersThisMonth: number;
  averageLifetimeValue: number;
}

// ═══════════════════════════════════════════════════════════════
// API CLIENT
// ═══════════════════════════════════════════════════════════════

export const customersApi = {
  // List customers (legacy offset pagination)
  list: async (params: CustomerQueryParams = {}): Promise<{ items: Customer[]; total: number }> => {
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
    return apiRequest.get<{ items: Customer[]; total: number }>(`/api/customers?${query}`);
  },

  // List customers with cursor-based pagination (scalable for millions of rows)
  listWithCursor: async (params: CustomerQueryParams = {}): Promise<CustomerCursorPaginatedResponse> => {
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
    return apiRequest.get<CustomerCursorPaginatedResponse>(`/api/customers?${query}`);
  },

  // Get customer by ID
  get: async (id: string): Promise<Customer> => {
    return apiRequest.get<Customer>(`/api/customers/${id}`);
  },

  // Get customer stats
  getStats: async (): Promise<CustomerStats> => {
    return apiRequest.get<CustomerStats>('/api/customers/stats');
  },

  // Create customer
  create: async (data: CreateCustomerInput): Promise<Customer> => {
    return apiRequest.post<Customer>('/api/customers', data);
  },

  // Update customer
  update: async (id: string, data: UpdateCustomerInput): Promise<Customer> => {
    return apiRequest.patch<Customer>(`/api/customers/${id}`, data);
  },

  // Delete customer (soft delete)
  delete: async (id: string): Promise<void> => {
    return apiRequest.delete(`/api/customers/${id}`);
  },

  // ═══════════════════════════════════════════════════════════════
  // ADDRESSES
  // ═══════════════════════════════════════════════════════════════

  // Get customer addresses
  getAddresses: async (customerId: string): Promise<CustomerAddress[]> => {
    return apiRequest.get<CustomerAddress[]>(`/api/customers/${customerId}/addresses`);
  },

  // Add address
  addAddress: async (customerId: string, data: CreateAddressInput): Promise<CustomerAddress> => {
    return apiRequest.post<CustomerAddress>(`/api/customers/${customerId}/addresses`, data);
  },

  // Update address
  updateAddress: async (customerId: string, addressId: string, data: Partial<CreateAddressInput>): Promise<CustomerAddress> => {
    return apiRequest.patch<CustomerAddress>(`/api/customers/${customerId}/addresses/${addressId}`, data);
  },

  // Delete address
  deleteAddress: async (customerId: string, addressId: string): Promise<void> => {
    return apiRequest.delete(`/api/customers/${customerId}/addresses/${addressId}`);
  },

  // ═══════════════════════════════════════════════════════════════
  // NOTES
  // ═══════════════════════════════════════════════════════════════

  // Get customer notes
  getNotes: async (customerId: string): Promise<CustomerNote[]> => {
    return apiRequest.get<CustomerNote[]>(`/api/customers/${customerId}/notes`);
  },

  // Add note
  addNote: async (customerId: string, content: string, type?: 'INTERNAL' | 'CUSTOMER_SERVICE'): Promise<CustomerNote> => {
    return apiRequest.post<CustomerNote>(`/api/customers/${customerId}/notes`, { content, type: type || 'INTERNAL' });
  },

  // Delete note
  deleteNote: async (customerId: string, noteId: string): Promise<void> => {
    return apiRequest.delete(`/api/customers/${customerId}/notes/${noteId}`);
  },

  // ═══════════════════════════════════════════════════════════════
  // ORDERS (for customer context)
  // ═══════════════════════════════════════════════════════════════

  // Get customer orders
  getOrders: async (customerId: string, params: { limit?: number; offset?: number } = {}): Promise<{ items: unknown[]; total: number }> => {
    const query = new URLSearchParams();
    query.set('customerId', customerId);
    if (params.limit) query.set('limit', String(params.limit));
    if (params.offset) query.set('offset', String(params.offset));
    return apiRequest.get<{ items: unknown[]; total: number }>(`/api/orders?${query}`);
  },
};
