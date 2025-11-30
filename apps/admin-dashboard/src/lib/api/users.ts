import { apiRequest } from '../api';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type ScopeType = 'ORGANIZATION' | 'CLIENT' | 'COMPANY' | 'DEPARTMENT' | 'TEAM';

export interface UserRoleAssignment {
  id: string;
  roleId: string;
  roleName: string;
  roleSlug: string;
  roleColor: string | null;
  scopeType: ScopeType;
  scopeId: string;
  scopeName?: string;
  assignedAt: string;
  expiresAt: string | null;
}

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  scopeType: ScopeType;
  scopeId: string;
  organizationId: string | null;
  clientId: string | null;
  companyId: string | null;
  departmentId: string | null;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  organizationName?: string;
  clientName?: string;
  companyName?: string;
  departmentName?: string;
  roleAssignments?: UserRoleAssignment[];
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  pending: number;
}

export interface UserQueryParams {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  companyId?: string;
  clientId?: string;
  departmentId?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'email' | 'role' | 'status' | 'createdAt' | 'lastLoginAt';
  sortOrder?: 'asc' | 'desc';
}

export interface InviteUserDto {
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  scopeType: ScopeType;
  scopeId: string;
  companyId?: string;
  clientId?: string;
  departmentId?: string;
  teamIds?: string[];
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  role?: UserRole;
  companyId?: string;
  clientId?: string;
  departmentId?: string;
}

export interface AssignRoleDto {
  roleId: string;
  scopeType: ScopeType;
  scopeId: string;
}

// ═══════════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export const usersApi = {
  /**
   * List users with pagination and filters
   */
  async list(params: UserQueryParams = {}): Promise<{ users: User[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.append('search', params.search);
    if (params.role) searchParams.append('role', params.role);
    if (params.status) searchParams.append('status', params.status);
    if (params.companyId) searchParams.append('companyId', params.companyId);
    if (params.clientId) searchParams.append('clientId', params.clientId);
    if (params.departmentId) searchParams.append('departmentId', params.departmentId);
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.offset) searchParams.append('offset', params.offset.toString());
    if (params.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.append('sortOrder', params.sortOrder);

    const query = searchParams.toString();
    return apiRequest.get<{ users: User[]; total: number }>(`/api/admin/users${query ? `?${query}` : ''}`);
  },

  /**
   * Get user statistics
   */
  async getStats(): Promise<UserStats> {
    return apiRequest.get<UserStats>('/api/admin/users/stats');
  },

  /**
   * Get user by ID
   */
  async getById(id: string): Promise<User> {
    return apiRequest.get<User>(`/api/admin/users/${id}`);
  },

  /**
   * Invite a new user
   */
  async invite(data: InviteUserDto): Promise<User> {
    return apiRequest.post<User>('/api/admin/users/invite', data);
  },

  /**
   * Update user details
   */
  async update(id: string, data: UpdateUserDto): Promise<User> {
    return apiRequest.patch<User>(`/api/admin/users/${id}`, data);
  },

  /**
   * Update user status
   */
  async updateStatus(id: string, status: UserStatus): Promise<User> {
    return apiRequest.patch<User>(`/api/admin/users/${id}/status`, { status });
  },

  /**
   * Assign RBAC role to user
   */
  async assignRole(userId: string, data: AssignRoleDto): Promise<void> {
    return apiRequest.post(`/api/admin/users/${userId}/roles`, data);
  },

  /**
   * Remove RBAC role from user
   */
  async removeRole(userId: string, roleId: string): Promise<void> {
    return apiRequest.delete(`/api/admin/users/${userId}/roles/${roleId}`);
  },
};

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get user's full name or email fallback
 */
export function getUserFullName(user: User): string {
  if (user.firstName || user.lastName) {
    return [user.firstName, user.lastName].filter(Boolean).join(' ');
  }
  return user.email.split('@')[0];
}

/**
 * Get user's initials for avatar
 */
export function getUserInitials(user: User): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  }
  if (user.firstName) {
    return user.firstName.slice(0, 2).toUpperCase();
  }
  return user.email.slice(0, 2).toUpperCase();
}

/**
 * Get badge variant for user status
 */
export function getStatusBadgeVariant(status: UserStatus): 'success' | 'warning' | 'destructive' | 'secondary' {
  switch (status) {
    case 'ACTIVE':
      return 'success';
    case 'INACTIVE':
      return 'secondary';
    case 'SUSPENDED':
      return 'destructive';
    default:
      return 'secondary';
  }
}

/**
 * Get badge variant for user role
 */
export function getRoleBadgeVariant(role: UserRole): 'destructive' | 'warning' | 'info' | 'secondary' | 'default' {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'destructive';
    case 'ADMIN':
      return 'warning';
    case 'MANAGER':
      return 'info';
    case 'USER':
      return 'default';
    case 'VIEWER':
      return 'secondary';
    default:
      return 'default';
  }
}

/**
 * Format role for display
 */
export function formatRole(role: UserRole): string {
  return role.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Format status for display
 */
export function formatStatus(status: UserStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const USER_ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: 'SUPER_ADMIN', label: 'Super Admin', description: 'Full platform access' },
  { value: 'ADMIN', label: 'Admin', description: 'Full access within scope' },
  { value: 'MANAGER', label: 'Manager', description: 'Team and operational access' },
  { value: 'USER', label: 'User', description: 'Standard operational access' },
  { value: 'VIEWER', label: 'Viewer', description: 'Read-only access' },
];

export const USER_STATUSES: { value: UserStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'SUSPENDED', label: 'Suspended' },
];
