'use client';

import { useAuth } from '@/contexts/auth-context';
import { useHierarchy } from '@/contexts/hierarchy-context';
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canAccessClient,
  canAccessCompany,
  canAccessOrganization,
} from '@/lib/permissions';
import { Permission } from '@/types/hierarchy';

export function usePermissions() {
  const { user } = useAuth();
  const { accessLevel } = useHierarchy();

  const checkPermission = (permission: Permission): boolean => {
    if (!user) return false;
    return hasPermission(user, permission);
  };

  const checkAnyPermission = (permissions: Permission[]): boolean => {
    if (!user) return false;
    return hasAnyPermission(user, permissions);
  };

  const checkAllPermissions = (permissions: Permission[]): boolean => {
    if (!user) return false;
    return hasAllPermissions(user, permissions);
  };

  const checkClientAccess = (clientId: string): boolean => {
    if (!user) return false;
    return canAccessClient(user, clientId);
  };

  const checkCompanyAccess = (companyId: string, companyClientId?: string): boolean => {
    if (!user) return false;
    return canAccessCompany(user, companyId, companyClientId);
  };

  const isOrgLevel = accessLevel === 'ORGANIZATION';
  const isClientLevel = accessLevel === 'CLIENT';
  const isCompanyLevel = accessLevel === 'COMPANY';

  return {
    // Permission checks
    hasPermission: checkPermission,
    hasAnyPermission: checkAnyPermission,
    hasAllPermissions: checkAllPermissions,

    // Access checks
    canAccessClient: checkClientAccess,
    canAccessCompany: checkCompanyAccess,
    canAccessOrganization: () => user ? canAccessOrganization(user) : false,

    // Quick access level checks
    isOrgLevel,
    isClientLevel,
    isCompanyLevel,

    // Common permission shortcuts
    canManageUsers: checkPermission('manage:users'),
    canManageSettings: checkPermission('manage:settings'),
    canManageClients: checkPermission('manage:clients'),
    canManageApiKeys: checkPermission('manage:api_keys'),
    canViewAdmin: checkPermission('view:admin'),
    canWriteTransactions: checkPermission('write:transactions'),
    canWriteCustomers: checkPermission('write:customers'),
    canWriteRouting: checkPermission('write:routing'),
  };
}
