/**
 * Cart Module Company Settings Types
 *
 * These interfaces define the structure of cart-related settings
 * stored in the Company.settings JSON field.
 *
 * Settings are accessed via CompanyCartSettingsService which provides
 * type-safe access with sensible defaults.
 */

// Express checkout provider enum - defined here to avoid circular dependencies
export enum ExpressCheckoutProvider {
  APPLE_PAY = 'APPLE_PAY',
  GOOGLE_PAY = 'GOOGLE_PAY',
  PAYPAL_EXPRESS = 'PAYPAL_EXPRESS',
  SHOP_PAY = 'SHOP_PAY',
}

// ═══════════════════════════════════════════════════════════════
// EXPRESS CHECKOUT SETTINGS
// ═══════════════════════════════════════════════════════════════

export interface ExpressCheckoutSettings {
  /** Which express checkout providers are enabled */
  enabledProviders: ExpressCheckoutProvider[];
  /** Apple Pay merchant identifier */
  applePayMerchantId?: string;
  /** Google Pay merchant identifier */
  googlePayMerchantId?: string;
  /** PayPal client ID for express checkout */
  paypalClientId?: string;
  /** Whether Shop Pay is enabled */
  shopPayEnabled?: boolean;
  /** Environment for payment processing: 'SANDBOX' | 'PRODUCTION' */
  environment: 'SANDBOX' | 'PRODUCTION';
  /** Session expiry in minutes (default: 30) */
  sessionExpiryMinutes?: number;
}

// ═══════════════════════════════════════════════════════════════
// UPSELL SETTINGS
// ═══════════════════════════════════════════════════════════════

export interface UpsellSettings {
  /** Whether upsell suggestions are enabled */
  enabled: boolean;
  /** Maximum number of suggestions to show */
  maxSuggestions: number;
  /** Minimum confidence score (0-1) to show suggestion */
  minConfidenceScore: number;
  /** Prefer bundle offers over individual products */
  preferBundles: boolean;
  /** Exclude products the customer recently purchased */
  excludeRecentlyPurchased: boolean;
  /** Number of days to look back for recent purchases */
  recentPurchaseDays: number;
}

// ═══════════════════════════════════════════════════════════════
// INVENTORY HOLD SETTINGS
// ═══════════════════════════════════════════════════════════════

export interface InventoryHoldSettings {
  /** Whether inventory holds are enabled */
  enabled: boolean;
  /** Duration in minutes to hold inventory */
  holdDurationMinutes: number;
  /** Allow orders even if inventory is insufficient */
  allowOversell: boolean;
  /** Show low stock warnings to customers */
  showLowStockWarning: boolean;
  /** Threshold for low stock warnings */
  lowStockThreshold: number;
}

// ═══════════════════════════════════════════════════════════════
// CART ABANDONMENT SETTINGS
// ═══════════════════════════════════════════════════════════════

export interface CartAbandonmentSettings {
  /** Minutes of inactivity before cart is considered at-risk */
  atRiskThresholdMinutes: number;
  /** Minutes of inactivity before cart is marked abandoned */
  abandonedThresholdMinutes: number;
  /** Whether to send recovery emails */
  enableRecoveryEmails: boolean;
  /** Hours after abandonment to send first recovery email */
  firstEmailDelayHours: number;
  /** Hours after first email to send second recovery email */
  secondEmailDelayHours: number;
  /** Maximum recovery emails to send per cart */
  maxRecoveryEmails: number;
  /** Discount code to include in recovery emails (optional) */
  recoveryDiscountCode?: string;
}

// ═══════════════════════════════════════════════════════════════
// COMBINED CART SETTINGS
// ═══════════════════════════════════════════════════════════════

export interface CompanyCartSettings {
  /** Express checkout configuration */
  expressCheckout?: Partial<ExpressCheckoutSettings>;
  /** Upsell suggestions configuration */
  upsell?: Partial<UpsellSettings>;
  /** Inventory hold configuration */
  inventoryHold?: Partial<InventoryHoldSettings>;
  /** Cart abandonment configuration */
  abandonment?: Partial<CartAbandonmentSettings>;
}

// ═══════════════════════════════════════════════════════════════
// DEFAULT VALUES
// ═══════════════════════════════════════════════════════════════

export const DEFAULT_EXPRESS_CHECKOUT_SETTINGS: ExpressCheckoutSettings = {
  enabledProviders: [],
  environment: 'SANDBOX',
  sessionExpiryMinutes: 30,
};

export const DEFAULT_UPSELL_SETTINGS: UpsellSettings = {
  enabled: true,
  maxSuggestions: 3,
  minConfidenceScore: 0.3,
  preferBundles: true,
  excludeRecentlyPurchased: true,
  recentPurchaseDays: 30,
};

export const DEFAULT_INVENTORY_HOLD_SETTINGS: InventoryHoldSettings = {
  enabled: true,
  holdDurationMinutes: 15,
  allowOversell: false,
  showLowStockWarning: true,
  lowStockThreshold: 5,
};

export const DEFAULT_ABANDONMENT_SETTINGS: CartAbandonmentSettings = {
  atRiskThresholdMinutes: 30,
  abandonedThresholdMinutes: 60,
  enableRecoveryEmails: true,
  firstEmailDelayHours: 1,
  secondEmailDelayHours: 24,
  maxRecoveryEmails: 2,
};
