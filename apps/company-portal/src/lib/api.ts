// API client for company portal
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface FunnelBranding {
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor?: string;
  fontFamily?: string;
}

export interface FunnelSettings {
  branding: FunnelBranding;
  urls: {
    successUrl?: string;
    cancelUrl?: string;
    termsUrl?: string;
    privacyUrl?: string;
  };
  behavior: {
    allowBackNavigation: boolean;
    showProgressBar: boolean;
    autoSaveProgress: boolean;
    sessionTimeout: number;
    abandonmentEmail: boolean;
  };
  seo: {
    title?: string;
    description?: string;
    ogImage?: string;
  };
}

export interface LandingSection {
  id: string;
  type: 'hero' | 'features' | 'testimonials' | 'faq' | 'cta' | 'custom';
  config: Record<string, unknown>;
}

export interface LandingStageConfig {
  layout: 'hero-cta' | 'video-hero' | 'feature-grid' | 'testimonial-focus';
  sections: LandingSection[];
  cta: {
    text: string;
    style: 'solid' | 'gradient' | 'outline';
  };
}

export interface ProductSelectionConfig {
  layout: 'grid' | 'carousel' | 'comparison' | 'single-product';
  source: {
    type: 'manual' | 'category' | 'collection' | 'all';
    productIds?: string[];
    categoryId?: string;
    collectionId?: string;
  };
  display: {
    showPrices: boolean;
    showDescription: boolean;
    showVariants: boolean;
    showQuantity: boolean;
    showFilters: boolean;
    showSearch: boolean;
    itemsPerPage: number;
  };
  selection: {
    mode: 'single' | 'multiple';
    minItems?: number;
    maxItems?: number;
    allowQuantity: boolean;
  };
  cta: {
    text: string;
    position: 'per-item' | 'fixed-bottom' | 'both';
  };
}

export interface CheckoutStageConfig {
  layout: 'single-page' | 'multi-step' | 'two-column' | 'one-column';
  fields: {
    customer: {
      email: { enabled: boolean; required: boolean; label?: string };
      firstName: { enabled: boolean; required: boolean; label?: string };
      lastName: { enabled: boolean; required: boolean; label?: string };
      phone: { enabled: boolean; required: boolean; label?: string };
      company: { enabled: boolean; required: boolean; label?: string };
    };
    shipping: {
      enabled: boolean;
      required: boolean;
    };
    billing: {
      enabled: boolean;
      sameAsShipping: boolean;
    };
    custom: Array<{
      id: string;
      type: string;
      label: string;
      required: boolean;
    }>;
  };
  payment: {
    methods: Array<{
      type: string;
      enabled: boolean;
      label?: string;
    }>;
    showOrderSummary: boolean;
    allowCoupons: boolean;
    allowGiftCards: boolean;
    showTaxEstimate: boolean;
    showShippingEstimate: boolean;
  };
  trust: {
    showSecurityBadges: boolean;
    showGuarantee: boolean;
    showTestimonial: boolean;
    guaranteeText?: string;
  };
}

export type StageConfig = LandingStageConfig | ProductSelectionConfig | CheckoutStageConfig;

export interface FunnelStage {
  id: string;
  name: string;
  type: 'LANDING' | 'PRODUCT_SELECTION' | 'CHECKOUT';
  order: number;
  config: StageConfig;
}

export interface Funnel {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  description?: string;
  type: 'DIRECT_CHECKOUT' | 'PRODUCT_CHECKOUT' | 'LANDING_CHECKOUT' | 'FULL_FUNNEL';
  status: 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'ARCHIVED';
  settings: FunnelSettings;
  stages: FunnelStage[];
  totalVisits: number;
  totalConversions: number;
}

export interface FunnelSession {
  id: string;
  funnelId: string;
  sessionToken: string;
  currentStageOrder: number;
  status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED' | 'EXPIRED';
  selectedProducts: SelectedProduct[];
  customerInfo?: CustomerInfo;
  utmParams?: UTMParams;
}

export interface SelectedProduct {
  productId: string;
  variantId?: string;
  quantity: number;
  price: number;
  name: string;
  imageUrl?: string;
}

export interface CustomerInfo {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
}

export interface UTMParams {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  sku: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
  images: ProductImage[];
  variants: ProductVariant[];
  metadata?: Record<string, unknown>;
}

export interface ProductImage {
  id: string;
  url: string;
  alt?: string;
  position: number;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  attributes: Record<string, string>;
}

// ═══════════════════════════════════════════════════════════════
// FUNNEL API
// ═══════════════════════════════════════════════════════════════

export async function getFunnelBySeoSlug(seoSlug: string): Promise<Funnel> {
  const res = await fetch(`${API_BASE}/api/f/${seoSlug}`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch funnel: ${res.status}`);
  }
  return res.json();
}

export async function startSession(
  funnelId: string,
  data: {
    variantId?: string;
    utmParams?: UTMParams;
    referrer?: string;
    device?: string;
    entryStageOrder?: number;
  }
): Promise<FunnelSession> {
  const res = await fetch(`${API_BASE}/api/f/${funnelId}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`Failed to start session: ${res.status}`);
  }
  return res.json();
}

export async function getSession(sessionToken: string): Promise<FunnelSession> {
  const res = await fetch(`${API_BASE}/api/f/sessions/${sessionToken}`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to get session: ${res.status}`);
  }
  return res.json();
}

export async function updateSession(
  sessionToken: string,
  data: Partial<{
    selectedProducts: SelectedProduct[];
    customerInfo: CustomerInfo;
    currentStageOrder: number;
  }>
): Promise<FunnelSession> {
  const res = await fetch(`${API_BASE}/api/f/sessions/${sessionToken}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`Failed to update session: ${res.status}`);
  }
  return res.json();
}

export async function trackEvent(
  sessionToken: string,
  event: {
    type: string;
    stageOrder?: number;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await fetch(`${API_BASE}/api/f/sessions/${sessionToken}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
}

export async function advanceStage(
  sessionToken: string,
  toStageOrder: number
): Promise<FunnelSession> {
  const res = await fetch(`${API_BASE}/api/f/sessions/${sessionToken}/advance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toStageOrder }),
  });
  if (!res.ok) {
    throw new Error(`Failed to advance stage: ${res.status}`);
  }
  return res.json();
}

export async function completeSession(
  sessionToken: string,
  data: { orderId: string; totalAmount: number; currency: string }
): Promise<FunnelSession> {
  const res = await fetch(`${API_BASE}/api/f/sessions/${sessionToken}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`Failed to complete session: ${res.status}`);
  }
  return res.json();
}

// ═══════════════════════════════════════════════════════════════
// PRODUCTS API
// ═══════════════════════════════════════════════════════════════

export async function getProducts(params: {
  companyId: string;
  productIds?: string[];
  categoryId?: string;
  collectionId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: Product[]; total: number }> {
  const searchParams = new URLSearchParams();
  searchParams.set('companyId', params.companyId);
  if (params.productIds?.length) {
    searchParams.set('ids', params.productIds.join(','));
  }
  if (params.categoryId) {
    searchParams.set('categoryId', params.categoryId);
  }
  if (params.collectionId) {
    searchParams.set('collectionId', params.collectionId);
  }
  if (params.limit) {
    searchParams.set('limit', params.limit.toString());
  }
  if (params.offset) {
    searchParams.set('offset', params.offset.toString());
  }

  const res = await fetch(`${API_BASE}/api/products/public?${searchParams}`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch products: ${res.status}`);
  }
  return res.json();
}

export async function getProduct(productId: string): Promise<Product> {
  const res = await fetch(`${API_BASE}/api/products/public/${productId}`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch product: ${res.status}`);
  }
  return res.json();
}

// ═══════════════════════════════════════════════════════════════
// CHECKOUT API
// ═══════════════════════════════════════════════════════════════

export interface CheckoutSummary {
  sessionToken: string;
  funnelId: string;
  funnelName: string;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  shippingAmount: number;
  shippingDetails?: {
    carrier: string;
    estimatedDays: number;
    method: string;
  };
  taxAmount: number;
  taxDetails?: {
    taxRate: number;
    taxJurisdiction: string;
  };
  total: number;
  currency: string;
  shippingAddress?: Record<string, unknown>;
  customerInfo?: CustomerInfo;
}

export interface CheckoutRequest {
  card: {
    number: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
    cardholderName?: string;
  };
  billingAddress: {
    firstName: string;
    lastName: string;
    street1: string;
    street2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    email?: string;
    phone?: string;
  };
  email: string;
  saveCard?: boolean;
}

export interface CheckoutResult {
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  transactionId?: string;
  customerId?: string;
  error?: string;
  errorCode?: string;
}

export async function getCheckoutSummary(sessionToken: string): Promise<CheckoutSummary> {
  const res = await fetch(`${API_BASE}/api/f/sessions/${sessionToken}/checkout`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to get checkout summary: ${res.status}`);
  }
  return res.json();
}

export async function processCheckout(
  sessionToken: string,
  data: CheckoutRequest
): Promise<CheckoutResult> {
  const res = await fetch(`${API_BASE}/api/f/sessions/${sessionToken}/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  // Always parse the response, even on error
  const result = await res.json();

  if (!res.ok) {
    return {
      success: false,
      error: result.message || result.error || `Checkout failed: ${res.status}`,
      errorCode: result.errorCode || 'API_ERROR',
    };
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════
// CUSTOMER ORDERS API
// ═══════════════════════════════════════════════════════════════

export interface PublicOrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  imageUrl?: string;
}

export interface PublicOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  items: PublicOrderItem[];
  subtotal: number;
  shippingAmount: number;
  taxAmount: number;
  total: number;
  currency: string;
  shippingAddress?: {
    firstName: string;
    lastName: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
  createdAt: string;
  updatedAt: string;
}

export async function lookupOrder(orderNumber: string, email: string): Promise<PublicOrder> {
  const res = await fetch(`${API_BASE}/api/orders/public/lookup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderNumber, email }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Order not found' }));
    throw new Error(error.message || 'Order not found');
  }
  return res.json();
}

export async function getCustomerOrders(email: string): Promise<{ orders: PublicOrder[]; total: number }> {
  const res = await fetch(`${API_BASE}/api/orders/public/my-orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    throw new Error('Failed to fetch orders');
  }
  return res.json();
}

// ═══════════════════════════════════════════════════════════════
// CUSTOMER SUBSCRIPTIONS API
// ═══════════════════════════════════════════════════════════════

export interface PublicSubscription {
  id: string;
  status: string;
  planName: string;
  planDisplayName?: string;
  productName?: string;
  productImageUrl?: string;
  amount: number;
  currency: string;
  interval: string;
  nextBillingDate: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  canceledAt: string | null;
  pausedUntil: string | null;
  createdAt: string;
  canPause: boolean;
  canCancel: boolean;
  canResume: boolean;
}

export async function getCustomerSubscriptions(
  email: string
): Promise<{ subscriptions: PublicSubscription[]; total: number }> {
  const res = await fetch(`${API_BASE}/api/subscriptions/public/my-subscriptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    throw new Error('Failed to fetch subscriptions');
  }
  return res.json();
}

export async function pauseSubscription(
  email: string,
  subscriptionId: string,
  reason?: string,
  resumeDate?: string
): Promise<PublicSubscription> {
  const res = await fetch(`${API_BASE}/api/subscriptions/public/pause`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, subscriptionId, reason, resumeDate }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to pause subscription' }));
    throw new Error(error.message || 'Failed to pause subscription');
  }
  return res.json();
}

export async function resumeSubscription(
  email: string,
  subscriptionId: string
): Promise<PublicSubscription> {
  const res = await fetch(`${API_BASE}/api/subscriptions/public/resume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, subscriptionId }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to resume subscription' }));
    throw new Error(error.message || 'Failed to resume subscription');
  }
  return res.json();
}

export async function cancelSubscription(
  email: string,
  subscriptionId: string,
  reason?: string,
  feedback?: string
): Promise<PublicSubscription> {
  const res = await fetch(`${API_BASE}/api/subscriptions/public/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, subscriptionId, reason, feedback }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to cancel subscription' }));
    throw new Error(error.message || 'Failed to cancel subscription');
  }
  return res.json();
}

// ═══════════════════════════════════════════════════════════════
// CUSTOMER PAYMENT METHODS API
// ═══════════════════════════════════════════════════════════════

export interface PaymentMethod {
  id: string;
  cardType: string;
  lastFour: string;
  expirationMonth: number;
  expirationYear: number;
  cardholderName?: string;
  nickname?: string;
  isDefault: boolean;
  createdAt: string;
}

// Get company code from environment or URL
// In production, this would be derived from the subdomain or portal config
function getCompanyCode(): string {
  return process.env.NEXT_PUBLIC_COMPANY_CODE || 'DEMO';
}

export async function getCustomerPaymentMethods(
  email: string
): Promise<{ paymentMethods: PaymentMethod[]; total: number }> {
  const companyCode = getCompanyCode();
  const res = await fetch(`${API_BASE}/api/card-vault/public/my-cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, companyCode }),
  });
  if (!res.ok) {
    throw new Error('Failed to fetch payment methods');
  }
  return res.json();
}

export async function addPaymentMethod(
  email: string,
  data: {
    card: {
      number: string;
      expiryMonth: string;
      expiryYear: string;
      cvv: string;
      cardholderName?: string;
    };
    nickname?: string;
    setAsDefault?: boolean;
  }
): Promise<PaymentMethod> {
  const companyCode = getCompanyCode();
  const res = await fetch(`${API_BASE}/api/card-vault/public/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, companyCode, ...data }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to add payment method' }));
    throw new Error(error.message || 'Failed to add payment method');
  }
  return res.json();
}

export async function deletePaymentMethod(
  email: string,
  paymentMethodId: string
): Promise<void> {
  const companyCode = getCompanyCode();
  const res = await fetch(`${API_BASE}/api/card-vault/public/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, companyCode, paymentMethodId }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to delete payment method' }));
    throw new Error(error.message || 'Failed to delete payment method');
  }
}

export async function setDefaultPaymentMethod(
  email: string,
  paymentMethodId: string
): Promise<PaymentMethod> {
  const companyCode = getCompanyCode();
  const res = await fetch(`${API_BASE}/api/card-vault/public/set-default`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, companyCode, paymentMethodId }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to set default' }));
    throw new Error(error.message || 'Failed to set default');
  }
  return res.json();
}
