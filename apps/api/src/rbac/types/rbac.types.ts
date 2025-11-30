import { ScopeType, PermissionGrantType } from '@prisma/client';

// Permission codes follow format: "resource:action" or "resource:action:scope"
// Examples: "transactions:read", "users:write", "settings:manage"

export interface PermissionCode {
  resource: string;
  action: string;
  scope?: string;
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface RolePermission {
  id: string;
  roleId: string;
  permissionId: string;
  constraints?: Record<string, any>;
  permission?: Permission;
  createdAt: Date;
}

export interface UserRoleAssignment {
  id: string;
  userId: string;
  roleId: string;
  scopeType: ScopeType;
  scopeId: string;
  assignedBy?: string;
  assignedAt: Date;
  expiresAt?: Date;
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
  grantedAt: Date;
  expiresAt?: Date;
  reason?: string;
  constraints?: Record<string, any>;
  permission?: Permission;
}

export interface UserSession {
  id: string;
  userId: string;
  sessionToken: string;
  userAgent?: string;
  ipAddress?: string;
  deviceInfo?: Record<string, any>;
  city?: string;
  country?: string;
  isActive: boolean;
  lastActiveAt: Date;
  createdAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
  revokedBy?: string;
  revokeReason?: string;
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
  expiresAt?: Date;
}

export interface GrantPermissionDto {
  userId: string;
  permissionId: string;
  scopeType: ScopeType;
  scopeId: string;
  grantType?: PermissionGrantType;
  expiresAt?: Date;
  reason?: string;
  constraints?: Record<string, any>;
}

// Permission check context
export interface PermissionCheckContext {
  userId: string;
  scopeType: ScopeType;
  scopeId: string;
  permission: string;  // Permission code to check
}

// Effective permissions result
export interface EffectivePermissions {
  userId: string;
  scopeType: ScopeType;
  scopeId: string;
  permissions: string[];  // List of permission codes
  roles: { roleId: string; roleName: string; roleSlug: string }[];
}

// Permission categories for UI grouping
export const PERMISSION_CATEGORIES = [
  'users',
  'roles',
  'transactions',
  'orders',
  'products',
  'customers',
  'subscriptions',
  'analytics',
  'settings',
  'integrations',
  'billing',
  'audit',
] as const;

export type PermissionCategory = typeof PERMISSION_CATEGORIES[number];

// Standard actions
export const PERMISSION_ACTIONS = [
  'read',
  'write',
  'delete',
  'manage',  // Full access including admin operations
  'export',
  'import',
] as const;

export type PermissionAction = typeof PERMISSION_ACTIONS[number];

// Helper to generate permission code
export function generatePermissionCode(resource: string, action: string): string {
  return `${resource}:${action}`;
}

// Helper to parse permission code
export function parsePermissionCode(code: string): PermissionCode {
  const parts = code.split(':');
  return {
    resource: parts[0],
    action: parts[1],
    scope: parts[2],
  };
}

// Helper to check if permission matches (supports wildcards)
export function permissionMatches(userPermission: string, requiredPermission: string): boolean {
  // Exact match
  if (userPermission === requiredPermission) return true;

  // Wildcard match (e.g., "transactions:*" matches "transactions:read")
  if (userPermission.endsWith(':*')) {
    const resource = userPermission.slice(0, -2);
    return requiredPermission.startsWith(resource + ':');
  }

  // Super admin wildcard
  if (userPermission === '*') return true;

  return false;
}
