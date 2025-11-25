# Implementation Part 1: Configuration & Utilities

## File: apps/admin-dashboard/tailwind.config.js

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
        // Brand colors
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
        'slide-up': 'slideUp 0.3s ease-out',
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
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
```

---

## File: apps/admin-dashboard/src/lib/utils.ts

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
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

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}
```

---

## File: apps/admin-dashboard/src/types/hierarchy.ts

```typescript
// Access levels in the hierarchy
export type ScopeType = 'ORGANIZATION' | 'CLIENT' | 'COMPANY' | 'DEPARTMENT' | 'TEAM';

// User roles
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
  _count?: {
    clients: number;
    users: number;
  };
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
  _count?: {
    companies: number;
    users: number;
  };
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
  _count?: {
    departments: number;
    users: number;
    transactions: number;
    customers: number;
  };
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
  _count?: {
    teams: number;
    users: number;
  };
}

export interface Team {
  id: string;
  departmentId: string;
  name: string;
  slug: string;
  description?: string;
  teamLeadId?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
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
  // Resolved scope entities
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
  // Runtime status (from health checks)
  status?: 'healthy' | 'degraded' | 'down';
  volume?: number;
}

// Hierarchy context for current user session
export interface HierarchyScope {
  // The user's access level
  accessLevel: ScopeType;
  
  // What the user can see (based on their level)
  canSeeOrganizations: boolean;
  canSeeClients: boolean;
  
  // Available entities for selection
  availableClients: Client[];
  availableCompanies: Company[];
  availableDepartments: Department[];
  
  // Currently selected (for filtering)
  selectedClientId: string | null;
  selectedCompanyId: string | null;
  selectedDepartmentId: string | null;
}

// Permission definitions
export type Permission =
  | 'read:transactions'
  | 'write:transactions'
  | 'read:customers'
  | 'write:customers'
  | 'read:payments'
  | 'write:payments'
  | 'read:routing'
  | 'write:routing'
  | 'read:analytics'
  | 'write:analytics'
  | 'manage:users'
  | 'manage:billing'
  | 'manage:settings'
  | 'view:all_clients'
  | 'manage:clients'
  | 'view:admin';
```

---

## File: apps/admin-dashboard/src/types/transactions.ts

```typescript
export type TransactionStatus = 
  | 'PENDING'
  | 'PROCESSING' 
  | 'COMPLETED' 
  | 'FAILED' 
  | 'REFUNDED' 
  | 'VOIDED'
  | 'DISPUTED';

export type TransactionType = 
  | 'CHARGE'
  | 'REFUND'
  | 'VOID'
  | 'CHARGEBACK'
  | 'ADJUSTMENT'
  | 'AUTHORIZATION'
  | 'CAPTURE';

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
  // Relations
  company?: {
    id: string;
    name: string;
    slug: string;
  };
  customer?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  paymentProvider?: {
    id: string;
    name: string;
    type: string;
  };
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
  revenueChange: number;      // % change vs previous period
  transactionChange: number;  // % change vs previous period
}
```

---

## File: apps/admin-dashboard/src/types/api.ts

```typescript
export interface ApiResponse<T> {
  data: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
  details?: Record<string, unknown>;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DashboardMetrics {
  revenue: {
    total: number;
    change: number;
    period: string;
  };
  transactions: {
    total: number;
    change: number;
    successful: number;
    failed: number;
  };
  subscriptions: {
    active: number;
    change: number;
    churnRate: number;
  };
  customers: {
    total: number;
    change: number;
    active: number;
  };
}

export interface ProviderMetrics {
  providerId: string;
  providerName: string;
  providerType: string;
  status: 'healthy' | 'degraded' | 'down';
  volume: number;
  transactionCount: number;
  successRate: number;
  averageFee: number;
}

export interface RoutingSavings {
  totalSaved: number;
  period: string;
  rules: Array<{
    name: string;
    description: string;
    saved: number;
    transactionCount: number;
  }>;
}
```

---

## File: apps/admin-dashboard/src/lib/permissions.ts

```typescript
import { User, ScopeType, Permission, UserRole } from '@/types/hierarchy';

// Role-based permissions mapping
const rolePermissions: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    'read:transactions', 'write:transactions',
    'read:customers', 'write:customers',
    'read:payments', 'write:payments',
    'read:routing', 'write:routing',
    'read:analytics', 'write:analytics',
    'manage:users', 'manage:billing', 'manage:settings',
    'view:all_clients', 'manage:clients', 'view:admin',
  ],
  ADMIN: [
    'read:transactions', 'write:transactions',
    'read:customers', 'write:customers',
    'read:payments', 'write:payments',
    'read:routing', 'write:routing',
    'read:analytics',
    'manage:users', 'manage:settings',
  ],
  MANAGER: [
    'read:transactions', 'write:transactions',
    'read:customers', 'write:customers',
    'read:payments',
    'read:routing',
    'read:analytics',
  ],
  USER: [
    'read:transactions',
    'read:customers',
    'read:payments',
  ],
  VIEWER: [
    'read:transactions',
    'read:customers',
  ],
};

// Check if user has specific permission
export function hasPermission(user: User, permission: Permission): boolean {
  const permissions = rolePermissions[user.role] || [];
  return permissions.includes(permission);
}

// Check if user has any of the given permissions
export function hasAnyPermission(user: User, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(user, p));
}

// Check if user has all of the given permissions
export function hasAllPermissions(user: User, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(user, p));
}

// Check if user can access organization level features
export function canAccessOrganization(user: User): boolean {
  return user.scopeType === 'ORGANIZATION';
}

// Check if user can access a specific client
export function canAccessClient(user: User, clientId: string): boolean {
  if (user.scopeType === 'ORGANIZATION') return true;
  if (user.scopeType === 'CLIENT') return user.clientId === clientId;
  return false;
}

// Check if user can access a specific company
export function canAccessCompany(user: User, companyId: string, companyClientId?: string): boolean {
  if (user.scopeType === 'ORGANIZATION') return true;
  if (user.scopeType === 'CLIENT' && companyClientId) {
    return user.clientId === companyClientId;
  }
  if (user.scopeType === 'COMPANY') return user.companyId === companyId;
  // Department and Team users can access their parent company
  if (user.companyId) return user.companyId === companyId;
  return false;
}

// Get navigation items based on user's access level
export interface NavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  badge?: string | number;
  children?: NavItem[];
}

export function getNavigationItems(user: User): NavItem[] {
  const items: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', href: '/' },
    { id: 'transactions', label: 'Transactions', icon: 'Receipt', href: '/transactions' },
  ];

  // Client level and above
  if (['ORGANIZATION', 'CLIENT', 'COMPANY'].includes(user.scopeType)) {
    items.push(
      { id: 'customers', label: 'Customers', icon: 'Users', href: '/customers' },
      { id: 'payments', label: 'Payment Methods', icon: 'CreditCard', href: '/payments' },
    );
  }

  // Company managers and above
  if (['ORGANIZATION', 'CLIENT', 'COMPANY'].includes(user.scopeType) && 
      ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) {
    items.push(
      { id: 'routing', label: 'Routing Rules', icon: 'GitBranch', href: '/routing' },
      { id: 'payouts', label: 'Payouts', icon: 'Wallet', href: '/payouts' },
    );
  }

  // Settings section
  const settingsItems: NavItem[] = [];
  
  if (hasPermission(user, 'manage:users')) {
    settingsItems.push({ id: 'team', label: 'Team', icon: 'Building2', href: '/settings/team' });
  }
  
  if (hasPermission(user, 'manage:settings')) {
    settingsItems.push({ id: 'settings', label: 'Settings', icon: 'Settings', href: '/settings' });
  }

  if (settingsItems.length > 0) {
    items.push(...settingsItems);
  }

  // Organization-only items
  if (user.scopeType === 'ORGANIZATION') {
    items.push(
      { id: 'divider', label: '', icon: '', href: '' }, // Visual divider
      { id: 'clients', label: 'All Clients', icon: 'Building', href: '/admin/clients' },
      { id: 'analytics', label: 'Platform Analytics', icon: 'BarChart3', href: '/admin/analytics' },
      { id: 'system', label: 'System', icon: 'Server', href: '/admin/system' },
    );
  }

  return items;
}

// Role display names
export const roleDisplayNames: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  USER: 'User',
  VIEWER: 'Viewer',
};

// Scope display names
export const scopeDisplayNames: Record<ScopeType, string> = {
  ORGANIZATION: 'Organization',
  CLIENT: 'Agency',
  COMPANY: 'Company',
  DEPARTMENT: 'Department',
  TEAM: 'Team',
};
```

---

## File: apps/admin-dashboard/src/lib/api.ts

```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';
import { ApiResponse, ApiError } from '@/types/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_URL}/api`,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    // Request interceptor for auth
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiError>) => {
        if (error.response?.status === 401) {
          // Redirect to login
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  clearToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  // Generic methods
  async get<T>(url: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
    const response = await this.client.get(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
    const response = await this.client.post(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
    const response = await this.client.put(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<ApiResponse<T>> {
    const response = await this.client.delete(url);
    return response.data;
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.post<{ user: any; token: string }>('/auth/login', { email, password });
  }

  async logout() {
    return this.post('/auth/logout');
  }

  async getCurrentUser() {
    return this.get<{ user: any }>('/auth/me');
  }

  // Hierarchy endpoints
  async getAccessibleHierarchy() {
    return this.get<{
      clients: any[];
      companies: any[];
      departments: any[];
    }>('/hierarchy/accessible');
  }

  // Dashboard endpoints
  async getDashboardMetrics(params?: { companyId?: string; clientId?: string }) {
    return this.get<any>('/dashboard/metrics', params);
  }

  async getProviderMetrics(params?: { companyId?: string }) {
    return this.get<any>('/dashboard/providers', params);
  }

  async getRoutingSavings(params?: { companyId?: string }) {
    return this.get<any>('/dashboard/routing-savings', params);
  }

  // Transaction endpoints
  async getTransactions(params?: Record<string, unknown>) {
    return this.get<any>('/transactions', params);
  }

  async getTransaction(id: string) {
    return this.get<any>(`/transactions/${id}`);
  }

  // Customer endpoints
  async getCustomers(params?: Record<string, unknown>) {
    return this.get<any>('/customers', params);
  }

  async getCustomer(id: string) {
    return this.get<any>(`/customers/${id}`);
  }

  // Company endpoints
  async getCompanies(params?: { clientId?: string }) {
    return this.get<any>('/companies', params);
  }

  async getCompany(id: string) {
    return this.get<any>(`/companies/${id}`);
  }

  // Client endpoints (org only)
  async getClients() {
    return this.get<any>('/clients');
  }

  async getClient(id: string) {
    return this.get<any>(`/clients/${id}`);
  }
}

export const api = new ApiClient();
export default api;
```

---

## File: apps/admin-dashboard/src/app/globals.css

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
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}

/* Custom scrollbar */
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

/* Focus styles */
*:focus-visible {
  @apply outline-none ring-2 ring-cyan-500 ring-offset-2 ring-offset-zinc-950;
}

/* Selection */
::selection {
  @apply bg-cyan-500/30 text-cyan-50;
}
```

---

Continue to IMPLEMENTATION_02_UI.md for base UI components...
