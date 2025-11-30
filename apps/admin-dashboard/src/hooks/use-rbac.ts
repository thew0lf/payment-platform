'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useHierarchy } from '@/contexts/hierarchy-context';
import * as rbacApi from '@/lib/api/rbac';
import type { EffectivePermissions, Role, Permission, UserSession } from '@/lib/api/rbac';

interface UseRbacOptions {
  /** Auto-fetch permissions on mount */
  autoFetch?: boolean;
  /** Refresh interval in ms (0 = disabled) */
  refreshInterval?: number;
}

interface UseRbacReturn {
  // State
  permissions: string[];
  roles: { roleId: string; roleName: string; roleSlug: string }[];
  isLoading: boolean;
  error: string | null;

  // Permission checks
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;

  // Role checks
  hasRole: (roleSlug: string) => boolean;
  hasAnyRole: (roleSlugs: string[]) => boolean;

  // Quick checks
  isAdmin: boolean;
  isPlatformAdmin: boolean;
  isClientAdmin: boolean;
  isCompanyAdmin: boolean;

  // Actions
  refresh: () => Promise<void>;
  checkPermissionAsync: (permission: string) => Promise<boolean>;
}

/**
 * Hook for RBAC permission management
 * Fetches and caches effective permissions from the backend
 */
export function useRbac(options: UseRbacOptions = {}): UseRbacReturn {
  const { autoFetch = true, refreshInterval = 0 } = options;
  const { user, isAuthenticated } = useAuth();
  const { selectedCompanyId, selectedClientId, accessLevel } = useHierarchy();

  const [effectivePermissions, setEffectivePermissions] = useState<EffectivePermissions | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine current scope for permission checks
  const currentScope = useMemo(() => {
    if (selectedCompanyId) {
      return { scopeType: 'COMPANY' as rbacApi.ScopeType, scopeId: selectedCompanyId };
    }
    if (selectedClientId) {
      return { scopeType: 'CLIENT' as rbacApi.ScopeType, scopeId: selectedClientId };
    }
    if (user?.organizationId) {
      return { scopeType: 'ORGANIZATION' as rbacApi.ScopeType, scopeId: user.organizationId };
    }
    return null;
  }, [selectedCompanyId, selectedClientId, user?.organizationId]);

  // Fetch effective permissions
  const fetchPermissions = useCallback(async () => {
    if (!isAuthenticated || !currentScope) {
      setEffectivePermissions(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await rbacApi.getMyPermissions(currentScope.scopeType, currentScope.scopeId);
      setEffectivePermissions(result);
    } catch (err: any) {
      console.error('Failed to fetch permissions:', err);
      setError(err.message || 'Failed to fetch permissions');
      // Keep existing permissions on error
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, currentScope]);

  // Auto-fetch on mount and scope change
  useEffect(() => {
    if (autoFetch) {
      fetchPermissions();
    }
  }, [autoFetch, fetchPermissions]);

  // Refresh interval
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(fetchPermissions, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, fetchPermissions]);

  // Derived values
  const permissions = effectivePermissions?.permissions || [];
  const roles = effectivePermissions?.roles || [];

  // Permission check functions
  const hasPermission = useCallback(
    (permission: string): boolean => {
      return rbacApi.hasPermission(permissions, permission);
    },
    [permissions]
  );

  const hasAnyPermission = useCallback(
    (perms: string[]): boolean => {
      return rbacApi.hasAnyPermission(permissions, perms);
    },
    [permissions]
  );

  const hasAllPermissions = useCallback(
    (perms: string[]): boolean => {
      return rbacApi.hasAllPermissions(permissions, perms);
    },
    [permissions]
  );

  // Role check functions
  const hasRole = useCallback(
    (roleSlug: string): boolean => {
      return roles.some(r => r.roleSlug === roleSlug);
    },
    [roles]
  );

  const hasAnyRole = useCallback(
    (roleSlugs: string[]): boolean => {
      return roles.some(r => roleSlugs.includes(r.roleSlug));
    },
    [roles]
  );

  // Quick checks
  const isAdmin = hasPermission('*');
  const isPlatformAdmin = hasRole('platform_admin');
  const isClientAdmin = hasRole('client_admin');
  const isCompanyAdmin = hasRole('company_admin');

  // Async permission check (always fresh from server)
  const checkPermissionAsync = useCallback(
    async (permission: string): Promise<boolean> => {
      if (!currentScope) return false;
      try {
        const result = await rbacApi.checkMyPermission(
          permission,
          currentScope.scopeType,
          currentScope.scopeId
        );
        return result.hasPermission;
      } catch {
        return false;
      }
    },
    [currentScope]
  );

  return {
    permissions,
    roles,
    isLoading,
    error,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    isAdmin,
    isPlatformAdmin,
    isClientAdmin,
    isCompanyAdmin,
    refresh: fetchPermissions,
    checkPermissionAsync,
  };
}

// ═══════════════════════════════════════════════════════════════
// ROLE MANAGEMENT HOOK
// ═══════════════════════════════════════════════════════════════

interface UseRolesReturn {
  roles: Role[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createRole: (dto: rbacApi.CreateRoleDto) => Promise<Role>;
  updateRole: (id: string, dto: rbacApi.UpdateRoleDto) => Promise<Role>;
  deleteRole: (id: string) => Promise<void>;
}

export function useRoles(scopeType?: rbacApi.ScopeType, scopeId?: string): UseRolesReturn {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await rbacApi.getRoles(scopeType, scopeId);
      setRoles(result);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch roles');
    } finally {
      setIsLoading(false);
    }
  }, [scopeType, scopeId]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const createRole = async (dto: rbacApi.CreateRoleDto): Promise<Role> => {
    const role = await rbacApi.createRole(dto);
    await fetchRoles();
    return role;
  };

  const updateRole = async (id: string, dto: rbacApi.UpdateRoleDto): Promise<Role> => {
    const role = await rbacApi.updateRole(id, dto);
    await fetchRoles();
    return role;
  };

  const deleteRole = async (id: string): Promise<void> => {
    await rbacApi.deleteRole(id);
    await fetchRoles();
  };

  return {
    roles,
    isLoading,
    error,
    refresh: fetchRoles,
    createRole,
    updateRole,
    deleteRole,
  };
}

// ═══════════════════════════════════════════════════════════════
// PERMISSIONS LIST HOOK
// ═══════════════════════════════════════════════════════════════

interface UsePermissionsListReturn {
  permissions: Permission[];
  groupedPermissions: Map<string, Permission[]>;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function usePermissionsList(category?: string): UsePermissionsListReturn {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await rbacApi.getPermissions(category);
      setPermissions(result);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch permissions');
    } finally {
      setIsLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const groupedPermissions = useMemo(() => {
    return rbacApi.groupPermissionsByCategory(permissions);
  }, [permissions]);

  return {
    permissions,
    groupedPermissions,
    isLoading,
    error,
    refresh: fetchPermissions,
  };
}

// ═══════════════════════════════════════════════════════════════
// SESSIONS HOOK
// ═══════════════════════════════════════════════════════════════

interface UseSessionsReturn {
  sessions: UserSession[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  revokeSession: (sessionId: string) => Promise<void>;
  revokeAllSessions: (exceptCurrent?: boolean) => Promise<number>;
}

export function useSessions(): UseSessionsReturn {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await rbacApi.getMySessions();
      setSessions(result);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch sessions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const revokeSession = async (sessionId: string): Promise<void> => {
    await rbacApi.revokeMySession(sessionId);
    await fetchSessions();
  };

  const revokeAllSessions = async (exceptCurrent = true): Promise<number> => {
    const result = await rbacApi.revokeAllMySessions(exceptCurrent);
    await fetchSessions();
    return result.revokedCount;
  };

  return {
    sessions,
    isLoading,
    error,
    refresh: fetchSessions,
    revokeSession,
    revokeAllSessions,
  };
}

// ═══════════════════════════════════════════════════════════════
// USER ROLE ASSIGNMENTS HOOK
// ═══════════════════════════════════════════════════════════════

interface UseUserRolesReturn {
  roles: Role[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  assignRole: (roleId: string, scopeType: rbacApi.ScopeType, scopeId: string) => Promise<void>;
  unassignRole: (roleId: string, scopeType: rbacApi.ScopeType, scopeId: string) => Promise<void>;
}

export function useUserRoles(userId: string): UseUserRolesReturn {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoles = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await rbacApi.getUserRoles(userId);
      setRoles(result);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch user roles');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const assignRole = async (roleId: string, scopeType: rbacApi.ScopeType, scopeId: string): Promise<void> => {
    await rbacApi.assignRole({ userId, roleId, scopeType, scopeId });
    await fetchRoles();
  };

  const unassignRole = async (roleId: string, scopeType: rbacApi.ScopeType, scopeId: string): Promise<void> => {
    await rbacApi.unassignRole(userId, roleId, scopeType, scopeId);
    await fetchRoles();
  };

  return {
    roles,
    isLoading,
    error,
    refresh: fetchRoles,
    assignRole,
    unassignRole,
  };
}
