import { PaymentGatewayType } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════
// GATEWAY TYPES
// ═══════════════════════════════════════════════════════════════

export interface GatewayCredentials {
  apiKey?: string;
  secretKey?: string;
  merchantId?: string;
  publicKey?: string;
  privateKey?: string;
  username?: string;
  password?: string;
  environment: 'sandbox' | 'production';
  [key: string]: unknown;
}

export interface PaymentRequest {
  sessionId: string;
  amount: number;
  currency: string;
  customerId?: string;
  customerEmail?: string;
  customerName?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  billingAddress?: BillingAddress;
  shippingAddress?: ShippingAddress;
  returnUrl?: string;
  cancelUrl?: string;
  paymentMethod?: PaymentMethodData;
}

export interface BillingAddress {
  firstName?: string;
  lastName?: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface ShippingAddress extends BillingAddress {}

export interface PaymentMethodData {
  type: 'card' | 'bank_account' | 'paypal' | 'ach';
  // For card payments (tokenized)
  token?: string;
  // For direct card input (avoid storing - PCI compliance)
  card?: {
    number: string;
    expMonth: number;
    expYear: number;
    cvc: string;
    name?: string;
  };
  // For bank account
  bankAccount?: {
    accountNumber: string;
    routingNumber: string;
    accountType: 'checking' | 'savings';
    accountHolderName: string;
  };
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  gatewayTransactionId?: string;
  status: PaymentStatus;
  message?: string;
  errorCode?: string;
  rawResponse?: Record<string, unknown>;
  requiresAction?: boolean;
  actionType?: 'redirect' | '3ds' | 'capture';
  actionUrl?: string;
  clientSecret?: string; // For Stripe Elements confirmation
}

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'requires_action'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded';

export interface RefundRequest {
  transactionId: string;
  gatewayTransactionId: string;
  amount: number;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  gatewayRefundId?: string;
  status: RefundStatus;
  message?: string;
  errorCode?: string;
  rawResponse?: Record<string, unknown>;
}

export type RefundStatus =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed';

// Stripe-specific types for Elements
export interface StripeCreatePaymentIntentRequest {
  amount: number;
  currency: string;
  customerId?: string;
  customerEmail?: string;
  metadata?: Record<string, unknown>;
  statementDescriptor?: string;
  setupFutureUsage?: 'off_session' | 'on_session';
}

export interface StripePaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
  status: string;
}

// PayPal-specific types
export interface PayPalCreateOrderRequest {
  amount: number;
  currency: string;
  description?: string;
  returnUrl: string;
  cancelUrl: string;
  metadata?: Record<string, unknown>;
}

export interface PayPalOrderResult {
  orderId: string;
  approveUrl: string;
  status: string;
}

// NMI/Authorize.net direct post types
export interface DirectPostRequest {
  amount: number;
  currency: string;
  cardNumber: string;
  cardExpMonth: string;
  cardExpYear: string;
  cardCvv: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  billingAddress?: BillingAddress;
  orderId?: string;
  description?: string;
}

export interface DirectPostResult {
  success: boolean;
  transactionId?: string;
  authCode?: string;
  avsResponse?: string;
  cvvResponse?: string;
  message?: string;
  errorCode?: string;
}

// Gateway capabilities
export interface GatewayCapabilities {
  supportsTokenization: boolean;
  supportsRecurring: boolean;
  supportsRefunds: boolean;
  supportsPartialRefunds: boolean;
  supportsVoid: boolean;
  supports3DS: boolean;
  supportsACH: boolean;
  supportedCurrencies: string[];
  supportedCardBrands: string[];
  maxTransactionAmount?: number;
  requiresCardPresent: boolean;
}

// Gateway configuration
export interface GatewayConfig {
  type: PaymentGatewayType;
  credentials: GatewayCredentials;
  capabilities: GatewayCapabilities;
  webhookSecret?: string;
  priority?: number;
}
