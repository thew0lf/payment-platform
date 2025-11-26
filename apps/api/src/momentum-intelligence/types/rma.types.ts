/**
 * RMA (Return Merchandise Authorization) Types
 * Complete return management workflow
 */

// =============================================================================
// ENUMS
// =============================================================================

export enum RMAStatus {
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  LABEL_SENT = 'LABEL_SENT',
  IN_TRANSIT = 'IN_TRANSIT',
  RECEIVED = 'RECEIVED',
  INSPECTING = 'INSPECTING',
  INSPECTION_COMPLETE = 'INSPECTION_COMPLETE',
  PROCESSING_REFUND = 'PROCESSING_REFUND',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export enum RMAType {
  RETURN = 'RETURN',
  EXCHANGE = 'EXCHANGE',
  WARRANTY = 'WARRANTY',
  REPAIR = 'REPAIR',
  RECALL = 'RECALL',
}

export enum ReturnReason {
  DEFECTIVE = 'DEFECTIVE',
  WRONG_SIZE = 'WRONG_SIZE',
  WRONG_COLOR = 'WRONG_COLOR',
  WRONG_ITEM = 'WRONG_ITEM',
  NOT_AS_DESCRIBED = 'NOT_AS_DESCRIBED',
  DAMAGED_IN_SHIPPING = 'DAMAGED_IN_SHIPPING',
  ARRIVED_LATE = 'ARRIVED_LATE',
  NO_LONGER_NEEDED = 'NO_LONGER_NEEDED',
  BETTER_PRICE_FOUND = 'BETTER_PRICE_FOUND',
  QUALITY_NOT_EXPECTED = 'QUALITY_NOT_EXPECTED',
  ACCIDENTAL_ORDER = 'ACCIDENTAL_ORDER',
  WARRANTY_CLAIM = 'WARRANTY_CLAIM',
  RECALL = 'RECALL',
  OTHER = 'OTHER',
}

export enum InspectionResult {
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL',
  PENDING = 'PENDING',
}

export enum ItemCondition {
  NEW_UNOPENED = 'NEW_UNOPENED',
  NEW_OPENED = 'NEW_OPENED',
  LIKE_NEW = 'LIKE_NEW',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR',
  DAMAGED = 'DAMAGED',
  DEFECTIVE = 'DEFECTIVE',
}

export enum DispositionAction {
  RESTOCK = 'RESTOCK',
  REFURBISH = 'REFURBISH',
  LIQUIDATE = 'LIQUIDATE',
  DONATE = 'DONATE',
  DESTROY = 'DESTROY',
  RETURN_TO_VENDOR = 'RETURN_TO_VENDOR',
}

// =============================================================================
// RMA TYPES
// =============================================================================

export interface RMA {
  id: string;
  rmaNumber: string;
  companyId: string;
  customerId: string;
  orderId: string;
  csSessionId?: string;

  type: RMAType;
  status: RMAStatus;
  reason: ReturnReason;
  reasonDetails?: string;

  items: RMAItem[];

  shipping: RMAShipping;

  inspection?: RMAInspection;

  resolution: RMAResolution;

  timeline: RMATimelineEvent[];

  metadata: RMAMetadata;

  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  completedAt?: Date;
}

export interface RMAItem {
  id: string;
  orderItemId: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  reason: ReturnReason;
  reasonDetails?: string;

  inspection?: ItemInspection;

  disposition?: {
    action: DispositionAction;
    notes?: string;
    completedAt?: Date;
  };
}

export interface ItemInspection {
  condition: ItemCondition;
  result: InspectionResult;
  notes?: string;
  photos?: string[];
  inspectedBy?: string;
  inspectedAt?: Date;
  refundEligible: boolean;
  refundPercentage: number;
}

export interface RMAShipping {
  labelType: 'prepaid' | 'customer_paid' | 'pickup';
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  labelUrl?: string;
  labelSentAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;

  shippingCost?: number;
  customerPaid?: boolean;

  returnAddress: ReturnAddress;

  trackingHistory?: TrackingEvent[];
}

export interface ReturnAddress {
  name: string;
  company?: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface TrackingEvent {
  status: string;
  location?: string;
  timestamp: Date;
  description?: string;
}

export interface RMAInspection {
  status: 'pending' | 'in_progress' | 'completed';
  startedAt?: Date;
  completedAt?: Date;
  inspectedBy?: string;
  overallResult: InspectionResult;
  notes?: string;
  photos?: string[];
}

export interface RMAResolution {
  type: 'refund' | 'exchange' | 'store_credit' | 'repair' | 'no_action';
  status: 'pending' | 'processing' | 'completed';

  refund?: {
    refundId?: string;
    amount: number;
    method: string;
    processedAt?: Date;
  };

  exchange?: {
    newOrderId?: string;
    items: {
      productId: string;
      quantity: number;
    }[];
    additionalPayment?: number;
  };

  storeCredit?: {
    amount: number;
    creditId?: string;
    expiresAt?: Date;
  };

  repair?: {
    estimatedDays: number;
    repairCost?: number;
    customerPays?: boolean;
    notes?: string;
  };
}

export interface RMATimelineEvent {
  status: RMAStatus;
  timestamp: Date;
  actor?: string;
  actorType?: 'customer' | 'ai' | 'human' | 'system';
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface RMAMetadata {
  initiatedBy: 'customer' | 'ai_rep' | 'ai_manager' | 'human_agent' | 'system';
  channel?: 'voice' | 'chat' | 'email' | 'api' | 'portal';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  tags?: string[];
  internalNotes?: string;
}

// =============================================================================
// RMA POLICY CONFIGURATION
// =============================================================================

export interface RMAPolicy {
  companyId: string;
  enabled: boolean;

  generalRules: GeneralRMARules;

  returnReasons: ReasonConfig[];

  shippingConfig: ShippingConfig;

  inspectionConfig: InspectionConfig;

  resolutionConfig: ResolutionConfig;

  notifications: RMANotifications;

  automation: RMAAutomation;
}

export interface GeneralRMARules {
  returnWindowDays: number;
  warrantyDays: number;
  maxItemsPerRMA: number;
  rmaExpirationDays: number;

  requirePhotos: boolean;
  requireReason: boolean;
  requireProofOfPurchase: boolean;

  allowPartialReturns: boolean;
  allowExchanges: boolean;
  allowWarrantyClaims: boolean;

  excludedCategories: string[];
  excludedProducts: string[];
  finalSaleCategories: string[];
}

export interface ReasonConfig {
  reason: ReturnReason;
  enabled: boolean;
  requiresProof: boolean;
  proofTypes: ('photo' | 'video' | 'receipt')[];
  autoApprove: boolean;
  restockingFeePercentage: number;
  customerPaysReturn: boolean;
  eligibleForExchange: boolean;
  priority: 'low' | 'normal' | 'high';
}

export interface ShippingConfig {
  defaultCarrier: string;
  prepaidLabels: {
    enabled: boolean;
    carriers: string[];
    maxValue: number;
  };
  customerPaidReturns: {
    enabled: boolean;
    minOrderValue: number;
  };
  pickupService: {
    enabled: boolean;
    carriers: string[];
    minOrderValue: number;
  };

  returnAddresses: ReturnAddress[];
  defaultReturnAddressId: string;

  internationalReturns: {
    enabled: boolean;
    customerPaysCustoms: boolean;
    allowedCountries: string[];
  };
}

export interface InspectionConfig {
  required: boolean;
  autoPassConditions: ItemCondition[];
  autoFailConditions: ItemCondition[];

  inspectionChecklist: InspectionChecklistItem[];

  dispositionRules: DispositionRule[];

  qualityMetrics: {
    trackDefectRates: boolean;
    trackVendorIssues: boolean;
    reportingThreshold: number;
  };
}

export interface InspectionChecklistItem {
  id: string;
  name: string;
  required: boolean;
  passCondition: string;
}

export interface DispositionRule {
  condition: ItemCondition;
  action: DispositionAction;
  notes?: string;
}

export interface ResolutionConfig {
  defaultResolution: 'refund' | 'exchange' | 'store_credit';

  refundRules: {
    processingTimeDays: number;
    partialRefundThreshold: number;
    restockingFeeEnabled: boolean;
    defaultRestockingFeePercentage: number;
  };

  exchangeRules: {
    allowDifferentProduct: boolean;
    allowUpgrade: boolean;
    allowDowngrade: boolean;
    priceProtectionDays: number;
  };

  storeCreditRules: {
    bonusPercentage: number;
    expirationDays: number;
    minimumAmount: number;
  };
}

export interface RMANotifications {
  customer: {
    onCreation: boolean;
    onApproval: boolean;
    onLabelSent: boolean;
    onReceived: boolean;
    onInspectionComplete: boolean;
    onResolution: boolean;
    reminderBeforeExpiration: boolean;
    reminderDays: number;
    channels: ('email' | 'sms' | 'push')[];
  };
  internal: {
    onHighValue: boolean;
    highValueThreshold: number;
    onInspectionFailed: boolean;
    onExpiring: boolean;
    expiringDays: number;
    dailySummary: boolean;
    recipients: string[];
    channels: ('email' | 'slack')[];
  };
}

export interface RMAAutomation {
  autoApprove: {
    enabled: boolean;
    conditions: RMAAutoApproveCondition[];
  };
  autoCreateLabel: boolean;
  autoProcessRefund: boolean;
  autoCloseAfterDays: number;
  autoExpireReminders: boolean;
}

export interface RMAAutoApproveCondition {
  field: 'reason' | 'amount' | 'customer_tier' | 'customer_ltv' | 'order_age' | 'item_category';
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: string | number | string[];
}

// =============================================================================
// DTOs
// =============================================================================

export interface CreateRMADto {
  companyId: string;
  customerId: string;
  orderId: string;
  csSessionId?: string;

  type: RMAType;
  reason: ReturnReason;
  reasonDetails?: string;

  items: {
    orderItemId: string;
    quantity: number;
    reason?: ReturnReason;
    reasonDetails?: string;
    photos?: string[];
  }[];

  preferredResolution?: 'refund' | 'exchange' | 'store_credit';
  exchangeItems?: {
    productId: string;
    quantity: number;
  }[];

  metadata?: {
    channel?: 'voice' | 'chat' | 'email' | 'api' | 'portal';
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    tags?: string[];
  };
}

export interface ApproveRMADto {
  rmaId: string;
  notes?: string;
  overrideRules?: boolean;
}

export interface RejectRMADto {
  rmaId: string;
  reason: string;
  suggestAlternative?: boolean;
  alternativeOffer?: {
    type: 'partial_return' | 'store_credit' | 'discount';
    amount?: number;
    message?: string;
  };
}

export interface UpdateRMAStatusDto {
  rmaId: string;
  status: RMAStatus;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface RecordInspectionDto {
  rmaId: string;
  items: {
    rmaItemId: string;
    condition: ItemCondition;
    result: InspectionResult;
    notes?: string;
    photos?: string[];
    refundPercentage?: number;
  }[];
  overallNotes?: string;
}

export interface ProcessResolutionDto {
  rmaId: string;
  resolutionType: 'refund' | 'exchange' | 'store_credit' | 'repair' | 'no_action';

  refund?: {
    amount: number;
    method?: string;
  };

  exchange?: {
    items: {
      productId: string;
      quantity: number;
    }[];
    additionalPayment?: number;
  };

  storeCredit?: {
    amount: number;
    expirationDays?: number;
  };

  notes?: string;
}

export interface GetRMAsDto {
  companyId: string;
  status?: RMAStatus;
  type?: RMAType;
  customerId?: string;
  orderId?: string;
  reason?: ReturnReason;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface RMAAnalyticsDto {
  companyId: string;
  startDate: string;
  endDate: string;
  groupBy?: 'day' | 'week' | 'month';
}

// =============================================================================
// ANALYTICS TYPES
// =============================================================================

export interface RMAAnalytics {
  period: {
    start: Date;
    end: Date;
  };

  overview: {
    totalRMAs: number;
    totalItems: number;
    totalValue: number;
    approvalRate: number;
    avgProcessingTime: number;
    returnRate: number;
  };

  byStatus: Record<RMAStatus, {
    count: number;
    value: number;
  }>;

  byType: Record<RMAType, {
    count: number;
    value: number;
  }>;

  byReason: {
    reason: ReturnReason;
    count: number;
    value: number;
    avgValue: number;
    trend: number;
  }[];

  inspection: {
    totalInspected: number;
    passRate: number;
    avgInspectionTime: number;
    byCondition: Record<ItemCondition, number>;
    byDisposition: Record<DispositionAction, number>;
  };

  resolution: {
    byType: {
      type: string;
      count: number;
      value: number;
    }[];
    avgResolutionTime: number;
    customerSatisfaction: number;
  };

  shipping: {
    avgTransitTime: number;
    lostPackages: number;
    prepaidLabelsIssued: number;
    shippingCostTotal: number;
  };

  trends: {
    date: string;
    rmaCount: number;
    itemCount: number;
    value: number;
  }[];

  topReturnedProducts: {
    productId: string;
    productName: string;
    returnCount: number;
    returnRate: number;
    topReasons: ReturnReason[];
  }[];

  qualityInsights: {
    defectRate: number;
    topDefectCategories: string[];
    vendorIssues: {
      vendorId: string;
      vendorName: string;
      returnCount: number;
      defectRate: number;
    }[];
  };
}
