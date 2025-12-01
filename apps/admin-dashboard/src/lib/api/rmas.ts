import { apiRequest } from '../api';

// ═══════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════

export type RMAStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'LABEL_SENT'
  | 'IN_TRANSIT'
  | 'RECEIVED'
  | 'INSPECTING'
  | 'INSPECTION_COMPLETE'
  | 'PROCESSING_REFUND'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED';

export type RMAType = 'RETURN' | 'EXCHANGE' | 'WARRANTY' | 'REPAIR' | 'RECALL';

export type ReturnReason =
  | 'DEFECTIVE'
  | 'WRONG_SIZE'
  | 'WRONG_COLOR'
  | 'WRONG_ITEM'
  | 'NOT_AS_DESCRIBED'
  | 'DAMAGED_IN_SHIPPING'
  | 'ARRIVED_LATE'
  | 'NO_LONGER_NEEDED'
  | 'BETTER_PRICE_FOUND'
  | 'QUALITY_NOT_EXPECTED'
  | 'ACCIDENTAL_ORDER'
  | 'WARRANTY_CLAIM'
  | 'RECALL'
  | 'OTHER';

export type InspectionResult = 'PASSED' | 'FAILED' | 'PARTIAL' | 'PENDING';

export type ItemCondition =
  | 'NEW_UNOPENED'
  | 'NEW_OPENED'
  | 'LIKE_NEW'
  | 'GOOD'
  | 'FAIR'
  | 'POOR'
  | 'DAMAGED'
  | 'DEFECTIVE';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface RMAItem {
  id: string;
  orderItemId: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  reason: ReturnReason;
  reasonDetails?: string;
  inspection?: {
    condition: ItemCondition;
    result: InspectionResult;
    notes?: string;
    refundEligible: boolean;
    refundPercentage: number;
  };
}

export interface RMAShipping {
  labelType: 'prepaid' | 'customer_paid' | 'pickup';
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  labelUrl?: string;
  labelSentAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  returnAddress: {
    name: string;
    street1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export interface RMAResolution {
  type: 'refund' | 'exchange' | 'store_credit' | 'repair' | 'no_action';
  status: 'pending' | 'processing' | 'completed';
  refund?: {
    refundId?: string;
    amount: number;
    method: string;
    processedAt?: string;
  };
}

export interface RMATimelineEvent {
  status: RMAStatus;
  timestamp: string;
  actor?: string;
  actorType?: 'customer' | 'ai' | 'human' | 'system';
  notes?: string;
}

export interface RMA {
  id: string;
  rmaNumber: string;
  companyId: string;
  customerId: string;
  orderId: string;
  csSessionId?: string;

  type: RMAType;
  status: RMAStatus;
  reason: ReturnReason;
  reasonDetails?: string;

  items: RMAItem[];
  shipping: RMAShipping;
  inspection?: {
    status: 'pending' | 'in_progress' | 'completed';
    overallResult: InspectionResult;
    notes?: string;
  };
  resolution: RMAResolution;
  timeline: RMATimelineEvent[];

  metadata: {
    initiatedBy: 'customer' | 'ai_rep' | 'ai_manager' | 'human_agent' | 'system';
    channel?: 'voice' | 'chat' | 'email' | 'api' | 'portal';
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    tags?: string[];
  };

  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  completedAt?: string;

  // Relations (optional, loaded with includes)
  order?: {
    id: string;
    orderNumber: string;
  };
  customer?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface CreateRMAInput {
  orderId: string;
  customerId: string;
  type: RMAType;
  reason: ReturnReason;
  reasonDetails?: string;
  items: {
    orderItemId: string;
    quantity: number;
    reason?: ReturnReason;
    reasonDetails?: string;
  }[];
  preferredResolution?: 'refund' | 'exchange' | 'store_credit';
  metadata?: {
    channel?: 'voice' | 'chat' | 'email' | 'api' | 'portal';
    priority?: 'low' | 'normal' | 'high' | 'urgent';
  };
}

export interface RMAQueryParams {
  status?: RMAStatus;
  type?: RMAType;
  reason?: ReturnReason;
  customerId?: string;
  orderId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface RMAListResponse {
  items: RMA[];
  total: number;
  pagination?: {
    nextCursor?: string;
    hasMore: boolean;
  };
}

export interface RMAStats {
  totalRMAs: number;
  pendingRMAs: number;
  inTransitRMAs: number;
  completedRMAs: number;
  totalValue: number;
  approvalRate: number;
  avgProcessingTime: number;
}

// ═══════════════════════════════════════════════════════════════
// API CLIENT
// ═══════════════════════════════════════════════════════════════

export const rmasApi = {
  // List RMAs
  list: async (params: RMAQueryParams = {}): Promise<RMAListResponse> => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    });
    const response = await apiRequest.get<{ rmas: RMA[]; total: number }>(`/api/momentum/rma?${query}`);
    return { items: response.rmas || [], total: response.total || 0 };
  },

  // Get RMA by ID
  get: async (id: string): Promise<RMA> => {
    return apiRequest.get<RMA>(`/api/momentum/rma/${id}`);
  },

  // Create RMA
  create: async (data: CreateRMAInput): Promise<RMA> => {
    return apiRequest.post<RMA>('/api/momentum/rma', data);
  },

  // Approve RMA
  approve: async (id: string, notes?: string): Promise<RMA> => {
    return apiRequest.put<RMA>(`/api/momentum/rma/${id}/approve`, { notes });
  },

  // Reject RMA
  reject: async (id: string, reason: string): Promise<RMA> => {
    return apiRequest.put<RMA>(`/api/momentum/rma/${id}/reject`, { reason });
  },

  // Update status
  updateStatus: async (id: string, status: RMAStatus, notes?: string): Promise<RMA> => {
    return apiRequest.put<RMA>(`/api/momentum/rma/${id}/status`, { status, notes });
  },

  // Get stats
  getStats: async (startDate?: string, endDate?: string): Promise<RMAStats> => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    return apiRequest.get<RMAStats>(`/api/momentum/rma/stats?${params}`);
  },
};

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function getRMAStatusColor(status: RMAStatus): string {
  const colors: Record<RMAStatus, string> = {
    REQUESTED: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    APPROVED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    LABEL_SENT: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    IN_TRANSIT: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    RECEIVED: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    INSPECTING: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    INSPECTION_COMPLETE: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    PROCESSING_REFUND: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    COMPLETED: 'bg-green-500/10 text-green-400 border-green-500/20',
    REJECTED: 'bg-red-500/10 text-red-400 border-red-500/20',
    CANCELLED: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
    EXPIRED: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  };
  return colors[status] || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
}

export function getRMAStatusLabel(status: RMAStatus): string {
  const labels: Record<RMAStatus, string> = {
    REQUESTED: 'Requested',
    APPROVED: 'Approved',
    LABEL_SENT: 'Label Sent',
    IN_TRANSIT: 'In Transit',
    RECEIVED: 'Received',
    INSPECTING: 'Inspecting',
    INSPECTION_COMPLETE: 'Inspection Complete',
    PROCESSING_REFUND: 'Processing Refund',
    COMPLETED: 'Completed',
    REJECTED: 'Rejected',
    CANCELLED: 'Cancelled',
    EXPIRED: 'Expired',
  };
  return labels[status] || status;
}

export function getRMATypeLabel(type: RMAType): string {
  const labels: Record<RMAType, string> = {
    RETURN: 'Return',
    EXCHANGE: 'Exchange',
    WARRANTY: 'Warranty',
    REPAIR: 'Repair',
    RECALL: 'Recall',
  };
  return labels[type] || type;
}

export function getReturnReasonLabel(reason: ReturnReason): string {
  const labels: Record<ReturnReason, string> = {
    DEFECTIVE: 'Defective',
    WRONG_SIZE: 'Wrong Size',
    WRONG_COLOR: 'Wrong Color',
    WRONG_ITEM: 'Wrong Item',
    NOT_AS_DESCRIBED: 'Not as Described',
    DAMAGED_IN_SHIPPING: 'Damaged in Shipping',
    ARRIVED_LATE: 'Arrived Late',
    NO_LONGER_NEEDED: 'No Longer Needed',
    BETTER_PRICE_FOUND: 'Better Price Found',
    QUALITY_NOT_EXPECTED: 'Quality Not Expected',
    ACCIDENTAL_ORDER: 'Accidental Order',
    WARRANTY_CLAIM: 'Warranty Claim',
    RECALL: 'Recall',
    OTHER: 'Other',
  };
  return labels[reason] || reason;
}

export function canApproveRMA(rma: RMA): boolean {
  return rma.status === 'REQUESTED';
}

export function canRejectRMA(rma: RMA): boolean {
  return rma.status === 'REQUESTED';
}

export function formatRMANumber(rmaNumber: string): string {
  // Format as RMA-XXX-XXX for display
  if (rmaNumber.startsWith('RMA-')) {
    const number = rmaNumber.replace('RMA-', '');
    if (number.length === 6) {
      return `RMA-${number.slice(0, 3)}-${number.slice(3)}`;
    }
  }
  return rmaNumber;
}
