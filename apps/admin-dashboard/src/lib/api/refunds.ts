import { apiRequest } from '../api';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type RefundStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type RefundType = 'FULL' | 'PARTIAL';
export type RefundReason =
  | 'CUSTOMER_REQUEST'
  | 'DAMAGED_ITEM'
  | 'WRONG_ITEM'
  | 'QUALITY_ISSUE'
  | 'SHIPPING_ISSUE'
  | 'DUPLICATE_ORDER'
  | 'FRAUD'
  | 'OTHER';

export interface RefundLineItem {
  orderItemId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  refundAmount: number;
}

export interface Refund {
  id: string;
  companyId: string;
  orderId: string;
  customerId: string;
  requestedBy: string | null;

  // Refund details
  refundNumber?: string; // May be undefined for legacy records
  type: RefundType;
  status: RefundStatus;
  reason: RefundReason;
  reasonDetails?: string;

  // Amounts (backend uses requestedAmount/approvedAmount, frontend shows as refundAmount)
  originalAmount?: number;
  requestedAmount?: number; // From backend
  approvedAmount?: number; // From backend
  refundAmount?: number; // For display (populated from requestedAmount)
  currency: string;

  // Line items for partial refunds
  lineItems: RefundLineItem[];

  // Approval workflow
  autoApproved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;

  // Processing
  processedAt?: string;
  processingError?: string;
  transactionId?: string;

  // Notes
  internalNotes?: string;
  customerNotes?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;

  // Relations (optional, loaded with includes)
  order?: {
    id: string;
    orderNumber: string;
    total: number;
  };
  customer?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  requestedByUser?: {
    id: string;
    name: string;
    email: string;
  };
  approvedByUser?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface RefundSettings {
  id: string;
  companyId: string;

  // Auto-approval settings
  autoApprovalEnabled: boolean;
  autoApprovalMaxAmount: number;
  autoApprovalMaxDays: number;

  // Restrictions
  requireReason: boolean;
  requireApproval: boolean;
  allowPartialRefunds: boolean;

  // Notifications
  notifyOnRequest: boolean;
  notifyOnApproval: boolean;
  notifyOnCompletion: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface CreateRefundInput {
  orderId: string;
  type: RefundType;
  reason: RefundReason;
  reasonDetails?: string;
  refundAmount?: number; // Required for partial refunds
  lineItems?: RefundLineItem[]; // Required for partial refunds
  internalNotes?: string;
  customerNotes?: string;
}

export interface UpdateRefundInput {
  reason?: RefundReason;
  reasonDetails?: string;
  internalNotes?: string;
  customerNotes?: string;
}

export interface RefundQueryParams {
  orderId?: string;
  customerId?: string;
  status?: RefundStatus;
  type?: RefundType;
  reason?: RefundReason;
  startDate?: string;
  endDate?: string;
  search?: string;
  limit?: number;
  offset?: number;
  cursor?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface RefundCursorPaginatedResponse {
  items: Refund[];
  pagination: {
    nextCursor: string | null;
    prevCursor: string | null;
    hasMore: boolean;
    count: number;
    estimatedTotal?: number;
  };
}

export interface RefundStats {
  totalRefunds: number;
  pendingRefunds: number;
  approvedRefunds: number;
  rejectedRefunds: number;
  completedRefunds: number;
  totalRefundAmount: number;
  averageRefundAmount: number;
  autoApprovalRate: number;
}

export interface UpdateRefundSettingsInput {
  autoApprovalEnabled?: boolean;
  autoApprovalMaxAmount?: number;
  autoApprovalMaxDays?: number;
  requireReason?: boolean;
  requireApproval?: boolean;
  allowPartialRefunds?: boolean;
  notifyOnRequest?: boolean;
  notifyOnApproval?: boolean;
  notifyOnCompletion?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// API CLIENT
// ═══════════════════════════════════════════════════════════════

export const refundsApi = {
  // List refunds (legacy offset pagination)
  list: async (params: RefundQueryParams = {}): Promise<{ items: Refund[]; total: number }> => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    });
    // Backend returns { refunds: [...], total: N }, map to { items: [...], total: N }
    const response = await apiRequest.get<{ refunds: Refund[]; total: number }>(`/api/refunds?${query}`);
    // Map requestedAmount to refundAmount for frontend display
    const items = response.refunds.map(refund => ({
      ...refund,
      refundAmount: refund.requestedAmount || refund.refundAmount || 0,
      refundNumber: refund.refundNumber || refund.id.substring(0, 8), // Fallback for display
    }));
    return { items, total: response.total };
  },

  // List refunds with cursor-based pagination (scalable for millions of rows)
  listWithCursor: async (params: RefundQueryParams = {}): Promise<RefundCursorPaginatedResponse> => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    });
    return apiRequest.get<RefundCursorPaginatedResponse>(`/api/refunds?${query}`);
  },

  // Get refund by ID
  get: async (id: string): Promise<Refund> => {
    return apiRequest.get<Refund>(`/api/refunds/${id}`);
  },

  // Get refund by refund number
  getByNumber: async (refundNumber: string): Promise<Refund> => {
    return apiRequest.get<Refund>(`/api/refunds/number/${refundNumber}`);
  },

  // Get refund stats
  getStats: async (startDate?: string, endDate?: string): Promise<RefundStats> => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    // Map backend field names to frontend expected names
    const response = await apiRequest.get<{
      totalRefunds: number;
      pendingRefunds: number;
      approvedRefunds: number;
      rejectedRefunds: number;
      completedRefunds: number;
      totalRefundedAmount: number;
      averageRefundAmount: number;
      autoApprovalRate?: number;
    }>(`/api/refunds/stats?${params}`);
    return {
      ...response,
      totalRefundAmount: response.totalRefundedAmount,
      autoApprovalRate: response.autoApprovalRate ?? 0,
    };
  },

  // Create refund request
  create: async (data: CreateRefundInput): Promise<Refund> => {
    return apiRequest.post<Refund>('/api/refunds', data);
  },

  // Update refund
  update: async (id: string, data: UpdateRefundInput): Promise<Refund> => {
    return apiRequest.patch<Refund>(`/api/refunds/${id}`, data);
  },

  // Approve refund
  approve: async (id: string, notes?: string): Promise<Refund> => {
    return apiRequest.post<Refund>(`/api/refunds/${id}/approve`, { notes });
  },

  // Reject refund
  reject: async (id: string, reason: string): Promise<Refund> => {
    return apiRequest.post<Refund>(`/api/refunds/${id}/reject`, { reason });
  },

  // Process refund (actually execute the refund)
  process: async (id: string): Promise<Refund> => {
    return apiRequest.post<Refund>(`/api/refunds/${id}/process`);
  },

  // Cancel refund (before processing)
  cancel: async (id: string, reason?: string): Promise<Refund> => {
    return apiRequest.post<Refund>(`/api/refunds/${id}/cancel`, { reason });
  },

  // Bulk approve refunds
  bulkApprove: async (ids: string[]): Promise<{ success: number; failed: number }> => {
    return apiRequest.post<{ success: number; failed: number }>('/api/refunds/bulk/approve', { ids });
  },

  // Bulk reject refunds
  bulkReject: async (ids: string[], reason: string): Promise<{ success: number; failed: number }> => {
    return apiRequest.post<{ success: number; failed: number }>('/api/refunds/bulk/reject', { ids, reason });
  },

  // ═══════════════════════════════════════════════════════════════
  // REFUND SETTINGS
  // ═══════════════════════════════════════════════════════════════

  // Get refund settings for current company
  getSettings: async (): Promise<RefundSettings> => {
    return apiRequest.get<RefundSettings>('/api/refunds/settings');
  },

  // Update refund settings
  updateSettings: async (data: UpdateRefundSettingsInput): Promise<RefundSettings> => {
    return apiRequest.patch<RefundSettings>('/api/refunds/settings', data);
  },

  // ═══════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  // Get refunds by order
  getByOrder: async (orderId: string): Promise<Refund[]> => {
    return apiRequest.get<Refund[]>(`/api/orders/${orderId}/refunds`);
  },

  // Get refunds by customer
  getByCustomer: async (customerId: string, params: { limit?: number; offset?: number } = {}): Promise<{ items: Refund[]; total: number }> => {
    const query = new URLSearchParams();
    query.set('customerId', customerId);
    if (params.limit) query.set('limit', String(params.limit));
    if (params.offset) query.set('offset', String(params.offset));
    return apiRequest.get<{ items: Refund[]; total: number }>(`/api/refunds?${query}`);
  },
};

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function formatRefundNumber(refundNumber: string): string {
  // Assuming refund numbers follow a pattern like "RFN-000000001"
  // Format as "RFN-000-000-001" for display
  if (refundNumber.startsWith('RFN-')) {
    const number = refundNumber.replace('RFN-', '');
    if (number.length === 9) {
      return `RFN-${number.slice(0, 3)}-${number.slice(3, 6)}-${number.slice(6)}`;
    }
  }
  return refundNumber;
}

export function getRefundStatusColor(status: RefundStatus): string {
  const colors: Record<RefundStatus, string> = {
    PENDING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    APPROVED: 'bg-green-500/10 text-green-400 border-green-500/20',
    REJECTED: 'bg-red-500/10 text-red-400 border-red-500/20',
    PROCESSING: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    COMPLETED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    FAILED: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    CANCELLED: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  };
  return colors[status] || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
}

export function getRefundReasonLabel(reason: RefundReason): string {
  const labels: Record<RefundReason, string> = {
    CUSTOMER_REQUEST: 'Customer Request',
    DAMAGED_ITEM: 'Damaged Item',
    WRONG_ITEM: 'Wrong Item',
    QUALITY_ISSUE: 'Quality Issue',
    SHIPPING_ISSUE: 'Shipping Issue',
    DUPLICATE_ORDER: 'Duplicate Order',
    FRAUD: 'Fraud',
    OTHER: 'Other',
  };
  return labels[reason] || reason;
}

export function canApproveRefund(refund: Refund): boolean {
  return refund.status === 'PENDING';
}

export function canRejectRefund(refund: Refund): boolean {
  return refund.status === 'PENDING';
}

export function canProcessRefund(refund: Refund): boolean {
  return refund.status === 'APPROVED';
}

export function canCancelRefund(refund: Refund): boolean {
  return ['PENDING', 'APPROVED'].includes(refund.status);
}
