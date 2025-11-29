import { apiRequest } from '../api';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type SoftDeleteModel =
  | 'Client'
  | 'Company'
  | 'Department'
  | 'User'
  | 'Customer'
  | 'CustomerAddress'
  | 'Subscription'
  | 'Order'
  | 'Product'
  | 'MerchantAccount'
  | 'RoutingRule'
  | 'Webhook';

export type PermanentDeleteReason = 'RETENTION_EXPIRED' | 'GDPR_REQUEST' | 'ADMIN_REQUEST';

export interface DeletedRecord {
  id: string;
  entityType: SoftDeleteModel;
  entityName: string | null;
  deletedAt: string;
  deletedBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  deleteReason: string | null;
  cascadedFrom: string | null;
  canRestore: boolean;
  expiresAt: string;
  cascadedCount: number;
}

export interface DeletionPreview {
  entity: {
    id: string;
    name: string;
    type: SoftDeleteModel;
  };
  cascadeCount: Record<string, number>;
  totalAffected: number;
  warnings: string[];
}

export interface DeletionDetails {
  id: string;
  entityType: SoftDeleteModel;
  entityId: string;
  entityName: string | null;
  deletedAt: string;
  deletedBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  deleteReason: string | null;
  canRestore: boolean;
  expiresAt: string;
  retentionDays: number;
  cascadeRecords: Array<{
    entityType: string;
    entityId: string;
    entityName: string | null;
  }>;
  snapshot: Record<string, unknown> | null;
}

export interface DeleteResult {
  success: boolean;
  message: string;
  cascadeId?: string;
  affectedCount?: number;
}

export interface RestoreResult {
  success: boolean;
  message: string;
  restoredCount?: number;
}

export interface PurgeResult {
  purged: Record<string, number>;
  totalPurged: number;
}

export interface ListDeletedParams {
  entityType?: SoftDeleteModel;
  search?: string;
  deletedAfter?: string;
  deletedBefore?: string;
  limit?: number;
  offset?: number;
}

// ═══════════════════════════════════════════════════════════════
// API CLIENT
// ═══════════════════════════════════════════════════════════════

export const deletedApi = {
  /**
   * List all deleted records (Trash view)
   */
  list: async (params: ListDeletedParams = {}): Promise<{ items: DeletedRecord[]; total: number }> => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    });
    return apiRequest.get<{ items: DeletedRecord[]; total: number }>(`/api/deleted?${query}`);
  },

  /**
   * List deleted records of a specific type
   */
  listByType: async (
    entityType: SoftDeleteModel,
    params: Omit<ListDeletedParams, 'entityType'> = {},
  ): Promise<{ items: DeletedRecord[]; total: number }> => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    });
    return apiRequest.get<{ items: DeletedRecord[]; total: number }>(`/api/deleted/${entityType}?${query}`);
  },

  /**
   * Preview deletion impact
   */
  previewDelete: async (entityType: SoftDeleteModel, id: string): Promise<DeletionPreview> => {
    return apiRequest.get<DeletionPreview>(`/api/deleted/${entityType}/${id}/preview`);
  },

  /**
   * Soft delete an entity
   */
  delete: async (
    entityType: SoftDeleteModel,
    id: string,
    options?: { reason?: string; cascade?: boolean },
  ): Promise<DeleteResult> => {
    return apiRequest.delete<DeleteResult>(`/api/deleted/${entityType}/${id}`, options);
  },

  /**
   * Restore a soft-deleted entity
   */
  restore: async (
    entityType: SoftDeleteModel,
    id: string,
    options?: { cascade?: boolean },
  ): Promise<RestoreResult> => {
    return apiRequest.post<RestoreResult>(`/api/deleted/${entityType}/${id}/restore`, options || {});
  },

  /**
   * Get detailed information about a deleted entity
   */
  getDetails: async (entityType: SoftDeleteModel, id: string): Promise<DeletionDetails> => {
    return apiRequest.get<DeletionDetails>(`/api/deleted/${entityType}/${id}/details`);
  },

  /**
   * Permanently delete (GDPR/compliance only)
   */
  permanentDelete: async (
    entityType: SoftDeleteModel,
    id: string,
    reason: PermanentDeleteReason,
  ): Promise<DeleteResult> => {
    return apiRequest.delete<DeleteResult>(`/api/deleted/${entityType}/${id}/permanent`, { reason });
  },

  /**
   * Manually trigger retention purge (admin only)
   */
  purgeExpired: async (): Promise<PurgeResult> => {
    return apiRequest.post<PurgeResult>('/api/deleted/purge', {});
  },
};

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const SOFT_DELETE_MODELS: { value: SoftDeleteModel; label: string; icon: string }[] = [
  { value: 'Client', label: 'Clients', icon: 'Building2' },
  { value: 'Company', label: 'Companies', icon: 'Building' },
  { value: 'Department', label: 'Departments', icon: 'Layers' },
  { value: 'User', label: 'Users', icon: 'Users' },
  { value: 'Customer', label: 'Customers', icon: 'UserCircle' },
  { value: 'CustomerAddress', label: 'Addresses', icon: 'MapPin' },
  { value: 'Subscription', label: 'Subscriptions', icon: 'RefreshCw' },
  { value: 'Order', label: 'Orders', icon: 'ShoppingCart' },
  { value: 'Product', label: 'Products', icon: 'Package' },
  { value: 'MerchantAccount', label: 'Merchant Accounts', icon: 'CreditCard' },
  { value: 'RoutingRule', label: 'Routing Rules', icon: 'Route' },
  { value: 'Webhook', label: 'Webhooks', icon: 'Webhook' },
];

export const RETENTION_PERIODS: Record<SoftDeleteModel, { days: number; label: string }> = {
  Client: { days: 730, label: '2 years' },
  Company: { days: 365, label: '1 year' },
  Department: { days: 90, label: '90 days' },
  User: { days: 180, label: '6 months' },
  Customer: { days: 90, label: '90 days' },
  CustomerAddress: { days: 90, label: '90 days' },
  Subscription: { days: 365, label: '1 year' },
  Order: { days: 365, label: '1 year' },
  Product: { days: 90, label: '90 days' },
  MerchantAccount: { days: 365, label: '1 year' },
  RoutingRule: { days: 90, label: '90 days' },
  Webhook: { days: 90, label: '90 days' },
};

export const PERMANENT_DELETE_REASONS: { value: PermanentDeleteReason; label: string }[] = [
  { value: 'GDPR_REQUEST', label: 'GDPR Right to Erasure Request' },
  { value: 'ADMIN_REQUEST', label: 'Administrative Request' },
  { value: 'RETENTION_EXPIRED', label: 'Retention Period Expired' },
];

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════

export function formatTimeUntilExpiration(expiresAt: string): string {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diff = expires.getTime() - now.getTime();

  if (diff <= 0) return 'Expired';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 30) {
    const months = Math.floor(days / 30);
    return `${months} month${months > 1 ? 's' : ''}`;
  }
  return `${days} day${days !== 1 ? 's' : ''}`;
}

export function getEntityTypeLabel(entityType: SoftDeleteModel): string {
  const model = SOFT_DELETE_MODELS.find((m) => m.value === entityType);
  return model?.label || entityType;
}

export function getEntityTypeIcon(entityType: SoftDeleteModel): string {
  const model = SOFT_DELETE_MODELS.find((m) => m.value === entityType);
  return model?.icon || 'File';
}
