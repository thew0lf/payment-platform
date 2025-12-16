import { apiRequest } from '../api';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type WaitlistStatus = 'PENDING' | 'VERIFIED' | 'INVITED' | 'REGISTERED' | 'DECLINED';

export interface WaitlistEntry {
  id: string;
  organizationId: string;
  email: string;
  phone?: string;
  companyName?: string;
  firstName?: string;
  lastName?: string;
  founderNumber: string;
  basePosition: number;
  currentPosition: number;
  referralCode: string;
  referredBy?: string;
  referralCount: number;
  status: WaitlistStatus;
  emailVerified: boolean;
  phoneVerified: boolean;
  invitedAt?: string;
  inviteExpiresAt?: string;
  registeredAt?: string;
  clientId?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  variant?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWaitlistDto {
  email: string;
  phone?: string;
  companyName?: string;
  firstName?: string;
  lastName?: string;
  referralCode?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  variant?: string;
}

export interface UpdateWaitlistDto {
  companyName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  status?: WaitlistStatus;
}

export interface WaitlistStats {
  total: number;
  pending: number;
  verified: number;
  invited: number;
  registered: number;
  declined: number;
  todaySignups: number;
  weekSignups: number;
}

export interface WaitlistQueryParams {
  status?: WaitlistStatus;
  search?: string;
  hasReferrals?: boolean;
  limit?: number;
  offset?: number;
}

export interface SendInviteResult {
  success: boolean;
  message: string;
  inviteToken?: string;
  inviteUrl?: string;
}

export interface BulkInviteResult {
  sent: number;
  failed: number;
  results: SendInviteResult[];
}

export interface VerifyInviteResult {
  valid: boolean;
  message?: string;
  founderNumber?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
}

export interface CompleteRegistrationDto {
  token: string;
  password: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
}

export interface RegistrationResult {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  client?: {
    id: string;
    name: string;
    code?: string;
  };
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const WAITLIST_STATUSES: { value: WaitlistStatus; label: string; color: string }[] = [
  { value: 'PENDING', label: 'Pending', color: 'amber' },
  { value: 'VERIFIED', label: 'Verified', color: 'blue' },
  { value: 'INVITED', label: 'Invited', color: 'purple' },
  { value: 'REGISTERED', label: 'Registered', color: 'green' },
  { value: 'DECLINED', label: 'Declined', color: 'red' },
];

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

export function getWaitlistStatusBadgeVariant(status: WaitlistStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'REGISTERED':
      return 'default';
    case 'INVITED':
      return 'secondary';
    case 'DECLINED':
      return 'destructive';
    default:
      return 'outline';
  }
}

export function formatWaitlistStatus(status: WaitlistStatus): string {
  return WAITLIST_STATUSES.find((s) => s.value === status)?.label || status;
}

export function getWaitlistEntryName(entry: WaitlistEntry): string {
  if (entry.firstName || entry.lastName) {
    return [entry.firstName, entry.lastName].filter(Boolean).join(' ');
  }
  return entry.email.split('@')[0];
}

export function getWaitlistEntryInitials(entry: WaitlistEntry): string {
  if (entry.firstName && entry.lastName) {
    return `${entry.firstName[0]}${entry.lastName[0]}`.toUpperCase();
  }
  if (entry.firstName) {
    return entry.firstName.substring(0, 2).toUpperCase();
  }
  return entry.email.substring(0, 2).toUpperCase();
}

// ═══════════════════════════════════════════════════════════════
// API CLIENT
// ═══════════════════════════════════════════════════════════════

export const waitlistApi = {
  // List waitlist entries
  list: async (params: WaitlistQueryParams = {}): Promise<{ items: WaitlistEntry[]; total: number }> => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    });
    return apiRequest.get<{ items: WaitlistEntry[]; total: number }>(`/api/admin/waitlist?${query}`);
  },

  // Get waitlist entry by ID
  get: async (id: string): Promise<WaitlistEntry> => {
    return apiRequest.get<WaitlistEntry>(`/api/admin/waitlist/${id}`);
  },

  // Get waitlist stats
  getStats: async (): Promise<WaitlistStats> => {
    return apiRequest.get<WaitlistStats>('/api/admin/waitlist/stats');
  },

  // Create waitlist entry (admin)
  create: async (data: CreateWaitlistDto): Promise<WaitlistEntry> => {
    return apiRequest.post<WaitlistEntry>('/api/admin/waitlist', data);
  },

  // Update waitlist entry
  update: async (id: string, data: UpdateWaitlistDto): Promise<WaitlistEntry> => {
    return apiRequest.patch<WaitlistEntry>(`/api/admin/waitlist/${id}`, data);
  },

  // Delete waitlist entry
  delete: async (id: string): Promise<void> => {
    return apiRequest.delete(`/api/admin/waitlist/${id}`);
  },

  // Send invite to a single entry
  sendInvite: async (id: string): Promise<SendInviteResult> => {
    return apiRequest.post<SendInviteResult>(`/api/admin/waitlist/${id}/invite`);
  },

  // Send bulk invites
  sendBulkInvites: async (ids: string[]): Promise<BulkInviteResult> => {
    return apiRequest.post<BulkInviteResult>('/api/admin/waitlist/bulk-invite', { ids });
  },
};

// ═══════════════════════════════════════════════════════════════
// PUBLIC API CLIENT (No auth required)
// ═══════════════════════════════════════════════════════════════

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const publicWaitlistApi = {
  // Verify an invite token
  verifyInvite: async (token: string): Promise<VerifyInviteResult> => {
    const response = await fetch(`${API_URL}/api/waitlist/verify-invite/${token}`);
    return response.json();
  },

  // Complete registration
  register: async (data: CompleteRegistrationDto): Promise<RegistrationResult> => {
    const response = await fetch(`${API_URL}/api/waitlist/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Registration failed' }));
      throw new Error(error.message || 'Registration failed');
    }
    return response.json();
  },
};
