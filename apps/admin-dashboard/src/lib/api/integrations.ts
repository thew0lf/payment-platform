import { api } from '../api';

export enum IntegrationProvider {
  PAYPAL_PAYFLOW = 'PAYPAL_PAYFLOW',
  NMI = 'NMI',
  AUTHORIZE_NET = 'AUTHORIZE_NET',
  STRIPE = 'STRIPE',
  AUTH0 = 'AUTH0',
  OKTA = 'OKTA',
  TWILIO = 'TWILIO',
  SENDGRID = 'SENDGRID',
  // OAuth Providers
  GOOGLE = 'GOOGLE',
  MICROSOFT = 'MICROSOFT',
  SLACK = 'SLACK',
  HUBSPOT = 'HUBSPOT',
  SALESFORCE = 'SALESFORCE',
  QUICKBOOKS = 'QUICKBOOKS',
}

export enum IntegrationCategory {
  PAYMENT_GATEWAY = 'PAYMENT_GATEWAY',
  AUTHENTICATION = 'AUTHENTICATION',
  COMMUNICATION = 'COMMUNICATION',
  ANALYTICS = 'ANALYTICS',
  OAUTH = 'OAUTH',
  EMAIL_TRANSACTIONAL = 'EMAIL_TRANSACTIONAL',
  SMS = 'SMS',
}

export enum IntegrationStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  ERROR = 'ERROR',
  DISABLED = 'DISABLED',
}

export enum IntegrationMode {
  OWN = 'OWN',
  PLATFORM = 'PLATFORM',
}

export enum AuthType {
  API_KEY = 'API_KEY',
  OAUTH2 = 'OAUTH2',
  OAUTH2_CLIENT = 'OAUTH2_CLIENT',
  BASIC_AUTH = 'BASIC_AUTH',
  CUSTOM = 'CUSTOM',
}

export interface CredentialSchemaProperty {
  type: 'string' | 'number' | 'boolean';
  title: string;
  description?: string;
  format?: 'password' | 'email' | 'url';
  pattern?: string;
  default?: string | number | boolean;
}

export interface CredentialSchema {
  type: 'object';
  required: string[];
  properties: Record<string, CredentialSchemaProperty>;
}

export interface IntegrationDefinition {
  id: string;
  provider: IntegrationProvider;
  name: string;
  description: string;
  category: IntegrationCategory;
  logoUrl?: string;
  documentationUrl?: string;
  isOrgOnly: boolean;
  isClientAllowed: boolean;
  isPlatformOffered: boolean;
  authType?: AuthType;
  credentialSchema: CredentialSchema;
  requiredCompliance: string[];
  status: 'active' | 'beta' | 'deprecated';
}

export interface PlatformIntegration {
  id: string;
  organizationId: string;
  provider: IntegrationProvider;
  category: IntegrationCategory;
  name: string;
  description?: string;
  environment: string;
  isSharedWithClients: boolean;
  clientPricing?: { type: string; amount: number; percentage?: number };
  status: IntegrationStatus;
  lastTestedAt?: Date;
  lastTestResult?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt?: Date;
  createdBy: string;
  updatedBy?: string;
}

export interface ClientIntegration {
  id: string;
  clientId: string;
  provider: IntegrationProvider;
  category: IntegrationCategory;
  name: string;
  description?: string;
  mode: IntegrationMode;
  platformIntegrationId?: string;
  environment: string;
  usageThisMonth?: { transactionCount: number; transactionVolume: number };
  isDefault: boolean;
  priority: number;
  status: IntegrationStatus;
  isVerified: boolean;
  verifiedAt?: Date;
  verifiedBy?: string;
  lastTestedAt?: Date;
  lastTestResult?: string;
  errorMessage?: string;
  merchantAccountId?: string;
  createdAt: Date;
  updatedAt?: Date;
  createdBy: string;
  updatedBy?: string;
}

export interface IntegrationTestResult {
  success: boolean;
  message: string;
  latencyMs: number;
  testedAt: Date;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://api.dev.avnz.io:3001';

let authToken: string | null = null;

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T; status: number }> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (typeof window !== 'undefined') {
    authToken = localStorage.getItem('avnz_token');
  }

  if (authToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return { data, status: response.status };
}

export const integrationsApi = {
  // Platform integrations (ORG_ADMIN) - routes at /api/integrations/platform
  listPlatformIntegrations: () =>
    request<PlatformIntegration[]>('/api/integrations/platform'),

  getPlatformIntegration: (id: string) =>
    request<PlatformIntegration>(`/api/integrations/platform/${id}`),

  createPlatformIntegration: (data: {
    provider: IntegrationProvider;
    name: string;
    description?: string;
    credentials: Record<string, string>;
    settings?: Record<string, unknown>;
    environment: string;
    isSharedWithClients?: boolean;
    clientPricing?: { type: string; amount: number; percentage?: number };
  }) =>
    request<PlatformIntegration>('/api/integrations/platform', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updatePlatformIntegration: (
    id: string,
    data: Partial<{
      name: string;
      description: string;
      credentials: Record<string, string>;
      settings: Record<string, unknown>;
      environment: string;
      status: IntegrationStatus;
      isSharedWithClients: boolean;
      clientPricing: { type: string; amount: number; percentage?: number };
    }>
  ) =>
    request<PlatformIntegration>(`/api/integrations/platform/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deletePlatformIntegration: (id: string) =>
    request<void>(`/api/integrations/platform/${id}`, { method: 'DELETE' }),

  testPlatformIntegration: (id: string) =>
    request<IntegrationTestResult>(`/api/integrations/platform/${id}/test`, {
      method: 'POST',
    }),

  configureSharing: (
    id: string,
    data: {
      isSharedWithClients: boolean;
      clientPricing?: { type: string; amount: number; percentage?: number };
    }
  ) =>
    request<PlatformIntegration>(`/api/integrations/platform/${id}/sharing`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Definitions (from platform controller)
  listDefinitions: () =>
    request<IntegrationDefinition[]>('/api/integrations/platform/definitions'),

  // Client integrations - routes at /api/integrations/client
  listClientIntegrations: (_clientId: string) =>
    request<ClientIntegration[]>('/api/integrations/client'),

  getClientIntegration: (_clientId: string, id: string) =>
    request<ClientIntegration>(`/api/integrations/client/${id}`),

  createClientIntegration: (
    _clientId: string,
    data: {
      provider: IntegrationProvider;
      name: string;
      description?: string;
      mode: IntegrationMode;
      credentials?: Record<string, string>;
      platformIntegrationId?: string;
      settings?: Record<string, unknown>;
      environment: string;
      isDefault?: boolean;
    }
  ) =>
    request<ClientIntegration>('/api/integrations/client', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateClientIntegration: (
    _clientId: string,
    id: string,
    data: Partial<{
      name: string;
      description: string;
      credentials: Record<string, string>;
      settings: Record<string, unknown>;
      environment: string;
      status: IntegrationStatus;
      isDefault: boolean;
    }>
  ) =>
    request<ClientIntegration>(`/api/integrations/client/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteClientIntegration: (_clientId: string, id: string) =>
    request<void>(`/api/integrations/client/${id}`, { method: 'DELETE' }),

  testClientIntegration: (_clientId: string, id: string) =>
    request<IntegrationTestResult>(`/api/integrations/client/${id}/test`, {
      method: 'POST',
    }),

  setDefaultIntegration: (_clientId: string, id: string) =>
    request<ClientIntegration>(`/api/integrations/client/${id}/default`, {
      method: 'PATCH',
    }),

  getAvailableForClient: (_clientId: string) =>
    request<{
      definitions: IntegrationDefinition[];
      platformOptions: PlatformIntegration[];
    }>('/api/integrations/client/available'),
};
