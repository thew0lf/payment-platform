import { apiRequest } from '../api';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type ScopeType = 'ORGANIZATION' | 'CLIENT' | 'COMPANY' | 'DEPARTMENT' | 'TEAM' | 'USER';
export type DataClassification = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'PII' | 'PCI' | 'PHI';

export interface AuditLogUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  scopeType: ScopeType | null;
  scopeId: string | null;
  changes: Record<string, { before: unknown; after: unknown }> | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  dataClassification: DataClassification | null;
  createdAt: string;
  user: AuditLogUser | null;
}

export interface AuditLogListResponse {
  items: AuditLogEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface AuditLogStats {
  totalLogs: number;
  logsByAction: Record<string, number>;
  logsByEntity: Record<string, number>;
  logsByClassification: Record<string, number>;
  recentActivity: { date: string; count: number }[];
}

export interface AuditLogFilters {
  actions: string[];
  entities: string[];
  dataClassifications: DataClassification[];
  scopeTypes: ScopeType[];
}

export interface AuditLogQueryParams {
  userId?: string;
  action?: string;
  actions?: string[];
  entity?: string;
  entities?: string[];
  entityId?: string;
  scopeType?: ScopeType;
  scopeId?: string;
  dataClassification?: DataClassification;
  search?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

// ═══════════════════════════════════════════════════════════════
// API CLIENT
// ═══════════════════════════════════════════════════════════════

export const auditLogsApi = {
  /**
   * List audit logs with filters and pagination
   */
  list: async (params: AuditLogQueryParams = {}): Promise<AuditLogListResponse> => {
    const query = new URLSearchParams();

    if (params.userId) query.set('userId', params.userId);
    if (params.action) query.set('action', params.action);
    if (params.actions?.length) query.set('actions', params.actions.join(','));
    if (params.entity) query.set('entity', params.entity);
    if (params.entities?.length) query.set('entities', params.entities.join(','));
    if (params.entityId) query.set('entityId', params.entityId);
    if (params.scopeType) query.set('scopeType', params.scopeType);
    if (params.scopeId) query.set('scopeId', params.scopeId);
    if (params.dataClassification) query.set('dataClassification', params.dataClassification);
    if (params.search) query.set('search', params.search);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.offset) query.set('offset', params.offset.toString());

    return apiRequest.get<AuditLogListResponse>(`/api/audit-logs?${query}`);
  },

  /**
   * Get a single audit log by ID
   */
  get: async (id: string): Promise<AuditLogEntry> => {
    return apiRequest.get<AuditLogEntry>(`/api/audit-logs/${id}`);
  },

  /**
   * Get audit log statistics
   */
  getStats: async (scopeId?: string, days = 30): Promise<AuditLogStats> => {
    const query = new URLSearchParams();
    if (scopeId) query.set('scopeId', scopeId);
    query.set('days', days.toString());
    return apiRequest.get<AuditLogStats>(`/api/audit-logs/stats?${query}`);
  },

  /**
   * Get available filter options
   */
  getFilters: async (): Promise<AuditLogFilters> => {
    return apiRequest.get<AuditLogFilters>('/api/audit-logs/filters');
  },

  /**
   * Get audit trail for a specific entity
   */
  getEntityTrail: async (entity: string, entityId: string, limit = 100): Promise<AuditLogEntry[]> => {
    const query = new URLSearchParams();
    query.set('limit', limit.toString());
    return apiRequest.get<AuditLogEntry[]>(`/api/audit-logs/entity/${entity}/${entityId}?${query}`);
  },
};

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Format action for display
 */
export function formatAction(action: string): string {
  return action
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Get action color class
 */
export function getActionColor(action: string): string {
  if (action.includes('DELETE') || action.includes('FAILED') || action.includes('BLOCK')) {
    return 'text-red-400';
  }
  if (action.includes('CREATE') || action.includes('COMPLETED') || action.includes('ENABLED')) {
    return 'text-emerald-400';
  }
  if (action.includes('UPDATE') || action.includes('CHANGED')) {
    return 'text-amber-400';
  }
  if (action.includes('LOGIN') || action.includes('LOGOUT')) {
    return 'text-cyan-400';
  }
  return 'text-zinc-300';
}

/**
 * Get data classification badge color
 */
export function getClassificationColor(classification: DataClassification | null): string {
  switch (classification) {
    case 'PCI':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'PII':
      return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'PHI':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'CONFIDENTIAL':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'INTERNAL':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'PUBLIC':
      return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
    default:
      return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
  }
}
