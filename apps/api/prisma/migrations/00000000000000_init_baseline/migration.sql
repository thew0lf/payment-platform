-- CreateEnum
CREATE TYPE "TrialStatus" AS ENUM ('NONE', 'AWAITING_TRIGGER', 'ACTIVE', 'CONVERTED', 'EXPIRED', 'CANCELLED', 'RETURNED');

-- CreateEnum
CREATE TYPE "FulfillmentProviderType" AS ENUM ('INTERNAL', 'THIRD_PARTY', 'DROPSHIP', 'DIGITAL', 'PRINT_ON_DEMAND', 'MARKETPLACE');

-- CreateEnum
CREATE TYPE "FulfillmentProviderStatus" AS ENUM ('ACTIVE', 'PAUSED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "BillingPlan" AS ENUM ('STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ClientPlan" AS ENUM ('FOUNDERS', 'BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "EntityStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "ScopeType" AS ENUM ('ORGANIZATION', 'CLIENT', 'COMPANY', 'DEPARTMENT', 'TEAM', 'VENDOR', 'VENDOR_COMPANY', 'VENDOR_DEPARTMENT', 'VENDOR_TEAM');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER', 'VIEWER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION');

-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('LEAD', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('SHIPPING', 'BILLING', 'BOTH');

-- CreateEnum
CREATE TYPE "PaymentProviderType" AS ENUM ('PAYFLOW', 'NMI', 'AUTHORIZE_NET', 'STRIPE', 'BRAINTREE', 'SQUARE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('CARD', 'ACH', 'CHECK', 'WIRE', 'WALLET_APPLE', 'WALLET_GOOGLE', 'PAYPAL', 'AFFIRM', 'KLARNA', 'CASH', 'INVOICE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'AUTHORIZED', 'PAID', 'PARTIALLY_REFUNDED', 'REFUNDED', 'FAILED', 'VOIDED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('CHARGE', 'REFUND', 'VOID', 'CHARGEBACK', 'ADJUSTMENT', 'AUTHORIZATION', 'CAPTURE');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED', 'VOIDED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELED', 'PAST_DUE', 'TRIALING', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RebillStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'EXHAUSTED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "SubscriptionPlanScope" AS ENUM ('ORGANIZATION', 'CLIENT', 'COMPANY');

-- CreateEnum
CREATE TYPE "SubscriptionPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "TrialStartTrigger" AS ENUM ('ON_PURCHASE', 'ON_SHIPMENT', 'ON_DELIVERY', 'MANUAL');

-- CreateEnum
CREATE TYPE "TrialReturnAction" AS ENUM ('EXTEND_TRIAL', 'CANCEL', 'CONVERT_ANYWAY', 'PAUSE_ALERT');

-- CreateEnum
CREATE TYPE "PartialShipmentAction" AS ENUM ('PROCEED', 'WAIT_ALL', 'PRORATE');

-- CreateEnum
CREATE TYPE "BackorderAction" AS ENUM ('DELAY_CHARGE', 'CHARGE_SHIP_LATER', 'SKIP_CYCLE');

-- CreateEnum
CREATE TYPE "ShippingCostAction" AS ENUM ('ABSORB_COST', 'PASS_TO_CUSTOMER', 'FREE_SHIPPING');

-- CreateEnum
CREATE TYPE "ProductFulfillmentType" AS ENUM ('PHYSICAL', 'VIRTUAL', 'ELECTRONIC');

-- CreateEnum
CREATE TYPE "ElectronicDeliveryMethod" AS ENUM ('EMAIL', 'SMS', 'EMAIL_AND_SMS', 'DOWNLOAD_LINK');

-- CreateEnum
CREATE TYPE "GiftDurationType" AS ENUM ('ONE_TIME', 'FIXED', 'ONGOING');

-- CreateEnum
CREATE TYPE "SubscriptionBundleType" AS ENUM ('FIXED', 'ROTATING', 'BUILD_YOUR_OWN', 'MIX_AND_MATCH');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'DRAFT', 'ARCHIVED', 'OUT_OF_STOCK');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('ONE_TIME', 'SUBSCRIPTION', 'GIFT', 'REPLACEMENT', 'SAMPLE');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PROCESSING', 'PARTIALLY_SHIPPED', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('UNFULFILLED', 'PARTIALLY_FULFILLED', 'FULFILLED', 'RETURNED');

-- CreateEnum
CREATE TYPE "ShippingCarrier" AS ENUM ('USPS', 'UPS', 'FEDEX', 'DHL', 'AMAZON', 'LOCAL_DELIVERY', 'PICKUP', 'OTHER');

-- CreateEnum
CREATE TYPE "ShippingMethod" AS ENUM ('GROUND', 'EXPRESS', 'OVERNIGHT', 'TWO_DAY', 'SAME_DAY', 'PICKUP', 'FREE');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('PENDING', 'LABEL_CREATED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RETURNED', 'EXCEPTION');

-- CreateEnum
CREATE TYPE "ShipmentEventType" AS ENUM ('LABEL_CREATED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_AT_FACILITY', 'DEPARTED_FACILITY', 'OUT_FOR_DELIVERY', 'DELIVERY_ATTEMPTED', 'DELIVERED', 'EXCEPTION', 'RETURNED_TO_SENDER');

-- CreateEnum
CREATE TYPE "DataClassification" AS ENUM ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'PII', 'PCI', 'PHI');

-- CreateEnum
CREATE TYPE "ChurnRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "InterventionType" AS ENUM ('SAVE_FLOW', 'PROACTIVE_OUTREACH', 'PAYMENT_RECOVERY', 'WINBACK', 'UPSELL', 'SERVICE_RECOVERY');

-- CreateEnum
CREATE TYPE "InterventionUrgency" AS ENUM ('IMMEDIATE', 'WITHIN_24H', 'WITHIN_7D', 'MONITORING');

-- CreateEnum
CREATE TYPE "InterventionStatus" AS ENUM ('PENDING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InterventionOutcome" AS ENUM ('SAVED', 'OFFER_ACCEPTED', 'DOWNGRADED', 'PAUSED', 'CANCELLED', 'NO_RESPONSE', 'ESCALATED');

-- CreateEnum
CREATE TYPE "DeliveryChannel" AS ENUM ('EMAIL', 'SMS', 'VOICE', 'IN_APP', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "SaveOutcome" AS ENUM ('SAVED_STAGE_1', 'SAVED_STAGE_2', 'SAVED_STAGE_3', 'SAVED_STAGE_4', 'SAVED_STAGE_5', 'SAVED_VOICE', 'CANCELLED', 'PAUSED', 'DOWNGRADED');

-- CreateEnum
CREATE TYPE "CallDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "VoiceCallStatus" AS ENUM ('INITIATED', 'RINGING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'BUSY', 'NO_ANSWER');

-- CreateEnum
CREATE TYPE "CallOutcome" AS ENUM ('SAVED', 'OFFER_ACCEPTED', 'DECLINED', 'ESCALATED_TO_HUMAN', 'CALLBACK_SCHEDULED', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "Sentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE', 'ANGRY');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('EMAIL_SEQUENCE', 'SMS_MESSAGE', 'VOICE_SCRIPT', 'AD_COPY', 'LANDING_PAGE', 'IN_APP_MODAL', 'PUSH_NOTIFICATION');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "UpsellType" AS ENUM ('SHIPPING_PROTECTION', 'TIER_UPGRADE', 'FREQUENCY_UPGRADE', 'ADD_ON', 'GIFT_SUBSCRIPTION', 'ANNUAL_PLAN');

-- CreateEnum
CREATE TYPE "UpsellMoment" AS ENUM ('CHECKOUT', 'POST_PURCHASE', 'DAY_7', 'DAY_14', 'DAY_30', 'MONTH_2', 'MONTH_3', 'SAVE_FLOW', 'WINBACK');

-- CreateEnum
CREATE TYPE "VoiceScriptType" AS ENUM ('INBOUND_SAVE', 'OUTBOUND_SAVE', 'WINBACK', 'UPSELL');

-- CreateEnum
CREATE TYPE "CSTier" AS ENUM ('AI_REP', 'AI_MANAGER', 'HUMAN_AGENT');

-- CreateEnum
CREATE TYPE "CSSessionStatus" AS ENUM ('ACTIVE', 'WAITING_CUSTOMER', 'ESCALATED', 'RESOLVED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "RefundType" AS ENUM ('AUTO', 'MANUAL', 'FULL', 'PARTIAL', 'BULK', 'MANAGER_OVERRIDE');

-- CreateEnum
CREATE TYPE "RefundReason" AS ENUM ('PRODUCT_DEFECT', 'DAMAGED_ITEM', 'WRONG_ITEM', 'NOT_AS_DESCRIBED', 'SHIPPING_DAMAGE', 'SHIPPING_ISSUE', 'NEVER_RECEIVED', 'DUPLICATE_CHARGE', 'DUPLICATE_ORDER', 'SUBSCRIPTION_CANCELLATION', 'CUSTOMER_REQUEST', 'SERVICE_ISSUE', 'QUALITY_ISSUE', 'LATE_DELIVERY', 'PRICE_MATCH', 'GOODWILL', 'FRAUD', 'OTHER', 'OTHER_REASON');

-- CreateEnum
CREATE TYPE "RefundMethod" AS ENUM ('ORIGINAL_PAYMENT', 'STORE_CREDIT', 'GIFT_CARD', 'CHECK_PAYMENT', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "RMAStatus" AS ENUM ('REQUESTED', 'RMA_APPROVED', 'LABEL_SENT', 'RMA_IN_TRANSIT', 'RECEIVED', 'INSPECTING', 'INSPECTION_COMPLETE', 'PROCESSING_REFUND', 'RMA_COMPLETED', 'RMA_REJECTED', 'RMA_CANCELLED', 'RMA_EXPIRED');

-- CreateEnum
CREATE TYPE "RMAType" AS ENUM ('RETURN', 'EXCHANGE', 'WARRANTY', 'REPAIR', 'RECALL');

-- CreateEnum
CREATE TYPE "ReturnReason" AS ENUM ('DEFECTIVE', 'WRONG_SIZE', 'WRONG_COLOR', 'WRONG_ITEM_RECEIVED', 'NOT_AS_DESCRIBED_RETURN', 'DAMAGED_IN_SHIPPING', 'ARRIVED_LATE', 'NO_LONGER_NEEDED', 'BETTER_PRICE_FOUND', 'QUALITY_NOT_EXPECTED', 'ACCIDENTAL_ORDER', 'WARRANTY_CLAIM', 'RECALL_RETURN', 'OTHER_RETURN_REASON');

-- CreateEnum
CREATE TYPE "TermsType" AS ENUM ('TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'REFUND_POLICY_DOC', 'SHIPPING_POLICY', 'SUBSCRIPTION_TERMS', 'COOKIE_POLICY', 'ACCEPTABLE_USE', 'DATA_PROCESSING', 'SLA', 'CUSTOM_TERMS');

-- CreateEnum
CREATE TYPE "TermsStatus" AS ENUM ('DRAFT_TERMS', 'PENDING_REVIEW', 'TERMS_APPROVED', 'TERMS_ACTIVE', 'TERMS_ARCHIVED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "AuthType" AS ENUM ('API_KEY', 'OAUTH2', 'OAUTH2_CLIENT', 'BASIC_AUTH', 'CUSTOM');

-- CreateEnum
CREATE TYPE "OAuthTokenStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REFRESH_FAILED', 'REVOKED', 'INVALID');

-- CreateEnum
CREATE TYPE "OAuthFlowType" AS ENUM ('PLATFORM', 'CLIENT');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO', 'MODEL_3D', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "PriceRuleType" AS ENUM ('QUANTITY_BREAK', 'CUSTOMER_GROUP', 'TIME_BASED', 'SUBSCRIPTION');

-- CreateEnum
CREATE TYPE "AdjustmentType" AS ENUM ('FIXED_AMOUNT', 'PERCENTAGE', 'FIXED_PRICE');

-- CreateEnum
CREATE TYPE "CollectionType" AS ENUM ('MANUAL', 'AUTOMATIC');

-- CreateEnum
CREATE TYPE "BundleType" AS ENUM ('FIXED', 'MIX_AND_MATCH', 'SUBSCRIPTION_BOX');

-- CreateEnum
CREATE TYPE "BundlePricing" AS ENUM ('FIXED', 'CALCULATED', 'TIERED');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('WAREHOUSE', 'STORE', 'DROPSHIP', 'VIRTUAL');

-- CreateEnum
CREATE TYPE "AdjustmentReason" AS ENUM ('RECEIVED', 'SOLD', 'RETURNED', 'DAMAGED', 'LOST', 'FOUND', 'TRANSFERRED', 'COUNT_ADJUSTMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "MarketingVideoType" AS ENUM ('PRODUCT_SHOWCASE', 'PRODUCT_LAUNCH', 'SALE_PROMO', 'TESTIMONIAL', 'TUTORIAL', 'BRAND_STORY', 'RETENTION_WINBACK', 'RETENTION_ANNIVERSARY', 'RETENTION_REMINDER', 'SOCIAL_AD');

-- CreateEnum
CREATE TYPE "VideoGenerationStatus" AS ENUM ('PENDING', 'GENERATING_SCRIPT', 'GENERATING_MEDIA', 'GENERATING_VOICE', 'COMPOSING', 'EXPORTING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "SceneMediaType" AS ENUM ('PRODUCT_IMAGE', 'AI_GENERATED_VIDEO', 'STOCK_VIDEO', 'SOLID_COLOR', 'GRADIENT');

-- CreateEnum
CREATE TYPE "VideoPlatform" AS ENUM ('TIKTOK', 'INSTAGRAM_REELS', 'INSTAGRAM_STORIES', 'INSTAGRAM_FEED', 'FACEBOOK_REELS', 'FACEBOOK_FEED', 'YOUTUBE_SHORTS', 'YOUTUBE', 'TWITTER', 'LINKEDIN');

-- CreateEnum
CREATE TYPE "PermissionGrantType" AS ENUM ('ALLOW', 'DENY');

-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('PENDING_VERIFICATION', 'VERIFIED', 'ACTIVE', 'SUSPENDED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "VendorTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');

-- CreateEnum
CREATE TYPE "VendorType" AS ENUM ('SUPPLIER', 'DROPSHIPPER', 'WHITE_LABEL', 'AFFILIATE', 'CUSTOMER_SERVICE_CENTER');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "ProductSyncMode" AS ENUM ('MANUAL', 'AUTOMATIC', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "ProductSyncStatus" AS ENUM ('PENDING', 'SYNCING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "NoteType" AS ENUM ('INTERNAL', 'CUSTOMER_SERVICE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FLAGGED');

-- CreateEnum
CREATE TYPE "ReviewSource" AS ENUM ('WEBSITE', 'EMAIL', 'API', 'IMPORT');

-- CreateEnum
CREATE TYPE "AIFeature" AS ENUM ('LANDING_PAGE_CONTENT', 'LANDING_PAGE_SECTION', 'AB_TEST_VARIANTS', 'PRODUCT_DESCRIPTION', 'SEO_OPTIMIZATION', 'IMAGE_ALT_TEXT');

-- CreateEnum
CREATE TYPE "AIUsageStatus" AS ENUM ('SUCCESS', 'FAILED', 'RATE_LIMITED');

-- CreateEnum
CREATE TYPE "LandingPageTheme" AS ENUM ('STARTER', 'ARTISAN', 'VELOCITY', 'LUXE', 'WELLNESS', 'FOODIE', 'PROFESSIONAL', 'CREATOR', 'MARKETPLACE');

-- CreateEnum
CREATE TYPE "SectionType" AS ENUM ('HEADER', 'FOOTER', 'HERO_CENTERED', 'HERO_SPLIT', 'HERO_VIDEO', 'HERO_CAROUSEL', 'FEATURES_GRID', 'FEATURES_LIST', 'FEATURES_ICONS', 'ABOUT_STORY', 'ABOUT_TEAM', 'ABOUT_TIMELINE', 'TESTIMONIALS_CARDS', 'TESTIMONIALS_CAROUSEL', 'TESTIMONIALS_WALL', 'LOGOS_STRIP', 'STATS_COUNTER', 'PRICING_TABLE', 'PRICING_COMPARISON', 'PRODUCTS_GRID', 'PRODUCTS_CAROUSEL', 'CTA_BANNER', 'CTA_SPLIT', 'NEWSLETTER', 'CONTACT_FORM', 'FAQ_ACCORDION', 'FAQ_GRID', 'GALLERY_GRID', 'GALLERY_MASONRY', 'VIDEO_EMBED', 'HTML_BLOCK', 'SPACER', 'DIVIDER');

-- CreateEnum
CREATE TYPE "LandingPageStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LandingPageHosting" AS ENUM ('PLATFORM', 'CLIENT');

-- CreateEnum
CREATE TYPE "DomainSslStatus" AS ENUM ('PENDING', 'VALIDATING', 'ACTIVE', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ABTestStatus" AS ENUM ('DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PopupType" AS ENUM ('MODAL', 'SLIDE_IN', 'FULLSCREEN', 'STICKY_BAR', 'BANNER');

-- CreateEnum
CREATE TYPE "PopupTrigger" AS ENUM ('IMMEDIATE', 'TIME_DELAY', 'SCROLL_PERCENT', 'EXIT_INTENT', 'CLICK', 'INACTIVITY');

-- CreateEnum
CREATE TYPE "PopupStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'SCHEDULED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ConversionGoalType" AS ENUM ('FORM_SUBMIT', 'BUTTON_CLICK', 'LINK_CLICK', 'PAGE_VISIT', 'SCROLL_DEPTH', 'TIME_ON_PAGE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PaymentPageStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PaymentPageType" AS ENUM ('CHECKOUT', 'SUBSCRIPTION', 'DONATION', 'INVOICE', 'PRODUCT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "CheckoutPageThemeCategory" AS ENUM ('MINIMAL', 'MODERN', 'ENTERPRISE', 'LUXURY', 'FRIENDLY', 'DARK', 'SPEED', 'TRUST');

-- CreateEnum
CREATE TYPE "PaymentSessionStatus" AS ENUM ('PENDING', 'PROCESSING', 'REQUIRES_ACTION', 'COMPLETED', 'FAILED', 'EXPIRED', 'ABANDONED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentGatewayType" AS ENUM ('STRIPE', 'PAYPAL', 'PAYPAL_REST', 'NMI', 'AUTHORIZE_NET', 'SQUARE', 'OWN_HOSTED');

-- CreateEnum
CREATE TYPE "FunnelType" AS ENUM ('DIRECT_CHECKOUT', 'PRODUCT_CHECKOUT', 'LANDING_CHECKOUT', 'FULL_FUNNEL');

-- CreateEnum
CREATE TYPE "FunnelStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "StageType" AS ENUM ('LANDING', 'PRODUCT_SELECTION', 'CHECKOUT');

-- CreateEnum
CREATE TYPE "FunnelSessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "FunnelEventType" AS ENUM ('STAGE_ENTERED', 'STAGE_COMPLETED', 'STAGE_ABANDONED', 'PRODUCT_VIEWED', 'PRODUCT_ADDED', 'PRODUCT_REMOVED', 'QUANTITY_CHANGED', 'CHECKOUT_STARTED', 'FIELD_COMPLETED', 'PAYMENT_METHOD_SELECTED', 'COUPON_APPLIED', 'COUPON_FAILED', 'PAYMENT_INITIATED', 'PAYMENT_COMPLETED', 'PAYMENT_FAILED', 'ERROR_OCCURRED', 'CUSTOM_EVENT');

-- CreateEnum
CREATE TYPE "FunnelVariantStatus" AS ENUM ('ACTIVE', 'PAUSED', 'WINNER', 'LOSER');

-- CreateEnum
CREATE TYPE "WinnerSelectionMode" AS ENUM ('MANUAL', 'AUTO_PAUSE_LOSERS', 'AUTO_WITH_APPROVAL');

-- CreateEnum
CREATE TYPE "FunnelABTestStatus" AS ENUM ('DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AIInsightType" AS ENUM ('DROP_OFF_ALERT', 'CONVERSION_OPPORTUNITY', 'PRICING_SUGGESTION', 'UX_IMPROVEMENT', 'COPY_ENHANCEMENT', 'AB_TEST_RECOMMENDATION', 'SEGMENT_INSIGHT', 'BENCHMARK_COMPARISON');

-- CreateEnum
CREATE TYPE "InsightStatus" AS ENUM ('PENDING', 'APPLIED', 'DISMISSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "InsightSource" AS ENUM ('RULE_BASED', 'LLM');

-- CreateEnum
CREATE TYPE "FunnelTemplateType" AS ENUM ('FULL_FUNNEL', 'COMPONENT');

-- CreateEnum
CREATE TYPE "FeatureStatus" AS ENUM ('DEVELOPMENT', 'READY_FOR_REVIEW', 'CODE_REVIEW', 'REVIEW_FIXING', 'READY_FOR_QA', 'QA_IN_PROGRESS', 'QA_COMPLETE', 'SR_REVIEW', 'QUESTIONS_READY', 'AWAITING_ANSWERS', 'SR_FIXING', 'READY_FOR_RETEST', 'APPROVED', 'MERGED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IssueSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'SUGGESTION');

-- CreateEnum
CREATE TYPE "IssueCategory" AS ENUM ('BUG', 'SECURITY', 'PERFORMANCE', 'UX', 'ACCESSIBILITY', 'CODE_QUALITY', 'TESTING', 'DOCUMENTATION', 'PERMISSIONS', 'DATA_INTEGRITY', 'INTEGRATION');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'WONT_FIX', 'DUPLICATE', 'CANNOT_REPRODUCE');

-- CreateEnum
CREATE TYPE "RetestStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED');

-- CreateEnum
CREATE TYPE "QACheckCategory" AS ENUM ('SECURITY', 'PERMISSIONS', 'FUNCTIONALITY', 'ERROR_HANDLING', 'EDGE_CASES', 'PERFORMANCE', 'ACCESSIBILITY', 'RESPONSIVE', 'DATA_INTEGRITY', 'INTEGRATION', 'DOCUMENTATION');

-- CreateEnum
CREATE TYPE "CodeReviewCategory" AS ENUM ('CODE_QUALITY', 'ARCHITECTURE', 'TYPE_SAFETY', 'ERROR_HANDLING', 'MAINTAINABILITY', 'TESTING', 'SECURITY', 'AUTHENTICATION', 'AUTHORIZATION', 'INPUT_VALIDATION', 'OUTPUT_ENCODING', 'CRYPTOGRAPHY', 'SOC2', 'ISO27001', 'PCI_DSS', 'GDPR', 'PERFORMANCE', 'DATABASE', 'API_DESIGN', 'LOGGING');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('ANONYMOUS', 'IDENTIFIED', 'QUALIFIED', 'CONVERTED', 'ABANDONED', 'NURTURING', 'DISQUALIFIED');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('FUNNEL', 'LANDING_PAGE', 'CHECKOUT_ABANDON', 'FORM', 'IMPORT', 'API', 'MANUAL');

-- CreateEnum
CREATE TYPE "CardVaultStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED', 'FAILED', 'PENDING');

-- CreateEnum
CREATE TYPE "CardType" AS ENUM ('VISA', 'MASTERCARD', 'AMEX', 'DISCOVER', 'DINERS', 'JCB', 'UNIONPAY', 'OTHER');

-- CreateEnum
CREATE TYPE "CardVaultProvider" AS ENUM ('PAYPAL_PAYFLOW', 'STRIPE', 'NMI', 'AUTHORIZE_NET', 'INTERNAL');

-- CreateEnum
CREATE TYPE "MarketingMethodology" AS ENUM ('NCI', 'AIDA', 'PAS', 'BAB', 'FOUR_PS', 'STORYBRAND', 'PASTOR', 'QUEST', 'FAB', 'CUSTOM');

-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED', 'SAVED', 'DISCARDED');

-- CreateEnum
CREATE TYPE "EmailTemplateCategory" AS ENUM ('AUTHENTICATION', 'TRANSACTIONAL', 'SUBSCRIPTION', 'NOTIFICATION', 'MARKETING', 'SYSTEM');

-- CreateEnum
CREATE TYPE "EmailSendStatus" AS ENUM ('QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'BOUNCED', 'COMPLAINED', 'FAILED', 'REJECTED');

-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('PENDING', 'VERIFIED', 'INVITED', 'REGISTERED', 'DECLINED');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT,
    "logo" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "billingEmail" TEXT,
    "billingPlan" "BillingPlan" NOT NULL DEFAULT 'STARTER',
    "billingStatus" "BillingStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "code" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "plan" "ClientPlan" NOT NULL DEFAULT 'BASIC',
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "cascadeId" TEXT,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "code" TEXT,
    "domain" TEXT,
    "logo" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "paymentConfig" JSONB NOT NULL DEFAULT '{}',
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "cascadeId" TEXT,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "cascadeId" TEXT,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "teamLeadId" TEXT,
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "avatar" TEXT,
    "phone" TEXT,
    "auth0Id" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "scopeType" "ScopeType" NOT NULL,
    "scopeId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "preferences" JSONB NOT NULL DEFAULT '{"theme": "system", "sidebarCollapsed": false}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT,
    "clientId" TEXT,
    "companyId" TEXT,
    "departmentId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "cascadeId" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TeamRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "cascadeId" TEXT,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "AddressType" NOT NULL DEFAULT 'BOTH',
    "label" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "company" TEXT,
    "phone" TEXT,
    "street1" TEXT NOT NULL,
    "street2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'US',
    "deliveryInstructions" TEXT,
    "isValidated" BOOLEAN NOT NULL DEFAULT false,
    "validatedAt" TIMESTAMP(3),
    "validationResponse" JSONB,
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "cascadeId" TEXT,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_vaults" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "PaymentMethodType" NOT NULL,
    "gatewayCustomerId" TEXT,
    "gatewayPaymentId" TEXT,
    "encryptedData" TEXT NOT NULL,
    "keyVersion" INTEGER NOT NULL DEFAULT 1,
    "encryptionAlgo" TEXT NOT NULL DEFAULT 'AES-256-GCM',
    "last4" TEXT NOT NULL,
    "bin" TEXT,
    "brand" TEXT,
    "expMonth" INTEGER,
    "expYear" INTEGER,
    "bankName" TEXT,
    "accountType" TEXT,
    "funding" TEXT,
    "checkNumberLast4" TEXT,
    "routingLast4" TEXT,
    "fingerprint" TEXT,
    "billingAddressSnapshot" JSONB,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "consentRecordedAt" TIMESTAMP(3),
    "consentIp" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_vaults_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_accounts" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT,
    "paymentVaultId" TEXT,
    "billingAddress" JSONB NOT NULL,
    "autoPayEnabled" BOOLEAN NOT NULL DEFAULT true,
    "autoPayDay" INTEGER,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "weight" DECIMAL(10,2),
    "weightUnit" TEXT NOT NULL DEFAULT 'oz',
    "price" DECIMAL(10,2) NOT NULL,
    "compareAtPrice" DECIMAL(10,2),
    "costPrice" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isSubscribable" BOOLEAN NOT NULL DEFAULT true,
    "subscriptionDiscount" DECIMAL(5,2),
    "fulfillmentType" "ProductFulfillmentType" NOT NULL DEFAULT 'PHYSICAL',
    "electronicDeliveryMethod" "ElectronicDeliveryMethod",
    "electronicDeliveryUrl" TEXT,
    "electronicDeliveryDays" INTEGER,
    "trackInventory" BOOLEAN NOT NULL DEFAULT true,
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 10,
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "images" JSONB NOT NULL DEFAULT '[]',
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "aiGeneratedDescription" BOOLEAN NOT NULL DEFAULT false,
    "aiGeneratedAt" TIMESTAMP(3),
    "attributes" JSONB,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "cascadeId" TEXT,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "billingAccountId" TEXT,
    "orderNumber" TEXT NOT NULL,
    "externalId" TEXT,
    "type" "OrderType" NOT NULL DEFAULT 'ONE_TIME',
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "shippingSnapshot" JSONB NOT NULL,
    "shippingAddressId" TEXT,
    "billingSnapshot" JSONB NOT NULL,
    "billingAddressId" TEXT,
    "addressLockedAt" TIMESTAMP(3),
    "addressLockedBy" TEXT,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discountCode" TEXT,
    "shippingAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "paymentVaultId" TEXT,
    "paymentSnapshot" JSONB,
    "fulfillmentStatus" "FulfillmentStatus" NOT NULL DEFAULT 'UNFULFILLED',
    "fulfilledAt" TIMESTAMP(3),
    "customerNotes" TEXT,
    "internalNotes" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "environment" TEXT NOT NULL DEFAULT 'production',
    "continuitySessionId" TEXT,
    "frictionLevel" TEXT,
    "momentumScore" INTEGER,
    "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "cascadeId" TEXT,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "productSnapshot" JSONB NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "fulfilledQuantity" INTEGER NOT NULL DEFAULT 0,
    "fulfillmentStatus" "FulfillmentStatus" NOT NULL DEFAULT 'UNFULFILLED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fulfillmentProviderId" TEXT,
    "shipmentNumber" TEXT NOT NULL,
    "carrier" "ShippingCarrier" NOT NULL,
    "carrierService" TEXT,
    "trackingNumber" TEXT,
    "trackingUrl" TEXT,
    "shippingMethod" "ShippingMethod" NOT NULL DEFAULT 'GROUND',
    "weight" DECIMAL(10,2),
    "weightUnit" TEXT NOT NULL DEFAULT 'oz',
    "length" DECIMAL(10,2),
    "width" DECIMAL(10,2),
    "height" DECIMAL(10,2),
    "dimensionUnit" TEXT NOT NULL DEFAULT 'in',
    "shippingCost" DECIMAL(10,2),
    "insuranceAmount" DECIMAL(10,2),
    "shippingLabelUrl" TEXT,
    "returnLabelUrl" TEXT,
    "shippingAddressSnapshot" JSONB NOT NULL,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'PENDING',
    "estimatedShipDate" TIMESTAMP(3),
    "estimatedDeliveryDate" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "signatureRequired" BOOLEAN NOT NULL DEFAULT false,
    "signedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_events" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "status" "ShipmentEventType" NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT,
    "carrierCode" TEXT,
    "carrierMessage" TEXT,
    "carrierData" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_providers" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PaymentProviderType" NOT NULL,
    "encryptedCredentials" TEXT NOT NULL,
    "keyVersion" INTEGER NOT NULL DEFAULT 1,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "environment" TEXT NOT NULL DEFAULT 'sandbox',
    "supportsRefunds" BOOLEAN NOT NULL DEFAULT true,
    "supportsVoid" BOOLEAN NOT NULL DEFAULT true,
    "supportsRecurring" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "subscriptionPlanId" TEXT,
    "planName" TEXT NOT NULL,
    "planAmount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "interval" "BillingInterval" NOT NULL,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "nextBillingDate" TIMESTAMP(3),
    "cycleCount" INTEGER NOT NULL DEFAULT 0,
    "trialStart" TIMESTAMP(3),
    "trialEnd" TIMESTAMP(3),
    "trialStatus" "TrialStatus" NOT NULL DEFAULT 'NONE',
    "trialStartTrigger" "TrialStartTrigger",
    "trialStartedByShipment" TEXT,
    "trialStartedByDelivery" TEXT,
    "trialFallbackUsed" BOOLEAN NOT NULL DEFAULT false,
    "trialConversionTrigger" "TrialStartTrigger",
    "trialConvertedAt" TIMESTAMP(3),
    "trialConvertedByShipment" TEXT,
    "trialConvertedByDelivery" TEXT,
    "trialReturnReceived" BOOLEAN NOT NULL DEFAULT false,
    "trialReturnAt" TIMESTAMP(3),
    "trialReturnAction" "TrialReturnAction",
    "trialExtensionDays" INTEGER,
    "shippingAddressId" TEXT,
    "shippingPreferences" JSONB NOT NULL DEFAULT '{}',
    "lastShipmentId" TEXT,
    "lastShipmentStatus" TEXT,
    "lastDeliveryAt" TIMESTAMP(3),
    "awaitingDeliveryForBilling" BOOLEAN NOT NULL DEFAULT false,
    "paymentVaultId" TEXT,
    "paymentProviderId" TEXT,
    "paymentFailed" BOOLEAN NOT NULL DEFAULT false,
    "paymentFailedAt" TIMESTAMP(3),
    "paymentFailCount" INTEGER NOT NULL DEFAULT 0,
    "paymentLastError" TEXT,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "canceledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "cancelSource" TEXT,
    "pausedAt" TIMESTAMP(3),
    "pauseResumeAt" TIMESTAMP(3),
    "pauseReason" TEXT,
    "pauseCount" INTEGER NOT NULL DEFAULT 0,
    "skipNextBilling" BOOLEAN NOT NULL DEFAULT false,
    "skipCount" INTEGER NOT NULL DEFAULT 0,
    "lastSkipAt" TIMESTAMP(3),
    "loyaltyTier" INTEGER,
    "loyaltyDiscountPct" DECIMAL(5,2),
    "loyaltyLockedAt" TIMESTAMP(3),
    "priceLocked" BOOLEAN NOT NULL DEFAULT false,
    "priceLockedAmount" DECIMAL(10,2),
    "priceLockedUntil" TIMESTAMP(3),
    "priceLockCycles" INTEGER,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "quantityPending" INTEGER,
    "isGift" BOOLEAN NOT NULL DEFAULT false,
    "giftPurchaserId" TEXT,
    "giftRecipientEmail" TEXT,
    "giftMessage" TEXT,
    "giftDurationType" "GiftDurationType",
    "giftCyclesRemaining" INTEGER,
    "bundleType" "SubscriptionBundleType",
    "parentSubId" TEXT,
    "churnRiskScore" DECIMAL(5,2),
    "churnRiskUpdatedAt" TIMESTAMP(3),
    "aiPredictions" JSONB,
    "aiActions" JSONB,
    "retentionOfferCount" INTEGER NOT NULL DEFAULT 0,
    "lastRetentionOffer" TIMESTAMP(3),
    "downselledFrom" TEXT,
    "winbackEligible" BOOLEAN NOT NULL DEFAULT false,
    "winbackOfferedAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "cascadeId" TEXT,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_items" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "priceOverride" DECIMAL(10,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),
    "options" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "subscription_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_rebills" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "transactionId" TEXT,
    "billingPeriodStart" TIMESTAMP(3) NOT NULL,
    "billingPeriodEnd" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "status" "RebillStatus" NOT NULL DEFAULT 'PENDING',
    "failureReason" TEXT,
    "failureCode" TEXT,
    "providerResponse" JSONB,
    "nextRetryAt" TIMESTAMP(3),
    "retriesRemaining" INTEGER NOT NULL DEFAULT 3,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_rebills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "scope" "SubscriptionPlanScope" NOT NULL,
    "organizationId" TEXT,
    "clientId" TEXT,
    "companyId" TEXT,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "shortDescription" TEXT,
    "basePriceMonthly" DECIMAL(10,2) NOT NULL,
    "basePriceAnnual" DECIMAL(10,2),
    "annualDiscountPct" DECIMAL(5,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "availableIntervals" "BillingInterval"[],
    "defaultInterval" "BillingInterval" NOT NULL DEFAULT 'MONTHLY',
    "trialEnabled" BOOLEAN NOT NULL DEFAULT false,
    "trialDays" INTEGER,
    "trialIncludesShipment" BOOLEAN NOT NULL DEFAULT false,
    "trialStartTrigger" "TrialStartTrigger" NOT NULL DEFAULT 'ON_PURCHASE',
    "trialConversionTrigger" "TrialStartTrigger" NOT NULL DEFAULT 'ON_PURCHASE',
    "trialWaitForDelivery" BOOLEAN NOT NULL DEFAULT false,
    "trialExtendDaysPostDelivery" INTEGER DEFAULT 0,
    "trialNoTrackingFallbackDays" INTEGER,
    "trialReturnAction" "TrialReturnAction" NOT NULL DEFAULT 'PAUSE_ALERT',
    "trialReturnExtendDays" INTEGER,
    "recurringEnabled" BOOLEAN NOT NULL DEFAULT true,
    "recurringIntervalDays" INTEGER,
    "recurringIncludesShipment" BOOLEAN NOT NULL DEFAULT true,
    "recurringTrigger" "TrialStartTrigger" NOT NULL DEFAULT 'ON_PURCHASE',
    "recurringWaitForDelivery" BOOLEAN NOT NULL DEFAULT false,
    "recurringExtendDaysPostDelivery" INTEGER DEFAULT 0,
    "partialShipmentAction" "PartialShipmentAction" NOT NULL DEFAULT 'PROCEED',
    "backorderAction" "BackorderAction" NOT NULL DEFAULT 'DELAY_CHARGE',
    "shippingCostAction" "ShippingCostAction" NOT NULL DEFAULT 'ABSORB_COST',
    "gracePeriodDays" INTEGER,
    "pauseEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pauseMaxDuration" INTEGER,
    "skipEnabled" BOOLEAN NOT NULL DEFAULT true,
    "skipMaxPerYear" INTEGER,
    "includedQuantity" INTEGER NOT NULL DEFAULT 1,
    "maxQuantity" INTEGER,
    "quantityChangeProrate" BOOLEAN NOT NULL DEFAULT true,
    "loyaltyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "loyaltyTiers" JSONB,
    "loyaltyStackable" BOOLEAN NOT NULL DEFAULT false,
    "priceLockEnabled" BOOLEAN NOT NULL DEFAULT false,
    "priceLockCycles" INTEGER,
    "earlyRenewalEnabled" BOOLEAN NOT NULL DEFAULT false,
    "earlyRenewalProrate" BOOLEAN NOT NULL DEFAULT true,
    "downsellPlanId" TEXT,
    "winbackEnabled" BOOLEAN NOT NULL DEFAULT false,
    "winbackDiscountPct" DECIMAL(5,2),
    "winbackTrialDays" INTEGER,
    "giftingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "giftDurationDefault" "GiftDurationType" NOT NULL DEFAULT 'ONGOING',
    "giftFixedCycles" INTEGER,
    "bundleType" "SubscriptionBundleType",
    "bundleMinProducts" INTEGER,
    "bundleMaxProducts" INTEGER,
    "notifyRenewalEnabled" BOOLEAN NOT NULL DEFAULT false,
    "notifyRenewalDaysBefore" INTEGER DEFAULT 3,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "badgeText" TEXT,
    "features" JSONB NOT NULL DEFAULT '[]',
    "miEnabled" BOOLEAN NOT NULL DEFAULT true,
    "miChurnDetectionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "miChurnThresholdCritical" INTEGER NOT NULL DEFAULT 80,
    "miChurnThresholdHigh" INTEGER NOT NULL DEFAULT 60,
    "miChurnThresholdMedium" INTEGER NOT NULL DEFAULT 40,
    "miSaveFlowEnabled" BOOLEAN NOT NULL DEFAULT true,
    "miSaveFlowMaxAttempts" INTEGER NOT NULL DEFAULT 3,
    "miInterventionsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "miInterventionTypes" JSONB NOT NULL DEFAULT '[]',
    "miSocialProofEnabled" BOOLEAN NOT NULL DEFAULT false,
    "miUrgencyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "miUpsellEnabled" BOOLEAN NOT NULL DEFAULT true,
    "miCrossSellEnabled" BOOLEAN NOT NULL DEFAULT true,
    "miPersonalizationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "status" "SubscriptionPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "cascadeId" TEXT,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_subscription_plans" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "overridePriceMonthly" DECIMAL(10,2),
    "overridePriceAnnual" DECIMAL(10,2),
    "overrideTrialDays" INTEGER,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_settings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "clientId" TEXT,
    "companyId" TEXT,
    "subscriptionsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "paymentFallbackEnabled" BOOLEAN NOT NULL DEFAULT true,
    "paymentFallbackMaxRetries" INTEGER NOT NULL DEFAULT 3,
    "aiCostControlEnabled" BOOLEAN NOT NULL DEFAULT false,
    "aiCostControlDisclaimer" TEXT,
    "aiMaxDiscountPct" DECIMAL(5,2) DEFAULT 30,
    "aiAutoApproveEnabled" BOOLEAN NOT NULL DEFAULT false,
    "aiABTestingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "aiABTestingDisclaimer" TEXT,
    "shippingSavingsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "defaultNotifyRenewal" BOOLEAN NOT NULL DEFAULT false,
    "defaultNotifyFailed" BOOLEAN NOT NULL DEFAULT true,
    "defaultNotifyPaused" BOOLEAN NOT NULL DEFAULT true,
    "defaultNotifyCancelled" BOOLEAN NOT NULL DEFAULT true,
    "defaultNotifyShipped" BOOLEAN NOT NULL DEFAULT true,
    "defaultNotifyDelivered" BOOLEAN NOT NULL DEFAULT false,
    "defaultNotifyPriceChange" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fulfillment_providers" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "type" "FulfillmentProviderType" NOT NULL,
    "status" "FulfillmentProviderStatus" NOT NULL DEFAULT 'ACTIVE',
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "contactName" TEXT,
    "webhookUrl" TEXT,
    "integrationId" TEXT,
    "apiCredentials" JSONB,
    "vendorCompanyId" TEXT,
    "supportsTracking" BOOLEAN NOT NULL DEFAULT true,
    "supportsPartialShip" BOOLEAN NOT NULL DEFAULT false,
    "supportsHoldForGroup" BOOLEAN NOT NULL DEFAULT false,
    "avgProcessingDays" INTEGER,
    "avgDeliveryDays" INTEGER,
    "trackingUpdatesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "deliveryConfirmEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "fulfillment_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_fulfillment_assignments" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "overrideProcessingDays" INTEGER,
    "overrideDeliveryDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_fulfillment_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT,
    "subscriptionId" TEXT,
    "orderId" TEXT,
    "paymentProviderId" TEXT,
    "paymentVaultId" TEXT,
    "transactionNumber" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "description" TEXT,
    "providerTransactionId" TEXT,
    "providerResponse" JSONB,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "failureReason" TEXT,
    "failureCode" TEXT,
    "refundedAmount" DECIMAL(10,2),
    "parentTransactionId" TEXT,
    "riskScore" INTEGER,
    "riskFlags" TEXT[],
    "avsResult" TEXT,
    "cvvResult" TEXT,
    "continuitySessionId" TEXT,
    "frictionLevel" TEXT,
    "momentumScore" INTEGER,
    "environment" TEXT NOT NULL DEFAULT 'production',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_accounts" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "providerType" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "descriptor" TEXT,
    "descriptorPhone" TEXT,
    "credentials" JSONB NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'sandbox',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "statusReason" TEXT,
    "statusChangedAt" TIMESTAMP(3),
    "minTransactionAmount" INTEGER NOT NULL DEFAULT 50,
    "maxTransactionAmount" INTEGER NOT NULL DEFAULT 10000000,
    "dailyTransactionLimit" INTEGER,
    "dailyVolumeLimit" INTEGER,
    "weeklyTransactionLimit" INTEGER,
    "weeklyVolumeLimit" INTEGER,
    "monthlyTransactionLimit" INTEGER,
    "monthlyVolumeLimit" INTEGER,
    "yearlyTransactionLimit" INTEGER,
    "yearlyVolumeLimit" INTEGER,
    "velocityWindow" INTEGER,
    "velocityMaxTransactions" INTEGER,
    "velocityMaxAmount" INTEGER,
    "todayTransactionCount" INTEGER NOT NULL DEFAULT 0,
    "todayVolume" INTEGER NOT NULL DEFAULT 0,
    "todaySuccessCount" INTEGER NOT NULL DEFAULT 0,
    "todayFailureCount" INTEGER NOT NULL DEFAULT 0,
    "weekTransactionCount" INTEGER NOT NULL DEFAULT 0,
    "weekVolume" INTEGER NOT NULL DEFAULT 0,
    "monthTransactionCount" INTEGER NOT NULL DEFAULT 0,
    "monthVolume" INTEGER NOT NULL DEFAULT 0,
    "yearTransactionCount" INTEGER NOT NULL DEFAULT 0,
    "yearVolume" INTEGER NOT NULL DEFAULT 0,
    "lastTransactionAt" TIMESTAMP(3),
    "usageResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fees" JSONB,
    "restrictions" JSONB,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "weight" INTEGER NOT NULL DEFAULT 100,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isBackupOnly" BOOLEAN NOT NULL DEFAULT false,
    "healthStatus" TEXT NOT NULL DEFAULT 'healthy',
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "avgLatencyMs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastHealthCheck" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "lastErrorMessage" TEXT,
    "lastErrorAt" TIMESTAMP(3),
    "uptimePercent" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "reserveBalance" INTEGER,
    "availableBalance" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "cascadeId" TEXT,

    CONSTRAINT "merchant_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_pools" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "accounts" JSONB NOT NULL DEFAULT '[]',
    "balancingStrategy" TEXT NOT NULL DEFAULT 'WEIGHTED',
    "failover" JSONB NOT NULL,
    "healthRouting" JSONB NOT NULL,
    "limitRouting" JSONB NOT NULL,
    "stickySession" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastAccountIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "account_pools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routing_rules" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'INACTIVE',
    "priority" INTEGER NOT NULL DEFAULT 100,
    "conditions" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "fallbackAction" TEXT,
    "fallbackPoolId" TEXT,
    "fallbackMessage" TEXT,
    "testingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "testingTrafficPct" DOUBLE PRECISION,
    "testingControlPoolId" TEXT,
    "testingTestPoolId" TEXT,
    "testingStartDate" TIMESTAMP(3),
    "testingEndDate" TIMESTAMP(3),
    "testingMetrics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "activateAt" TIMESTAMP(3),
    "deactivateAt" TIMESTAMP(3),
    "timezone" TEXT,
    "recurringSchedule" TEXT,
    "matchCount" INTEGER NOT NULL DEFAULT 0,
    "lastMatchedAt" TIMESTAMP(3),
    "avgProcessingTimeMs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "cascadeId" TEXT,

    CONSTRAINT "routing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routing_decisions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "primaryAccountId" TEXT,
    "primaryAccountName" TEXT,
    "fallbackAccountIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "blockReason" TEXT,
    "flaggedForReview" BOOLEAN NOT NULL DEFAULT false,
    "reviewReason" TEXT,
    "require3ds" BOOLEAN NOT NULL DEFAULT false,
    "surchargeAmount" INTEGER NOT NULL DEFAULT 0,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "originalAmount" INTEGER NOT NULL,
    "finalAmount" INTEGER NOT NULL,
    "appliedRuleIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "appliedRuleNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "evaluationTimeMs" INTEGER NOT NULL,
    "conditionsChecked" INTEGER NOT NULL,
    "rulesEvaluated" INTEGER NOT NULL,
    "contextSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "routing_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "billingInterval" TEXT NOT NULL DEFAULT 'MONTHLY',
    "baseCost" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "included" JSONB NOT NULL,
    "overage" JSONB NOT NULL,
    "features" JSONB NOT NULL DEFAULT '[]',
    "limits" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_subscriptions" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "statusReason" TEXT,
    "statusChangedAt" TIMESTAMP(3),
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "nextBillingDate" TIMESTAMP(3),
    "billingAnchorDay" INTEGER NOT NULL DEFAULT 1,
    "trialStart" TIMESTAMP(3),
    "trialEnd" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "pausedAt" TIMESTAMP(3),
    "pauseResumeAt" TIMESTAMP(3),
    "pauseReason" TEXT,
    "discountPercent" DOUBLE PRECISION,
    "discountReason" TEXT,
    "discountExpiresAt" TIMESTAMP(3),
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_periods" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "transactionCount" INTEGER NOT NULL DEFAULT 0,
    "transactionVolume" BIGINT NOT NULL DEFAULT 0,
    "transactionCost" INTEGER NOT NULL DEFAULT 0,
    "volumeCost" INTEGER NOT NULL DEFAULT 0,
    "apiCallCount" INTEGER NOT NULL DEFAULT 0,
    "apiCallCost" INTEGER NOT NULL DEFAULT 0,
    "companiesUsed" INTEGER NOT NULL DEFAULT 0,
    "usersUsed" INTEGER NOT NULL DEFAULT 0,
    "storageUsedMb" INTEGER NOT NULL DEFAULT 0,
    "baseCost" INTEGER NOT NULL DEFAULT 0,
    "overageCost" INTEGER NOT NULL DEFAULT 0,
    "totalCost" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_usage_records" (
    "id" TEXT NOT NULL,
    "usagePeriodId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "transactionCount" INTEGER NOT NULL DEFAULT 0,
    "transactionVolume" BIGINT NOT NULL DEFAULT 0,
    "apiCallCount" INTEGER NOT NULL DEFAULT 0,
    "allocatedCost" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_usage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_events" (
    "id" TEXT NOT NULL,
    "usagePeriodId" TEXT NOT NULL,
    "companyId" TEXT,
    "eventType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitCost" INTEGER NOT NULL DEFAULT 0,
    "totalCost" INTEGER NOT NULL DEFAULT 0,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "usagePeriodId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "tax" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "amountPaid" INTEGER NOT NULL DEFAULT 0,
    "amountDue" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "lineItems" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "stripeInvoiceId" TEXT,
    "stripePaymentIntentId" TEXT,
    "paymentMethod" TEXT,
    "pdfUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "scopeType" "ScopeType",
    "scopeId" TEXT,
    "changes" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "dataClassification" "DataClassification",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_intents" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "churnScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "churnRisk" "ChurnRiskLevel" NOT NULL DEFAULT 'LOW',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "signals" JSONB NOT NULL,
    "primaryFactors" TEXT[],
    "recommendedAction" "InterventionType",
    "urgency" "InterventionUrgency" NOT NULL DEFAULT 'MONITORING',
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interventions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "intentId" TEXT,
    "type" "InterventionType" NOT NULL,
    "channel" "DeliveryChannel" NOT NULL,
    "stage" TEXT,
    "templateId" TEXT,
    "content" JSONB,
    "offers" JSONB,
    "status" "InterventionStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "outcome" "InterventionOutcome",
    "outcomeDetails" JSONB,
    "revenueImpact" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interventions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "save_attempts" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "flowConfigId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "currentStage" INTEGER NOT NULL DEFAULT 1,
    "stageHistory" JSONB NOT NULL,
    "cancellationReason" TEXT,
    "reasonCategory" TEXT,
    "outcome" "SaveOutcome",
    "savedBy" TEXT,
    "offerAccepted" JSONB,
    "revenuePreserved" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "save_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_calls" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "interventionId" TEXT,
    "twilioCallSid" TEXT NOT NULL,
    "direction" "CallDirection" NOT NULL,
    "fromNumber" TEXT NOT NULL,
    "toNumber" TEXT NOT NULL,
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answeredAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "scriptId" TEXT NOT NULL,
    "transcriptRaw" TEXT,
    "transcriptProcessed" JSONB,
    "overallSentiment" "Sentiment",
    "detectedIntents" TEXT[],
    "keyMoments" JSONB,
    "status" "VoiceCallStatus" NOT NULL DEFAULT 'INITIATED',
    "outcome" "CallOutcome",
    "outcomeDetails" JSONB,
    "offersPresented" JSONB,
    "offerAccepted" JSONB,
    "actionsTaken" JSONB,
    "escalatedToHuman" BOOLEAN NOT NULL DEFAULT false,
    "escalationReason" TEXT,
    "humanAgentId" TEXT,
    "qualityScore" DOUBLE PRECISION,
    "qualityNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upsell_offers" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "UpsellType" NOT NULL,
    "moment" "UpsellMoment" NOT NULL,
    "productId" TEXT,
    "contentId" TEXT,
    "position" TEXT NOT NULL,
    "originalPrice" DOUBLE PRECISION,
    "offerPrice" DOUBLE PRECISION,
    "discount" DOUBLE PRECISION,
    "validUntil" TIMESTAMP(3),
    "triggerUsed" TEXT,
    "presented" BOOLEAN NOT NULL DEFAULT false,
    "presentedAt" TIMESTAMP(3),
    "accepted" BOOLEAN,
    "acceptedAt" TIMESTAMP(3),
    "revenue" DOUBLE PRECISION,
    "attributionWindow" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upsell_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upsell_configs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "aiRecommendations" BOOLEAN NOT NULL DEFAULT true,
    "globalLimits" JSONB NOT NULL,
    "channelDefaults" JSONB NOT NULL DEFAULT '{}',
    "aiSettings" JSONB NOT NULL,
    "triggerSettings" JSONB NOT NULL,
    "abTesting" JSONB NOT NULL DEFAULT '{"enabled": false, "defaultTrafficSplit": 50}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upsell_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "save_flow_configs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "patternInterrupt" JSONB NOT NULL,
    "diagnosisSurvey" JSONB NOT NULL,
    "branchingInterventions" JSONB NOT NULL,
    "nuclearOffer" JSONB NOT NULL,
    "lossVisualization" JSONB NOT NULL,
    "exitSurvey" JSONB NOT NULL,
    "winback" JSONB NOT NULL,
    "voiceAIEnabled" BOOLEAN NOT NULL DEFAULT false,
    "voiceAIConfig" JSONB,
    "activeExperiments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "save_flow_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_scripts" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "VoiceScriptType" NOT NULL,
    "description" TEXT,
    "opening" JSONB NOT NULL,
    "diagnosis" JSONB NOT NULL,
    "interventions" JSONB NOT NULL,
    "objectionHandling" JSONB NOT NULL,
    "closing" JSONB NOT NULL,
    "behavioralTriggers" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "avgSaveRate" DOUBLE PRECISION,
    "avgCallDuration" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_scripts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "behavioral_triggers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "implementation" JSONB NOT NULL,
    "examples" TEXT[],
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "avgEffectiveness" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "behavioral_triggers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "momentum_analytics" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "totalSaveAttempts" INTEGER NOT NULL DEFAULT 0,
    "successfulSaves" INTEGER NOT NULL DEFAULT 0,
    "saveRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "revenuePreserved" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stageMetrics" JSONB NOT NULL,
    "emailSaves" INTEGER NOT NULL DEFAULT 0,
    "smsSaves" INTEGER NOT NULL DEFAULT 0,
    "voiceSaves" INTEGER NOT NULL DEFAULT 0,
    "inAppSaves" INTEGER NOT NULL DEFAULT 0,
    "totalCalls" INTEGER NOT NULL DEFAULT 0,
    "avgCallDuration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "voiceSaveRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "contentGenerated" INTEGER NOT NULL DEFAULT 0,
    "topPerformingContent" JSONB,
    "upsellsPresented" INTEGER NOT NULL DEFAULT 0,
    "upsellsAccepted" INTEGER NOT NULL DEFAULT 0,
    "upsellRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "momentum_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intent_detections" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "sessionId" TEXT,
    "primaryIntent" TEXT NOT NULL,
    "primaryConfidence" DOUBLE PRECISION NOT NULL,
    "secondaryIntents" JSONB NOT NULL DEFAULT '[]',
    "cancelReason" TEXT,
    "cancelReasonConfidence" DOUBLE PRECISION,
    "sentiment" TEXT NOT NULL,
    "sentimentScore" DOUBLE PRECISION NOT NULL,
    "urgency" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceData" JSONB,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intent_detections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "churn_signals" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "signalType" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "value" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "decayDays" INTEGER NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "churn_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "churn_risk_scores" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "signalBreakdown" JSONB NOT NULL,
    "trend" TEXT NOT NULL,
    "trendDelta" DOUBLE PRECISION NOT NULL,
    "predictedChurnDate" TIMESTAMP(3),
    "recommendedActions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextCalculationAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "churn_risk_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_engagement_metrics" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "loginFrequency" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "loginFrequencyTrend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "featuresUsed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "featureUsageScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "ordersLast30Days" INTEGER NOT NULL DEFAULT 0,
    "ordersLast90Days" INTEGER NOT NULL DEFAULT 0,
    "orderFrequencyTrend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSkips" INTEGER NOT NULL DEFAULT 0,
    "skipsLast30Days" INTEGER NOT NULL DEFAULT 0,
    "skipRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "supportTicketsTotal" INTEGER NOT NULL DEFAULT 0,
    "supportTicketsLast30Days" INTEGER NOT NULL DEFAULT 0,
    "avgTicketResolutionHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastNpsScore" INTEGER,
    "lastNpsDate" TIMESTAMP(3),
    "lastFeedbackSentiment" TEXT,
    "engagementScore" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "healthScore" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_engagement_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cs_sessions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "currentTier" "CSTier" NOT NULL DEFAULT 'AI_REP',
    "status" "CSSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "issueCategory" TEXT,
    "issueSummary" TEXT,
    "customerSentiment" TEXT NOT NULL DEFAULT 'NEUTRAL',
    "sentimentHistory" JSONB NOT NULL DEFAULT '[]',
    "escalationHistory" JSONB NOT NULL DEFAULT '[]',
    "context" JSONB NOT NULL DEFAULT '{}',
    "resolutionType" TEXT,
    "resolutionSummary" TEXT,
    "resolutionActions" JSONB,
    "customerSatisfaction" INTEGER,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "followUpDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "cs_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cs_messages" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sentiment" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cs_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cs_configs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "aiRepConfig" JSONB NOT NULL,
    "aiManagerConfig" JSONB NOT NULL,
    "humanAgentConfig" JSONB NOT NULL,
    "irateProtocol" JSONB NOT NULL,
    "channelConfigs" JSONB NOT NULL,
    "businessHours" JSONB NOT NULL,
    "responseTemplates" JSONB NOT NULL DEFAULT '[]',
    "integrations" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cs_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "rmaId" TEXT,
    "csSessionId" TEXT,
    "type" "RefundType" NOT NULL DEFAULT 'MANUAL',
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "reason" "RefundReason" NOT NULL,
    "reasonDetails" TEXT,
    "requestedAmount" DECIMAL(10,2) NOT NULL,
    "approvedAmount" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "amountBreakdown" JSONB,
    "method" "RefundMethod" NOT NULL DEFAULT 'ORIGINAL_PAYMENT',
    "approvalLevel" TEXT NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "autoApprovalRule" TEXT,
    "paymentProcessor" TEXT,
    "processorTransactionId" TEXT,
    "processedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "initiatedBy" TEXT NOT NULL,
    "channel" TEXT,
    "customerImpact" TEXT,
    "fraudScore" DOUBLE PRECISION,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_policies" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "generalRules" JSONB NOT NULL,
    "autoApprovalRules" JSONB NOT NULL DEFAULT '[]',
    "tierLimits" JSONB NOT NULL,
    "reasonSpecificRules" JSONB NOT NULL DEFAULT '[]',
    "notifications" JSONB NOT NULL,
    "fraudPrevention" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refund_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rmas" (
    "id" TEXT NOT NULL,
    "rmaNumber" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "csSessionId" TEXT,
    "type" "RMAType" NOT NULL DEFAULT 'RETURN',
    "status" "RMAStatus" NOT NULL DEFAULT 'REQUESTED',
    "reason" "ReturnReason" NOT NULL,
    "reasonDetails" TEXT,
    "items" JSONB NOT NULL,
    "labelType" TEXT NOT NULL,
    "carrier" TEXT,
    "trackingNumber" TEXT,
    "trackingUrl" TEXT,
    "labelUrl" TEXT,
    "labelSentAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "returnAddress" JSONB NOT NULL,
    "inspectionStatus" TEXT,
    "inspectionResult" TEXT,
    "inspectionNotes" TEXT,
    "inspectionPhotos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "inspectedAt" TIMESTAMP(3),
    "inspectedBy" TEXT,
    "resolutionType" TEXT NOT NULL DEFAULT 'refund',
    "resolutionStatus" TEXT NOT NULL DEFAULT 'pending',
    "resolutionData" JSONB,
    "timeline" JSONB NOT NULL DEFAULT '[]',
    "initiatedBy" TEXT NOT NULL,
    "channel" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "rmas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rma_policies" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "generalRules" JSONB NOT NULL,
    "returnReasons" JSONB NOT NULL DEFAULT '[]',
    "shippingConfig" JSONB NOT NULL,
    "inspectionConfig" JSONB NOT NULL,
    "resolutionConfig" JSONB NOT NULL,
    "notifications" JSONB NOT NULL,
    "automation" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rma_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terms_documents" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "TermsType" NOT NULL,
    "title" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "status" "TermsStatus" NOT NULL DEFAULT 'DRAFT_TERMS',
    "fullText" TEXT NOT NULL,
    "htmlFormatted" TEXT,
    "sections" JSONB NOT NULL DEFAULT '[]',
    "language" TEXT NOT NULL DEFAULT 'en',
    "translations" JSONB,
    "readabilityScore" INTEGER NOT NULL DEFAULT 0,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "estimatedReadTime" INTEGER NOT NULL DEFAULT 0,
    "author" TEXT,
    "lastModifiedBy" TEXT,
    "reviewedBy" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "generatedBy" TEXT,
    "aiModel" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "internalNotes" TEXT,
    "externalUrl" TEXT,
    "complianceFrameworks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "jurisdictions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "complianceRequirements" JSONB NOT NULL DEFAULT '[]',
    "history" JSONB NOT NULL DEFAULT '[]',
    "effectiveDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "terms_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terms_summaries" (
    "id" TEXT NOT NULL,
    "termsDocumentId" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "keyPoints" JSONB,
    "faqs" JSONB,
    "importantDates" JSONB,
    "userRights" JSONB,
    "userObligations" JSONB,
    "language" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "terms_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terms_acceptances" (
    "id" TEXT NOT NULL,
    "termsDocumentId" TEXT NOT NULL,
    "termsVersion" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "userId" TEXT,
    "acceptanceMethod" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "location" TEXT,
    "deviceType" TEXT,
    "channel" TEXT,
    "withdrawnAt" TIMESTAMP(3),
    "withdrawalReason" TEXT,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "terms_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terms_analytics" (
    "id" TEXT NOT NULL,
    "termsDocumentId" TEXT NOT NULL,
    "totalViews" INTEGER NOT NULL DEFAULT 0,
    "uniqueViews" INTEGER NOT NULL DEFAULT 0,
    "avgTimeOnPage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAcceptances" INTEGER NOT NULL DEFAULT 0,
    "acceptanceRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sectionViews" JSONB NOT NULL DEFAULT '{}',
    "searchQueries" JSONB NOT NULL DEFAULT '[]',
    "faqClicks" JSONB NOT NULL DEFAULT '{}',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "terms_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_templates" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "subject" TEXT,
    "preheader" TEXT,
    "body" TEXT NOT NULL,
    "bodyHtml" TEXT,
    "variables" JSONB NOT NULL DEFAULT '[]',
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "aiProvider" TEXT,
    "aiPrompt" TEXT,
    "triggersApplied" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "triggerConfig" JSONB,
    "personalizationLevel" TEXT NOT NULL DEFAULT 'basic',
    "dynamicSections" JSONB,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "conversionRate" DOUBLE PRECISION,
    "openRate" DOUBLE PRECISION,
    "clickRate" DOUBLE PRECISION,
    "version" INTEGER NOT NULL DEFAULT 1,
    "previousVersionId" TEXT,
    "createdBy" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_contents" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "templateId" TEXT,
    "type" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "systemPrompt" TEXT,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "bodyHtml" TEXT,
    "variations" JSONB,
    "selectedVariationId" TEXT,
    "customerId" TEXT,
    "customerContext" JSONB,
    "triggersApplied" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "triggerApplications" JSONB,
    "qualityScore" DOUBLE PRECISION,
    "readabilityScore" DOUBLE PRECISION,
    "sentimentScore" DOUBLE PRECISION,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "generationTimeMs" INTEGER NOT NULL DEFAULT 0,
    "cost" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'GENERATED',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generated_contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_generation_configs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "providers" JSONB NOT NULL,
    "claude" JSONB NOT NULL,
    "ollama" JSONB NOT NULL,
    "quality" JSONB NOT NULL,
    "triggers" JSONB NOT NULL,
    "brandVoice" JSONB NOT NULL,
    "personalization" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_generation_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_messages" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "recipientEmail" TEXT,
    "recipientPhone" TEXT,
    "recipientDeviceTokens" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "channel" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "templateId" TEXT,
    "contentId" TEXT,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "bodyHtml" TEXT,
    "category" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scheduleType" TEXT NOT NULL DEFAULT 'IMMEDIATE',
    "scheduledFor" TIMESTAMP(3),
    "optimalSendWindow" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "statusHistory" JSONB NOT NULL DEFAULT '[]',
    "providerMessageId" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "convertedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "opensCount" INTEGER NOT NULL DEFAULT 0,
    "clicksCount" INTEGER NOT NULL DEFAULT 0,
    "clickedLinks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "variantId" TEXT,
    "experimentId" TEXT,
    "automationId" TEXT,
    "automationStepId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_retries" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "retriesRemaining" INTEGER NOT NULL,
    "lastRetryAt" TIMESTAMP(3),
    "nextRetryAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_retries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_preferences" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "unsubscribed" BOOLEAN NOT NULL DEFAULT false,
    "unsubscribedAt" TIMESTAMP(3),

    CONSTRAINT "customer_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_configs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "channelPriority" TEXT[],
    "defaultChannel" TEXT NOT NULL,
    "sendTimeOptimization" JSONB NOT NULL,
    "globalRateLimits" JSONB NOT NULL,
    "honorUnsubscribes" BOOLEAN NOT NULL DEFAULT true,
    "doubleOptIn" BOOLEAN NOT NULL DEFAULT false,
    "trackOpens" BOOLEAN NOT NULL DEFAULT true,
    "trackClicks" BOOLEAN NOT NULL DEFAULT true,
    "trackConversions" BOOLEAN NOT NULL DEFAULT true,
    "retrySettings" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automations" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "trigger" JSONB NOT NULL,
    "steps" JSONB NOT NULL,
    "settings" JSONB NOT NULL,
    "enrollmentCount" INTEGER NOT NULL DEFAULT 0,
    "completionCount" INTEGER NOT NULL DEFAULT 0,
    "conversionCount" INTEGER NOT NULL DEFAULT 0,
    "conversionRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "activatedAt" TIMESTAMP(3),

    CONSTRAINT "automations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_enrollments" (
    "id" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "currentStepId" TEXT,
    "currentStepStartedAt" TIMESTAMP(3),
    "stepsCompleted" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "messagesSent" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "triggerData" JSONB,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "exitedAt" TIMESTAMP(3),
    "exitReason" TEXT,
    "convertedAt" TIMESTAMP(3),
    "conversionValue" DECIMAL(10,2),

    CONSTRAINT "automation_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_reports" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "metrics" JSONB NOT NULL,
    "customMetrics" JSONB,
    "filters" JSONB NOT NULL,
    "schedule" JSONB,
    "delivery" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastGeneratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_snapshots" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "granularity" TEXT NOT NULL,
    "churnRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "churnedCustomers" INTEGER NOT NULL DEFAULT 0,
    "churnedRevenue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "saveAttempts" INTEGER NOT NULL DEFAULT 0,
    "successfulSaves" INTEGER NOT NULL DEFAULT 0,
    "saveRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "revenueSaved" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalCalls" INTEGER NOT NULL DEFAULT 0,
    "avgCallDuration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "callSaveRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "messagesSent" INTEGER NOT NULL DEFAULT 0,
    "messagesDelivered" INTEGER NOT NULL DEFAULT 0,
    "deliveryRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "openRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "clickRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "upsellsPresented" INTEGER NOT NULL DEFAULT 0,
    "upsellsConverted" INTEGER NOT NULL DEFAULT 0,
    "upsellConversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "upsellRevenue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalRevenue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "recurringRevenue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "netRevenueRetention" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "activeSubscriptions" INTEGER NOT NULL DEFAULT 0,
    "atRiskCustomers" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_alerts" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metric" TEXT,
    "threshold" DOUBLE PRECISION,
    "currentValue" DOUBLE PRECISION,
    "actionUrl" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,
    "dismissedAt" TIMESTAMP(3),
    "dismissedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dashboard_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_definitions" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "logoUrl" TEXT,
    "documentationUrl" TEXT,
    "isOrgOnly" BOOLEAN NOT NULL DEFAULT false,
    "isClientAllowed" BOOLEAN NOT NULL DEFAULT true,
    "isPlatformOffered" BOOLEAN NOT NULL DEFAULT false,
    "credentialSchema" JSONB NOT NULL,
    "settingsSchema" JSONB NOT NULL DEFAULT '{}',
    "requiredCompliance" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'active',
    "authType" "AuthType" NOT NULL DEFAULT 'API_KEY',
    "oauthConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_tokens" (
    "id" TEXT NOT NULL,
    "platformIntegrationId" TEXT,
    "clientIntegrationId" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenType" TEXT NOT NULL DEFAULT 'Bearer',
    "expiresAt" TIMESTAMP(3),
    "refreshExpiresAt" TIMESTAMP(3),
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "providerUserId" TEXT,
    "providerAccountId" TEXT,
    "providerData" JSONB,
    "keyVersion" INTEGER NOT NULL DEFAULT 1,
    "status" "OAuthTokenStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastRefreshedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oauth_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_states" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "organizationId" TEXT,
    "clientId" TEXT,
    "userId" TEXT NOT NULL,
    "flowType" "OAuthFlowType" NOT NULL DEFAULT 'PLATFORM',
    "redirectUrl" TEXT,
    "metadata" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_integrations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "credentials" JSONB NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "environment" TEXT NOT NULL DEFAULT 'SANDBOX',
    "isSharedWithClients" BOOLEAN NOT NULL DEFAULT false,
    "clientPricing" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "lastTestedAt" TIMESTAMP(3),
    "lastTestResult" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "platform_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_integrations" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'OWN',
    "credentials" JSONB,
    "platformIntegrationId" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "environment" TEXT NOT NULL DEFAULT 'SANDBOX',
    "usageThisMonth" JSONB,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "lastTestedAt" TIMESTAMP(3),
    "lastTestResult" TEXT,
    "errorMessage" TEXT,
    "merchantAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "client_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_usage" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "clientIntegrationId" TEXT,
    "platformIntegrationId" TEXT,
    "usageType" TEXT NOT NULL DEFAULT 'request',
    "sessionToken" TEXT,
    "requestCount" INTEGER NOT NULL DEFAULT 1,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "baseCostCents" INTEGER NOT NULL DEFAULT 0,
    "markupPercent" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "billableCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "billingPeriod" TEXT,
    "invoiceId" TEXT,
    "billedAt" TIMESTAMP(3),
    "endpoint" TEXT,
    "metadata" JSONB,
    "responseCode" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deletion_logs" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityName" TEXT,
    "companyId" TEXT,
    "deletedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "cascadeId" TEXT,
    "cascadedFrom" TEXT,
    "snapshot" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "restoredAt" TIMESTAMP(3),
    "restoredBy" TEXT,
    "purgedAt" TIMESTAMP(3),
    "purgeReason" TEXT,

    CONSTRAINT "deletion_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhooks" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "events" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "secret" TEXT,
    "headers" JSONB DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggeredAt" TIMESTAMP(3),
    "lastStatus" TEXT,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "cascadeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "level" INTEGER NOT NULL DEFAULT 0,
    "path" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "cascadeId" TEXT,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_tags" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_media" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "type" "MediaType" NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "duration" INTEGER,
    "altText" TEXT,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "generatedBy" TEXT,
    "generationMetadata" JSONB,
    "storageProvider" TEXT NOT NULL DEFAULT 'S3',
    "storageKey" TEXT NOT NULL,
    "cdnUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_price_rules" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PriceRuleType" NOT NULL,
    "minQuantity" INTEGER,
    "maxQuantity" INTEGER,
    "customerGroupId" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "adjustmentType" "AdjustmentType" NOT NULL,
    "adjustmentValue" DECIMAL(10,2) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_price_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "options" JSONB NOT NULL,
    "price" DECIMAL(10,2),
    "compareAtPrice" DECIMAL(10,2),
    "costPrice" DECIMAL(10,2),
    "weight" DECIMAL(10,3),
    "trackInventory" BOOLEAN NOT NULL DEFAULT true,
    "inventoryQuantity" INTEGER NOT NULL DEFAULT 0,
    "lowStockThreshold" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variant_options" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "variant_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variant_option_values" (
    "id" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "displayValue" TEXT,
    "colorCode" TEXT,
    "imageUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "variant_option_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collections" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "bannerUrl" TEXT,
    "type" "CollectionType" NOT NULL DEFAULT 'MANUAL',
    "rules" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3),
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_products" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bundles" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "BundleType" NOT NULL DEFAULT 'FIXED',
    "minItems" INTEGER,
    "maxItems" INTEGER,
    "pricingStrategy" "BundlePricing" NOT NULL DEFAULT 'FIXED',
    "discountType" "AdjustmentType",
    "discountValue" DECIMAL(10,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bundles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bundle_items" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "priceOverride" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bundle_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_locations" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "LocationType" NOT NULL DEFAULT 'WAREHOUSE',
    "address1" TEXT,
    "address2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_levels" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "onHand" INTEGER NOT NULL DEFAULT 0,
    "committed" INTEGER NOT NULL DEFAULT 0,
    "incoming" INTEGER NOT NULL DEFAULT 0,
    "available" INTEGER NOT NULL DEFAULT 0,
    "reorderPoint" INTEGER,
    "reorderQuantity" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_adjustments" (
    "id" TEXT NOT NULL,
    "inventoryLevelId" TEXT NOT NULL,
    "type" "AdjustmentReason" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "previousQuantity" INTEGER NOT NULL,
    "newQuantity" INTEGER NOT NULL,
    "reason" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "inventory_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_videos" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "type" "MarketingVideoType" NOT NULL,
    "status" "VideoGenerationStatus" NOT NULL DEFAULT 'PENDING',
    "templateId" TEXT,
    "style" JSONB,
    "script" TEXT,
    "voiceoverText" TEXT,
    "callToAction" TEXT,
    "outputUrl" TEXT,
    "thumbnailUrl" TEXT,
    "duration" INTEGER,
    "generationStartedAt" TIMESTAMP(3),
    "generationCompletedAt" TIMESTAMP(3),
    "generationError" TEXT,
    "creditsUsed" DECIMAL(10,2),
    "customerId" TEXT,
    "interventionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "marketing_videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_video_scenes" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "sceneNumber" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "mediaType" "SceneMediaType" NOT NULL,
    "mediaUrl" TEXT,
    "mediaGeneratedBy" TEXT,
    "textOverlay" TEXT,
    "textPosition" TEXT,
    "textStyle" JSONB,
    "transitionIn" TEXT,
    "transitionOut" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketing_video_scenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_video_variants" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "platform" "VideoPlatform" NOT NULL,
    "aspectRatio" TEXT NOT NULL,
    "outputUrl" TEXT,
    "thumbnailUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketing_video_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_video_templates" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "MarketingVideoType" NOT NULL,
    "sceneCount" INTEGER NOT NULL,
    "defaultDuration" INTEGER NOT NULL,
    "structure" JSONB NOT NULL,
    "defaultStyle" JSONB,
    "scriptTemplate" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_video_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "scopeType" "ScopeType" NOT NULL,
    "scopeId" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "constraints" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_role_assignments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "scopeType" "ScopeType" NOT NULL,
    "scopeId" TEXT NOT NULL,
    "assignedBy" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "user_role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission_grants" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "scopeType" "ScopeType" NOT NULL,
    "scopeId" TEXT NOT NULL,
    "grantType" "PermissionGrantType" NOT NULL DEFAULT 'ALLOW',
    "grantedBy" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "reason" TEXT,
    "constraints" JSONB,

    CONSTRAINT "permission_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "deviceInfo" JSONB,
    "city" TEXT,
    "country" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "revokeReason" TEXT,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "code" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "businessName" TEXT,
    "taxId" TEXT,
    "website" TEXT,
    "logo" TEXT,
    "description" TEXT,
    "status" "VendorStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "tier" "VendorTier" NOT NULL DEFAULT 'BRONZE',
    "vendorType" "VendorType" NOT NULL DEFAULT 'SUPPLIER',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "averageRating" DOUBLE PRECISION DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "completionRate" DOUBLE PRECISION DEFAULT 100,
    "averageShipDays" DOUBLE PRECISION,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "cascadeId" TEXT,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_companies" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "code" TEXT,
    "domain" TEXT,
    "logo" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'US',
    "postalCode" TEXT,
    "capabilities" TEXT[],
    "productCategories" TEXT[],
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "defaultLeadTimeDays" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "cascadeId" TEXT,

    CONSTRAINT "vendor_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_client_connections" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "vendorCompanyId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "customPricing" JSONB,
    "terms" JSONB,
    "creditLimit" DOUBLE PRECISION,
    "paymentTerms" TEXT,
    "syncMode" "ProductSyncMode" NOT NULL DEFAULT 'MANUAL',
    "lastSyncAt" TIMESTAMP(3),
    "autoSyncEnabled" BOOLEAN NOT NULL DEFAULT false,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,

    CONSTRAINT "vendor_client_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_products" (
    "id" TEXT NOT NULL,
    "vendorCompanyId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "wholesalePrice" DOUBLE PRECISION NOT NULL,
    "retailPrice" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 10,
    "weight" DOUBLE PRECISION,
    "dimensions" JSONB,
    "images" TEXT[],
    "categories" TEXT[],
    "leadTimeDays" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_product_syncs" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "vendorProductId" TEXT NOT NULL,
    "companyProductId" TEXT,
    "status" "ProductSyncStatus" NOT NULL DEFAULT 'PENDING',
    "lastSyncAt" TIMESTAMP(3),
    "syncError" TEXT,
    "customPrice" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_product_syncs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_orders" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "vendorCompanyId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "sourceOrderId" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "subtotal" DOUBLE PRECISION NOT NULL,
    "shippingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "shippingAddress" JSONB,
    "shippingMethod" TEXT,
    "trackingNumber" TEXT,
    "carrier" "ShippingCarrier",
    "expectedDeliveryAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "notes" TEXT,
    "vendorNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_order_items" (
    "id" TEXT NOT NULL,
    "vendorOrderId" TEXT NOT NULL,
    "vendorProductId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "quantityFulfilled" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_reviews" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "vendorCompanyId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "content" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedPurchase" BOOLEAN NOT NULL DEFAULT false,
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "moderatedAt" TIMESTAMP(3),
    "moderatedBy" TEXT,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "vendorResponse" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_notes" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "userId" TEXT,
    "content" TEXT NOT NULL,
    "type" "NoteType" NOT NULL DEFAULT 'INTERNAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_tags" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_settings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "autoApprovalEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoApprovalMaxAmount" DECIMAL(10,2) NOT NULL DEFAULT 100.00,
    "autoApprovalMaxDays" INTEGER NOT NULL DEFAULT 30,
    "requireReason" BOOLEAN NOT NULL DEFAULT true,
    "requireApproval" BOOLEAN NOT NULL DEFAULT true,
    "allowPartialRefunds" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnRequest" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnApproval" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnCompletion" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refund_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_reviews" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "customerId" TEXT,
    "orderId" TEXT,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "content" TEXT,
    "pros" TEXT[],
    "cons" TEXT[],
    "reviewerName" TEXT,
    "reviewerEmail" TEXT,
    "isVerifiedPurchase" BOOLEAN NOT NULL DEFAULT false,
    "purchaseDate" TIMESTAMP(3),
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "moderatedAt" TIMESTAMP(3),
    "moderatedBy" TEXT,
    "moderationNotes" TEXT,
    "rejectReason" TEXT,
    "sentimentScore" DOUBLE PRECISION,
    "keyPhrases" TEXT[],
    "aiSummary" TEXT,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "unhelpfulCount" INTEGER NOT NULL DEFAULT 0,
    "reportCount" INTEGER NOT NULL DEFAULT 0,
    "merchantResponse" TEXT,
    "merchantRespondedAt" TIMESTAMP(3),
    "merchantRespondedBy" TEXT,
    "source" "ReviewSource" NOT NULL DEFAULT 'WEBSITE',
    "sourceId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_media" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT,
    "mimeType" TEXT,
    "size" INTEGER,
    "thumbnailUrl" TEXT,
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_votes" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "customerId" TEXT,
    "ipAddress" TEXT,
    "isHelpful" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_configs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "autoApprove" BOOLEAN NOT NULL DEFAULT false,
    "requireVerifiedPurchase" BOOLEAN NOT NULL DEFAULT false,
    "minRatingForAutoApprove" INTEGER,
    "moderationKeywords" TEXT[],
    "showVerifiedBadge" BOOLEAN NOT NULL DEFAULT true,
    "showReviewerName" BOOLEAN NOT NULL DEFAULT true,
    "showReviewDate" BOOLEAN NOT NULL DEFAULT true,
    "allowAnonymous" BOOLEAN NOT NULL DEFAULT true,
    "sortDefault" TEXT NOT NULL DEFAULT 'newest',
    "minReviewLength" INTEGER NOT NULL DEFAULT 0,
    "maxReviewLength" INTEGER NOT NULL DEFAULT 5000,
    "allowMedia" BOOLEAN NOT NULL DEFAULT true,
    "maxMediaPerReview" INTEGER NOT NULL DEFAULT 5,
    "allowProsAndCons" BOOLEAN NOT NULL DEFAULT true,
    "sendReviewRequest" BOOLEAN NOT NULL DEFAULT true,
    "reviewRequestDelay" INTEGER NOT NULL DEFAULT 7,
    "sendResponseNotification" BOOLEAN NOT NULL DEFAULT true,
    "widgetTheme" TEXT NOT NULL DEFAULT 'light',
    "widgetPosition" TEXT NOT NULL DEFAULT 'bottom',
    "widgetPrimaryColor" TEXT NOT NULL DEFAULT '#3B82F6',
    "widgetCustomCss" TEXT,
    "enableRichSnippets" BOOLEAN NOT NULL DEFAULT true,
    "schemaType" TEXT NOT NULL DEFAULT 'Product',
    "incentiveEnabled" BOOLEAN NOT NULL DEFAULT false,
    "incentiveType" TEXT,
    "incentiveValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_review_stats" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "approvedReviews" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rating1Count" INTEGER NOT NULL DEFAULT 0,
    "rating2Count" INTEGER NOT NULL DEFAULT 0,
    "rating3Count" INTEGER NOT NULL DEFAULT 0,
    "rating4Count" INTEGER NOT NULL DEFAULT 0,
    "rating5Count" INTEGER NOT NULL DEFAULT 0,
    "verifiedReviews" INTEGER NOT NULL DEFAULT 0,
    "verifiedAvgRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "topKeywords" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_review_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_pages" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "subdomain" TEXT,
    "theme" "LandingPageTheme" NOT NULL DEFAULT 'STARTER',
    "colorScheme" JSONB NOT NULL DEFAULT '{}',
    "typography" JSONB NOT NULL DEFAULT '{}',
    "favicon" TEXT,
    "ogImage" TEXT,
    "customCss" TEXT,
    "customJs" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "keywords" TEXT[],
    "googleAnalyticsId" TEXT,
    "facebookPixelId" TEXT,
    "hostingType" "LandingPageHosting" NOT NULL DEFAULT 'PLATFORM',
    "platformDistributionId" TEXT,
    "platformUrl" TEXT,
    "platformS3Path" TEXT,
    "clientBucketName" TEXT,
    "clientDistributionId" TEXT,
    "clientUrl" TEXT,
    "status" "LandingPageStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "publishedBy" TEXT,
    "lastDeployedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "billingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "monthlyFee" INTEGER NOT NULL DEFAULT 0,
    "totalPageViews" BIGINT NOT NULL DEFAULT 0,
    "totalBandwidthMb" BIGINT NOT NULL DEFAULT 0,
    "totalDeploys" INTEGER NOT NULL DEFAULT 0,
    "lastPageViewAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "landing_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_page_sections" (
    "id" TEXT NOT NULL,
    "landingPageId" TEXT NOT NULL,
    "type" "SectionType" NOT NULL,
    "name" TEXT,
    "order" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "content" JSONB NOT NULL,
    "styles" JSONB,
    "hideOnMobile" BOOLEAN NOT NULL DEFAULT false,
    "hideOnDesktop" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landing_page_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_page_domains" (
    "id" TEXT NOT NULL,
    "landingPageId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sslStatus" "DomainSslStatus" NOT NULL DEFAULT 'PENDING',
    "sslCertArn" TEXT,
    "sslExpiresAt" TIMESTAMP(3),
    "verificationToken" TEXT,
    "verificationRecord" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "distributionId" TEXT,
    "distributionArn" TEXT,
    "monthlyFee" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landing_page_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_page_usage" (
    "id" TEXT NOT NULL,
    "landingPageId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "pageViews" BIGINT NOT NULL DEFAULT 0,
    "uniqueVisitors" BIGINT NOT NULL DEFAULT 0,
    "bandwidthMb" BIGINT NOT NULL DEFAULT 0,
    "deployCount" INTEGER NOT NULL DEFAULT 0,
    "baseFee" INTEGER NOT NULL DEFAULT 0,
    "bandwidthFee" INTEGER NOT NULL DEFAULT 0,
    "customDomainFee" INTEGER NOT NULL DEFAULT 0,
    "totalFee" INTEGER NOT NULL DEFAULT 0,
    "invoiced" BOOLEAN NOT NULL DEFAULT false,
    "invoicedAt" TIMESTAMP(3),
    "invoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landing_page_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_page_pricing" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "monthlyBaseFee" INTEGER NOT NULL DEFAULT 999,
    "customDomainFee" INTEGER NOT NULL DEFAULT 499,
    "includedPageViews" INTEGER NOT NULL DEFAULT 10000,
    "includedBandwidthMb" INTEGER NOT NULL DEFAULT 1000,
    "includedDeploys" INTEGER NOT NULL DEFAULT 50,
    "overageViewsPer1000" INTEGER NOT NULL DEFAULT 50,
    "overageBandwidthPerGb" INTEGER NOT NULL DEFAULT 100,
    "freePagesAllowed" INTEGER NOT NULL DEFAULT 1,
    "freeTrialDays" INTEGER NOT NULL DEFAULT 14,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landing_page_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feature" "AIFeature" NOT NULL,
    "operation" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "inputCost" INTEGER NOT NULL,
    "outputCost" INTEGER NOT NULL,
    "totalCost" INTEGER NOT NULL,
    "landingPageId" TEXT,
    "metadata" JSONB,
    "status" "AIUsageStatus" NOT NULL DEFAULT 'SUCCESS',
    "errorMsg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage_summary" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "totalRequests" INTEGER NOT NULL DEFAULT 0,
    "totalInputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalOutputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "totalCost" INTEGER NOT NULL DEFAULT 0,
    "usageByFeature" JSONB NOT NULL DEFAULT '{}',
    "invoiced" BOOLEAN NOT NULL DEFAULT false,
    "invoicedAt" TIMESTAMP(3),
    "invoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_usage_summary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_pricing" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "inputTokenPrice" INTEGER NOT NULL DEFAULT 3,
    "outputTokenPrice" INTEGER NOT NULL DEFAULT 15,
    "monthlyTokenAllowance" INTEGER NOT NULL DEFAULT 100000,
    "overageInputPrice" INTEGER NOT NULL DEFAULT 4,
    "overageOutputPrice" INTEGER NOT NULL DEFAULT 20,
    "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ab_tests" (
    "id" TEXT NOT NULL,
    "landingPageId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ABTestStatus" NOT NULL DEFAULT 'DRAFT',
    "trafficPercentage" INTEGER NOT NULL DEFAULT 100,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "scheduledStart" TIMESTAMP(3),
    "scheduledEnd" TIMESTAMP(3),
    "confidenceLevel" INTEGER NOT NULL DEFAULT 95,
    "minimumSampleSize" INTEGER NOT NULL DEFAULT 100,
    "primaryMetric" TEXT NOT NULL DEFAULT 'conversions',
    "winnerId" TEXT,
    "winnerDeclaredAt" TIMESTAMP(3),
    "statisticalSignificance" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "ab_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ab_test_variants" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isControl" BOOLEAN NOT NULL DEFAULT false,
    "weight" INTEGER NOT NULL DEFAULT 50,
    "changes" JSONB NOT NULL,
    "visitors" BIGINT NOT NULL DEFAULT 0,
    "conversions" BIGINT NOT NULL DEFAULT 0,
    "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bounceRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgTimeOnPage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRevenue" BIGINT NOT NULL DEFAULT 0,
    "avgOrderValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ab_test_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ab_test_assignments" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "converted" BOOLEAN NOT NULL DEFAULT false,
    "convertedAt" TIMESTAMP(3),
    "revenue" BIGINT,

    CONSTRAINT "ab_test_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_page_popups" (
    "id" TEXT NOT NULL,
    "landingPageId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PopupType" NOT NULL DEFAULT 'MODAL',
    "status" "PopupStatus" NOT NULL DEFAULT 'DRAFT',
    "trigger" "PopupTrigger" NOT NULL DEFAULT 'TIME_DELAY',
    "triggerValue" INTEGER,
    "triggerSelector" TEXT,
    "position" TEXT NOT NULL DEFAULT 'center',
    "animation" TEXT NOT NULL DEFAULT 'fade',
    "overlay" BOOLEAN NOT NULL DEFAULT true,
    "overlayClose" BOOLEAN NOT NULL DEFAULT true,
    "content" JSONB NOT NULL,
    "styles" JSONB,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "showOnce" BOOLEAN NOT NULL DEFAULT false,
    "showEveryDays" INTEGER,
    "showOnMobile" BOOLEAN NOT NULL DEFAULT true,
    "showOnDesktop" BOOLEAN NOT NULL DEFAULT true,
    "showOnAllPages" BOOLEAN NOT NULL DEFAULT true,
    "targetPages" TEXT[],
    "impressions" BIGINT NOT NULL DEFAULT 0,
    "closes" BIGINT NOT NULL DEFAULT 0,
    "conversions" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "landing_page_popups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dynamic_text_rules" (
    "id" TEXT NOT NULL,
    "landingPageId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "parameterName" TEXT NOT NULL,
    "defaultValue" TEXT NOT NULL,
    "targets" JSONB NOT NULL,
    "valueMappings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dynamic_text_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversion_goals" (
    "id" TEXT NOT NULL,
    "landingPageId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ConversionGoalType" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "selector" TEXT,
    "targetUrl" TEXT,
    "threshold" INTEGER,
    "eventName" TEXT,
    "revenueValue" INTEGER,
    "totalConversions" BIGINT NOT NULL DEFAULT 0,
    "totalRevenue" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversion_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversion_events" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pageUrl" TEXT,
    "referrer" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "revenue" INTEGER,

    CONSTRAINT "conversion_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkout_page_themes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "CheckoutPageThemeCategory" NOT NULL,
    "previewImageUrl" TEXT,
    "previewImageDark" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" TEXT,
    "companyId" TEXT,
    "styles" JSONB NOT NULL,
    "layout" JSONB NOT NULL,
    "components" JSONB NOT NULL,
    "darkModeStyles" JSONB,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "averageConversion" DECIMAL(5,2),
    "rating" DECIMAL(3,2),
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "checkout_page_themes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_pages" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "customDomain" TEXT,
    "type" "PaymentPageType" NOT NULL,
    "status" "PaymentPageStatus" NOT NULL DEFAULT 'DRAFT',
    "themeId" TEXT,
    "customStyles" JSONB,
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "brandColor" TEXT,
    "title" TEXT,
    "description" TEXT,
    "headline" TEXT,
    "subheadline" TEXT,
    "paymentConfig" JSONB NOT NULL,
    "acceptedGateways" JSONB NOT NULL,
    "lineItemsConfig" JSONB,
    "subscriptionConfig" JSONB,
    "donationConfig" JSONB,
    "customerFieldsConfig" JSONB NOT NULL,
    "shippingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "shippingConfig" JSONB,
    "taxEnabled" BOOLEAN NOT NULL DEFAULT false,
    "taxConfig" JSONB,
    "discountsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "discountsConfig" JSONB,
    "termsUrl" TEXT,
    "privacyUrl" TEXT,
    "refundPolicyUrl" TEXT,
    "customTermsText" TEXT,
    "requireTermsAccept" BOOLEAN NOT NULL DEFAULT false,
    "successUrl" TEXT,
    "cancelUrl" TEXT,
    "successMessage" TEXT,
    "webhookUrl" TEXT,
    "webhookSecret" TEXT,
    "aiInsightsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "conversionTracking" BOOLEAN NOT NULL DEFAULT true,
    "isVariant" BOOLEAN NOT NULL DEFAULT false,
    "parentPageId" TEXT,
    "variantName" TEXT,
    "variantWeight" INTEGER,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "ogImage" TEXT,
    "noIndex" BOOLEAN NOT NULL DEFAULT false,
    "allowedDomains" JSONB,
    "rateLimit" INTEGER,
    "scriptInventory" JSONB,
    "cspPolicy" JSONB,
    "publishedAt" TIMESTAMP(3),
    "publishedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "payment_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_page_sessions" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "customerId" TEXT,
    "customerEmail" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "billingAddress" JSONB,
    "shippingAddress" JSONB,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "subtotal" DECIMAL(15,2) NOT NULL,
    "discountAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "shippingAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL,
    "lineItems" JSONB,
    "subscriptionPlanId" TEXT,
    "trialDays" INTEGER,
    "discountCode" TEXT,
    "discountId" TEXT,
    "status" "PaymentSessionStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "selectedGateway" "PaymentGatewayType",
    "gatewaySessionId" TEXT,
    "gatewayCustomerId" TEXT,
    "transactionId" TEXT,
    "orderId" TEXT,
    "subscriptionId" TEXT,
    "riskScore" INTEGER,
    "riskLevel" TEXT,
    "riskFactors" JSONB,
    "deviceType" TEXT,
    "browserType" TEXT,
    "browserVersion" TEXT,
    "osType" TEXT,
    "ipAddress" TEXT,
    "country" TEXT,
    "region" TEXT,
    "city" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "referrer" TEXT,
    "journeyEvents" JSONB,
    "variantId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_page_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_page_analytics" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "hour" INTEGER,
    "pageViews" INTEGER NOT NULL DEFAULT 0,
    "uniqueVisitors" INTEGER NOT NULL DEFAULT 0,
    "sessionsStarted" INTEGER NOT NULL DEFAULT 0,
    "emailEntered" INTEGER NOT NULL DEFAULT 0,
    "paymentMethodSelected" INTEGER NOT NULL DEFAULT 0,
    "paymentAttempted" INTEGER NOT NULL DEFAULT 0,
    "paymentCompleted" INTEGER NOT NULL DEFAULT 0,
    "successfulPayments" INTEGER NOT NULL DEFAULT 0,
    "failedPayments" INTEGER NOT NULL DEFAULT 0,
    "abandonedSessions" INTEGER NOT NULL DEFAULT 0,
    "expiredSessions" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "averageOrderValue" DECIMAL(15,2),
    "conversionRate" DECIMAL(5,4),
    "abandonmentRate" DECIMAL(5,4),
    "failureRate" DECIMAL(5,4),
    "gatewayBreakdown" JSONB,
    "deviceBreakdown" JSONB,
    "countryBreakdown" JSONB,
    "aiInsights" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_page_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_page_gateway_configs" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "gateway" "PaymentGatewayType" NOT NULL,
    "integrationId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB,
    "displayName" TEXT,
    "iconUrl" TEXT,
    "minAmount" DECIMAL(15,2),
    "maxAmount" DECIMAL(15,2),
    "allowedCurrencies" JSONB,
    "allowedCountries" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_page_gateway_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_page_domains" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationToken" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "sslStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "sslExpiresAt" TIMESTAMP(3),
    "cnameTarget" TEXT,
    "defaultPageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "payment_page_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funnels" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortId" TEXT NOT NULL,
    "description" TEXT,
    "type" "FunnelType" NOT NULL,
    "status" "FunnelStatus" NOT NULL DEFAULT 'DRAFT',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "activeTestId" TEXT,
    "totalVisits" INTEGER NOT NULL DEFAULT 0,
    "totalConversions" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "funnels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funnel_stages" (
    "id" TEXT NOT NULL,
    "funnelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "StageType" NOT NULL,
    "order" INTEGER NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "themeId" TEXT,
    "customStyles" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "funnel_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funnel_variants" (
    "id" TEXT NOT NULL,
    "funnelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isControl" BOOLEAN NOT NULL DEFAULT false,
    "trafficWeight" INTEGER NOT NULL DEFAULT 50,
    "stageOverrides" JSONB,
    "status" "FunnelVariantStatus" NOT NULL DEFAULT 'ACTIVE',
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "funnel_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funnel_sessions" (
    "id" TEXT NOT NULL,
    "funnelId" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "variantId" TEXT,
    "leadId" TEXT,
    "currentStageOrder" INTEGER NOT NULL DEFAULT 0,
    "completedStages" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "status" "FunnelSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "selectedProducts" JSONB NOT NULL DEFAULT '[]',
    "customerInfo" JSONB NOT NULL DEFAULT '{}',
    "shippingAddress" JSONB,
    "billingAddress" JSONB,
    "customFields" JSONB NOT NULL DEFAULT '{}',
    "entryUrl" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "referrer" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "deviceType" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "orderId" TEXT,
    "totalAmount" DECIMAL(15,2),
    "currency" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "abandonedAt" TIMESTAMP(3),

    CONSTRAINT "funnel_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funnel_events" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" "FunnelEventType" NOT NULL,
    "stageOrder" INTEGER NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "funnel_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funnel_ab_tests" (
    "id" TEXT NOT NULL,
    "funnelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hypothesis" TEXT,
    "winnerSelectionMode" "WinnerSelectionMode" NOT NULL DEFAULT 'MANUAL',
    "minimumSessions" INTEGER NOT NULL DEFAULT 100,
    "confidenceThreshold" DECIMAL(3,2) NOT NULL DEFAULT 0.95,
    "autoPauseLosers" BOOLEAN NOT NULL DEFAULT false,
    "autoSelectWinner" BOOLEAN NOT NULL DEFAULT false,
    "requireApproval" BOOLEAN NOT NULL DEFAULT true,
    "status" "FunnelABTestStatus" NOT NULL DEFAULT 'DRAFT',
    "winnerId" TEXT,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "funnel_ab_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funnel_ab_test_results" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "sessions" INTEGER NOT NULL,
    "conversions" INTEGER NOT NULL,
    "conversionRate" DECIMAL(5,4) NOT NULL,
    "revenue" DECIMAL(15,2) NOT NULL,
    "avgOrderValue" DECIMAL(15,2) NOT NULL,
    "confidenceLevel" DECIMAL(5,4) NOT NULL,
    "improvementOverControl" DECIMAL(6,4),
    "isStatisticallySignificant" BOOLEAN NOT NULL DEFAULT false,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "funnel_ab_test_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funnel_ai_insights" (
    "id" TEXT NOT NULL,
    "funnelId" TEXT NOT NULL,
    "type" "AIInsightType" NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "confidenceScore" DECIMAL(3,2) NOT NULL,
    "dataPoints" INTEGER NOT NULL,
    "recommendation" JSONB NOT NULL,
    "estimatedImpact" TEXT,
    "status" "InsightStatus" NOT NULL DEFAULT 'PENDING',
    "actionTaken" TEXT,
    "actionTakenAt" TIMESTAMP(3),
    "actionTakenBy" TEXT,
    "source" "InsightSource" NOT NULL,
    "creditsUsed" INTEGER NOT NULL DEFAULT 0,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "funnel_ai_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_credits_balances" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "monthlyAllocation" INTEGER NOT NULL DEFAULT 100,
    "currentBalance" INTEGER NOT NULL DEFAULT 100,
    "purchasedCredits" INTEGER NOT NULL DEFAULT 0,
    "lastResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextResetAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_credits_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_credits_usage" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "creditsUsed" INTEGER NOT NULL,
    "funnelId" TEXT,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_credits_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funnel_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "thumbnail" TEXT,
    "templateType" "FunnelTemplateType" NOT NULL,
    "category" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "demoUrl" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "industry" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "funnel_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "features" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "branch" TEXT NOT NULL,
    "status" "FeatureStatus" NOT NULL DEFAULT 'DEVELOPMENT',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "developerId" TEXT,
    "developerName" TEXT,
    "qaAssigneeId" TEXT,
    "qaAssigneeName" TEXT,
    "reviewerId" TEXT,
    "reviewerName" TEXT,
    "specDocument" JSONB,
    "qaChecklist" JSONB,
    "qaReport" JSONB,
    "reviewQuestions" JSONB,
    "humanAnswers" JSONB,
    "filesAdded" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "filesModified" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "filesDeleted" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "permissionsAdded" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "qaRounds" INTEGER NOT NULL DEFAULT 0,
    "issuesFound" INTEGER NOT NULL DEFAULT 0,
    "issuesResolved" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "qaStartedAt" TIMESTAMP(3),
    "reviewStartedAt" TIMESTAMP(3),
    "questionsReadyAt" TIMESTAMP(3),
    "answeredAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "mergedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_issues" (
    "id" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "severity" "IssueSeverity" NOT NULL,
    "category" "IssueCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "stepsToReproduce" TEXT,
    "expectedBehavior" TEXT,
    "actualBehavior" TEXT,
    "filePath" TEXT,
    "lineNumber" INTEGER,
    "pageUrl" TEXT,
    "apiEndpoint" TEXT,
    "screenshots" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "errorLogs" TEXT,
    "status" "IssueStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "retestStatus" "RetestStatus",
    "retestNotes" TEXT,
    "retestedAt" TIMESTAMP(3),
    "retestedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_activities" (
    "id" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" "FeatureStatus",
    "toStatus" "FeatureStatus",
    "details" JSONB,
    "performedBy" TEXT NOT NULL,
    "performedByName" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_test_accounts" (
    "id" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "userId" TEXT,
    "organizationId" TEXT,
    "clientId" TEXT,
    "companyId" TEXT,
    "purpose" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_test_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qa_checklist_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "QACheckCategory" NOT NULL,
    "applicableTo" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qa_checklist_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qa_checklist_items" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "howToTest" TEXT,
    "testCommand" TEXT,
    "testEndpoint" TEXT,
    "expectedResult" TEXT NOT NULL,
    "failureSeverity" "IssueSeverity" NOT NULL DEFAULT 'MEDIUM',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qa_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "code_review_checklist_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "CodeReviewCategory" NOT NULL,
    "complianceRef" TEXT,
    "applicableTo" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "code_review_checklist_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "code_review_checklist_items" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "checkSteps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "complianceRef" TEXT,
    "failureImpact" TEXT,
    "severity" "IssueSeverity" NOT NULL DEFAULT 'MEDIUM',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "code_review_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "email" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "phone" TEXT,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "firstName" TEXT,
    "lastName" TEXT,
    "source" "LeadSource" NOT NULL DEFAULT 'FUNNEL',
    "sourceId" TEXT,
    "sourceName" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "referrer" TEXT,
    "landingPage" TEXT,
    "deviceType" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "ipAddress" TEXT,
    "geoCountry" TEXT,
    "geoRegion" TEXT,
    "geoCity" TEXT,
    "funnelId" TEXT,
    "highestStage" INTEGER NOT NULL DEFAULT 0,
    "lastStageName" TEXT,
    "abandonStage" INTEGER,
    "abandonReason" TEXT,
    "capturedFields" JSONB NOT NULL DEFAULT '{}',
    "fieldCaptureLog" JSONB NOT NULL DEFAULT '[]',
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "totalPageViews" INTEGER NOT NULL DEFAULT 0,
    "totalTimeOnSite" INTEGER NOT NULL DEFAULT 0,
    "engagementScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "intentScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estimatedValue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "cartValue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "cartItems" JSONB NOT NULL DEFAULT '[]',
    "status" "LeadStatus" NOT NULL DEFAULT 'ANONYMOUS',
    "qualifiedAt" TIMESTAMP(3),
    "qualifiedReason" TEXT,
    "convertedAt" TIMESTAMP(3),
    "customerId" TEXT,
    "conversionOrderId" TEXT,
    "lastContactedAt" TIMESTAMP(3),
    "contactCount" INTEGER NOT NULL DEFAULT 0,
    "optedOut" BOOLEAN NOT NULL DEFAULT false,
    "optedOutAt" TIMESTAMP(3),
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_activities" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "sessionToken" TEXT,
    "funnelId" TEXT,
    "stageOrder" INTEGER,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funnel_visitor_profiles" (
    "id" TEXT NOT NULL,
    "visitorFingerprint" TEXT,
    "leadId" TEXT,
    "email" TEXT,
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "totalPurchases" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalAbandons" INTEGER NOT NULL DEFAULT 0,
    "preferredDevice" TEXT,
    "preferredTimeOfDay" INTEGER,
    "preferredDayOfWeek" INTEGER,
    "avgTimeToConvert" INTEGER,
    "avgSessionDuration" INTEGER,
    "avgScrollDepth" DOUBLE PRECISION,
    "avgPagesPerSession" DOUBLE PRECISION,
    "viewedCategories" JSONB,
    "purchasedCategories" JSONB,
    "priceRangePref" TEXT,
    "respondsToDiscounts" BOOLEAN NOT NULL DEFAULT false,
    "respondsToUrgency" BOOLEAN NOT NULL DEFAULT false,
    "respondsToSocialProof" BOOLEAN NOT NULL DEFAULT false,
    "respondsToPriceAnchor" BOOLEAN NOT NULL DEFAULT false,
    "abandonmentRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgAbandonStage" DOUBLE PRECISION,
    "lastAbandonReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "funnel_visitor_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_vaults" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "provider" "CardVaultProvider" NOT NULL,
    "providerToken" TEXT NOT NULL,
    "providerCustomerId" TEXT,
    "cardType" "CardType" NOT NULL,
    "lastFour" TEXT NOT NULL,
    "cardholderName" TEXT,
    "expirationMonth" INTEGER NOT NULL,
    "expirationYear" INTEGER NOT NULL,
    "billingAddress" JSONB,
    "status" "CardVaultStatus" NOT NULL DEFAULT 'PENDING',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "lastUsedAt" TIMESTAMP(3),
    "successfulUses" INTEGER NOT NULL DEFAULT 0,
    "failedUses" INTEGER NOT NULL DEFAULT 0,
    "lastFailureReason" TEXT,
    "expirationAlertSent" BOOLEAN NOT NULL DEFAULT false,
    "expirationAlertAt" TIMESTAMP(3),
    "nickname" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "card_vaults_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_vault_transactions" (
    "id" TEXT NOT NULL,
    "cardVaultId" TEXT NOT NULL,
    "transactionId" TEXT,
    "orderId" TEXT,
    "success" BOOLEAN NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "providerResponse" JSONB,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "type" TEXT NOT NULL,
    "source" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_vault_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encrypted_cards" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sessionToken" TEXT,
    "encryptedData" TEXT NOT NULL,
    "keyVersion" INTEGER NOT NULL DEFAULT 1,
    "cardFingerprint" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "processedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "migratedToVaultId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "encrypted_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_methodology_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "methodology" "MarketingMethodology" NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "stagePrompts" JSONB NOT NULL,
    "questions" JSONB NOT NULL,
    "defaultStages" JSONB NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "companyId" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_methodology_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_funnel_generations" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "templateId" TEXT,
    "methodology" "MarketingMethodology" NOT NULL,
    "productIds" TEXT[],
    "discoveryAnswers" JSONB NOT NULL,
    "aiProvider" TEXT NOT NULL,
    "aiModel" TEXT NOT NULL,
    "generatedContent" JSONB NOT NULL,
    "rawResponses" JSONB,
    "status" "GenerationStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "funnelId" TEXT,
    "tokensUsed" INTEGER,
    "generationTimeMs" INTEGER,
    "editCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "savedAt" TIMESTAMP(3),

    CONSTRAINT "ai_funnel_generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "EmailTemplateCategory" NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlBody" TEXT NOT NULL,
    "textBody" TEXT,
    "fromName" TEXT,
    "fromEmail" TEXT,
    "replyTo" TEXT,
    "organizationId" TEXT,
    "clientId" TEXT,
    "companyId" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "variables" JSONB,
    "previewData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_send_logs" (
    "id" TEXT NOT NULL,
    "templateId" TEXT,
    "templateCode" TEXT,
    "organizationId" TEXT,
    "clientId" TEXT,
    "companyId" TEXT,
    "toEmail" TEXT NOT NULL,
    "toName" TEXT,
    "fromEmail" TEXT NOT NULL,
    "fromName" TEXT,
    "replyTo" TEXT,
    "subject" TEXT NOT NULL,
    "category" "EmailTemplateCategory" NOT NULL,
    "variablesUsed" JSONB,
    "provider" TEXT NOT NULL DEFAULT 'ses',
    "messageId" TEXT,
    "status" "EmailSendStatus" NOT NULL DEFAULT 'QUEUED',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "bouncedAt" TIMESTAMP(3),
    "complainedAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastRetryAt" TIMESTAMP(3),
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_send_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "companyName" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "founderNumber" TEXT NOT NULL,
    "basePosition" INTEGER NOT NULL,
    "currentPosition" INTEGER NOT NULL,
    "referralCode" TEXT NOT NULL,
    "referredBy" TEXT,
    "referralCount" INTEGER NOT NULL DEFAULT 0,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'PENDING',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "invitedAt" TIMESTAMP(3),
    "inviteToken" TEXT,
    "inviteExpiresAt" TIMESTAMP(3),
    "registeredAt" TIMESTAMP(3),
    "clientId" TEXT,
    "source" TEXT,
    "medium" TEXT,
    "campaign" TEXT,
    "variant" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waitlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_domain_key" ON "organizations"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "clients_code_key" ON "clients"("code");

-- CreateIndex
CREATE INDEX "clients_organizationId_idx" ON "clients"("organizationId");

-- CreateIndex
CREATE INDEX "clients_deletedAt_idx" ON "clients"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "clients_organizationId_slug_key" ON "clients"("organizationId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "companies_code_key" ON "companies"("code");

-- CreateIndex
CREATE INDEX "companies_clientId_idx" ON "companies"("clientId");

-- CreateIndex
CREATE INDEX "companies_deletedAt_idx" ON "companies"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "companies_clientId_slug_key" ON "companies"("clientId", "slug");

-- CreateIndex
CREATE INDEX "departments_companyId_idx" ON "departments"("companyId");

-- CreateIndex
CREATE INDEX "departments_deletedAt_idx" ON "departments"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "departments_companyId_slug_key" ON "departments"("companyId", "slug");

-- CreateIndex
CREATE INDEX "teams_departmentId_idx" ON "teams"("departmentId");

-- CreateIndex
CREATE INDEX "teams_teamLeadId_idx" ON "teams"("teamLeadId");

-- CreateIndex
CREATE UNIQUE INDEX "teams_departmentId_slug_key" ON "teams"("departmentId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_auth0Id_key" ON "users"("auth0Id");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expiresAt_idx" ON "password_reset_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "team_members_teamId_idx" ON "team_members"("teamId");

-- CreateIndex
CREATE INDEX "team_members_userId_idx" ON "team_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_teamId_userId_key" ON "team_members"("teamId", "userId");

-- CreateIndex
CREATE INDEX "customers_companyId_email_idx" ON "customers"("companyId", "email");

-- CreateIndex
CREATE INDEX "customers_deletedAt_idx" ON "customers"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "customers_companyId_email_deletedAt_key" ON "customers"("companyId", "email", "deletedAt");

-- CreateIndex
CREATE INDEX "addresses_customerId_type_idx" ON "addresses"("customerId", "type");

-- CreateIndex
CREATE INDEX "addresses_deletedAt_idx" ON "addresses"("deletedAt");

-- CreateIndex
CREATE INDEX "payment_vaults_customerId_isActive_idx" ON "payment_vaults"("customerId", "isActive");

-- CreateIndex
CREATE INDEX "payment_vaults_fingerprint_idx" ON "payment_vaults"("fingerprint");

-- CreateIndex
CREATE INDEX "billing_accounts_customerId_idx" ON "billing_accounts"("customerId");

-- CreateIndex
CREATE INDEX "products_companyId_status_idx" ON "products"("companyId", "status");

-- CreateIndex
CREATE INDEX "products_companyId_status_trackInventory_idx" ON "products"("companyId", "status", "trackInventory");

-- CreateIndex
CREATE INDEX "products_deletedAt_idx" ON "products"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "products_companyId_sku_deletedAt_key" ON "products"("companyId", "sku", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "products_companyId_slug_deletedAt_key" ON "products"("companyId", "slug", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");

-- CreateIndex
CREATE INDEX "orders_companyId_orderedAt_idx" ON "orders"("companyId", "orderedAt");

-- CreateIndex
CREATE INDEX "orders_companyId_status_fulfillmentStatus_idx" ON "orders"("companyId", "status", "fulfillmentStatus");

-- CreateIndex
CREATE INDEX "orders_customerId_idx" ON "orders"("customerId");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_orderNumber_idx" ON "orders"("orderNumber");

-- CreateIndex
CREATE INDEX "orders_deletedAt_idx" ON "orders"("deletedAt");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_items_productId_idx" ON "order_items"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_shipmentNumber_key" ON "shipments"("shipmentNumber");

-- CreateIndex
CREATE INDEX "shipments_orderId_idx" ON "shipments"("orderId");

-- CreateIndex
CREATE INDEX "shipments_trackingNumber_idx" ON "shipments"("trackingNumber");

-- CreateIndex
CREATE INDEX "shipments_fulfillmentProviderId_idx" ON "shipments"("fulfillmentProviderId");

-- CreateIndex
CREATE INDEX "shipment_events_shipmentId_occurredAt_idx" ON "shipment_events"("shipmentId", "occurredAt");

-- CreateIndex
CREATE INDEX "subscriptions_companyId_status_idx" ON "subscriptions"("companyId", "status");

-- CreateIndex
CREATE INDEX "subscriptions_companyId_interval_idx" ON "subscriptions"("companyId", "interval");

-- CreateIndex
CREATE INDEX "subscriptions_companyId_nextBillingDate_idx" ON "subscriptions"("companyId", "nextBillingDate");

-- CreateIndex
CREATE INDEX "subscriptions_companyId_createdAt_idx" ON "subscriptions"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "subscriptions_companyId_canceledAt_idx" ON "subscriptions"("companyId", "canceledAt");

-- CreateIndex
CREATE INDEX "subscriptions_customerId_idx" ON "subscriptions"("customerId");

-- CreateIndex
CREATE INDEX "subscriptions_subscriptionPlanId_idx" ON "subscriptions"("subscriptionPlanId");

-- CreateIndex
CREATE INDEX "subscriptions_trialStatus_idx" ON "subscriptions"("trialStatus");

-- CreateIndex
CREATE INDEX "subscriptions_churnRiskScore_idx" ON "subscriptions"("churnRiskScore");

-- CreateIndex
CREATE INDEX "subscriptions_createdAt_id_idx" ON "subscriptions"("createdAt" DESC, "id");

-- CreateIndex
CREATE INDEX "subscriptions_deletedAt_idx" ON "subscriptions"("deletedAt");

-- CreateIndex
CREATE INDEX "subscription_items_productId_idx" ON "subscription_items"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_items_subscriptionId_productId_key" ON "subscription_items"("subscriptionId", "productId");

-- CreateIndex
CREATE INDEX "subscription_rebills_subscriptionId_status_idx" ON "subscription_rebills"("subscriptionId", "status");

-- CreateIndex
CREATE INDEX "subscription_rebills_status_scheduledAt_idx" ON "subscription_rebills"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "subscription_rebills_nextRetryAt_idx" ON "subscription_rebills"("nextRetryAt");

-- CreateIndex
CREATE INDEX "subscription_plans_scope_status_idx" ON "subscription_plans"("scope", "status");

-- CreateIndex
CREATE INDEX "subscription_plans_companyId_status_idx" ON "subscription_plans"("companyId", "status");

-- CreateIndex
CREATE INDEX "subscription_plans_clientId_status_idx" ON "subscription_plans"("clientId", "status");

-- CreateIndex
CREATE INDEX "subscription_plans_organizationId_status_idx" ON "subscription_plans"("organizationId", "status");

-- CreateIndex
CREATE INDEX "subscription_plans_deletedAt_idx" ON "subscription_plans"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_scope_organizationId_name_key" ON "subscription_plans"("scope", "organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_scope_clientId_name_key" ON "subscription_plans"("scope", "clientId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_scope_companyId_name_key" ON "subscription_plans"("scope", "companyId", "name");

-- CreateIndex
CREATE INDEX "product_subscription_plans_planId_idx" ON "product_subscription_plans"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "product_subscription_plans_productId_planId_key" ON "product_subscription_plans"("productId", "planId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_settings_organizationId_key" ON "subscription_settings"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_settings_clientId_key" ON "subscription_settings"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_settings_companyId_key" ON "subscription_settings"("companyId");

-- CreateIndex
CREATE INDEX "fulfillment_providers_companyId_status_idx" ON "fulfillment_providers"("companyId", "status");

-- CreateIndex
CREATE INDEX "fulfillment_providers_companyId_type_idx" ON "fulfillment_providers"("companyId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "fulfillment_providers_companyId_code_deletedAt_key" ON "fulfillment_providers"("companyId", "code", "deletedAt");

-- CreateIndex
CREATE INDEX "product_fulfillment_assignments_providerId_idx" ON "product_fulfillment_assignments"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "product_fulfillment_assignments_productId_providerId_key" ON "product_fulfillment_assignments"("productId", "providerId");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_transactionNumber_key" ON "transactions"("transactionNumber");

-- CreateIndex
CREATE INDEX "transactions_companyId_createdAt_idx" ON "transactions"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "transactions_companyId_status_createdAt_idx" ON "transactions"("companyId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "transactions_customerId_idx" ON "transactions"("customerId");

-- CreateIndex
CREATE INDEX "transactions_orderId_idx" ON "transactions"("orderId");

-- CreateIndex
CREATE INDEX "transactions_subscriptionId_idx" ON "transactions"("subscriptionId");

-- CreateIndex
CREATE INDEX "transactions_paymentProviderId_idx" ON "transactions"("paymentProviderId");

-- CreateIndex
CREATE INDEX "transactions_paymentVaultId_idx" ON "transactions"("paymentVaultId");

-- CreateIndex
CREATE INDEX "transactions_parentTransactionId_idx" ON "transactions"("parentTransactionId");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "merchant_accounts_companyId_idx" ON "merchant_accounts"("companyId");

-- CreateIndex
CREATE INDEX "merchant_accounts_providerType_idx" ON "merchant_accounts"("providerType");

-- CreateIndex
CREATE INDEX "merchant_accounts_status_idx" ON "merchant_accounts"("status");

-- CreateIndex
CREATE INDEX "merchant_accounts_deletedAt_idx" ON "merchant_accounts"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_accounts_companyId_name_deletedAt_key" ON "merchant_accounts"("companyId", "name", "deletedAt");

-- CreateIndex
CREATE INDEX "account_pools_companyId_idx" ON "account_pools"("companyId");

-- CreateIndex
CREATE INDEX "account_pools_status_idx" ON "account_pools"("status");

-- CreateIndex
CREATE UNIQUE INDEX "account_pools_companyId_name_key" ON "account_pools"("companyId", "name");

-- CreateIndex
CREATE INDEX "routing_rules_companyId_idx" ON "routing_rules"("companyId");

-- CreateIndex
CREATE INDEX "routing_rules_status_idx" ON "routing_rules"("status");

-- CreateIndex
CREATE INDEX "routing_rules_priority_idx" ON "routing_rules"("priority");

-- CreateIndex
CREATE INDEX "routing_rules_deletedAt_idx" ON "routing_rules"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "routing_rules_companyId_name_deletedAt_key" ON "routing_rules"("companyId", "name", "deletedAt");

-- CreateIndex
CREATE INDEX "routing_decisions_companyId_idx" ON "routing_decisions"("companyId");

-- CreateIndex
CREATE INDEX "routing_decisions_transactionId_idx" ON "routing_decisions"("transactionId");

-- CreateIndex
CREATE INDEX "routing_decisions_createdAt_idx" ON "routing_decisions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "pricing_plans_name_key" ON "pricing_plans"("name");

-- CreateIndex
CREATE INDEX "pricing_plans_status_idx" ON "pricing_plans"("status");

-- CreateIndex
CREATE UNIQUE INDEX "client_subscriptions_clientId_key" ON "client_subscriptions"("clientId");

-- CreateIndex
CREATE INDEX "client_subscriptions_planId_idx" ON "client_subscriptions"("planId");

-- CreateIndex
CREATE INDEX "client_subscriptions_status_idx" ON "client_subscriptions"("status");

-- CreateIndex
CREATE INDEX "usage_periods_subscriptionId_idx" ON "usage_periods"("subscriptionId");

-- CreateIndex
CREATE INDEX "usage_periods_clientId_idx" ON "usage_periods"("clientId");

-- CreateIndex
CREATE INDEX "usage_periods_status_idx" ON "usage_periods"("status");

-- CreateIndex
CREATE INDEX "usage_periods_periodStart_periodEnd_idx" ON "usage_periods"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "company_usage_records_companyId_idx" ON "company_usage_records"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "company_usage_records_usagePeriodId_companyId_key" ON "company_usage_records"("usagePeriodId", "companyId");

-- CreateIndex
CREATE INDEX "usage_events_usagePeriodId_idx" ON "usage_events"("usagePeriodId");

-- CreateIndex
CREATE INDEX "usage_events_companyId_idx" ON "usage_events"("companyId");

-- CreateIndex
CREATE INDEX "usage_events_eventType_idx" ON "usage_events"("eventType");

-- CreateIndex
CREATE INDEX "usage_events_occurredAt_idx" ON "usage_events"("occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "invoices_clientId_idx" ON "invoices"("clientId");

-- CreateIndex
CREATE INDEX "invoices_subscriptionId_idx" ON "invoices"("subscriptionId");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_dueDate_idx" ON "invoices"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt");

-- CreateIndex
CREATE INDEX "customer_intents_companyId_customerId_idx" ON "customer_intents"("companyId", "customerId");

-- CreateIndex
CREATE INDEX "customer_intents_companyId_calculatedAt_idx" ON "customer_intents"("companyId", "calculatedAt");

-- CreateIndex
CREATE INDEX "customer_intents_churnRisk_urgency_idx" ON "customer_intents"("churnRisk", "urgency");

-- CreateIndex
CREATE INDEX "interventions_companyId_customerId_idx" ON "interventions"("companyId", "customerId");

-- CreateIndex
CREATE INDEX "interventions_status_scheduledAt_idx" ON "interventions"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "interventions_type_outcome_idx" ON "interventions"("type", "outcome");

-- CreateIndex
CREATE INDEX "save_attempts_companyId_customerId_idx" ON "save_attempts"("companyId", "customerId");

-- CreateIndex
CREATE INDEX "save_attempts_outcome_savedBy_idx" ON "save_attempts"("outcome", "savedBy");

-- CreateIndex
CREATE INDEX "save_attempts_companyId_createdAt_idx" ON "save_attempts"("companyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "voice_calls_interventionId_key" ON "voice_calls"("interventionId");

-- CreateIndex
CREATE UNIQUE INDEX "voice_calls_twilioCallSid_key" ON "voice_calls"("twilioCallSid");

-- CreateIndex
CREATE INDEX "voice_calls_companyId_customerId_idx" ON "voice_calls"("companyId", "customerId");

-- CreateIndex
CREATE INDEX "voice_calls_twilioCallSid_idx" ON "voice_calls"("twilioCallSid");

-- CreateIndex
CREATE INDEX "voice_calls_status_outcome_idx" ON "voice_calls"("status", "outcome");

-- CreateIndex
CREATE INDEX "voice_calls_companyId_initiatedAt_idx" ON "voice_calls"("companyId", "initiatedAt");

-- CreateIndex
CREATE INDEX "upsell_offers_companyId_customerId_idx" ON "upsell_offers"("companyId", "customerId");

-- CreateIndex
CREATE INDEX "upsell_offers_companyId_createdAt_idx" ON "upsell_offers"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "upsell_offers_type_moment_accepted_idx" ON "upsell_offers"("type", "moment", "accepted");

-- CreateIndex
CREATE UNIQUE INDEX "upsell_configs_companyId_key" ON "upsell_configs"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "save_flow_configs_companyId_key" ON "save_flow_configs"("companyId");

-- CreateIndex
CREATE INDEX "voice_scripts_companyId_type_idx" ON "voice_scripts"("companyId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "voice_scripts_companyId_name_key" ON "voice_scripts"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "behavioral_triggers_name_key" ON "behavioral_triggers"("name");

-- CreateIndex
CREATE INDEX "behavioral_triggers_category_idx" ON "behavioral_triggers"("category");

-- CreateIndex
CREATE INDEX "momentum_analytics_companyId_idx" ON "momentum_analytics"("companyId");

-- CreateIndex
CREATE INDEX "momentum_analytics_periodStart_periodEnd_idx" ON "momentum_analytics"("periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "momentum_analytics_companyId_periodStart_periodEnd_key" ON "momentum_analytics"("companyId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "intent_detections_companyId_idx" ON "intent_detections"("companyId");

-- CreateIndex
CREATE INDEX "intent_detections_customerId_idx" ON "intent_detections"("customerId");

-- CreateIndex
CREATE INDEX "intent_detections_primaryIntent_idx" ON "intent_detections"("primaryIntent");

-- CreateIndex
CREATE INDEX "intent_detections_detectedAt_idx" ON "intent_detections"("detectedAt");

-- CreateIndex
CREATE INDEX "churn_signals_customerId_idx" ON "churn_signals"("customerId");

-- CreateIndex
CREATE INDEX "churn_signals_signalType_idx" ON "churn_signals"("signalType");

-- CreateIndex
CREATE INDEX "churn_signals_expiresAt_idx" ON "churn_signals"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "churn_risk_scores_customerId_key" ON "churn_risk_scores"("customerId");

-- CreateIndex
CREATE INDEX "churn_risk_scores_companyId_idx" ON "churn_risk_scores"("companyId");

-- CreateIndex
CREATE INDEX "churn_risk_scores_riskLevel_idx" ON "churn_risk_scores"("riskLevel");

-- CreateIndex
CREATE INDEX "churn_risk_scores_score_idx" ON "churn_risk_scores"("score");

-- CreateIndex
CREATE UNIQUE INDEX "customer_engagement_metrics_customerId_key" ON "customer_engagement_metrics"("customerId");

-- CreateIndex
CREATE INDEX "customer_engagement_metrics_companyId_idx" ON "customer_engagement_metrics"("companyId");

-- CreateIndex
CREATE INDEX "customer_engagement_metrics_engagementScore_idx" ON "customer_engagement_metrics"("engagementScore");

-- CreateIndex
CREATE INDEX "customer_engagement_metrics_healthScore_idx" ON "customer_engagement_metrics"("healthScore");

-- CreateIndex
CREATE INDEX "cs_sessions_companyId_idx" ON "cs_sessions"("companyId");

-- CreateIndex
CREATE INDEX "cs_sessions_customerId_idx" ON "cs_sessions"("customerId");

-- CreateIndex
CREATE INDEX "cs_sessions_status_idx" ON "cs_sessions"("status");

-- CreateIndex
CREATE INDEX "cs_sessions_currentTier_idx" ON "cs_sessions"("currentTier");

-- CreateIndex
CREATE INDEX "cs_messages_sessionId_idx" ON "cs_messages"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "cs_configs_companyId_key" ON "cs_configs"("companyId");

-- CreateIndex
CREATE INDEX "refunds_companyId_idx" ON "refunds"("companyId");

-- CreateIndex
CREATE INDEX "refunds_customerId_idx" ON "refunds"("customerId");

-- CreateIndex
CREATE INDEX "refunds_orderId_idx" ON "refunds"("orderId");

-- CreateIndex
CREATE INDEX "refunds_status_idx" ON "refunds"("status");

-- CreateIndex
CREATE INDEX "refunds_type_idx" ON "refunds"("type");

-- CreateIndex
CREATE UNIQUE INDEX "refund_policies_companyId_key" ON "refund_policies"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "rmas_rmaNumber_key" ON "rmas"("rmaNumber");

-- CreateIndex
CREATE INDEX "rmas_companyId_idx" ON "rmas"("companyId");

-- CreateIndex
CREATE INDEX "rmas_customerId_idx" ON "rmas"("customerId");

-- CreateIndex
CREATE INDEX "rmas_orderId_idx" ON "rmas"("orderId");

-- CreateIndex
CREATE INDEX "rmas_status_idx" ON "rmas"("status");

-- CreateIndex
CREATE INDEX "rmas_rmaNumber_idx" ON "rmas"("rmaNumber");

-- CreateIndex
CREATE UNIQUE INDEX "rma_policies_companyId_key" ON "rma_policies"("companyId");

-- CreateIndex
CREATE INDEX "terms_documents_companyId_idx" ON "terms_documents"("companyId");

-- CreateIndex
CREATE INDEX "terms_documents_type_idx" ON "terms_documents"("type");

-- CreateIndex
CREATE INDEX "terms_documents_status_idx" ON "terms_documents"("status");

-- CreateIndex
CREATE INDEX "terms_summaries_termsDocumentId_idx" ON "terms_summaries"("termsDocumentId");

-- CreateIndex
CREATE INDEX "terms_acceptances_termsDocumentId_idx" ON "terms_acceptances"("termsDocumentId");

-- CreateIndex
CREATE INDEX "terms_acceptances_customerId_idx" ON "terms_acceptances"("customerId");

-- CreateIndex
CREATE INDEX "terms_acceptances_acceptedAt_idx" ON "terms_acceptances"("acceptedAt");

-- CreateIndex
CREATE INDEX "terms_analytics_termsDocumentId_idx" ON "terms_analytics"("termsDocumentId");

-- CreateIndex
CREATE UNIQUE INDEX "terms_analytics_termsDocumentId_periodStart_periodEnd_key" ON "terms_analytics"("termsDocumentId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "content_templates_companyId_idx" ON "content_templates"("companyId");

-- CreateIndex
CREATE INDEX "content_templates_type_idx" ON "content_templates"("type");

-- CreateIndex
CREATE INDEX "content_templates_purpose_idx" ON "content_templates"("purpose");

-- CreateIndex
CREATE INDEX "content_templates_status_idx" ON "content_templates"("status");

-- CreateIndex
CREATE INDEX "generated_contents_companyId_idx" ON "generated_contents"("companyId");

-- CreateIndex
CREATE INDEX "generated_contents_type_idx" ON "generated_contents"("type");

-- CreateIndex
CREATE INDEX "generated_contents_purpose_idx" ON "generated_contents"("purpose");

-- CreateIndex
CREATE INDEX "generated_contents_status_idx" ON "generated_contents"("status");

-- CreateIndex
CREATE UNIQUE INDEX "content_generation_configs_companyId_key" ON "content_generation_configs"("companyId");

-- CreateIndex
CREATE INDEX "delivery_messages_companyId_idx" ON "delivery_messages"("companyId");

-- CreateIndex
CREATE INDEX "delivery_messages_companyId_createdAt_idx" ON "delivery_messages"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "delivery_messages_customerId_idx" ON "delivery_messages"("customerId");

-- CreateIndex
CREATE INDEX "delivery_messages_status_idx" ON "delivery_messages"("status");

-- CreateIndex
CREATE INDEX "delivery_messages_scheduledFor_idx" ON "delivery_messages"("scheduledFor");

-- CreateIndex
CREATE INDEX "delivery_retries_messageId_idx" ON "delivery_retries"("messageId");

-- CreateIndex
CREATE INDEX "delivery_retries_nextRetryAt_idx" ON "delivery_retries"("nextRetryAt");

-- CreateIndex
CREATE UNIQUE INDEX "customer_preferences_customerId_channel_key" ON "customer_preferences"("customerId", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_configs_companyId_key" ON "delivery_configs"("companyId");

-- CreateIndex
CREATE INDEX "automations_companyId_idx" ON "automations"("companyId");

-- CreateIndex
CREATE INDEX "automations_status_idx" ON "automations"("status");

-- CreateIndex
CREATE INDEX "automation_enrollments_automationId_idx" ON "automation_enrollments"("automationId");

-- CreateIndex
CREATE INDEX "automation_enrollments_customerId_idx" ON "automation_enrollments"("customerId");

-- CreateIndex
CREATE INDEX "automation_enrollments_status_idx" ON "automation_enrollments"("status");

-- CreateIndex
CREATE INDEX "analytics_reports_companyId_idx" ON "analytics_reports"("companyId");

-- CreateIndex
CREATE INDEX "analytics_reports_isActive_idx" ON "analytics_reports"("isActive");

-- CreateIndex
CREATE INDEX "analytics_snapshots_companyId_idx" ON "analytics_snapshots"("companyId");

-- CreateIndex
CREATE INDEX "analytics_snapshots_snapshotDate_idx" ON "analytics_snapshots"("snapshotDate");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_snapshots_companyId_snapshotDate_granularity_key" ON "analytics_snapshots"("companyId", "snapshotDate", "granularity");

-- CreateIndex
CREATE INDEX "dashboard_alerts_companyId_idx" ON "dashboard_alerts"("companyId");

-- CreateIndex
CREATE INDEX "dashboard_alerts_type_idx" ON "dashboard_alerts"("type");

-- CreateIndex
CREATE INDEX "dashboard_alerts_category_idx" ON "dashboard_alerts"("category");

-- CreateIndex
CREATE INDEX "dashboard_alerts_createdAt_idx" ON "dashboard_alerts"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "integration_definitions_provider_key" ON "integration_definitions"("provider");

-- CreateIndex
CREATE INDEX "oauth_tokens_platformIntegrationId_idx" ON "oauth_tokens"("platformIntegrationId");

-- CreateIndex
CREATE INDEX "oauth_tokens_clientIntegrationId_idx" ON "oauth_tokens"("clientIntegrationId");

-- CreateIndex
CREATE INDEX "oauth_tokens_status_idx" ON "oauth_tokens"("status");

-- CreateIndex
CREATE INDEX "oauth_tokens_expiresAt_idx" ON "oauth_tokens"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_states_state_key" ON "oauth_states"("state");

-- CreateIndex
CREATE INDEX "oauth_states_state_idx" ON "oauth_states"("state");

-- CreateIndex
CREATE INDEX "oauth_states_expiresAt_idx" ON "oauth_states"("expiresAt");

-- CreateIndex
CREATE INDEX "platform_integrations_organizationId_idx" ON "platform_integrations"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "platform_integrations_organizationId_provider_key" ON "platform_integrations"("organizationId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "client_integrations_merchantAccountId_key" ON "client_integrations"("merchantAccountId");

-- CreateIndex
CREATE INDEX "client_integrations_clientId_idx" ON "client_integrations"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "client_integrations_clientId_provider_name_key" ON "client_integrations"("clientId", "provider", "name");

-- CreateIndex
CREATE INDEX "integration_usage_companyId_idx" ON "integration_usage"("companyId");

-- CreateIndex
CREATE INDEX "integration_usage_clientId_idx" ON "integration_usage"("clientId");

-- CreateIndex
CREATE INDEX "integration_usage_provider_idx" ON "integration_usage"("provider");

-- CreateIndex
CREATE INDEX "integration_usage_billingPeriod_idx" ON "integration_usage"("billingPeriod");

-- CreateIndex
CREATE INDEX "integration_usage_sessionToken_idx" ON "integration_usage"("sessionToken");

-- CreateIndex
CREATE INDEX "integration_usage_timestamp_idx" ON "integration_usage"("timestamp");

-- CreateIndex
CREATE INDEX "deletion_logs_entityType_entityId_idx" ON "deletion_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "deletion_logs_companyId_idx" ON "deletion_logs"("companyId");

-- CreateIndex
CREATE INDEX "deletion_logs_cascadeId_idx" ON "deletion_logs"("cascadeId");

-- CreateIndex
CREATE INDEX "deletion_logs_deletedAt_idx" ON "deletion_logs"("deletedAt");

-- CreateIndex
CREATE INDEX "deletion_logs_restoredAt_idx" ON "deletion_logs"("restoredAt");

-- CreateIndex
CREATE INDEX "deletion_logs_expiresAt_idx" ON "deletion_logs"("expiresAt");

-- CreateIndex
CREATE INDEX "webhooks_companyId_idx" ON "webhooks"("companyId");

-- CreateIndex
CREATE INDEX "webhooks_deletedAt_idx" ON "webhooks"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "webhooks_companyId_name_deletedAt_key" ON "webhooks"("companyId", "name", "deletedAt");

-- CreateIndex
CREATE INDEX "categories_companyId_parentId_idx" ON "categories"("companyId", "parentId");

-- CreateIndex
CREATE INDEX "categories_companyId_isActive_idx" ON "categories"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "categories_path_idx" ON "categories"("path");

-- CreateIndex
CREATE INDEX "categories_deletedAt_idx" ON "categories"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "categories_companyId_slug_deletedAt_key" ON "categories"("companyId", "slug", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "categories_companyId_parentId_name_deletedAt_key" ON "categories"("companyId", "parentId", "name", "deletedAt");

-- CreateIndex
CREATE INDEX "product_categories_categoryId_idx" ON "product_categories"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_productId_categoryId_key" ON "product_categories"("productId", "categoryId");

-- CreateIndex
CREATE INDEX "tags_companyId_idx" ON "tags"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "tags_companyId_slug_key" ON "tags"("companyId", "slug");

-- CreateIndex
CREATE INDEX "product_tags_tagId_idx" ON "product_tags"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "product_tags_productId_tagId_key" ON "product_tags"("productId", "tagId");

-- CreateIndex
CREATE INDEX "product_media_productId_type_sortOrder_idx" ON "product_media"("productId", "type", "sortOrder");

-- CreateIndex
CREATE INDEX "product_media_variantId_idx" ON "product_media"("variantId");

-- CreateIndex
CREATE INDEX "product_price_rules_productId_isActive_idx" ON "product_price_rules"("productId", "isActive");

-- CreateIndex
CREATE INDEX "product_price_rules_startDate_endDate_idx" ON "product_price_rules"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "product_variants_productId_isActive_deletedAt_idx" ON "product_variants"("productId", "isActive", "deletedAt");

-- CreateIndex
CREATE INDEX "product_variants_sku_idx" ON "product_variants"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_productId_sku_key" ON "product_variants"("productId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "variant_options_companyId_name_key" ON "variant_options"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "variant_option_values_optionId_value_key" ON "variant_option_values"("optionId", "value");

-- CreateIndex
CREATE INDEX "collections_companyId_isActive_idx" ON "collections"("companyId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "collections_companyId_slug_key" ON "collections"("companyId", "slug");

-- CreateIndex
CREATE INDEX "collection_products_productId_idx" ON "collection_products"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "collection_products_collectionId_productId_key" ON "collection_products"("collectionId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "bundles_productId_key" ON "bundles"("productId");

-- CreateIndex
CREATE INDEX "bundles_companyId_idx" ON "bundles"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "bundle_items_bundleId_productId_variantId_key" ON "bundle_items"("bundleId", "productId", "variantId");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_locations_companyId_code_key" ON "inventory_locations"("companyId", "code");

-- CreateIndex
CREATE INDEX "inventory_levels_productId_idx" ON "inventory_levels"("productId");

-- CreateIndex
CREATE INDEX "inventory_levels_variantId_idx" ON "inventory_levels"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_levels_locationId_productId_variantId_key" ON "inventory_levels"("locationId", "productId", "variantId");

-- CreateIndex
CREATE INDEX "inventory_adjustments_inventoryLevelId_createdAt_idx" ON "inventory_adjustments"("inventoryLevelId", "createdAt");

-- CreateIndex
CREATE INDEX "inventory_adjustments_referenceType_referenceId_idx" ON "inventory_adjustments"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "marketing_videos_companyId_status_idx" ON "marketing_videos"("companyId", "status");

-- CreateIndex
CREATE INDEX "marketing_videos_productId_idx" ON "marketing_videos"("productId");

-- CreateIndex
CREATE INDEX "marketing_videos_customerId_idx" ON "marketing_videos"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "marketing_video_scenes_videoId_sceneNumber_key" ON "marketing_video_scenes"("videoId", "sceneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "marketing_video_variants_videoId_platform_key" ON "marketing_video_variants"("videoId", "platform");

-- CreateIndex
CREATE INDEX "marketing_video_templates_type_isActive_idx" ON "marketing_video_templates"("type", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "permissions_category_idx" ON "permissions"("category");

-- CreateIndex
CREATE INDEX "roles_scopeType_scopeId_idx" ON "roles"("scopeType", "scopeId");

-- CreateIndex
CREATE INDEX "roles_deletedAt_idx" ON "roles"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "roles_scopeType_scopeId_slug_key" ON "roles"("scopeType", "scopeId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleId_permissionId_key" ON "role_permissions"("roleId", "permissionId");

-- CreateIndex
CREATE INDEX "user_role_assignments_userId_idx" ON "user_role_assignments"("userId");

-- CreateIndex
CREATE INDEX "user_role_assignments_roleId_idx" ON "user_role_assignments"("roleId");

-- CreateIndex
CREATE INDEX "user_role_assignments_scopeType_scopeId_idx" ON "user_role_assignments"("scopeType", "scopeId");

-- CreateIndex
CREATE UNIQUE INDEX "user_role_assignments_userId_roleId_scopeType_scopeId_key" ON "user_role_assignments"("userId", "roleId", "scopeType", "scopeId");

-- CreateIndex
CREATE INDEX "permission_grants_userId_idx" ON "permission_grants"("userId");

-- CreateIndex
CREATE INDEX "permission_grants_scopeType_scopeId_idx" ON "permission_grants"("scopeType", "scopeId");

-- CreateIndex
CREATE UNIQUE INDEX "permission_grants_userId_permissionId_scopeType_scopeId_key" ON "permission_grants"("userId", "permissionId", "scopeType", "scopeId");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_sessionToken_key" ON "user_sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "user_sessions_userId_idx" ON "user_sessions"("userId");

-- CreateIndex
CREATE INDEX "user_sessions_sessionToken_idx" ON "user_sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "user_sessions_isActive_expiresAt_idx" ON "user_sessions"("isActive", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_code_key" ON "vendors"("code");

-- CreateIndex
CREATE INDEX "vendors_status_idx" ON "vendors"("status");

-- CreateIndex
CREATE INDEX "vendors_tier_idx" ON "vendors"("tier");

-- CreateIndex
CREATE INDEX "vendors_vendorType_idx" ON "vendors"("vendorType");

-- CreateIndex
CREATE INDEX "vendors_deletedAt_idx" ON "vendors"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_organizationId_slug_key" ON "vendors"("organizationId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_companies_code_key" ON "vendor_companies"("code");

-- CreateIndex
CREATE INDEX "vendor_companies_status_idx" ON "vendor_companies"("status");

-- CreateIndex
CREATE INDEX "vendor_companies_deletedAt_idx" ON "vendor_companies"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_companies_vendorId_slug_key" ON "vendor_companies"("vendorId", "slug");

-- CreateIndex
CREATE INDEX "vendor_client_connections_status_idx" ON "vendor_client_connections"("status");

-- CreateIndex
CREATE INDEX "vendor_client_connections_vendorId_idx" ON "vendor_client_connections"("vendorId");

-- CreateIndex
CREATE INDEX "vendor_client_connections_vendorCompanyId_idx" ON "vendor_client_connections"("vendorCompanyId");

-- CreateIndex
CREATE INDEX "vendor_client_connections_companyId_idx" ON "vendor_client_connections"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_client_connections_vendorCompanyId_companyId_key" ON "vendor_client_connections"("vendorCompanyId", "companyId");

-- CreateIndex
CREATE INDEX "vendor_products_isActive_idx" ON "vendor_products"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_products_vendorCompanyId_sku_key" ON "vendor_products"("vendorCompanyId", "sku");

-- CreateIndex
CREATE INDEX "vendor_product_syncs_status_idx" ON "vendor_product_syncs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_product_syncs_connectionId_vendorProductId_key" ON "vendor_product_syncs"("connectionId", "vendorProductId");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_orders_orderNumber_key" ON "vendor_orders"("orderNumber");

-- CreateIndex
CREATE INDEX "vendor_orders_status_idx" ON "vendor_orders"("status");

-- CreateIndex
CREATE INDEX "vendor_orders_vendorCompanyId_idx" ON "vendor_orders"("vendorCompanyId");

-- CreateIndex
CREATE INDEX "vendor_orders_sourceOrderId_idx" ON "vendor_orders"("sourceOrderId");

-- CreateIndex
CREATE INDEX "vendor_order_items_vendorOrderId_idx" ON "vendor_order_items"("vendorOrderId");

-- CreateIndex
CREATE INDEX "marketplace_reviews_vendorId_idx" ON "marketplace_reviews"("vendorId");

-- CreateIndex
CREATE INDEX "marketplace_reviews_vendorCompanyId_idx" ON "marketplace_reviews"("vendorCompanyId");

-- CreateIndex
CREATE INDEX "marketplace_reviews_companyId_idx" ON "marketplace_reviews"("companyId");

-- CreateIndex
CREATE INDEX "marketplace_reviews_rating_idx" ON "marketplace_reviews"("rating");

-- CreateIndex
CREATE INDEX "customer_notes_customerId_idx" ON "customer_notes"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_tags_companyId_name_key" ON "customer_tags"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "refund_settings_companyId_key" ON "refund_settings"("companyId");

-- CreateIndex
CREATE INDEX "product_reviews_companyId_idx" ON "product_reviews"("companyId");

-- CreateIndex
CREATE INDEX "product_reviews_productId_idx" ON "product_reviews"("productId");

-- CreateIndex
CREATE INDEX "product_reviews_customerId_idx" ON "product_reviews"("customerId");

-- CreateIndex
CREATE INDEX "product_reviews_status_idx" ON "product_reviews"("status");

-- CreateIndex
CREATE INDEX "product_reviews_rating_idx" ON "product_reviews"("rating");

-- CreateIndex
CREATE INDEX "product_reviews_createdAt_idx" ON "product_reviews"("createdAt");

-- CreateIndex
CREATE INDEX "product_reviews_deletedAt_idx" ON "product_reviews"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "product_reviews_orderId_productId_key" ON "product_reviews"("orderId", "productId");

-- CreateIndex
CREATE INDEX "review_media_reviewId_idx" ON "review_media"("reviewId");

-- CreateIndex
CREATE INDEX "review_votes_reviewId_idx" ON "review_votes"("reviewId");

-- CreateIndex
CREATE UNIQUE INDEX "review_votes_reviewId_customerId_key" ON "review_votes"("reviewId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "review_votes_reviewId_ipAddress_key" ON "review_votes"("reviewId", "ipAddress");

-- CreateIndex
CREATE UNIQUE INDEX "review_configs_companyId_key" ON "review_configs"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "product_review_stats_productId_key" ON "product_review_stats"("productId");

-- CreateIndex
CREATE INDEX "product_review_stats_companyId_idx" ON "product_review_stats"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "landing_pages_subdomain_key" ON "landing_pages"("subdomain");

-- CreateIndex
CREATE INDEX "landing_pages_subdomain_idx" ON "landing_pages"("subdomain");

-- CreateIndex
CREATE INDEX "landing_pages_status_idx" ON "landing_pages"("status");

-- CreateIndex
CREATE INDEX "landing_pages_deletedAt_idx" ON "landing_pages"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "landing_pages_companyId_slug_deletedAt_key" ON "landing_pages"("companyId", "slug", "deletedAt");

-- CreateIndex
CREATE INDEX "landing_page_sections_landingPageId_order_idx" ON "landing_page_sections"("landingPageId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "landing_page_domains_domain_key" ON "landing_page_domains"("domain");

-- CreateIndex
CREATE INDEX "landing_page_usage_companyId_periodStart_idx" ON "landing_page_usage"("companyId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "landing_page_usage_landingPageId_periodStart_key" ON "landing_page_usage"("landingPageId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "landing_page_pricing_organizationId_key" ON "landing_page_pricing"("organizationId");

-- CreateIndex
CREATE INDEX "ai_usage_companyId_createdAt_idx" ON "ai_usage"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_usage_userId_createdAt_idx" ON "ai_usage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_usage_feature_createdAt_idx" ON "ai_usage"("feature", "createdAt");

-- CreateIndex
CREATE INDEX "ai_usage_summary_companyId_periodStart_idx" ON "ai_usage_summary"("companyId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "ai_usage_summary_companyId_periodStart_key" ON "ai_usage_summary"("companyId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "ai_pricing_organizationId_key" ON "ai_pricing"("organizationId");

-- CreateIndex
CREATE INDEX "ab_tests_landingPageId_idx" ON "ab_tests"("landingPageId");

-- CreateIndex
CREATE INDEX "ab_tests_companyId_idx" ON "ab_tests"("companyId");

-- CreateIndex
CREATE INDEX "ab_tests_status_idx" ON "ab_tests"("status");

-- CreateIndex
CREATE INDEX "ab_test_variants_testId_idx" ON "ab_test_variants"("testId");

-- CreateIndex
CREATE INDEX "ab_test_assignments_variantId_idx" ON "ab_test_assignments"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "ab_test_assignments_testId_visitorId_key" ON "ab_test_assignments"("testId", "visitorId");

-- CreateIndex
CREATE INDEX "landing_page_popups_landingPageId_idx" ON "landing_page_popups"("landingPageId");

-- CreateIndex
CREATE INDEX "landing_page_popups_companyId_idx" ON "landing_page_popups"("companyId");

-- CreateIndex
CREATE INDEX "landing_page_popups_status_idx" ON "landing_page_popups"("status");

-- CreateIndex
CREATE INDEX "dynamic_text_rules_landingPageId_idx" ON "dynamic_text_rules"("landingPageId");

-- CreateIndex
CREATE INDEX "dynamic_text_rules_companyId_idx" ON "dynamic_text_rules"("companyId");

-- CreateIndex
CREATE INDEX "conversion_goals_landingPageId_idx" ON "conversion_goals"("landingPageId");

-- CreateIndex
CREATE INDEX "conversion_goals_companyId_idx" ON "conversion_goals"("companyId");

-- CreateIndex
CREATE INDEX "conversion_events_goalId_idx" ON "conversion_events"("goalId");

-- CreateIndex
CREATE INDEX "conversion_events_visitorId_idx" ON "conversion_events"("visitorId");

-- CreateIndex
CREATE INDEX "conversion_events_occurredAt_idx" ON "conversion_events"("occurredAt");

-- CreateIndex
CREATE INDEX "checkout_page_themes_category_idx" ON "checkout_page_themes"("category");

-- CreateIndex
CREATE INDEX "checkout_page_themes_isPublic_idx" ON "checkout_page_themes"("isPublic");

-- CreateIndex
CREATE INDEX "checkout_page_themes_isSystem_idx" ON "checkout_page_themes"("isSystem");

-- CreateIndex
CREATE INDEX "payment_pages_companyId_idx" ON "payment_pages"("companyId");

-- CreateIndex
CREATE INDEX "payment_pages_status_idx" ON "payment_pages"("status");

-- CreateIndex
CREATE INDEX "payment_pages_type_idx" ON "payment_pages"("type");

-- CreateIndex
CREATE INDEX "payment_pages_deletedAt_idx" ON "payment_pages"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "payment_pages_companyId_slug_key" ON "payment_pages"("companyId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "payment_page_sessions_sessionToken_key" ON "payment_page_sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "payment_page_sessions_pageId_idx" ON "payment_page_sessions"("pageId");

-- CreateIndex
CREATE INDEX "payment_page_sessions_sessionToken_idx" ON "payment_page_sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "payment_page_sessions_status_idx" ON "payment_page_sessions"("status");

-- CreateIndex
CREATE INDEX "payment_page_sessions_customerId_idx" ON "payment_page_sessions"("customerId");

-- CreateIndex
CREATE INDEX "payment_page_sessions_expiresAt_idx" ON "payment_page_sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "payment_page_sessions_createdAt_idx" ON "payment_page_sessions"("createdAt");

-- CreateIndex
CREATE INDEX "payment_page_analytics_pageId_idx" ON "payment_page_analytics"("pageId");

-- CreateIndex
CREATE INDEX "payment_page_analytics_date_idx" ON "payment_page_analytics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "payment_page_analytics_pageId_date_hour_key" ON "payment_page_analytics"("pageId", "date", "hour");

-- CreateIndex
CREATE INDEX "payment_page_gateway_configs_pageId_idx" ON "payment_page_gateway_configs"("pageId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_page_gateway_configs_pageId_gateway_key" ON "payment_page_gateway_configs"("pageId", "gateway");

-- CreateIndex
CREATE UNIQUE INDEX "payment_page_domains_domain_key" ON "payment_page_domains"("domain");

-- CreateIndex
CREATE INDEX "payment_page_domains_companyId_idx" ON "payment_page_domains"("companyId");

-- CreateIndex
CREATE INDEX "payment_page_domains_domain_idx" ON "payment_page_domains"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "funnels_shortId_key" ON "funnels"("shortId");

-- CreateIndex
CREATE INDEX "funnels_companyId_idx" ON "funnels"("companyId");

-- CreateIndex
CREATE INDEX "funnels_status_idx" ON "funnels"("status");

-- CreateIndex
CREATE INDEX "funnels_shortId_idx" ON "funnels"("shortId");

-- CreateIndex
CREATE UNIQUE INDEX "funnels_companyId_slug_key" ON "funnels"("companyId", "slug");

-- CreateIndex
CREATE INDEX "funnel_stages_funnelId_idx" ON "funnel_stages"("funnelId");

-- CreateIndex
CREATE UNIQUE INDEX "funnel_stages_funnelId_order_key" ON "funnel_stages"("funnelId", "order");

-- CreateIndex
CREATE INDEX "funnel_variants_funnelId_idx" ON "funnel_variants"("funnelId");

-- CreateIndex
CREATE INDEX "funnel_variants_status_idx" ON "funnel_variants"("status");

-- CreateIndex
CREATE UNIQUE INDEX "funnel_sessions_sessionToken_key" ON "funnel_sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "funnel_sessions_orderId_key" ON "funnel_sessions"("orderId");

-- CreateIndex
CREATE INDEX "funnel_sessions_funnelId_idx" ON "funnel_sessions"("funnelId");

-- CreateIndex
CREATE INDEX "funnel_sessions_variantId_idx" ON "funnel_sessions"("variantId");

-- CreateIndex
CREATE INDEX "funnel_sessions_leadId_idx" ON "funnel_sessions"("leadId");

-- CreateIndex
CREATE INDEX "funnel_sessions_status_idx" ON "funnel_sessions"("status");

-- CreateIndex
CREATE INDEX "funnel_sessions_startedAt_idx" ON "funnel_sessions"("startedAt");

-- CreateIndex
CREATE INDEX "funnel_events_sessionId_idx" ON "funnel_events"("sessionId");

-- CreateIndex
CREATE INDEX "funnel_events_type_idx" ON "funnel_events"("type");

-- CreateIndex
CREATE INDEX "funnel_events_timestamp_idx" ON "funnel_events"("timestamp");

-- CreateIndex
CREATE INDEX "funnel_ab_tests_funnelId_idx" ON "funnel_ab_tests"("funnelId");

-- CreateIndex
CREATE INDEX "funnel_ab_tests_status_idx" ON "funnel_ab_tests"("status");

-- CreateIndex
CREATE INDEX "funnel_ab_test_results_testId_idx" ON "funnel_ab_test_results"("testId");

-- CreateIndex
CREATE INDEX "funnel_ab_test_results_variantId_idx" ON "funnel_ab_test_results"("variantId");

-- CreateIndex
CREATE INDEX "funnel_ai_insights_funnelId_idx" ON "funnel_ai_insights"("funnelId");

-- CreateIndex
CREATE INDEX "funnel_ai_insights_status_idx" ON "funnel_ai_insights"("status");

-- CreateIndex
CREATE INDEX "funnel_ai_insights_type_idx" ON "funnel_ai_insights"("type");

-- CreateIndex
CREATE UNIQUE INDEX "ai_credits_balances_companyId_key" ON "ai_credits_balances"("companyId");

-- CreateIndex
CREATE INDEX "ai_credits_usage_companyId_idx" ON "ai_credits_usage"("companyId");

-- CreateIndex
CREATE INDEX "ai_credits_usage_usedAt_idx" ON "ai_credits_usage"("usedAt");

-- CreateIndex
CREATE UNIQUE INDEX "funnel_templates_slug_key" ON "funnel_templates"("slug");

-- CreateIndex
CREATE INDEX "funnel_templates_category_idx" ON "funnel_templates"("category");

-- CreateIndex
CREATE INDEX "funnel_templates_templateType_idx" ON "funnel_templates"("templateType");

-- CreateIndex
CREATE UNIQUE INDEX "features_code_key" ON "features"("code");

-- CreateIndex
CREATE INDEX "features_organizationId_idx" ON "features"("organizationId");

-- CreateIndex
CREATE INDEX "features_status_idx" ON "features"("status");

-- CreateIndex
CREATE INDEX "features_priority_idx" ON "features"("priority");

-- CreateIndex
CREATE INDEX "feature_issues_featureId_idx" ON "feature_issues"("featureId");

-- CreateIndex
CREATE INDEX "feature_issues_status_idx" ON "feature_issues"("status");

-- CreateIndex
CREATE INDEX "feature_issues_severity_idx" ON "feature_issues"("severity");

-- CreateIndex
CREATE INDEX "feature_activities_featureId_idx" ON "feature_activities"("featureId");

-- CreateIndex
CREATE INDEX "feature_activities_performedAt_idx" ON "feature_activities"("performedAt");

-- CreateIndex
CREATE INDEX "feature_test_accounts_featureId_idx" ON "feature_test_accounts"("featureId");

-- CreateIndex
CREATE INDEX "qa_checklist_items_templateId_idx" ON "qa_checklist_items"("templateId");

-- CreateIndex
CREATE INDEX "code_review_checklist_items_templateId_idx" ON "code_review_checklist_items"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "leads_customerId_key" ON "leads"("customerId");

-- CreateIndex
CREATE INDEX "leads_companyId_idx" ON "leads"("companyId");

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "leads"("status");

-- CreateIndex
CREATE INDEX "leads_email_idx" ON "leads"("email");

-- CreateIndex
CREATE INDEX "leads_phone_idx" ON "leads"("phone");

-- CreateIndex
CREATE INDEX "leads_funnelId_idx" ON "leads"("funnelId");

-- CreateIndex
CREATE INDEX "leads_engagementScore_idx" ON "leads"("engagementScore");

-- CreateIndex
CREATE INDEX "leads_lastSeenAt_idx" ON "leads"("lastSeenAt");

-- CreateIndex
CREATE INDEX "leads_convertedAt_idx" ON "leads"("convertedAt");

-- CreateIndex
CREATE UNIQUE INDEX "leads_companyId_email_key" ON "leads"("companyId", "email");

-- CreateIndex
CREATE INDEX "lead_activities_leadId_idx" ON "lead_activities"("leadId");

-- CreateIndex
CREATE INDEX "lead_activities_type_idx" ON "lead_activities"("type");

-- CreateIndex
CREATE INDEX "lead_activities_occurredAt_idx" ON "lead_activities"("occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "funnel_visitor_profiles_visitorFingerprint_key" ON "funnel_visitor_profiles"("visitorFingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "funnel_visitor_profiles_leadId_key" ON "funnel_visitor_profiles"("leadId");

-- CreateIndex
CREATE INDEX "funnel_visitor_profiles_email_idx" ON "funnel_visitor_profiles"("email");

-- CreateIndex
CREATE INDEX "funnel_visitor_profiles_visitorFingerprint_idx" ON "funnel_visitor_profiles"("visitorFingerprint");

-- CreateIndex
CREATE INDEX "card_vaults_companyId_idx" ON "card_vaults"("companyId");

-- CreateIndex
CREATE INDEX "card_vaults_customerId_idx" ON "card_vaults"("customerId");

-- CreateIndex
CREATE INDEX "card_vaults_status_idx" ON "card_vaults"("status");

-- CreateIndex
CREATE INDEX "card_vaults_expirationYear_expirationMonth_idx" ON "card_vaults"("expirationYear", "expirationMonth");

-- CreateIndex
CREATE UNIQUE INDEX "card_vaults_companyId_customerId_providerToken_key" ON "card_vaults"("companyId", "customerId", "providerToken");

-- CreateIndex
CREATE INDEX "card_vault_transactions_cardVaultId_idx" ON "card_vault_transactions"("cardVaultId");

-- CreateIndex
CREATE INDEX "card_vault_transactions_transactionId_idx" ON "card_vault_transactions"("transactionId");

-- CreateIndex
CREATE INDEX "card_vault_transactions_processedAt_idx" ON "card_vault_transactions"("processedAt");

-- CreateIndex
CREATE INDEX "encrypted_cards_sessionToken_idx" ON "encrypted_cards"("sessionToken");

-- CreateIndex
CREATE INDEX "encrypted_cards_cardFingerprint_idx" ON "encrypted_cards"("cardFingerprint");

-- CreateIndex
CREATE INDEX "encrypted_cards_expiresAt_idx" ON "encrypted_cards"("expiresAt");

-- CreateIndex
CREATE INDEX "ai_methodology_templates_methodology_idx" ON "ai_methodology_templates"("methodology");

-- CreateIndex
CREATE INDEX "ai_methodology_templates_companyId_idx" ON "ai_methodology_templates"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_funnel_generations_funnelId_key" ON "ai_funnel_generations"("funnelId");

-- CreateIndex
CREATE INDEX "ai_funnel_generations_companyId_idx" ON "ai_funnel_generations"("companyId");

-- CreateIndex
CREATE INDEX "ai_funnel_generations_status_idx" ON "ai_funnel_generations"("status");

-- CreateIndex
CREATE INDEX "ai_funnel_generations_createdAt_idx" ON "ai_funnel_generations"("createdAt");

-- CreateIndex
CREATE INDEX "email_templates_category_idx" ON "email_templates"("category");

-- CreateIndex
CREATE INDEX "email_templates_isActive_idx" ON "email_templates"("isActive");

-- CreateIndex
CREATE INDEX "email_templates_deletedAt_idx" ON "email_templates"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_organizationId_code_key" ON "email_templates"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_clientId_code_key" ON "email_templates"("clientId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_companyId_code_key" ON "email_templates"("companyId", "code");

-- CreateIndex
CREATE INDEX "email_send_logs_toEmail_idx" ON "email_send_logs"("toEmail");

-- CreateIndex
CREATE INDEX "email_send_logs_templateCode_idx" ON "email_send_logs"("templateCode");

-- CreateIndex
CREATE INDEX "email_send_logs_status_idx" ON "email_send_logs"("status");

-- CreateIndex
CREATE INDEX "email_send_logs_createdAt_idx" ON "email_send_logs"("createdAt");

-- CreateIndex
CREATE INDEX "email_send_logs_companyId_createdAt_idx" ON "email_send_logs"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "email_send_logs_relatedEntityType_relatedEntityId_idx" ON "email_send_logs"("relatedEntityType", "relatedEntityId");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_founderNumber_key" ON "waitlist"("founderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_referralCode_key" ON "waitlist"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_inviteToken_key" ON "waitlist"("inviteToken");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_clientId_key" ON "waitlist"("clientId");

-- CreateIndex
CREATE INDEX "waitlist_organizationId_idx" ON "waitlist"("organizationId");

-- CreateIndex
CREATE INDEX "waitlist_status_idx" ON "waitlist"("status");

-- CreateIndex
CREATE INDEX "waitlist_currentPosition_idx" ON "waitlist"("currentPosition");

-- CreateIndex
CREATE INDEX "waitlist_founderNumber_idx" ON "waitlist"("founderNumber");

-- CreateIndex
CREATE INDEX "waitlist_inviteToken_idx" ON "waitlist"("inviteToken");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_organizationId_email_key" ON "waitlist"("organizationId", "email");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_teamLeadId_fkey" FOREIGN KEY ("teamLeadId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_vaults" ADD CONSTRAINT "payment_vaults_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_accounts" ADD CONSTRAINT "billing_accounts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_accounts" ADD CONSTRAINT "billing_accounts_paymentVaultId_fkey" FOREIGN KEY ("paymentVaultId") REFERENCES "payment_vaults"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_billingAccountId_fkey" FOREIGN KEY ("billingAccountId") REFERENCES "billing_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_fulfillmentProviderId_fkey" FOREIGN KEY ("fulfillmentProviderId") REFERENCES "fulfillment_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_events" ADD CONSTRAINT "shipment_events_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_providers" ADD CONSTRAINT "payment_providers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_subscriptionPlanId_fkey" FOREIGN KEY ("subscriptionPlanId") REFERENCES "subscription_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_paymentVaultId_fkey" FOREIGN KEY ("paymentVaultId") REFERENCES "payment_vaults"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_paymentProviderId_fkey" FOREIGN KEY ("paymentProviderId") REFERENCES "payment_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_giftPurchaserId_fkey" FOREIGN KEY ("giftPurchaserId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_parentSubId_fkey" FOREIGN KEY ("parentSubId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_items" ADD CONSTRAINT "subscription_items_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_items" ADD CONSTRAINT "subscription_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_rebills" ADD CONSTRAINT "subscription_rebills_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_rebills" ADD CONSTRAINT "subscription_rebills_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_downsellPlanId_fkey" FOREIGN KEY ("downsellPlanId") REFERENCES "subscription_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_subscription_plans" ADD CONSTRAINT "product_subscription_plans_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_subscription_plans" ADD CONSTRAINT "product_subscription_plans_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_settings" ADD CONSTRAINT "subscription_settings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_settings" ADD CONSTRAINT "subscription_settings_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_settings" ADD CONSTRAINT "subscription_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fulfillment_providers" ADD CONSTRAINT "fulfillment_providers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fulfillment_providers" ADD CONSTRAINT "fulfillment_providers_vendorCompanyId_fkey" FOREIGN KEY ("vendorCompanyId") REFERENCES "vendor_companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_fulfillment_assignments" ADD CONSTRAINT "product_fulfillment_assignments_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_fulfillment_assignments" ADD CONSTRAINT "product_fulfillment_assignments_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "fulfillment_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_paymentProviderId_fkey" FOREIGN KEY ("paymentProviderId") REFERENCES "payment_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_paymentVaultId_fkey" FOREIGN KEY ("paymentVaultId") REFERENCES "payment_vaults"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_subscriptions" ADD CONSTRAINT "client_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "pricing_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_periods" ADD CONSTRAINT "usage_periods_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "client_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_usage_records" ADD CONSTRAINT "company_usage_records_usagePeriodId_fkey" FOREIGN KEY ("usagePeriodId") REFERENCES "usage_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_usagePeriodId_fkey" FOREIGN KEY ("usagePeriodId") REFERENCES "usage_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "client_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_usagePeriodId_fkey" FOREIGN KEY ("usagePeriodId") REFERENCES "usage_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_intents" ADD CONSTRAINT "customer_intents_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_intents" ADD CONSTRAINT "customer_intents_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_intentId_fkey" FOREIGN KEY ("intentId") REFERENCES "customer_intents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "save_attempts" ADD CONSTRAINT "save_attempts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "save_attempts" ADD CONSTRAINT "save_attempts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_calls" ADD CONSTRAINT "voice_calls_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_calls" ADD CONSTRAINT "voice_calls_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_calls" ADD CONSTRAINT "voice_calls_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "interventions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upsell_offers" ADD CONSTRAINT "upsell_offers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upsell_offers" ADD CONSTRAINT "upsell_offers_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upsell_configs" ADD CONSTRAINT "upsell_configs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "save_flow_configs" ADD CONSTRAINT "save_flow_configs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_scripts" ADD CONSTRAINT "voice_scripts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "momentum_analytics" ADD CONSTRAINT "momentum_analytics_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cs_messages" ADD CONSTRAINT "cs_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "cs_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_csSessionId_fkey" FOREIGN KEY ("csSessionId") REFERENCES "cs_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_initiatedBy_fkey" FOREIGN KEY ("initiatedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_rejectedBy_fkey" FOREIGN KEY ("rejectedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rmas" ADD CONSTRAINT "rmas_csSessionId_fkey" FOREIGN KEY ("csSessionId") REFERENCES "cs_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terms_summaries" ADD CONSTRAINT "terms_summaries_termsDocumentId_fkey" FOREIGN KEY ("termsDocumentId") REFERENCES "terms_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terms_acceptances" ADD CONSTRAINT "terms_acceptances_termsDocumentId_fkey" FOREIGN KEY ("termsDocumentId") REFERENCES "terms_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_contents" ADD CONSTRAINT "generated_contents_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_enrollments" ADD CONSTRAINT "automation_enrollments_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "automations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_integrations" ADD CONSTRAINT "platform_integrations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_integrations" ADD CONSTRAINT "client_integrations_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_integrations" ADD CONSTRAINT "client_integrations_platformIntegrationId_fkey" FOREIGN KEY ("platformIntegrationId") REFERENCES "platform_integrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_integrations" ADD CONSTRAINT "client_integrations_merchantAccountId_fkey" FOREIGN KEY ("merchantAccountId") REFERENCES "merchant_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_usage" ADD CONSTRAINT "integration_usage_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_usage" ADD CONSTRAINT "integration_usage_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_usage" ADD CONSTRAINT "integration_usage_clientIntegrationId_fkey" FOREIGN KEY ("clientIntegrationId") REFERENCES "client_integrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_usage" ADD CONSTRAINT "integration_usage_platformIntegrationId_fkey" FOREIGN KEY ("platformIntegrationId") REFERENCES "platform_integrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deletion_logs" ADD CONSTRAINT "deletion_logs_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_price_rules" ADD CONSTRAINT "product_price_rules_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant_options" ADD CONSTRAINT "variant_options_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant_option_values" ADD CONSTRAINT "variant_option_values_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "variant_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_products" ADD CONSTRAINT "collection_products_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_products" ADD CONSTRAINT "collection_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundles" ADD CONSTRAINT "bundles_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundles" ADD CONSTRAINT "bundles_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_items" ADD CONSTRAINT "bundle_items_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "bundles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_items" ADD CONSTRAINT "bundle_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_items" ADD CONSTRAINT "bundle_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_locations" ADD CONSTRAINT "inventory_locations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_levels" ADD CONSTRAINT "inventory_levels_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "inventory_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_levels" ADD CONSTRAINT "inventory_levels_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_levels" ADD CONSTRAINT "inventory_levels_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_inventoryLevelId_fkey" FOREIGN KEY ("inventoryLevelId") REFERENCES "inventory_levels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_videos" ADD CONSTRAINT "marketing_videos_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_videos" ADD CONSTRAINT "marketing_videos_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_videos" ADD CONSTRAINT "marketing_videos_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "marketing_video_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_videos" ADD CONSTRAINT "marketing_videos_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_videos" ADD CONSTRAINT "marketing_videos_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_video_scenes" ADD CONSTRAINT "marketing_video_scenes_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "marketing_videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_video_variants" ADD CONSTRAINT "marketing_video_variants_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "marketing_videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_video_templates" ADD CONSTRAINT "marketing_video_templates_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_grants" ADD CONSTRAINT "permission_grants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_grants" ADD CONSTRAINT "permission_grants_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_companies" ADD CONSTRAINT "vendor_companies_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_client_connections" ADD CONSTRAINT "vendor_client_connections_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_client_connections" ADD CONSTRAINT "vendor_client_connections_vendorCompanyId_fkey" FOREIGN KEY ("vendorCompanyId") REFERENCES "vendor_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_client_connections" ADD CONSTRAINT "vendor_client_connections_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_products" ADD CONSTRAINT "vendor_products_vendorCompanyId_fkey" FOREIGN KEY ("vendorCompanyId") REFERENCES "vendor_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_product_syncs" ADD CONSTRAINT "vendor_product_syncs_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "vendor_client_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_product_syncs" ADD CONSTRAINT "vendor_product_syncs_vendorProductId_fkey" FOREIGN KEY ("vendorProductId") REFERENCES "vendor_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_product_syncs" ADD CONSTRAINT "vendor_product_syncs_companyProductId_fkey" FOREIGN KEY ("companyProductId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_orders" ADD CONSTRAINT "vendor_orders_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "vendor_client_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_orders" ADD CONSTRAINT "vendor_orders_vendorCompanyId_fkey" FOREIGN KEY ("vendorCompanyId") REFERENCES "vendor_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_orders" ADD CONSTRAINT "vendor_orders_sourceOrderId_fkey" FOREIGN KEY ("sourceOrderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_order_items" ADD CONSTRAINT "vendor_order_items_vendorOrderId_fkey" FOREIGN KEY ("vendorOrderId") REFERENCES "vendor_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_order_items" ADD CONSTRAINT "vendor_order_items_vendorProductId_fkey" FOREIGN KEY ("vendorProductId") REFERENCES "vendor_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_notes" ADD CONSTRAINT "customer_notes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_notes" ADD CONSTRAINT "customer_notes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_tags" ADD CONSTRAINT "customer_tags_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_settings" ADD CONSTRAINT "refund_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_media" ADD CONSTRAINT "review_media_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "product_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_votes" ADD CONSTRAINT "review_votes_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "product_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_votes" ADD CONSTRAINT "review_votes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_configs" ADD CONSTRAINT "review_configs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_review_stats" ADD CONSTRAINT "product_review_stats_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_review_stats" ADD CONSTRAINT "product_review_stats_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landing_pages" ADD CONSTRAINT "landing_pages_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landing_page_sections" ADD CONSTRAINT "landing_page_sections_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "landing_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landing_page_domains" ADD CONSTRAINT "landing_page_domains_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "landing_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landing_page_usage" ADD CONSTRAINT "landing_page_usage_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "landing_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ab_tests" ADD CONSTRAINT "ab_tests_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "landing_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ab_tests" ADD CONSTRAINT "ab_tests_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ab_test_variants" ADD CONSTRAINT "ab_test_variants_testId_fkey" FOREIGN KEY ("testId") REFERENCES "ab_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landing_page_popups" ADD CONSTRAINT "landing_page_popups_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "landing_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landing_page_popups" ADD CONSTRAINT "landing_page_popups_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dynamic_text_rules" ADD CONSTRAINT "dynamic_text_rules_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "landing_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dynamic_text_rules" ADD CONSTRAINT "dynamic_text_rules_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversion_goals" ADD CONSTRAINT "conversion_goals_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "landing_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversion_goals" ADD CONSTRAINT "conversion_goals_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversion_events" ADD CONSTRAINT "conversion_events_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "conversion_goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_pages" ADD CONSTRAINT "payment_pages_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_pages" ADD CONSTRAINT "payment_pages_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "checkout_page_themes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_pages" ADD CONSTRAINT "payment_pages_parentPageId_fkey" FOREIGN KEY ("parentPageId") REFERENCES "payment_pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_page_sessions" ADD CONSTRAINT "payment_page_sessions_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "payment_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_page_sessions" ADD CONSTRAINT "payment_page_sessions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_page_analytics" ADD CONSTRAINT "payment_page_analytics_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "payment_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funnels" ADD CONSTRAINT "funnels_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funnel_stages" ADD CONSTRAINT "funnel_stages_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "funnels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funnel_variants" ADD CONSTRAINT "funnel_variants_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "funnels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funnel_sessions" ADD CONSTRAINT "funnel_sessions_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "funnels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funnel_sessions" ADD CONSTRAINT "funnel_sessions_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "funnel_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funnel_sessions" ADD CONSTRAINT "funnel_sessions_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funnel_events" ADD CONSTRAINT "funnel_events_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "funnel_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funnel_ab_tests" ADD CONSTRAINT "funnel_ab_tests_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "funnels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funnel_ab_test_results" ADD CONSTRAINT "funnel_ab_test_results_testId_fkey" FOREIGN KEY ("testId") REFERENCES "funnel_ab_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funnel_ab_test_results" ADD CONSTRAINT "funnel_ab_test_results_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "funnel_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funnel_ai_insights" ADD CONSTRAINT "funnel_ai_insights_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "funnels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "features" ADD CONSTRAINT "features_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_issues" ADD CONSTRAINT "feature_issues_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_activities" ADD CONSTRAINT "feature_activities_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_test_accounts" ADD CONSTRAINT "feature_test_accounts_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qa_checklist_items" ADD CONSTRAINT "qa_checklist_items_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "qa_checklist_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "code_review_checklist_items" ADD CONSTRAINT "code_review_checklist_items_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "code_review_checklist_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funnel_visitor_profiles" ADD CONSTRAINT "funnel_visitor_profiles_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_vaults" ADD CONSTRAINT "card_vaults_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_vaults" ADD CONSTRAINT "card_vaults_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_vault_transactions" ADD CONSTRAINT "card_vault_transactions_cardVaultId_fkey" FOREIGN KEY ("cardVaultId") REFERENCES "card_vaults"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_methodology_templates" ADD CONSTRAINT "ai_methodology_templates_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_funnel_generations" ADD CONSTRAINT "ai_funnel_generations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_funnel_generations" ADD CONSTRAINT "ai_funnel_generations_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ai_methodology_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_funnel_generations" ADD CONSTRAINT "ai_funnel_generations_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "funnels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_send_logs" ADD CONSTRAINT "email_send_logs_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "email_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_referredBy_fkey" FOREIGN KEY ("referredBy") REFERENCES "waitlist"("referralCode") ON DELETE SET NULL ON UPDATE CASCADE;

