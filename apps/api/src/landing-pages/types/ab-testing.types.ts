import { ABTestStatus, PopupType, PopupTrigger, PopupStatus, ConversionGoalType } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════
// A/B TESTING TYPES
// ═══════════════════════════════════════════════════════════════

export interface VariantChange {
  sectionId: string;
  field: string;
  value: any;
}

export interface CreateABTestDto {
  name: string;
  description?: string;
  trafficPercentage?: number;
  confidenceLevel?: number;
  minimumSampleSize?: number;
  primaryMetric?: string;
  scheduledStart?: Date;
  scheduledEnd?: Date;
}

export interface UpdateABTestDto {
  name?: string;
  description?: string;
  status?: ABTestStatus;
  trafficPercentage?: number;
  confidenceLevel?: number;
  minimumSampleSize?: number;
  primaryMetric?: string;
  scheduledStart?: Date;
  scheduledEnd?: Date;
}

export interface CreateVariantDto {
  name: string;
  isControl?: boolean;
  weight: number;
  changes: VariantChange[];
}

export interface UpdateVariantDto {
  name?: string;
  weight?: number;
  changes?: VariantChange[];
}

export interface ABTestSummary {
  id: string;
  landingPageId: string;
  name: string;
  status: ABTestStatus;
  trafficPercentage: number;
  variantCount: number;
  totalVisitors: number;
  totalConversions: number;
  overallConversionRate: number;
  startedAt?: Date;
  endedAt?: Date;
  winnerId?: string;
  createdAt: Date;
}

export interface ABTestDetail {
  id: string;
  landingPageId: string;
  companyId: string;
  name: string;
  description?: string;
  status: ABTestStatus;
  trafficPercentage: number;
  confidenceLevel: number;
  minimumSampleSize: number;
  primaryMetric: string;
  startedAt?: Date;
  endedAt?: Date;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  winnerId?: string;
  winnerDeclaredAt?: Date;
  statisticalSignificance?: number;
  variants: VariantDetail[];
  createdAt: Date;
  updatedAt: Date;
}

export interface VariantDetail {
  id: string;
  name: string;
  isControl: boolean;
  weight: number;
  changes: VariantChange[];
  visitors: number;
  conversions: number;
  conversionRate: number;
  bounceRate: number;
  avgTimeOnPage: number;
  totalRevenue: number;
  avgOrderValue: number;
  createdAt: Date;
}

export interface ABTestAssignmentResult {
  testId: string;
  variantId: string;
  variantName: string;
  changes: VariantChange[];
  isNewVisitor: boolean;
}

export interface ABTestStats {
  variantId: string;
  variantName: string;
  visitors: number;
  conversions: number;
  conversionRate: number;
  improvement: number; // % improvement over control
  confidence: number;  // Statistical confidence
  isWinning: boolean;
}

// ═══════════════════════════════════════════════════════════════
// POPUP & STICKY BAR TYPES
// ═══════════════════════════════════════════════════════════════

export interface PopupContent {
  headline?: string;
  body?: string;
  ctaText?: string;
  ctaUrl?: string;
  image?: string;
  formFields?: PopupFormField[];
  dismissText?: string;
}

export interface PopupFormField {
  name: string;
  type: 'text' | 'email' | 'phone' | 'select';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[]; // For select type
}

export interface PopupStyles {
  backgroundColor?: string;
  textColor?: string;
  ctaBackgroundColor?: string;
  ctaTextColor?: string;
  width?: string;
  maxWidth?: string;
  borderRadius?: string;
  padding?: string;
  boxShadow?: string;
}

export interface CreatePopupDto {
  name: string;
  type: PopupType;
  trigger: PopupTrigger;
  triggerValue?: number;
  triggerSelector?: string;
  position?: string;
  animation?: string;
  overlay?: boolean;
  overlayClose?: boolean;
  content: PopupContent;
  styles?: PopupStyles;
  startDate?: Date;
  endDate?: Date;
  showOnce?: boolean;
  showEveryDays?: number;
  showOnMobile?: boolean;
  showOnDesktop?: boolean;
  showOnAllPages?: boolean;
  targetPages?: string[];
}

export interface UpdatePopupDto {
  name?: string;
  type?: PopupType;
  status?: PopupStatus;
  trigger?: PopupTrigger;
  triggerValue?: number;
  triggerSelector?: string;
  position?: string;
  animation?: string;
  overlay?: boolean;
  overlayClose?: boolean;
  content?: PopupContent;
  styles?: PopupStyles;
  startDate?: Date;
  endDate?: Date;
  showOnce?: boolean;
  showEveryDays?: number;
  showOnMobile?: boolean;
  showOnDesktop?: boolean;
  showOnAllPages?: boolean;
  targetPages?: string[];
}

export interface PopupSummary {
  id: string;
  name: string;
  type: PopupType;
  status: PopupStatus;
  trigger: PopupTrigger;
  impressions: number;
  conversions: number;
  conversionRate: number;
  createdAt: Date;
}

export interface PopupDetail {
  id: string;
  landingPageId: string;
  companyId: string;
  name: string;
  type: PopupType;
  status: PopupStatus;
  trigger: PopupTrigger;
  triggerValue?: number;
  triggerSelector?: string;
  position: string;
  animation: string;
  overlay: boolean;
  overlayClose: boolean;
  content: PopupContent;
  styles?: PopupStyles;
  startDate?: Date;
  endDate?: Date;
  showOnce: boolean;
  showEveryDays?: number;
  showOnMobile: boolean;
  showOnDesktop: boolean;
  showOnAllPages: boolean;
  targetPages: string[];
  impressions: number;
  closes: number;
  conversions: number;
  createdAt: Date;
  updatedAt: Date;
}

// ═══════════════════════════════════════════════════════════════
// DYNAMIC TEXT REPLACEMENT TYPES
// ═══════════════════════════════════════════════════════════════

export interface DTRTarget {
  selector?: string;  // CSS selector
  sectionId?: string; // Section ID
  field: string;      // Field to replace
}

export interface DTRValueMapping {
  [key: string]: string; // e.g., { "new-york": "New York City", "la": "Los Angeles" }
}

export interface CreateDTRDto {
  name: string;
  parameterName: string;
  defaultValue: string;
  targets: DTRTarget[];
  valueMappings?: DTRValueMapping;
}

export interface UpdateDTRDto {
  name?: string;
  enabled?: boolean;
  parameterName?: string;
  defaultValue?: string;
  targets?: DTRTarget[];
  valueMappings?: DTRValueMapping;
}

export interface DTRSummary {
  id: string;
  name: string;
  parameterName: string;
  defaultValue: string;
  enabled: boolean;
  targetCount: number;
  createdAt: Date;
}

export interface DTRDetail {
  id: string;
  landingPageId: string;
  companyId: string;
  name: string;
  enabled: boolean;
  parameterName: string;
  defaultValue: string;
  targets: DTRTarget[];
  valueMappings?: DTRValueMapping;
  createdAt: Date;
  updatedAt: Date;
}

// ═══════════════════════════════════════════════════════════════
// CONVERSION TRACKING TYPES
// ═══════════════════════════════════════════════════════════════

export interface CreateConversionGoalDto {
  name: string;
  type: ConversionGoalType;
  isPrimary?: boolean;
  selector?: string;
  targetUrl?: string;
  threshold?: number;
  eventName?: string;
  revenueValue?: number;
}

export interface UpdateConversionGoalDto {
  name?: string;
  type?: ConversionGoalType;
  isPrimary?: boolean;
  selector?: string;
  targetUrl?: string;
  threshold?: number;
  eventName?: string;
  revenueValue?: number;
}

export interface ConversionGoalSummary {
  id: string;
  name: string;
  type: ConversionGoalType;
  isPrimary: boolean;
  totalConversions: number;
  totalRevenue: number;
  createdAt: Date;
}

export interface ConversionGoalDetail {
  id: string;
  landingPageId: string;
  companyId: string;
  name: string;
  type: ConversionGoalType;
  isPrimary: boolean;
  selector?: string;
  targetUrl?: string;
  threshold?: number;
  eventName?: string;
  revenueValue?: number;
  totalConversions: number;
  totalRevenue: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrackConversionDto {
  goalId: string;
  visitorId: string;
  pageUrl?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  revenue?: number;
}
