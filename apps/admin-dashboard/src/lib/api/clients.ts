import { apiRequest } from '../api';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type ClientStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type ClientPlan = 'FOUNDERS' | 'BASIC' | 'STANDARD' | 'PREMIUM' | 'ENTERPRISE';

export interface Client {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  code: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  plan: ClientPlan;
  status: ClientStatus;
  createdAt: string;
  updatedAt: string;
  _count?: {
    companies: number;
    users: number;
  };
}

export interface ClientQueryParams {
  search?: string;
  status?: ClientStatus;
  plan?: ClientPlan;
  sortBy?: 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface ClientStats {
  totalClients: number;
  activeClients: number;
  totalCompanies: number;
  clientsByPlan: Record<string, number>;
}

export interface CreateClientInput {
  name: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  plan?: ClientPlan;
}

export interface UpdateClientInput {
  name?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  plan?: ClientPlan;
  status?: ClientStatus;
}

// ═══════════════════════════════════════════════════════════════
// API CLIENT
// ═══════════════════════════════════════════════════════════════

export const clientsApi = {
  // List clients
  list: async (params: ClientQueryParams = {}): Promise<{ clients: Client[]; total: number }> => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    });
    return apiRequest.get<{ clients: Client[]; total: number }>(`/api/admin/clients?${query}`);
  },

  // Get client by ID
  get: async (id: string): Promise<Client> => {
    return apiRequest.get<Client>(`/api/admin/clients/${id}`);
  },

  // Get client stats
  getStats: async (): Promise<ClientStats> => {
    return apiRequest.get<ClientStats>('/api/admin/clients/stats');
  },

  // Create client
  create: async (data: CreateClientInput): Promise<Client> => {
    return apiRequest.post<Client>('/api/admin/clients', data);
  },

  // Update client
  update: async (id: string, data: UpdateClientInput): Promise<Client> => {
    return apiRequest.patch<Client>(`/api/admin/clients/${id}`, data);
  },

  // Delete client (soft delete)
  delete: async (id: string): Promise<void> => {
    return apiRequest.delete(`/api/admin/clients/${id}`);
  },
};
