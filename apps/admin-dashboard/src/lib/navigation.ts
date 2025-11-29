import {
  Building,
  Building2,
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Users,
  ShoppingBag,
  PackageCheck,
  GitBranch,
  Landmark,
  CreditCard,
  Plug,
  Key,
  SlidersHorizontal,
  UserCog,
  BarChart3,
  Package,
  Truck,
  Zap,
  Wrench,
  Settings,
  LucideIcon,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type ScopeType = 'ORGANIZATION' | 'CLIENT' | 'COMPANY' | 'DEPARTMENT' | 'TEAM' | 'USER';
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER';

export interface NavBadges {
  orders: number;
  fulfillment: number;
  lowStock: number;
}

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number | string;
  badgeKey?: keyof NavBadges;
  badgeVariant?: 'default' | 'warning' | 'error';
}

export interface NavSection {
  id: string;
  label: string;
  icon: LucideIcon;
  defaultExpanded: boolean;
  items: NavItem[];
  requiredScopes?: ScopeType[];
  requiredRoles?: UserRole[];
}

// ═══════════════════════════════════════════════════════════════
// ICON MAP (for dynamic rendering)
// ═══════════════════════════════════════════════════════════════

export const iconMap: Record<string, LucideIcon> = {
  Building,
  Building2,
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Users,
  ShoppingBag,
  PackageCheck,
  GitBranch,
  Landmark,
  CreditCard,
  Plug,
  Key,
  SlidersHorizontal,
  UserCog,
  BarChart3,
  Package,
  Truck,
  Zap,
  Wrench,
  Settings,
};

// ═══════════════════════════════════════════════════════════════
// NAVIGATION CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export const navigationSections: NavSection[] = [
  // Platform Admin - Org/Client only
  {
    id: 'platform-admin',
    label: 'Platform Admin',
    icon: Building2,
    defaultExpanded: false,
    requiredScopes: ['ORGANIZATION', 'CLIENT'],
    items: [
      { id: 'clients', label: 'Clients', href: '/admin/clients', icon: Building },
    ],
  },

  // Insights (Dashboard)
  {
    id: 'insights',
    label: 'Insights',
    icon: BarChart3,
    defaultExpanded: true,
    items: [
      { id: 'main', label: 'Main', href: '/', icon: LayoutDashboard },
    ],
  },

  // Daily Operations - Most used, expanded by default
  {
    id: 'daily-operations',
    label: 'Daily Operations',
    icon: Receipt,
    defaultExpanded: true,
    items: [
      { id: 'orders', label: 'Orders', href: '/orders', icon: ShoppingCart, badgeKey: 'orders' },
      { id: 'transactions', label: 'Transactions', href: '/transactions', icon: Receipt },
      { id: 'customers', label: 'Customers', href: '/customers', icon: Users },
    ],
  },

  // Catalog
  {
    id: 'catalog',
    label: 'Catalog',
    icon: Package,
    defaultExpanded: false,
    items: [
      { id: 'products', label: 'Products', href: '/products', icon: ShoppingBag, badgeKey: 'lowStock' },
    ],
  },

  // Fulfillment
  {
    id: 'fulfillment',
    label: 'Fulfillment',
    icon: Truck,
    defaultExpanded: false,
    items: [
      { id: 'shipments', label: 'Shipments', href: '/shipments', icon: PackageCheck, badgeKey: 'fulfillment' },
    ],
  },

  // Payment Routing
  {
    id: 'payment-routing',
    label: 'Payment Routing',
    icon: Zap,
    defaultExpanded: false,
    items: [
      { id: 'routing-rules', label: 'Routing Rules', href: '/routing', icon: GitBranch },
      { id: 'account-pools', label: 'Account Pools', href: '/routing/pools', icon: Landmark },
    ],
  },

  // Configuration
  {
    id: 'configuration',
    label: 'Configuration',
    icon: Wrench,
    defaultExpanded: false,
    items: [
      { id: 'merchant-accounts', label: 'Merchant Accounts', href: '/settings/merchant-accounts', icon: CreditCard },
      { id: 'integrations', label: 'Integrations', href: '/integrations', icon: Plug },
      { id: 'api-keys', label: 'API Keys', href: '/settings/api-keys', icon: Key },
    ],
  },

  // Settings
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    defaultExpanded: false,
    items: [
      { id: 'general', label: 'General', href: '/settings/general', icon: SlidersHorizontal },
      { id: 'team', label: 'Team', href: '/settings/team', icon: UserCog },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get navigation sections filtered by user scope and role
 */
export function getNavigationSections(
  scopeType: ScopeType,
  role: UserRole
): NavSection[] {
  return navigationSections.filter((section) => {
    // Check scope requirements
    if (section.requiredScopes && !section.requiredScopes.includes(scopeType)) {
      return false;
    }

    // Check role requirements
    if (section.requiredRoles && !section.requiredRoles.includes(role)) {
      return false;
    }

    return true;
  });
}

/**
 * Find which section contains a given path
 */
export function findSectionByPath(path: string): NavSection | undefined {
  return navigationSections.find((section) =>
    section.items.some((item) => {
      if (item.href === '/') {
        return path === '/';
      }
      return path === item.href || path.startsWith(item.href + '/');
    })
  );
}

/**
 * Check if a path matches a nav item
 */
export function isPathActive(itemHref: string, currentPath: string): boolean {
  if (itemHref === '/') {
    return currentPath === '/';
  }
  return currentPath === itemHref || currentPath.startsWith(itemHref + '/');
}

/**
 * Get default expanded state for all sections
 */
export function getDefaultExpandedState(): Record<string, boolean> {
  return navigationSections.reduce(
    (acc, section) => ({
      ...acc,
      [section.id]: section.defaultExpanded,
    }),
    {} as Record<string, boolean>
  );
}

/**
 * Storage key for persisting sidebar state
 */
export const SIDEBAR_STORAGE_KEY = 'avnz-sidebar-expanded';

/**
 * Get all nav items flattened (for command palette search)
 */
export function getAllNavItems(): Array<NavItem & { section: string }> {
  return navigationSections.flatMap((section) =>
    section.items.map((item) => ({
      ...item,
      section: section.label,
    }))
  );
}
