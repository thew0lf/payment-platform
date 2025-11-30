'use client';

import { ReactNode } from 'react';
import { useRbac } from '@/hooks/use-rbac';

interface PermissionGateProps {
  children: ReactNode;
  /** Single permission or array of permissions */
  permission?: string | string[];
  /** If true, requires ALL permissions (default). If false, requires ANY permission */
  requireAll?: boolean;
  /** Role slug or array of role slugs */
  role?: string | string[];
  /** If true, requires ALL roles. If false, requires ANY role (default) */
  requireAllRoles?: boolean;
  /** Fallback content to show if permission check fails */
  fallback?: ReactNode;
  /** If true, shows nothing instead of fallback */
  hide?: boolean;
}

/**
 * Conditionally render children based on user permissions/roles
 *
 * @example
 * // Single permission
 * <PermissionGate permission="orders:write">
 *   <CreateOrderButton />
 * </PermissionGate>
 *
 * @example
 * // Multiple permissions (ALL required)
 * <PermissionGate permission={['orders:write', 'orders:delete']} requireAll>
 *   <OrderManagement />
 * </PermissionGate>
 *
 * @example
 * // Multiple permissions (ANY required)
 * <PermissionGate permission={['admin:*', 'orders:manage']} requireAll={false}>
 *   <AdminPanel />
 * </PermissionGate>
 *
 * @example
 * // Role-based
 * <PermissionGate role="company_admin">
 *   <AdminSettings />
 * </PermissionGate>
 */
export function PermissionGate({
  children,
  permission,
  requireAll = true,
  role,
  requireAllRoles = false,
  fallback = null,
  hide = false,
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, hasRole, hasAnyRole } = useRbac();

  let hasAccess = true;

  // Check permissions
  if (permission) {
    const perms = Array.isArray(permission) ? permission : [permission];

    if (requireAll) {
      hasAccess = hasAllPermissions(perms);
    } else {
      hasAccess = hasAnyPermission(perms);
    }
  }

  // Check roles (if still has access)
  if (hasAccess && role) {
    const roles = Array.isArray(role) ? role : [role];

    if (requireAllRoles) {
      hasAccess = roles.every(r => hasRole(r));
    } else {
      hasAccess = hasAnyRole(roles);
    }
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  if (hide) {
    return null;
  }

  return <>{fallback}</>;
}

/**
 * Shorthand for admin-only content
 */
export function AdminGate({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGate permission="*" fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

/**
 * Shorthand for any of the listed permissions
 */
export function AnyPermissionGate({
  children,
  permissions,
  fallback = null,
}: {
  children: ReactNode;
  permissions: string[];
  fallback?: ReactNode;
}) {
  return (
    <PermissionGate permission={permissions} requireAll={false} fallback={fallback}>
      {children}
    </PermissionGate>
  );
}
