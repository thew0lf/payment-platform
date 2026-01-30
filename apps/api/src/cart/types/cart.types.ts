/**
 * Cart System Types
 */

export { CartStatus } from '@prisma/client';

export interface CartItemSnapshot {
  name: string;
  sku: string;
  image?: string;
  originalPrice: number;
  [key: string]: string | number | undefined;
}

export interface CartDiscountCode {
  code: string;
  discountAmount: number;
  type: 'percentage' | 'fixed';
  description?: string;
  [key: string]: string | number | undefined;
}

export interface CartTotals {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  shippingTotal: number;
  grandTotal: number;
  itemCount: number;
}

export interface CartItemData {
  id: string;
  productId: string;
  variantId?: string;
  productSnapshot: CartItemSnapshot;
  quantity: number;
  unitPrice: number;
  originalPrice: number;
  discountAmount: number;
  lineTotal: number;
  customFields?: Record<string, unknown>;
  giftMessage?: string;
  isGift: boolean;
  addedAt: Date;
}

export interface CartFunnelData {
  id: string;
  name: string;
  slug: string;
}

export interface CartData {
  id: string;
  companyId: string;
  siteId?: string;
  customerId?: string;
  sessionToken?: string;
  visitorId?: string;
  status: string;
  currency: string;
  totals: CartTotals;
  discountCodes: CartDiscountCode[];
  items: CartItemData[];
  savedItems: SavedCartItemData[];
  shippingPostalCode?: string;
  shippingCountry?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date;
  expiresAt?: Date;
  funnel?: CartFunnelData;
}

export interface SavedCartItemData {
  id: string;
  productId: string;
  variantId?: string;
  quantity: number;
  priceAtSave: number;
  savedAt: Date;
}

export interface AddToCartInput {
  productId: string;
  variantId?: string;
  quantity: number;
  customFields?: Record<string, unknown>;
  giftMessage?: string;
  isGift?: boolean;
}

export interface UpdateCartItemInput {
  quantity?: number;
  customFields?: Record<string, unknown>;
  giftMessage?: string;
  isGift?: boolean;
}

export interface ApplyDiscountInput {
  code: string;
}

export interface CartQueryParams {
  sessionToken?: string;
  customerId?: string;
  visitorId?: string;
  siteId?: string;
  status?: string;
  includeItems?: boolean;
}

export interface CartRecoveryData {
  cartId: string;
  email: string;
  customerName?: string;
  items: CartItemData[];
  totals: CartTotals;
  abandonedAt: Date;
  recoveryUrl: string;
}

/**
 * Bundle Cart Integration Types
 */

export interface BundleItemSelection {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface AddBundleToCartInput {
  bundleId: string;
  selectedItems?: BundleItemSelection[];
  quantity?: number; // Bundle quantity (default 1)
}

export interface BundleCartItem extends CartItemData {
  bundleId: string;
  bundleProductId: string;
  bundleGroupId: string; // Groups items from the same bundle addition
  isBundleItem: true;
}

export interface BundleAddResult {
  cart: CartData;
  bundleGroupId: string;
  bundlePrice: number;
  itemsAdded: number;
}

/**
 * Bundle Types for Cart Integration
 * These match the Prisma includes used in CartService.addBundleToCart
 */

export interface BundleProductSnapshot {
  id: string;
  name: string;
  sku: string | null;
  price: import('@prisma/client').Prisma.Decimal;
  companyId: string;
}

export interface BundleItemProductSnapshot {
  id: string;
  name: string;
  sku: string | null;
  price: import('@prisma/client').Prisma.Decimal;
  images: import('@prisma/client').Prisma.JsonValue; // JSON array of image URLs
}

export interface BundleItemVariantSnapshot {
  id: string;
  name: string;
  sku: string | null;
  price: import('@prisma/client').Prisma.Decimal;
}

export interface BundleItemWithRelations {
  id: string;
  bundleId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  isRequired: boolean;
  sortOrder: number;
  priceOverride: import('@prisma/client').Prisma.Decimal | null;
  createdAt: Date;
  product: BundleItemProductSnapshot;
  variant: BundleItemVariantSnapshot | null;
}

export interface BundleWithItems {
  id: string;
  companyId: string;
  productId: string;
  type: import('@prisma/client').BundleType;
  minItems: number | null;
  maxItems: number | null;
  pricingStrategy: import('@prisma/client').BundlePricing;
  discountType: import('@prisma/client').AdjustmentType | null;
  discountValue: import('@prisma/client').Prisma.Decimal | null;
  isActive: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  product: BundleProductSnapshot;
  items: BundleItemWithRelations[];
}
