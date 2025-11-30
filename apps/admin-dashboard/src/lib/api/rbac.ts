import { apiRequest } from '../api';

// Types matching backend
export type ScopeType = 'ORGANIZATION' | 'CLIENT' | 'COMPANY' | 'DEPARTMENT' | 'TEAM';
export type PermissionGrantType = 'ALLOW' | 'DENY';

export interface Permission {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  scopeType: ScopeType;
  scopeId?: string;
  isSystem: boolean;
  isDefault: boolean;
  priority: number;
  permissions?: RolePermission[];
  createdAt: string;
  updatedAt: string;
}

export interface RolePermission {
  id: string;
  roleId: string;
  permissionId: string;
  constraints?: Record<string, unknown>;
  permission?: Permission;
  createdAt: string;
}

export interface UserRoleAssignment {
  id: string;
  userId: string;
  roleId: string;
  scopeType: ScopeType;
  scopeId: string;
  assignedBy?: string;
  assignedAt: string;
  expiresAt?: string;
  role?: Role;
}

export interface PermissionGrant {
  id: string;
  userId: string;
  permissionId: string;
  scopeType: ScopeType;
  scopeId: string;
  grantType: PermissionGrantType;
  grantedBy?: string;
  grantedAt: string;
  expiresAt?: string;
  reason?: string;
  constraints?: Record<string, unknown>;
  permission?: Permission;
}

export interface UserSession {
  id: string;
  userId: string;
  sessionToken: string;
  userAgent?: string;
  ipAddress?: string;
  deviceInfo?: Record<string, unknown>;
  city?: string;
  country?: string;
  isActive: boolean;
  lastActiveAt: string;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string;
  revokedBy?: string;
  revokeReason?: string;
}

export interface EffectivePermissions {
  userId: string;
  scopeType: ScopeType;
  scopeId: string;
  permissions: string[];
  roles: { roleId: string; roleName: string; roleSlug: string }[];
}

// DTOs
export interface CreatePermissionDto {
  code: string;
  name: string;
  description?: string;
  category: string;
}

export interface CreateRoleDto {
  name: string;
  slug?: string;
  description?: string;
  color?: string;
  scopeType: ScopeType;
  scopeId?: string;
  isDefault?: boolean;
  priority?: number;
  permissionIds?: string[];
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
  color?: string;
  isDefault?: boolean;
  priority?: number;
  permissionIds?: string[];
}

export interface AssignRoleDto {
  userId: string;
  roleId: string;
  scopeType: ScopeType;
  scopeId: string;
  expiresAt?: string;
}

export interface GrantPermissionDto {
  userId: string;
  permissionId: string;
  scopeType: ScopeType;
  scopeId: string;
  grantType?: PermissionGrantType;
  expiresAt?: string;
  reason?: string;
  constraints?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════
// PERMISSIONS API
// ═══════════════════════════════════════════════════════════════

export async function getPermissions(category?: string): Promise<Permission[]> {
  const params = category ? `?category=${encodeURIComponent(category)}` : '';
  return apiRequest.get<Permission[]>(`/api/rbac/permissions${params}`);
}

export async function createPermission(dto: CreatePermissionDto): Promise<Permission> {
  return apiRequest.post<Permission>('/api/rbac/permissions', dto);
}

export async function getPermission(id: string): Promise<Permission> {
  return apiRequest.get<Permission>(`/api/rbac/permissions/${id}`);
}

export async function deletePermission(id: string): Promise<void> {
  return apiRequest.delete<void>(`/api/rbac/permissions/${id}`);
}

// ═══════════════════════════════════════════════════════════════
// ROLES API
// ═══════════════════════════════════════════════════════════════

export async function getRoles(scopeType?: ScopeType, scopeId?: string): Promise<Role[]> {
  const params = new URLSearchParams();
  if (scopeType) params.append('scopeType', scopeType);
  if (scopeId) params.append('scopeId', scopeId);
  const query = params.toString() ? `?${params.toString()}` : '';
  return apiRequest.get<Role[]>(`/api/rbac/roles${query}`);
}

export async function createRole(dto: CreateRoleDto): Promise<Role> {
  return apiRequest.post<Role>('/api/rbac/roles', dto);
}

export async function getRole(id: string): Promise<Role> {
  return apiRequest.get<Role>(`/api/rbac/roles/${id}`);
}

export async function updateRole(id: string, dto: UpdateRoleDto): Promise<Role> {
  return apiRequest.patch<Role>(`/api/rbac/roles/${id}`, dto);
}

export async function deleteRole(id: string): Promise<void> {
  return apiRequest.delete<void>(`/api/rbac/roles/${id}`);
}

export async function setRolePermissions(roleId: string, permissionIds: string[]): Promise<Role> {
  return apiRequest.patch<Role>(`/api/rbac/roles/${roleId}/permissions`, { permissionIds });
}

// ═══════════════════════════════════════════════════════════════
// ROLE ASSIGNMENTS API
// ═══════════════════════════════════════════════════════════════

export async function assignRole(dto: AssignRoleDto): Promise<{ success: boolean }> {
  return apiRequest.post<{ success: boolean }>('/api/rbac/assignments', dto);
}

export async function unassignRole(
  userId: string,
  roleId: string,
  scopeType: ScopeType,
  scopeId: string,
): Promise<void> {
  const params = new URLSearchParams({
    userId,
    roleId,
    scopeType,
    scopeId,
  });
  return apiRequest.delete<void>(`/api/rbac/assignments?${params.toString()}`);
}

export async function getUserRoles(
  userId: string,
  scopeType?: ScopeType,
  scopeId?: string,
): Promise<Role[]> {
  const params = new URLSearchParams();
  if (scopeType) params.append('scopeType', scopeType);
  if (scopeId) params.append('scopeId', scopeId);
  const query = params.toString() ? `?${params.toString()}` : '';
  return apiRequest.get<Role[]>(`/api/rbac/users/${userId}/roles${query}`);
}

// ═══════════════════════════════════════════════════════════════
// PERMISSION GRANTS API
// ═══════════════════════════════════════════════════════════════

export async function grantPermission(dto: GrantPermissionDto): Promise<PermissionGrant> {
  return apiRequest.post<PermissionGrant>('/api/rbac/grants', dto);
}

export async function revokeGrant(
  userId: string,
  permissionId: string,
  scopeType: ScopeType,
  scopeId: string,
): Promise<void> {
  const params = new URLSearchParams({
    userId,
    permissionId,
    scopeType,
    scopeId,
  });
  return apiRequest.delete<void>(`/api/rbac/grants?${params.toString()}`);
}

export async function getUserGrants(
  userId: string,
  scopeType?: ScopeType,
  scopeId?: string,
): Promise<PermissionGrant[]> {
  const params = new URLSearchParams();
  if (scopeType) params.append('scopeType', scopeType);
  if (scopeId) params.append('scopeId', scopeId);
  const query = params.toString() ? `?${params.toString()}` : '';
  return apiRequest.get<PermissionGrant[]>(`/api/rbac/users/${userId}/grants${query}`);
}

// ═══════════════════════════════════════════════════════════════
// EFFECTIVE PERMISSIONS API
// ═══════════════════════════════════════════════════════════════

export async function getUserEffectivePermissions(
  userId: string,
  scopeType: ScopeType,
  scopeId: string,
): Promise<EffectivePermissions> {
  const params = new URLSearchParams({ scopeType, scopeId });
  return apiRequest.get<EffectivePermissions>(`/api/rbac/users/${userId}/effective-permissions?${params.toString()}`);
}

export async function getMyPermissions(scopeType?: ScopeType, scopeId?: string): Promise<EffectivePermissions> {
  const params = new URLSearchParams();
  if (scopeType) params.append('scopeType', scopeType);
  if (scopeId) params.append('scopeId', scopeId);
  const query = params.toString() ? `?${params.toString()}` : '';
  return apiRequest.get<EffectivePermissions>(`/api/rbac/me/permissions${query}`);
}

export async function checkMyPermission(
  permission: string,
  scopeType?: ScopeType,
  scopeId?: string,
): Promise<{ hasPermission: boolean }> {
  const params = new URLSearchParams({ permission });
  if (scopeType) params.append('scopeType', scopeType);
  if (scopeId) params.append('scopeId', scopeId);
  return apiRequest.get<{ hasPermission: boolean }>(`/api/rbac/me/check?${params.toString()}`);
}

// ═══════════════════════════════════════════════════════════════
// SESSIONS API
// ═══════════════════════════════════════════════════════════════

export async function getMySessions(): Promise<UserSession[]> {
  return apiRequest.get<UserSession[]>('/api/rbac/me/sessions');
}

export async function revokeMySession(sessionId: string): Promise<void> {
  return apiRequest.delete<void>(`/api/rbac/me/sessions/${sessionId}`);
}

export async function revokeAllMySessions(exceptCurrent = true): Promise<{ revokedCount: number }> {
  const params = exceptCurrent ? '?exceptCurrent=true' : '';
  return apiRequest.delete<{ revokedCount: number }>(`/api/rbac/me/sessions${params}`);
}

export async function getUserSessions(userId: string): Promise<UserSession[]> {
  return apiRequest.get<UserSession[]>(`/api/rbac/users/${userId}/sessions`);
}

export async function revokeUserSessions(userId: string): Promise<{ revokedCount: number }> {
  return apiRequest.delete<{ revokedCount: number }>(`/api/rbac/users/${userId}/sessions`);
}

// ═══════════════════════════════════════════════════════════════
// PERMISSION CATEGORIES (for UI grouping)
// ═══════════════════════════════════════════════════════════════

export const PERMISSION_CATEGORIES = [
  { key: 'users', label: 'Users', icon: 'Users' },
  { key: 'roles', label: 'Roles & Permissions', icon: 'Shield' },
  { key: 'transactions', label: 'Transactions', icon: 'CreditCard' },
  { key: 'orders', label: 'Orders', icon: 'ShoppingCart' },
  { key: 'products', label: 'Products', icon: 'Package' },
  { key: 'customers', label: 'Customers', icon: 'UserCheck' },
  { key: 'subscriptions', label: 'Subscriptions', icon: 'RefreshCw' },
  { key: 'analytics', label: 'Analytics', icon: 'BarChart3' },
  { key: 'settings', label: 'Settings', icon: 'Settings' },
  { key: 'integrations', label: 'Integrations', icon: 'Plug' },
  { key: 'billing', label: 'Billing', icon: 'Receipt' },
  { key: 'audit', label: 'Audit', icon: 'FileText' },
  { key: 'fulfillment', label: 'Fulfillment', icon: 'Truck' },
  { key: 'admin', label: 'Admin', icon: 'Crown' },
] as const;

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if a permission code matches (supports wildcards)
 */
export function permissionMatches(userPermission: string, requiredPermission: string): boolean {
  if (userPermission === requiredPermission) return true;
  if (userPermission.endsWith(':*')) {
    const resource = userPermission.slice(0, -2);
    return requiredPermission.startsWith(resource + ':');
  }
  if (userPermission === '*') return true;
  return false;
}

/**
 * Check if user has permission from their effective permissions list
 */
export function hasPermission(effectivePermissions: string[], requiredPermission: string): boolean {
  return effectivePermissions.some(p => permissionMatches(p, requiredPermission));
}

/**
 * Check if user has all required permissions
 */
export function hasAllPermissions(effectivePermissions: string[], requiredPermissions: string[]): boolean {
  return requiredPermissions.every(required =>
    effectivePermissions.some(p => permissionMatches(p, required))
  );
}

/**
 * Check if user has any of the required permissions
 */
export function hasAnyPermission(effectivePermissions: string[], requiredPermissions: string[]): boolean {
  return requiredPermissions.some(required =>
    effectivePermissions.some(p => permissionMatches(p, required))
  );
}

/**
 * Group permissions by category
 */
export function groupPermissionsByCategory(permissions: Permission[]): Map<string, Permission[]> {
  const grouped = new Map<string, Permission[]>();
  for (const perm of permissions) {
    const existing = grouped.get(perm.category) || [];
    grouped.set(perm.category, [...existing, perm]);
  }
  return grouped;
}

/**
 * Get role color class for Tailwind
 */
export function getRoleColorClass(color: string | undefined): string {
  if (!color) return 'bg-gray-500';
  // Convert hex to Tailwind class name
  const colorMap: Record<string, string> = {
    '#dc2626': 'bg-red-600',
    '#ea580c': 'bg-orange-600',
    '#ca8a04': 'bg-yellow-600',
    '#16a34a': 'bg-green-600',
    '#0284c7': 'bg-sky-600',
    '#6b7280': 'bg-gray-500',
    '#7c3aed': 'bg-violet-600',
    '#db2777': 'bg-pink-600',
  };
  return colorMap[color] || 'bg-gray-500';
}
