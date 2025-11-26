export type ScopeType = 'ORGANIZATION' | 'CLIENT' | 'COMPANY' | 'DEPARTMENT' | 'TEAM' | 'USER';
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
  | 'manage:users' | 'manage:billing' | 'manage:settings' | 'manage:api_keys'
  | 'view:all_clients' | 'manage:clients' | 'view:admin';
