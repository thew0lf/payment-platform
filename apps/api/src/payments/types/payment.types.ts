/**
 * Payment Provider Types & Interfaces
 * 
 * Core abstractions for payment gateway integrations.
 * Designed to support PayPal Payflow, NMI, Authorize.Net, and future providers.
 */

// =============================================================================
// ENUMS
// =============================================================================

export enum PaymentProviderType {
  PAYFLOW = 'PAYFLOW',
  PAYPAL_REST = 'PAYPAL_REST',
  PAYPAL_CLASSIC = 'PAYPAL_CLASSIC',  // Legacy NVP API
  NMI = 'NMI',
  AUTHORIZE_NET = 'AUTHORIZE_NET',
  STRIPE = 'STRIPE',
  BRAINTREE = 'BRAINTREE',
  SQUARE = 'SQUARE',
}

export enum TransactionType {
  SALE = 'SALE',
  AUTHORIZATION = 'AUTHORIZATION',
  CAPTURE = 'CAPTURE',
  VOID = 'VOID',
  REFUND = 'REFUND',
  CREDIT = 'CREDIT',
  VERIFY = 'VERIFY',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  APPROVED = 'APPROVED',
  DECLINED = 'DECLINED',
  ERROR = 'ERROR',
  VOIDED = 'VOIDED',
  REFUNDED = 'REFUNDED',
  SETTLED = 'SETTLED',
  HELD_FOR_REVIEW = 'HELD_FOR_REVIEW',
}

export enum CardBrand {
  VISA = 'VISA',
  MASTERCARD = 'MASTERCARD',
  AMEX = 'AMEX',
  DISCOVER = 'DISCOVER',
  DINERS = 'DINERS',
  JCB = 'JCB',
  UNIONPAY = 'UNIONPAY',
  UNKNOWN = 'UNKNOWN',
}

export enum AVSResult {
  MATCH = 'MATCH',
  ADDRESS_MATCH = 'ADDRESS_MATCH',
  ZIP_MATCH = 'ZIP_MATCH',
  NO_MATCH = 'NO_MATCH',
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  NOT_AVAILABLE = 'NOT_AVAILABLE',
  ERROR = 'ERROR',
}

export enum CVVResult {
  MATCH = 'MATCH',
  NO_MATCH = 'NO_MATCH',
  NOT_PROCESSED = 'NOT_PROCESSED',
  NOT_PRESENT = 'NOT_PRESENT',
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  ERROR = 'ERROR',
}

// =============================================================================
// CARD & PAYMENT METHOD TYPES
// =============================================================================

export interface CardData {
  number: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  cardholderName?: string;
}

export interface TokenizedCard {
  token: string;
  last4: string;
  brand: CardBrand;
  expiryMonth: number;
  expiryYear: number;
  fingerprint?: string;
}

export interface BankAccount {
  routingNumber: string;
  accountNumber: string;
  accountType: 'checking' | 'savings';
  accountHolderName: string;
  bankName?: string;
}

export interface BillingAddress {
  firstName: string;
  lastName: string;
  company?: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  email?: string;
}

export interface ShippingAddress extends BillingAddress {
  isResidential?: boolean;
}

// =============================================================================
// TRANSACTION REQUEST/RESPONSE
// =============================================================================

export interface TransactionRequest {
  referenceId: string;
  orderId?: string;
  customerId?: string;
  type: TransactionType;
  amount: number;
  currency: string;
  card?: CardData;
  token?: string;
  bankAccount?: BankAccount;
  originalTransactionId?: string;
  billingAddress?: BillingAddress;
  shippingAddress?: ShippingAddress;
  description?: string;
  metadata?: Record<string, string>;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  isRecurring?: boolean;
  recurringType?: 'initial' | 'subsequent';
  threeDSecure?: {
    enabled: boolean;
    returnUrl?: string;
    cavv?: string;
    eci?: string;
    xid?: string;
  };
}

export interface TransactionResponse {
  success: boolean;
  status: TransactionStatus;
  transactionId: string;
  referenceId: string;
  authorizationCode?: string;
  amount: number;
  currency: string;
  avsResult?: AVSResult;
  cvvResult?: CVVResult;
  token?: TokenizedCard;
  errorCode?: string;
  errorMessage?: string;
  declineCode?: string;
  riskScore?: number;
  riskFlags?: string[];
  rawResponse?: Record<string, unknown>;
  processedAt: Date;
}

// =============================================================================
// PROVIDER CONFIGURATION
// =============================================================================

export interface PayflowCredentials {
  vendor: string;
  user: string;
  password: string;
  partner: string;
  environment: 'sandbox' | 'production';
}

export interface NMICredentials {
  securityKey: string;
  username?: string;
  password?: string;
  environment: 'sandbox' | 'production';
}

export interface AuthorizeNetCredentials {
  loginId: string;
  transactionKey: string;
  environment: 'sandbox' | 'production';
}

export interface PayPalRestCredentials {
  clientId: string;
  clientSecret: string;
  environment: 'sandbox' | 'production';
}

export interface PayPalClassicCredentials {
  apiUsername: string;
  apiPassword: string;
  apiSignature: string;
  environment: 'sandbox' | 'production';
}

export interface StripeCredentials {
  secretKey: string;
  publishableKey?: string;
  webhookSecret?: string;
  environment: 'sandbox' | 'production';  // 'sandbox' = test mode
}

export type ProviderCredentials =
  | PayflowCredentials
  | PayPalRestCredentials
  | PayPalClassicCredentials
  | NMICredentials
  | AuthorizeNetCredentials
  | StripeCredentials;

export interface ProviderConfig {
  id: string;
  companyId: string;
  name: string;
  type: PaymentProviderType;
  credentials: ProviderCredentials;
  isDefault: boolean;
  isActive: boolean;
  priority: number;
  supportsTokenization: boolean;
  supportsRecurring: boolean;
  supports3DSecure: boolean;
  supportsACH: boolean;
  maxTransactionAmount?: number;
  minTransactionAmount?: number;
  dailyLimit?: number;
  monthlyLimit?: number;
  maxRetries: number;
  retryDelayMs: number;
}

// =============================================================================
// PROVIDER HEALTH & METRICS
// =============================================================================

export interface ProviderHealth {
  providerId: string;
  status: 'healthy' | 'degraded' | 'down';
  latencyMs: number;
  lastChecked: Date;
  successRate: number;
  errorRate: number;
  lastError?: {
    code: string;
    message: string;
    timestamp: Date;
  };
}

export interface ProviderMetrics {
  providerId: string;
  period: 'hour' | 'day' | 'week' | 'month';
  transactionCount: number;
  successCount: number;
  failureCount: number;
  totalVolume: number;
  averageLatencyMs: number;
  successRate: number;
}

// =============================================================================
// WEBHOOK & EVENT TYPES
// =============================================================================

export enum PaymentEventType {
  TRANSACTION_CREATED = 'transaction.created',
  TRANSACTION_APPROVED = 'transaction.approved',
  TRANSACTION_DECLINED = 'transaction.declined',
  TRANSACTION_VOIDED = 'transaction.voided',
  TRANSACTION_REFUNDED = 'transaction.refunded',
  TRANSACTION_SETTLED = 'transaction.settled',
  TRANSACTION_DISPUTED = 'transaction.disputed',
  TOKEN_CREATED = 'token.created',
  TOKEN_DELETED = 'token.deleted',
  PROVIDER_HEALTH_CHANGED = 'provider.health_changed',
}

export interface PaymentEvent {
  id: string;
  type: PaymentEventType;
  providerId: string;
  companyId: string;
  transactionId?: string;
  data: Record<string, unknown>;
  timestamp: Date;
}
