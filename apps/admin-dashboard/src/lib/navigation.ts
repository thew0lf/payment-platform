import {
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
  Trash2,
  FolderTree,
  Tags,
  Layers,
  Shield,
  Lock,
  Store,
  Factory,
  Link2,
  RotateCcw,
  ClipboardList,
  Repeat,
  Star,
  Megaphone,
  FileText,
  Wallet,
  Workflow,
  Bug,
  FileCheck2,
  UserPlus,
  Palette,
  TrendingUp,
  Sparkles,
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
  Trash2,
  FolderTree,
  Tags,
  Layers,
  Shield,
  Lock,
  Store,
  Factory,
  Link2,
  RotateCcw,
  ClipboardList,
  Repeat,
  Star,
  Megaphone,
  FileText,
  Wallet,
  Workflow,
  Bug,
  FileCheck2,
  UserPlus,
  Palette,
  TrendingUp,
  Sparkles,
};

// ═══════════════════════════════════════════════════════════════
// NAVIGATION CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export const navigationSections: NavSection[] = [
  // Insights (Dashboard & Analytics)
  {
    id: 'insights',
    label: 'Insights',
    icon: BarChart3,
    defaultExpanded: true,
    items: [
      { id: 'main', label: 'Dashboard', href: '/', icon: LayoutDashboard },
      { id: 'revenue-analytics', label: 'Revenue', href: '/insights/revenue', icon: TrendingUp },
      { id: 'orders-analytics', label: 'Orders', href: '/insights/orders', icon: ShoppingCart },
      { id: 'customers-analytics', label: 'Customers', href: '/insights/customers', icon: Users },
      { id: 'funnels-analytics', label: 'Funnels', href: '/insights/funnels', icon: Workflow },
      { id: 'subscription-analytics', label: 'Subscriptions', href: '/insights/subscriptions', icon: Repeat },
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
      { id: 'subscriptions', label: 'Subscriptions', href: '/subscriptions', icon: Repeat },
      { id: 'transactions', label: 'Transactions', href: '/transactions', icon: Receipt },
      { id: 'customers', label: 'Customers', href: '/customers', icon: Users },
      { id: 'refunds', label: 'Refunds', href: '/refunds', icon: RotateCcw },
      { id: 'rmas', label: 'Returns (RMA)', href: '/rmas', icon: Package },
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
      { id: 'subscription-plans', label: 'Subscription Plans', href: '/subscription-plans', icon: Repeat },
      { id: 'categories', label: 'Categories', href: '/products/categories', icon: FolderTree },
      { id: 'tags', label: 'Tags', href: '/products/tags', icon: Tags },
      { id: 'collections', label: 'Collections', href: '/products/collections', icon: Layers },
      { id: 'reviews', label: 'Reviews', href: '/reviews', icon: Star },
    ],
  },

  // Marketing
  {
    id: 'marketing',
    label: 'Marketing',
    icon: Megaphone,
    defaultExpanded: false,
    items: [
      { id: 'funnels', label: 'Funnels', href: '/funnels', icon: Workflow },
      { id: 'leads', label: 'Leads', href: '/leads', icon: UserPlus },
      { id: 'landing-pages', label: 'Landing Pages', href: '/landing-pages', icon: FileText },
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

  // Vendors - Organization level only
  {
    id: 'vendors',
    label: 'Vendors',
    icon: Factory,
    defaultExpanded: false,
    requiredScopes: ['ORGANIZATION'],
    items: [
      { id: 'all-vendors', label: 'All Vendors', href: '/vendors', icon: Store },
      { id: 'connections', label: 'Connections', href: '/vendors/connections', icon: Link2 },
    ],
  },

  // Feature Development - Organization level only
  {
    id: 'features',
    label: 'Development',
    icon: GitBranch,
    defaultExpanded: false,
    requiredScopes: ['ORGANIZATION'],
    items: [
      { id: 'feature-pipeline', label: 'Feature Pipeline', href: '/features', icon: GitBranch },
      { id: 'code-review-checklist', label: 'Code Review', href: '/features/code-review', icon: FileCheck2 },
      { id: 'qa-checklist', label: 'QA Checklist', href: '/features/checklist', icon: Bug },
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
      { id: 'appearance', label: 'Appearance', href: '/settings/appearance', icon: Palette },
      { id: 'billing', label: 'Billing', href: '/settings/billing', icon: Wallet },
      { id: 'security', label: 'Security', href: '/settings/security', icon: Lock },
      { id: 'roles', label: 'Roles & Permissions', href: '/settings/roles', icon: Shield },
      { id: 'team', label: 'Team', href: '/settings/team', icon: UserCog },
      { id: 'waitlist', label: 'Founders Waitlist', href: '/settings/waitlist', icon: Sparkles },
      { id: 'audit-logs', label: 'Audit Logs', href: '/settings/audit-logs', icon: ClipboardList },
      { id: 'deleted', label: 'Trash', href: '/deleted', icon: Trash2 },
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
