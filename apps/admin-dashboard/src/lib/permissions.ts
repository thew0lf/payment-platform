import { User, ScopeType, Permission, UserRole } from '@/types/hierarchy';

const rolePermissions: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    'read:transactions', 'write:transactions', 'read:customers', 'write:customers',
    'read:payments', 'write:payments', 'read:routing', 'write:routing',
    'read:analytics', 'write:analytics', 'manage:users', 'manage:billing',
    'manage:settings', 'view:all_clients', 'manage:clients', 'view:admin',
  ],
  ADMIN: [
    'read:transactions', 'write:transactions', 'read:customers', 'write:customers',
    'read:payments', 'write:payments', 'read:routing', 'write:routing',
    'read:analytics', 'manage:users', 'manage:settings',
  ],
  MANAGER: [
    'read:transactions', 'write:transactions', 'read:customers', 'write:customers',
    'read:payments', 'read:routing', 'read:analytics',
  ],
  USER: ['read:transactions', 'read:customers', 'read:payments'],
  VIEWER: ['read:transactions', 'read:customers'],
};

export function hasPermission(user: User, permission: Permission): boolean {
  return (rolePermissions[user.role] || []).includes(permission);
}

export function hasAnyPermission(user: User, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(user, p));
}

export function hasAllPermissions(user: User, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(user, p));
}

export function canAccessOrganization(user: User): boolean {
  return user.scopeType === 'ORGANIZATION';
}

export function canAccessClient(user: User, clientId: string): boolean {
  if (user.scopeType === 'ORGANIZATION') return true;
  if (user.scopeType === 'CLIENT') return user.clientId === clientId;
  return false;
}

export function canAccessCompany(user: User, companyId: string, companyClientId?: string): boolean {
  if (user.scopeType === 'ORGANIZATION') return true;
  if (user.scopeType === 'CLIENT' && companyClientId) return user.clientId === companyClientId;
  if (user.scopeType === 'COMPANY') return user.companyId === companyId;
  if (user.companyId) return user.companyId === companyId;
  return false;
}

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  badge?: string | number;
}

export function getNavigationItems(user: User): NavItem[] {
  const items: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', href: '/' },
    { id: 'transactions', label: 'Transactions', icon: 'Receipt', href: '/transactions' },
  ];

  if (['ORGANIZATION', 'CLIENT', 'COMPANY'].includes(user.scopeType)) {
    items.push(
      { id: 'customers', label: 'Customers', icon: 'Users', href: '/customers' },
      { id: 'payments', label: 'Payment Methods', icon: 'CreditCard', href: '/payments' },
    );
  }

  if (['ORGANIZATION', 'CLIENT', 'COMPANY'].includes(user.scopeType) &&
      ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) {
    items.push(
      { id: 'routing', label: 'Routing Rules', icon: 'GitBranch', href: '/routing' },
      { id: 'payouts', label: 'Payouts', icon: 'Wallet', href: '/payouts' },
    );
  }

  if (hasPermission(user, 'manage:users')) {
    items.push({ id: 'team', label: 'Team', icon: 'Building2', href: '/settings/team' });
  }
  if (hasPermission(user, 'manage:settings')) {
    // Client users get integrations link to /settings/integrations
    if (user.scopeType === 'CLIENT') {
      items.push({ id: 'integrations', label: 'Integrations', icon: 'Plug', href: '/settings/integrations' });
    }
    items.push({ id: 'settings', label: 'Settings', icon: 'Settings', href: '/settings' });
  }

  if (user.scopeType === 'ORGANIZATION') {
    items.push(
      { id: 'divider', label: '', icon: '', href: '' },
      { id: 'clients', label: 'All Clients', icon: 'Building', href: '/admin/clients' },
      { id: 'platform-integrations', label: 'Platform Integrations', icon: 'Plug', href: '/integrations' },
      { id: 'analytics', label: 'Platform Analytics', icon: 'BarChart3', href: '/admin/analytics' },
      { id: 'system', label: 'System', icon: 'Server', href: '/admin/system' },
    );
  }

  return items;
}

export const roleDisplayNames: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  USER: 'User',
  VIEWER: 'Viewer',
};

export const scopeDisplayNames: Record<ScopeType, string> = {
  ORGANIZATION: 'Organization',
  CLIENT: 'Agency',
  COMPANY: 'Company',
  DEPARTMENT: 'Department',
  TEAM: 'Team',
  USER: 'User',
};
