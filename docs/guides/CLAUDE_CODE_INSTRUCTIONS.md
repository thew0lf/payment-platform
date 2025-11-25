# avnz.io Payment Platform - Claude Code Implementation

## MASTER INSTRUCTION FILE FOR CLAUDE CODE

Copy and paste these commands and files directly into Claude Code to implement the modern dashboard with role-based access control.

---

## Step 1: Install Dependencies

```bash
cd apps/admin-dashboard
npm install @radix-ui/react-dropdown-menu @radix-ui/react-dialog @radix-ui/react-select @radix-ui/react-tooltip @radix-ui/react-avatar @radix-ui/react-tabs lucide-react clsx tailwind-merge class-variance-authority @tanstack/react-query axios date-fns recharts cmdk zustand
npm install -D @types/bcrypt
```

---

## Step 2: Update Tailwind Config

Replace `apps/admin-dashboard/tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          950: '#083344',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in': 'slideIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}
```

---

## Step 3: Update Global CSS

Replace `apps/admin-dashboard/src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: 9 9 11;
  --foreground: 250 250 250;
}

@layer base {
  * {
    @apply border-zinc-800;
  }
  body {
    @apply bg-zinc-950 text-zinc-50;
  }
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: rgb(24 24 27);
}
::-webkit-scrollbar-thumb {
  background: rgb(63 63 70);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgb(82 82 91);
}

*:focus-visible {
  @apply outline-none ring-2 ring-cyan-500 ring-offset-2 ring-offset-zinc-950;
}

::selection {
  @apply bg-cyan-500/30 text-cyan-50;
}
```

---

## Step 4: Create Directory Structure

```bash
cd apps/admin-dashboard/src
mkdir -p lib types contexts hooks components/ui components/layout components/dashboard components/hierarchy
mkdir -p app/\(auth\)/login app/\(dashboard\)/transactions app/\(dashboard\)/customers app/\(dashboard\)/payments app/\(dashboard\)/routing app/\(dashboard\)/payouts app/\(dashboard\)/settings/team app/\(dashboard\)/admin/clients app/\(dashboard\)/admin/analytics app/\(dashboard\)/admin/system
```

---

## Step 5: Create Files

### Create each file below in the specified path:

---

### File: `apps/admin-dashboard/src/lib/utils.ts`

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d);
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hr ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(d);
}
```

---

### File: `apps/admin-dashboard/src/types/hierarchy.ts`

```typescript
export type ScopeType = 'ORGANIZATION' | 'CLIENT' | 'COMPANY' | 'DEPARTMENT' | 'TEAM';
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  logo?: string;
  billingPlan: string;
  billingStatus: string;
  createdAt: string;
  updatedAt: string;
  _count?: { clients: number; users: number };
}

export interface Client {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  contactName?: string;
  contactEmail?: string;
  plan: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  companies?: Company[];
  _count?: { companies: number; users: number };
}

export interface Company {
  id: string;
  clientId: string;
  name: string;
  slug: string;
  domain?: string;
  logo?: string;
  timezone: string;
  currency: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  client?: Client;
  departments?: Department[];
  paymentProviders?: PaymentProvider[];
  _count?: { departments: number; users: number; transactions: number; customers: number };
}

export interface Department {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  company?: Company;
  _count?: { teams: number; users: number };
}

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  phone?: string;
  scopeType: ScopeType;
  scopeId: string;
  role: UserRole;
  status: string;
  organizationId?: string;
  clientId?: string;
  companyId?: string;
  departmentId?: string;
  createdAt: string;
  updatedAt: string;
  organization?: Organization;
  client?: Client;
  company?: Company;
  department?: Department;
}

export interface PaymentProvider {
  id: string;
  companyId: string;
  name: string;
  type: 'PAYFLOW' | 'NMI' | 'AUTHORIZE_NET' | 'STRIPE' | 'BRAINTREE' | 'SQUARE';
  isDefault: boolean;
  isActive: boolean;
  priority: number;
  environment: 'sandbox' | 'production';
  createdAt: string;
  updatedAt: string;
  status?: 'healthy' | 'degraded' | 'down';
  volume?: number;
}

export type Permission =
  | 'read:transactions' | 'write:transactions'
  | 'read:customers' | 'write:customers'
  | 'read:payments' | 'write:payments'
  | 'read:routing' | 'write:routing'
  | 'read:analytics' | 'write:analytics'
  | 'manage:users' | 'manage:billing' | 'manage:settings'
  | 'view:all_clients' | 'manage:clients' | 'view:admin';
```

---

### File: `apps/admin-dashboard/src/types/transactions.ts`

```typescript
export type TransactionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'VOIDED' | 'DISPUTED';
export type TransactionType = 'CHARGE' | 'REFUND' | 'VOID' | 'CHARGEBACK' | 'ADJUSTMENT' | 'AUTHORIZATION' | 'CAPTURE';

export interface Transaction {
  id: string;
  companyId: string;
  customerId?: string;
  subscriptionId?: string;
  orderId?: string;
  paymentProviderId?: string;
  transactionNumber: string;
  type: TransactionType;
  amount: number;
  currency: string;
  description?: string;
  providerTransactionId?: string;
  status: TransactionStatus;
  failureReason?: string;
  failureCode?: string;
  refundedAmount?: number;
  riskScore?: number;
  riskFlags: string[];
  avsResult?: string;
  cvvResult?: string;
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
  company?: { id: string; name: string; slug: string };
  customer?: { id: string; email: string; firstName?: string; lastName?: string };
  paymentProvider?: { id: string; name: string; type: string };
}

export interface TransactionFilters {
  status?: TransactionStatus[];
  type?: TransactionType[];
  companyId?: string;
  customerId?: string;
  providerId?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
}

export interface TransactionMetrics {
  totalRevenue: number;
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  successRate: number;
  averageValue: number;
  revenueChange: number;
  transactionChange: number;
}
```

---

### File: `apps/admin-dashboard/src/lib/permissions.ts`

```typescript
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
    items.push({ id: 'settings', label: 'Settings', icon: 'Settings', href: '/settings' });
  }

  if (user.scopeType === 'ORGANIZATION') {
    items.push(
      { id: 'divider', label: '', icon: '', href: '' },
      { id: 'clients', label: 'All Clients', icon: 'Building', href: '/admin/clients' },
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
};
```

---

## Step 6: See Additional Implementation Files

The remaining files are documented in:

1. **IMPLEMENTATION_02_UI.md** - Button, Card, Badge, Input, Table, DropdownMenu components
2. **IMPLEMENTATION_03_LAYOUT.md** - Sidebar, Header, CommandPalette components
3. **IMPLEMENTATION_04_CONTEXTS.md** - AuthContext, HierarchyContext, usePermissions hook
4. **IMPLEMENTATION_05_DASHBOARD.md** - MetricCard, ProviderStatus, RoutingSavings, TransactionTable, Main Dashboard page
5. **IMPLEMENTATION_06_PAGES.md** - All page routes (transactions, customers, routing, admin/clients, settings, login)
6. **IMPLEMENTATION_07_API.md** - Backend API updates with hierarchy-aware endpoints

---

## Step 7: Test the Implementation

### Test Accounts (password: demo123)

| Level | Email | Access |
|-------|-------|--------|
| Organization | admin@avnz.io | All clients, all companies, admin routes |
| Client | owner@velocityagency.com | Their companies only, no admin routes |
| Company | manager@coffeeco.com | Their company only |

### Access Control Tests

1. **Org user** → Should see client switcher, can access /admin/*
2. **Client user** → Should NOT see client switcher, sees company selector, cannot access /admin/*
3. **Company user** → Should NOT see any switchers, sees only their data

---

## Quick Start Commands

```bash
# Terminal 1: Start database
cd payment-platform
docker-compose up postgres redis -d

# Terminal 2: Run Prisma migration and seed
cd apps/api
npx prisma migrate dev
npx prisma db seed

# Terminal 3: Start API
cd apps/api
npm run dev

# Terminal 4: Start Dashboard
cd apps/admin-dashboard
npm run dev

# Open browser
open http://localhost:3002
```

---

## File Checklist

After implementation, you should have these files:

```
apps/admin-dashboard/src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx          ✅
│   │   └── layout.tsx              ✅
│   ├── (dashboard)/
│   │   ├── layout.tsx              ✅
│   │   ├── page.tsx                ✅ (Main dashboard)
│   │   ├── transactions/page.tsx   ✅
│   │   ├── customers/page.tsx      ✅
│   │   ├── payments/page.tsx       ✅
│   │   ├── routing/page.tsx        ✅
│   │   ├── payouts/page.tsx        ✅
│   │   ├── settings/
│   │   │   ├── page.tsx            ✅
│   │   │   └── team/page.tsx       ✅
│   │   └── admin/
│   │       ├── clients/page.tsx    ✅
│   │       ├── analytics/page.tsx  ✅
│   │       └── system/page.tsx     ✅
│   ├── globals.css                 ✅
│   └── layout.tsx                  ✅
├── components/
│   ├── ui/
│   │   ├── button.tsx              ✅
│   │   ├── card.tsx                ✅
│   │   ├── badge.tsx               ✅
│   │   ├── input.tsx               ✅
│   │   ├── table.tsx               ✅
│   │   ├── dropdown-menu.tsx       ✅
│   │   └── index.ts                ✅
│   ├── layout/
│   │   ├── sidebar.tsx             ✅
│   │   ├── header.tsx              ✅
│   │   └── command-palette.tsx     ✅
│   └── dashboard/
│       ├── metric-card.tsx         ✅
│       ├── transaction-table.tsx   ✅
│       ├── provider-status.tsx     ✅
│       └── routing-savings.tsx     ✅
├── contexts/
│   ├── auth-context.tsx            ✅
│   └── hierarchy-context.tsx       ✅
├── hooks/
│   ├── use-permissions.ts          ✅
│   └── use-filtered-data.ts        ✅
├── lib/
│   ├── utils.ts                    ✅
│   ├── permissions.ts              ✅
│   └── api.ts                      ✅
├── types/
│   ├── hierarchy.ts                ✅
│   └── transactions.ts             ✅
└── tailwind.config.js              ✅
```

---

## Summary

This implementation provides:

1. **Modern Dark UI** - Zinc/cyan color scheme inspired by Linear/Stripe
2. **5-Level RBAC** - Organization → Client → Company → Department → User
3. **Org-Only Admin Routes** - /admin/* routes hidden from non-org users
4. **Client Scoping** - Clients only see their companies
5. **Company Filtering** - Data filtered based on selected company
6. **Similar Dashboards** - Consistent design across all areas
7. **NCI Value Metrics** - "Time Saved" display for behavioral reinforcement

