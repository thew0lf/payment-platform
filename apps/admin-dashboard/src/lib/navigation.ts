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
  Building,
  Building2,
  LucideIcon,
  Brain,
  AlertTriangle,
  Target,
  Activity,
  Bot,
  MessageSquare,
  Phone,
  Headphones,
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
  requiredScopes?: ScopeType[];
  requiredRoles?: UserRole[];
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
  Building,
  Building2,
  Brain,
  AlertTriangle,
  Target,
  Activity,
  Bot,
  MessageSquare,
  Phone,
  Headphones,
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

  // Momentum Intelligence
  {
    id: 'momentum',
    label: 'Momentum Intelligence',
    icon: Brain,
    defaultExpanded: false,
    items: [
      { id: 'churn-risk', label: 'Churn Risk', href: '/momentum/churn', icon: AlertTriangle },
      { id: 'save-flows', label: 'Save Flows', href: '/momentum/save-flows', icon: Target },
      { id: 'triggers', label: 'Behavioral Triggers', href: '/momentum/triggers', icon: Sparkles },
      { id: 'rmas', label: 'Returns (RMA)', href: '/rmas', icon: RotateCcw },
    ],
  },

  // CS AI - AI-powered Customer Service
  {
    id: 'cs-ai',
    label: 'CS AI',
    icon: Bot,
    defaultExpanded: false,
    items: [
      { id: 'cs-dashboard', label: 'Dashboard', href: '/cs-ai', icon: BarChart3 },
      { id: 'cs-conversations', label: 'Conversations', href: '/cs-ai/conversations', icon: MessageSquare },
      { id: 'cs-voice', label: 'Voice Calls', href: '/cs-ai/voice', icon: Phone },
      { id: 'cs-analytics', label: 'Analytics', href: '/cs-ai/analytics', icon: TrendingUp },
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

  // Organization Management - Organization and Client levels
  {
    id: 'organization',
    label: 'Organization',
    icon: Building,
    defaultExpanded: false,
    requiredScopes: ['ORGANIZATION', 'CLIENT'],
    items: [
      { id: 'clients', label: 'Clients', href: '/clients', icon: Building, requiredScopes: ['ORGANIZATION'] },
      { id: 'companies', label: 'Companies', href: '/companies', icon: Building2 },
      { id: 'sites', label: 'Sites', href: '/sites', icon: Store },
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
      { id: 'vendor-companies', label: 'Companies', href: '/vendors/companies', icon: Building2 },
      { id: 'vendor-products', label: 'Products', href: '/vendors/products', icon: Package },
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
 * Also filters individual items within sections based on their scope requirements
 */
export function getNavigationSections(
  scopeType: ScopeType,
  role: UserRole
): NavSection[] {
  return navigationSections
    .filter((section) => {
      // Check scope requirements at section level
      if (section.requiredScopes && !section.requiredScopes.includes(scopeType)) {
        return false;
      }

      // Check role requirements at section level
      if (section.requiredRoles && !section.requiredRoles.includes(role)) {
        return false;
      }

      return true;
    })
    .map((section) => {
      // Filter items within each section based on their scope/role requirements
      const filteredItems = section.items.filter((item) => {
        // Check scope requirements at item level
        if (item.requiredScopes && !item.requiredScopes.includes(scopeType)) {
          return false;
        }

        // Check role requirements at item level
        if (item.requiredRoles && !item.requiredRoles.includes(role)) {
          return false;
        }

        return true;
      });

      return {
        ...section,
        items: filteredItems,
      };
    })
    // Remove sections that have no visible items after filtering
    .filter((section) => section.items.length > 0);
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
