/**
 * Integrations Framework Types
 * UI-Configurable Service Credentials
 */

// ═══════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════

export enum IntegrationCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  PAYMENT_GATEWAY = 'PAYMENT_GATEWAY',
  EMAIL_TRANSACTIONAL = 'EMAIL_TRANSACTIONAL',
  EMAIL_MARKETING = 'EMAIL_MARKETING',
  SMS = 'SMS',
  VOICE = 'VOICE',
  PUSH_NOTIFICATION = 'PUSH_NOTIFICATION',
  AI_ML = 'AI_ML',
  STORAGE = 'STORAGE',
  MONITORING = 'MONITORING',
  FEATURE_FLAGS = 'FEATURE_FLAGS',
  WEBHOOK = 'WEBHOOK',
}

export enum IntegrationProvider {
  // Authentication (Org-only)
  AUTH0 = 'AUTH0',
  OKTA = 'OKTA',
  COGNITO = 'COGNITO',

  // Payment Gateways (Client-configurable)
  PAYPAL_PAYFLOW = 'PAYPAL_PAYFLOW',
  NMI = 'NMI',
  AUTHORIZE_NET = 'AUTHORIZE_NET',
  STRIPE = 'STRIPE',

  // Email
  AWS_SES = 'AWS_SES',
  SENDGRID = 'SENDGRID',
  KLAVIYO = 'KLAVIYO',

  // SMS
  AWS_SNS = 'AWS_SNS',
  TWILIO = 'TWILIO',

  // AI
  AWS_BEDROCK = 'AWS_BEDROCK',
  OPENAI = 'OPENAI',

  // Storage
  AWS_S3 = 'AWS_S3',

  // Monitoring
  DATADOG = 'DATADOG',
  SENTRY = 'SENTRY',
  CLOUDWATCH = 'CLOUDWATCH',

  // Feature Flags
  LAUNCHDARKLY = 'LAUNCHDARKLY',
  AWS_APPCONFIG = 'AWS_APPCONFIG',
}

export enum IntegrationStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ERROR = 'ERROR',
}

export enum IntegrationMode {
  OWN = 'OWN',
  PLATFORM = 'PLATFORM',
}

export enum IntegrationEnvironment {
  SANDBOX = 'SANDBOX',
  PRODUCTION = 'PRODUCTION',
}

// ═══════════════════════════════════════════════════════════════
// CREDENTIAL SCHEMAS
// ═══════════════════════════════════════════════════════════════

export interface CredentialSchemaProperty {
  type: 'string' | 'number' | 'boolean';
  title: string;
  description?: string;
  format?: 'password' | 'email' | 'url';
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  default?: string | number | boolean;
}

export interface CredentialSchema {
  type: 'object';
  required: string[];
  properties: Record<string, CredentialSchemaProperty>;
}

// ═══════════════════════════════════════════════════════════════
// PROVIDER CREDENTIALS
// ═══════════════════════════════════════════════════════════════

export interface PayflowCredentials {
  partner: string;
  vendor: string;
  user: string;
  password: string;
}

export interface NMICredentials {
  securityKey: string;
  username?: string;
  password?: string;
}

export interface AuthorizeNetCredentials {
  apiLoginId: string;
  transactionKey: string;
}

export interface StripeCredentials {
  secretKey: string;
  publishableKey?: string;
  webhookSecret?: string;
}

export interface Auth0Credentials {
  domain: string;
  clientId: string;
  clientSecret: string;
  audience: string;
}

export interface AWSSESCredentials {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  fromEmail: string;
}

export interface TwilioCredentials {
  accountSid: string;
  authToken: string;
  fromNumber?: string;
}

export type IntegrationCredentials =
  | PayflowCredentials
  | NMICredentials
  | AuthorizeNetCredentials
  | StripeCredentials
  | Auth0Credentials
  | AWSSESCredentials
  | TwilioCredentials
  | Record<string, unknown>;

// ═══════════════════════════════════════════════════════════════
// INTEGRATION DEFINITION
// ═══════════════════════════════════════════════════════════════

export interface IntegrationDefinition {
  id: string;
  provider: IntegrationProvider;
  category: IntegrationCategory;
  name: string;
  description: string;
  logoUrl?: string;
  documentationUrl?: string;
  isOrgOnly: boolean;
  isClientAllowed: boolean;
  isPlatformOffered: boolean;
  credentialSchema: CredentialSchema;
  settingsSchema?: CredentialSchema;
  requiredCompliance: string[];
  status: 'active' | 'beta' | 'deprecated';
  createdAt: Date;
  updatedAt: Date;
}

// ═══════════════════════════════════════════════════════════════
// PLATFORM INTEGRATION
// ═══════════════════════════════════════════════════════════════

export interface PlatformIntegration {
  id: string;
  organizationId: string;
  provider: IntegrationProvider;
  category: IntegrationCategory;
  name: string;
  description?: string;
  settings?: Record<string, unknown>;
  environment: IntegrationEnvironment;
  isSharedWithClients: boolean;
  clientPricing?: ClientPricing;
  status: IntegrationStatus;
  lastTestedAt?: Date;
  lastTestResult?: 'success' | 'failure';
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}

export interface ClientPricing {
  type: 'per_transaction' | 'monthly' | 'usage_based';
  percentageFee?: number;
  flatFee?: number;
  monthlyMinimum?: number;
  monthlyFee?: number;
  description?: string;
}

// ═══════════════════════════════════════════════════════════════
// CLIENT INTEGRATION
// ═══════════════════════════════════════════════════════════════

export interface ClientIntegration {
  id: string;
  clientId: string;
  provider: IntegrationProvider;
  category: IntegrationCategory;
  name: string;
  description?: string;
  mode: IntegrationMode;
  platformIntegrationId?: string;
  settings?: Record<string, unknown>;
  environment: IntegrationEnvironment;
  usageThisMonth?: ClientIntegrationUsage;
  isDefault: boolean;
  priority: number;
  status: IntegrationStatus;
  isVerified: boolean;
  verifiedAt?: Date;
  verifiedBy?: string;
  lastTestedAt?: Date;
  lastTestResult?: 'success' | 'failure';
  errorMessage?: string;
  merchantAccountId?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}

export interface ClientIntegrationUsage {
  transactionCount: number;
  transactionVolume: number;
  lastUpdated: Date;
}

// ═══════════════════════════════════════════════════════════════
// ENCRYPTED CREDENTIALS
// ═══════════════════════════════════════════════════════════════

export interface EncryptedCredentials {
  encrypted: string;
  iv: string;
  authTag: string;
  keyVersion: number;
  encryptedAt: Date;
}

// ═══════════════════════════════════════════════════════════════
// TEST RESULT
// ═══════════════════════════════════════════════════════════════

export interface IntegrationTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  testedAt: Date;
  details?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════
// DTOs
// ═══════════════════════════════════════════════════════════════

export interface CreatePlatformIntegrationDto {
  provider: IntegrationProvider;
  name: string;
  description?: string;
  credentials: IntegrationCredentials;
  settings?: Record<string, unknown>;
  environment: IntegrationEnvironment;
  isSharedWithClients?: boolean;
  clientPricing?: ClientPricing;
}

export interface UpdatePlatformIntegrationDto {
  name?: string;
  description?: string;
  credentials?: IntegrationCredentials;
  settings?: Record<string, unknown>;
  environment?: IntegrationEnvironment;
  isSharedWithClients?: boolean;
  clientPricing?: ClientPricing;
  status?: IntegrationStatus;
}

export interface CreateClientIntegrationDto {
  provider: IntegrationProvider;
  name: string;
  description?: string;
  mode: IntegrationMode;
  credentials?: IntegrationCredentials;
  platformIntegrationId?: string;
  settings?: Record<string, unknown>;
  environment: IntegrationEnvironment;
  isDefault?: boolean;
}

export interface UpdateClientIntegrationDto {
  name?: string;
  description?: string;
  credentials?: IntegrationCredentials;
  settings?: Record<string, unknown>;
  environment?: IntegrationEnvironment;
  isDefault?: boolean;
  status?: IntegrationStatus;
}

export interface ConfigureClientSharingDto {
  isSharedWithClients: boolean;
  clientPricing?: ClientPricing;
}
