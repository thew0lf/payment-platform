import { apiRequest } from '../api';

// ============================================================================
// Types
// ============================================================================

export type LocationType = 'WAREHOUSE' | 'STORE' | 'DROPSHIP' | 'VIRTUAL';

export type AdjustmentReason =
  | 'RECEIVED'
  | 'SOLD'
  | 'RETURNED'
  | 'DAMAGED'
  | 'LOST'
  | 'FOUND'
  | 'TRANSFERRED'
  | 'COUNT_ADJUSTMENT'
  | 'OTHER';

export interface InventoryLocation {
  id: string;
  companyId: string;
  name: string;
  code: string;
  type: LocationType;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    inventoryLevels: number;
  };
}

export interface InventoryLevel {
  id: string;
  locationId: string;
  productId?: string;
  variantId?: string;
  onHand: number;
  committed: number;
  incoming: number;
  available: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  updatedAt: string;
  location?: {
    id: string;
    name: string;
    code: string;
    type: LocationType;
  };
  product?: {
    id: string;
    name: string;
    sku: string;
  };
  variant?: {
    id: string;
    name: string;
    sku: string;
  };
  adjustments?: InventoryAdjustment[];
}

export interface InventoryAdjustment {
  id: string;
  inventoryLevelId: string;
  type: AdjustmentReason;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason?: string;
  referenceType?: string;
  referenceId?: string;
  createdAt: string;
  createdById: string;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
}

// ============================================================================
// Input Types
// ============================================================================

export interface CreateInventoryLocationInput {
  name: string;
  code: string;
  type?: LocationType;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  isActive?: boolean;
  isDefault?: boolean;
}

export interface UpdateInventoryLocationInput extends Partial<CreateInventoryLocationInput> {}

export interface CreateInventoryLevelInput {
  locationId: string;
  productId?: string;
  variantId?: string;
  onHand?: number;
  committed?: number;
  incoming?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
}

export interface UpdateInventoryLevelInput {
  onHand?: number;
  committed?: number;
  incoming?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
}

export interface SetInventoryInput {
  locationId: string;
  productId?: string;
  variantId?: string;
  quantity: number;
  reason?: string;
}

export interface TransferInventoryInput {
  fromLocationId: string;
  toLocationId: string;
  productId?: string;
  variantId?: string;
  quantity: number;
  reason?: string;
}

export interface AdjustInventoryInput {
  inventoryLevelId: string;
  type: AdjustmentReason;
  quantity: number;
  reason?: string;
  referenceType?: string;
  referenceId?: string;
}

// ============================================================================
// Location API
// ============================================================================

export const inventoryLocationsApi = {
  list: async (companyId?: string): Promise<InventoryLocation[]> => {
    const params = new URLSearchParams();
    if (companyId) params.set('companyId', companyId);
    const query = params.toString();
    return apiRequest.get<InventoryLocation[]>(`/api/inventory/locations${query ? `?${query}` : ''}`);
  },

  get: async (id: string): Promise<InventoryLocation> => {
    return apiRequest.get<InventoryLocation>(`/api/inventory/locations/${id}`);
  },

  getDefault: async (companyId?: string): Promise<InventoryLocation | null> => {
    const params = new URLSearchParams();
    if (companyId) params.set('companyId', companyId);
    const query = params.toString();
    return apiRequest.get<InventoryLocation | null>(`/api/inventory/locations/default${query ? `?${query}` : ''}`);
  },

  create: async (data: CreateInventoryLocationInput, companyId?: string): Promise<InventoryLocation> => {
    const params = new URLSearchParams();
    if (companyId) params.set('companyId', companyId);
    const query = params.toString();
    return apiRequest.post<InventoryLocation>(`/api/inventory/locations${query ? `?${query}` : ''}`, data);
  },

  update: async (id: string, data: UpdateInventoryLocationInput): Promise<InventoryLocation> => {
    return apiRequest.patch<InventoryLocation>(`/api/inventory/locations/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    return apiRequest.delete(`/api/inventory/locations/${id}`);
  },

  setDefault: async (id: string): Promise<InventoryLocation> => {
    return apiRequest.post<InventoryLocation>(`/api/inventory/locations/${id}/set-default`);
  },
};

// ============================================================================
// Level API
// ============================================================================

export const inventoryLevelsApi = {
  getByLocation: async (locationId: string): Promise<InventoryLevel[]> => {
    return apiRequest.get<InventoryLevel[]>(`/api/inventory/levels/by-location/${locationId}`);
  },

  getByProduct: async (productId: string): Promise<InventoryLevel[]> => {
    return apiRequest.get<InventoryLevel[]>(`/api/inventory/levels/by-product/${productId}`);
  },

  getByVariant: async (variantId: string): Promise<InventoryLevel[]> => {
    return apiRequest.get<InventoryLevel[]>(`/api/inventory/levels/by-variant/${variantId}`);
  },

  getLowStock: async (companyId?: string): Promise<InventoryLevel[]> => {
    const params = new URLSearchParams();
    if (companyId) params.set('companyId', companyId);
    const query = params.toString();
    return apiRequest.get<InventoryLevel[]>(`/api/inventory/levels/low-stock${query ? `?${query}` : ''}`);
  },

  get: async (id: string): Promise<InventoryLevel> => {
    return apiRequest.get<InventoryLevel>(`/api/inventory/levels/${id}`);
  },

  getHistory: async (id: string, limit?: number): Promise<InventoryAdjustment[]> => {
    const params = new URLSearchParams();
    if (limit) params.set('limit', limit.toString());
    const query = params.toString();
    return apiRequest.get<InventoryAdjustment[]>(`/api/inventory/levels/${id}/history${query ? `?${query}` : ''}`);
  },

  upsert: async (data: CreateInventoryLevelInput): Promise<InventoryLevel> => {
    return apiRequest.post<InventoryLevel>('/api/inventory/levels', data);
  },

  update: async (id: string, data: UpdateInventoryLevelInput): Promise<InventoryLevel> => {
    return apiRequest.patch<InventoryLevel>(`/api/inventory/levels/${id}`, data);
  },

  setInventory: async (data: SetInventoryInput): Promise<InventoryLevel> => {
    return apiRequest.post<InventoryLevel>('/api/inventory/levels/set', data);
  },

  adjustInventory: async (data: AdjustInventoryInput): Promise<InventoryLevel> => {
    return apiRequest.post<InventoryLevel>('/api/inventory/levels/adjust', data);
  },

  transferInventory: async (data: TransferInventoryInput): Promise<{ from: InventoryLevel; to: InventoryLevel }> => {
    return apiRequest.post<{ from: InventoryLevel; to: InventoryLevel }>('/api/inventory/levels/transfer', data);
  },
};
