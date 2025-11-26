/**
 * Refund Management Types
 * Comprehensive refund processing with approval workflows
 */

// =============================================================================
// ENUMS
// =============================================================================

export enum RefundStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
}

export enum RefundType {
  AUTO = 'AUTO',
  MANUAL = 'MANUAL',
  BULK = 'BULK',
  MANAGER_OVERRIDE = 'MANAGER_OVERRIDE',
}

export enum RefundReason {
  PRODUCT_DEFECT = 'PRODUCT_DEFECT',
  WRONG_ITEM = 'WRONG_ITEM',
  NOT_AS_DESCRIBED = 'NOT_AS_DESCRIBED',
  SHIPPING_DAMAGE = 'SHIPPING_DAMAGE',
  NEVER_RECEIVED = 'NEVER_RECEIVED',
  DUPLICATE_CHARGE = 'DUPLICATE_CHARGE',
  SUBSCRIPTION_CANCELLATION = 'SUBSCRIPTION_CANCELLATION',
  CUSTOMER_REQUEST = 'CUSTOMER_REQUEST',
  SERVICE_ISSUE = 'SERVICE_ISSUE',
  QUALITY_ISSUE = 'QUALITY_ISSUE',
  LATE_DELIVERY = 'LATE_DELIVERY',
  PRICE_MATCH = 'PRICE_MATCH',
  GOODWILL = 'GOODWILL',
  OTHER = 'OTHER',
}

export enum RefundMethod {
  ORIGINAL_PAYMENT = 'ORIGINAL_PAYMENT',
  STORE_CREDIT = 'STORE_CREDIT',
  GIFT_CARD = 'GIFT_CARD',
  CHECK = 'CHECK',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

export enum ApprovalLevel {
  AUTO_APPROVED = 'AUTO_APPROVED',
  AI_REP = 'AI_REP',
  AI_MANAGER = 'AI_MANAGER',
  HUMAN_MANAGER = 'HUMAN_MANAGER',
  FINANCE = 'FINANCE',
}

// =============================================================================
// REFUND TYPES
// =============================================================================

export interface Refund {
  id: string;
  companyId: string;
  customerId: string;
  orderId: string;
  rmaId?: string;
  csSessionId?: string;

  type: RefundType;
  status: RefundStatus;
  reason: RefundReason;
  reasonDetails?: string;

  amount: RefundAmount;
  method: RefundMethod;

  approval: RefundApproval;

  processing: RefundProcessing;

  metadata: RefundMetadata;

  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface RefundAmount {
  requested: number;
  approved: number;
  currency: string;
  breakdown: {
    productAmount: number;
    shippingAmount: number;
    taxAmount: number;
    fees?: number;
    adjustments?: number;
  };
}

export interface RefundApproval {
  level: ApprovalLevel;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  notes?: string;
  autoApprovalRule?: string;
}

export interface RefundProcessing {
  paymentProcessor?: string;
  transactionId?: string;
  processedAt?: Date;
  failureReason?: string;
  retryCount?: number;
  lastRetryAt?: Date;
}

export interface RefundMetadata {
  initiatedBy: 'customer' | 'ai_rep' | 'ai_manager' | 'human_agent' | 'system';
  channel?: 'voice' | 'chat' | 'email' | 'api';
  customerImpact?: 'low' | 'medium' | 'high';
  fraudScore?: number;
  tags?: string[];
}

// =============================================================================
// REFUND POLICY CONFIGURATION
// =============================================================================

export interface RefundPolicy {
  companyId: string;
  enabled: boolean;

  generalRules: GeneralRefundRules;
  autoApprovalRules: AutoApprovalRule[];
  tierLimits: TierRefundLimits[];
  reasonSpecificRules: ReasonSpecificRule[];

  notifications: RefundNotifications;

  fraudPrevention: FraudPreventionConfig;
}

export interface GeneralRefundRules {
  maxRefundPeriodDays: number;
  allowPartialRefunds: boolean;
  requireRMA: boolean;
  requireReturnReceipt: boolean;
  restockingFee: number;
  shippingRefundable: boolean;

  excludedCategories: string[];
  excludedProducts: string[];

  bulkRefundMinItems: number;
  bulkRefundMaxItems: number;
}

export interface AutoApprovalRule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;

  conditions: RefundCondition[];

  maxAmount: number;
  approvalLevel: ApprovalLevel;

  description: string;
}

export interface RefundCondition {
  field: 'amount' | 'reason' | 'customer_tier' | 'customer_ltv' | 'order_age' | 'previous_refunds' | 'product_category';
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'between';
  value: string | number | string[] | number[];
}

export interface TierRefundLimits {
  tier: 'AI_REP' | 'AI_MANAGER' | 'HUMAN_MANAGER' | 'FINANCE';
  maxSingleRefund: number;
  maxDailyRefunds: number;
  maxDailyAmount: number;
  requiresSecondApproval: boolean;
  secondApprovalThreshold?: number;
}

export interface ReasonSpecificRule {
  reason: RefundReason;
  requiresProof: boolean;
  proofTypes: ('photo' | 'video' | 'tracking' | 'receipt')[];
  maxRefundPercentage: number;
  autoApprovalEligible: boolean;
  additionalApprovalRequired: boolean;
}

export interface RefundNotifications {
  customerNotifications: {
    onRequest: boolean;
    onApproval: boolean;
    onRejection: boolean;
    onCompletion: boolean;
    channels: ('email' | 'sms' | 'push')[];
  };
  internalNotifications: {
    onHighValue: boolean;
    highValueThreshold: number;
    onRejection: boolean;
    dailySummary: boolean;
    recipients: string[];
    channels: ('email' | 'slack')[];
  };
}

export interface FraudPreventionConfig {
  enabled: boolean;

  velocityChecks: {
    maxRefundsPerCustomerPerMonth: number;
    maxAmountPerCustomerPerMonth: number;
    maxRefundsPerOrderLifetime: number;
  };

  suspiciousPatterns: {
    checkSerialReturner: boolean;
    serialReturnerThreshold: number;
    checkHighValueOnly: boolean;
    highValueThreshold: number;
    checkNewCustomers: boolean;
    newCustomerDays: number;
  };

  actions: {
    flagForReview: boolean;
    requireManagerApproval: boolean;
    blockAutoApproval: boolean;
    notifyFraudTeam: boolean;
  };
}

// =============================================================================
// DTOs
// =============================================================================

export interface CreateRefundDto {
  companyId: string;
  customerId: string;
  orderId: string;
  rmaId?: string;
  csSessionId?: string;

  reason: RefundReason;
  reasonDetails?: string;

  amount: number;
  method?: RefundMethod;

  items?: RefundLineItem[];

  metadata?: {
    channel?: 'voice' | 'chat' | 'email' | 'api';
    tags?: string[];
  };
}

export interface RefundLineItem {
  orderItemId: string;
  quantity: number;
  amount: number;
  reason?: RefundReason;
}

export interface ApproveRefundDto {
  refundId: string;
  approvedAmount?: number;
  notes?: string;
}

export interface RejectRefundDto {
  refundId: string;
  reason: string;
  suggestAlternative?: boolean;
  alternativeOffer?: {
    type: 'store_credit' | 'partial_refund' | 'exchange';
    amount?: number;
    message?: string;
  };
}

export interface BulkRefundDto {
  companyId: string;
  reason: RefundReason;
  reasonDetails?: string;

  refunds: {
    orderId: string;
    customerId: string;
    amount: number;
    items?: RefundLineItem[];
  }[];

  notes?: string;
}

export interface GetRefundsDto {
  companyId: string;
  status?: RefundStatus;
  type?: RefundType;
  customerId?: string;
  orderId?: string;
  reason?: RefundReason;
  minAmount?: number;
  maxAmount?: number;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface RefundAnalyticsDto {
  companyId: string;
  startDate: string;
  endDate: string;
  groupBy?: 'day' | 'week' | 'month';
}

// =============================================================================
// ANALYTICS TYPES
// =============================================================================

export interface RefundAnalytics {
  period: {
    start: Date;
    end: Date;
  };

  overview: {
    totalRefunds: number;
    totalAmount: number;
    avgRefundAmount: number;
    approvalRate: number;
    avgProcessingTime: number;
  };

  byStatus: Record<RefundStatus, {
    count: number;
    amount: number;
  }>;

  byReason: {
    reason: RefundReason;
    count: number;
    amount: number;
    avgAmount: number;
    trend: number;
  }[];

  byMethod: Record<RefundMethod, {
    count: number;
    amount: number;
  }>;

  byApprovalLevel: {
    level: ApprovalLevel;
    count: number;
    amount: number;
    avgProcessingTime: number;
  }[];

  trends: {
    date: string;
    count: number;
    amount: number;
  }[];

  fraudMetrics: {
    flaggedRefunds: number;
    suspiciousCustomers: number;
    blockedRefunds: number;
    falsePositives: number;
  };

  topRefundedProducts: {
    productId: string;
    productName: string;
    refundCount: number;
    totalAmount: number;
  }[];

  customerImpact: {
    totalCustomersAffected: number;
    repeatRefunders: number;
    avgRefundsPerCustomer: number;
    customerSatisfactionPostRefund: number;
  };
}
