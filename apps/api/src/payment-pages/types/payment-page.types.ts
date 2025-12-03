import {
  PaymentPageStatus,
  PaymentPageType,
  CheckoutPageThemeCategory,
  PaymentSessionStatus,
  PaymentGatewayType,
} from '@prisma/client';

// ═══════════════════════════════════════════════════════════════
// THEME TYPES
// ═══════════════════════════════════════════════════════════════

export interface ThemeStyles {
  // Colors
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  textSecondaryColor: string;
  borderColor: string;
  errorColor: string;
  successColor: string;
  warningColor: string;

  // Typography
  fontFamily: string;
  headingFontFamily?: string;
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
  };
  fontWeight: {
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };

  // Spacing
  borderRadius: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };

  // Shadows
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

export interface ThemeLayout {
  type: 'single-column' | 'two-column' | 'split-screen' | 'minimal';
  headerPosition: 'top' | 'left' | 'none';
  summaryPosition: 'right' | 'bottom' | 'floating' | 'none';
  formWidth: 'narrow' | 'medium' | 'wide' | 'full';
  contentAlignment: 'left' | 'center' | 'right';
  showProgressIndicator: boolean;
  progressStyle: 'steps' | 'bar' | 'dots' | 'none';
}

export interface ComponentStyles {
  // Input fields
  input: {
    height: string;
    padding: string;
    borderWidth: string;
    borderStyle: 'solid' | 'dashed' | 'none';
    focusRingWidth: string;
    focusRingColor: string;
  };

  // Buttons
  button: {
    height: string;
    padding: string;
    borderRadius: string;
    fontWeight: number;
    textTransform: 'none' | 'uppercase' | 'capitalize';
  };

  // Cards
  card: {
    padding: string;
    borderRadius: string;
    borderWidth: string;
    shadow: string;
  };

  // Payment method selector
  paymentMethod: {
    style: 'tabs' | 'cards' | 'list' | 'radio';
    iconSize: string;
    showLabels: boolean;
  };
}

// ═══════════════════════════════════════════════════════════════
// PAYMENT PAGE TYPES
// ═══════════════════════════════════════════════════════════════

export interface PaymentConfig {
  // Amounts
  allowCustomAmount: boolean;
  minAmount?: number;
  maxAmount?: number;
  defaultAmount?: number;
  suggestedAmounts?: number[];

  // Currency
  defaultCurrency: string;
  supportedCurrencies: string[];

  // Payment methods
  allowSavedCards: boolean;
  allowGuestCheckout: boolean;
  requireBillingAddress: boolean;
  requireShippingAddress: boolean;

  // Subscription specific
  trialPeriodDays?: number;
  allowPlanSelection?: boolean;
  plans?: PaymentPlan[];
}

export interface PaymentPlan {
  id: string;
  name: string;
  description?: string;
  priceMonthly: number;
  priceYearly?: number;
  features: string[];
  highlighted?: boolean;
  ctaText?: string;
}

export interface AcceptedGateways {
  gateways: GatewayConfig[];
  defaultGateway: PaymentGatewayType;
  fallbackOrder: PaymentGatewayType[];
}

export interface GatewayConfig {
  type: PaymentGatewayType;
  enabled: boolean;
  priority: number;
  displayName?: string;
  icon?: string;
  supportedMethods: PaymentMethod[];
  clientId?: string; // For PayPal
  publishableKey?: string; // For Stripe
}

export type PaymentMethod =
  | 'card'
  | 'bank_transfer'
  | 'paypal'
  | 'apple_pay'
  | 'google_pay'
  | 'klarna'
  | 'afterpay'
  | 'ach'
  | 'sepa';

export interface CustomerFieldsConfig {
  email: FieldConfig;
  phone: FieldConfig;
  firstName: FieldConfig;
  lastName: FieldConfig;
  company: FieldConfig;
  customFields: CustomField[];
}

export interface FieldConfig {
  enabled: boolean;
  required: boolean;
  label?: string;
  placeholder?: string;
}

export interface CustomField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'select' | 'checkbox' | 'textarea';
  name: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // For select
  defaultValue?: string;
}

export interface BrandingConfig {
  logo?: string;
  favicon?: string;
  companyName?: string;
  supportEmail?: string;
  supportPhone?: string;
  websiteUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  customCss?: string;
}

export interface ShippingConfig {
  enabled: boolean;
  methods: ShippingMethod[];
  freeShippingThreshold?: number;
  defaultMethod?: string;
}

export interface ShippingMethod {
  id: string;
  name: string;
  description?: string;
  price: number;
  estimatedDays: string;
  enabled: boolean;
}

export interface TaxConfig {
  enabled: boolean;
  inclusive: boolean;
  autoCalculate: boolean;
  defaultRate?: number;
  rates: TaxRate[];
}

export interface TaxRate {
  id: string;
  name: string;
  rate: number;
  country?: string;
  state?: string;
  postalCodes?: string[];
}

export interface DiscountConfig {
  enabled: boolean;
  showPromoCodeField: boolean;
  automaticDiscounts: AutomaticDiscount[];
}

export interface AutomaticDiscount {
  id: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  minPurchase?: number;
  validFrom?: string;
  validUntil?: string;
}

export interface TermsConfig {
  requireAcceptance: boolean;
  termsUrl?: string;
  privacyUrl?: string;
  refundPolicyUrl?: string;
  customTermsText?: string;
}

export interface WebhookConfig {
  events: WebhookEvent[];
}

export interface WebhookEvent {
  event: string;
  url: string;
  enabled: boolean;
  secret?: string;
}

export interface AiConfig {
  enabled: boolean;
  features: {
    fraudDetection: boolean;
    conversionOptimization: boolean;
    dynamicPricing: boolean;
    abandonmentRecovery: boolean;
  };
  riskThreshold: number;
  autoBlockHighRisk: boolean;
}

export interface AbTestConfig {
  enabled: boolean;
  variants: AbTestVariant[];
  currentWinner?: string;
  startDate?: string;
  endDate?: string;
}

export interface AbTestVariant {
  id: string;
  name: string;
  weight: number;
  themeId?: string;
  layoutOverrides?: Partial<ThemeLayout>;
  styleOverrides?: Partial<ThemeStyles>;
}

export interface SeoConfig {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  noIndex: boolean;
}

export interface SecurityConfig {
  maxAttempts: number;
  lockoutDuration: number;
  requireCaptcha: boolean;
  captchaThreshold: number;
  allowedCountries?: string[];
  blockedCountries?: string[];
  blockedIps?: string[];
}

export interface PciConfig {
  cspEnabled: boolean;
  cspPolicy?: string;
  sriEnabled: boolean;
  scriptMonitoring: boolean;
  allowedScriptDomains: string[];
}

// ═══════════════════════════════════════════════════════════════
// SESSION TYPES
// ═══════════════════════════════════════════════════════════════

export interface SessionLineItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  imageUrl?: string;
  sku?: string;
  metadata?: Record<string, unknown>;
}

export interface SessionCustomerData {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  customFields?: Record<string, unknown>;
}

export interface SessionBillingAddress {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export interface SessionShippingAddress extends SessionBillingAddress {
  name: string;
  phone?: string;
}

export interface SessionDeviceInfo {
  userAgent: string;
  ip: string;
  country?: string;
  city?: string;
  browser?: string;
  os?: string;
  device?: string;
  screenResolution?: string;
}

export interface SessionUtmParams {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

export interface SessionGatewayResponse {
  transactionId?: string;
  status: string;
  message?: string;
  raw?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════
// ANALYTICS TYPES
// ═══════════════════════════════════════════════════════════════

export interface GatewayBreakdown {
  [gateway: string]: {
    sessions: number;
    completed: number;
    revenue: number;
    conversionRate: number;
  };
}

export interface DeviceBreakdown {
  desktop: { sessions: number; conversions: number };
  mobile: { sessions: number; conversions: number };
  tablet: { sessions: number; conversions: number };
}

export interface CountryBreakdown {
  [country: string]: {
    sessions: number;
    completed: number;
    revenue: number;
  };
}

export interface AiInsights {
  conversionPrediction: number;
  riskScore: number;
  recommendedChanges: RecommendedChange[];
  abTestResults?: AbTestResult[];
  fraudAlerts: FraudAlert[];
}

export interface RecommendedChange {
  type: 'layout' | 'color' | 'copy' | 'pricing' | 'gateway';
  priority: 'high' | 'medium' | 'low';
  description: string;
  expectedImpact: string;
  confidence: number;
}

export interface AbTestResult {
  variantId: string;
  variantName: string;
  sessions: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
  statisticalSignificance: number;
}

export interface FraudAlert {
  id: string;
  timestamp: string;
  sessionId: string;
  riskScore: number;
  reasons: string[];
  action: 'blocked' | 'flagged' | 'allowed';
}

// ═══════════════════════════════════════════════════════════════
// RE-EXPORTS
// ═══════════════════════════════════════════════════════════════

export {
  PaymentPageStatus,
  PaymentPageType,
  CheckoutPageThemeCategory,
  PaymentSessionStatus,
  PaymentGatewayType,
};
