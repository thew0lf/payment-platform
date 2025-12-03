import {
  FunnelType,
  FunnelStatus,
  StageType,
  FunnelSessionStatus,
  FunnelEventType,
  FunnelVariantStatus,
  WinnerSelectionMode,
  FunnelABTestStatus,
  AIInsightType,
  InsightStatus,
  InsightSource,
  FunnelTemplateType,
} from '@prisma/client';

// Re-export Prisma enums
export {
  FunnelType,
  FunnelStatus,
  StageType,
  FunnelSessionStatus,
  FunnelEventType,
  FunnelVariantStatus,
  WinnerSelectionMode,
  FunnelABTestStatus,
  AIInsightType,
  InsightStatus,
  InsightSource,
  FunnelTemplateType,
};

// ═══════════════════════════════════════════════════════════════
// FUNNEL SETTINGS
// ═══════════════════════════════════════════════════════════════

export interface FunnelBranding {
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor?: string;
  fontFamily?: string;
}

export interface FunnelUrls {
  successUrl?: string;
  cancelUrl?: string;
  termsUrl?: string;
  privacyUrl?: string;
}

export interface FunnelBehavior {
  allowBackNavigation: boolean;
  showProgressBar: boolean;
  autoSaveProgress: boolean;
  sessionTimeout: number; // minutes
  abandonmentEmail: boolean;
}

export interface FunnelSeo {
  title?: string;
  description?: string;
  ogImage?: string;
}

export interface FunnelAISettings {
  insightsEnabled: boolean;
  insightTiming: 'daily_digest' | 'on_demand' | 'hybrid';
  actionMode: 'one_click' | 'draft_review' | 'guided_wizard';
}

export interface FunnelSettings {
  branding: FunnelBranding;
  urls: FunnelUrls;
  behavior: FunnelBehavior;
  seo: FunnelSeo;
  ai: FunnelAISettings;
}

// ═══════════════════════════════════════════════════════════════
// STAGE CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════

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

export interface ProductSource {
  type: 'manual' | 'category' | 'collection' | 'all';
  productIds?: string[];
  categoryId?: string;
  collectionId?: string;
}

export interface ProductSelectionDisplay {
  showPrices: boolean;
  showDescription: boolean;
  showVariants: boolean;
  showQuantity: boolean;
  showFilters: boolean;
  showSearch: boolean;
  itemsPerPage: number;
}

export interface ProductSelectionBehavior {
  mode: 'single' | 'multiple';
  minItems?: number;
  maxItems?: number;
  allowQuantity: boolean;
}

export interface ProductSelectionConfig {
  layout: 'grid' | 'carousel' | 'comparison' | 'single-product';
  source: ProductSource;
  display: ProductSelectionDisplay;
  selection: ProductSelectionBehavior;
  cta: {
    text: string;
    position: 'per-item' | 'fixed-bottom' | 'both';
  };
}

export interface FieldConfig {
  enabled: boolean;
  required: boolean;
  label?: string;
  placeholder?: string;
}

export interface CustomerFieldsConfig {
  email: FieldConfig;
  firstName: FieldConfig;
  lastName: FieldConfig;
  phone: FieldConfig;
  company: FieldConfig;
}

export interface CustomField {
  id: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date' | 'time' | 'datetime' | 'file';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: { label: string; value: string }[];
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
  conditional?: {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains';
    value: string;
  };
}

export interface ShippingFieldsConfig {
  enabled: boolean;
  required: boolean;
}

export interface BillingFieldsConfig {
  enabled: boolean;
  sameAsShipping: boolean;
}

export interface PaymentMethodConfig {
  type: 'card' | 'paypal' | 'apple_pay' | 'google_pay' | 'bank' | 'klarna' | 'affirm';
  enabled: boolean;
  label?: string;
  description?: string;
}

export interface CheckoutStep {
  id: string;
  name: string;
  icon?: string;
  fields: string[];
}

export interface CheckoutTrust {
  showSecurityBadges: boolean;
  showGuarantee: boolean;
  showTestimonial: boolean;
  guaranteeText?: string;
}

export interface CheckoutUpsells {
  enabled: boolean;
  products: string[];
  position: 'before-payment' | 'after-payment' | 'modal';
}

export interface CheckoutStageConfig {
  layout: 'single-page' | 'multi-step' | 'two-column' | 'one-column';
  steps?: CheckoutStep[];
  fields: {
    customer: CustomerFieldsConfig;
    shipping: ShippingFieldsConfig;
    billing: BillingFieldsConfig;
    custom: CustomField[];
  };
  payment: {
    methods: PaymentMethodConfig[];
    showOrderSummary: boolean;
    allowCoupons: boolean;
    allowGiftCards: boolean;
    showTaxEstimate: boolean;
    showShippingEstimate: boolean;
  };
  trust: CheckoutTrust;
  upsells?: CheckoutUpsells;
}

export type StageConfig = LandingStageConfig | ProductSelectionConfig | CheckoutStageConfig;

// ═══════════════════════════════════════════════════════════════
// SESSION & ANALYTICS
// ═══════════════════════════════════════════════════════════════

export interface SelectedProduct {
  productId: string;
  variantId?: string;
  quantity: number;
  price: number;
  name: string;
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

// ═══════════════════════════════════════════════════════════════
// REACT FLOW CANVAS
// ═══════════════════════════════════════════════════════════════

export interface FunnelNode {
  id: string;
  type: 'landing' | 'product' | 'checkout' | 'success';
  position: { x: number; y: number };
  data: {
    label: string;
    stageId?: string;
    stageOrder: number;
    config?: StageConfig;
  };
}

export interface FunnelEdge {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
}

export interface FunnelCanvas {
  nodes: FunnelNode[];
  edges: FunnelEdge[];
}

// ═══════════════════════════════════════════════════════════════
// API RESPONSES
// ═══════════════════════════════════════════════════════════════

export interface FunnelWithStages {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  description?: string;
  type: FunnelType;
  status: FunnelStatus;
  settings: FunnelSettings;
  totalVisits: number;
  totalConversions: number;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  stages: {
    id: string;
    name: string;
    type: StageType;
    order: number;
    config: StageConfig;
    themeId?: string;
    customStyles?: Record<string, unknown>;
  }[];
}

export interface FunnelAnalytics {
  funnelId: string;
  period: 'day' | 'week' | 'month' | 'all';
  totalVisits: number;
  totalConversions: number;
  conversionRate: number;
  averageOrderValue: number;
  totalRevenue: number;
  stageMetrics: {
    stageOrder: number;
    stageName: string;
    visits: number;
    completions: number;
    dropOff: number;
    completionRate: number;
  }[];
  topProducts: {
    productId: string;
    productName: string;
    count: number;
    revenue: number;
  }[];
  deviceBreakdown: {
    device: string;
    count: number;
    percentage: number;
  }[];
}
