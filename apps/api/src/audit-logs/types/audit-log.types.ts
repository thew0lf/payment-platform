import { ScopeType, DataClassification } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT ACTIONS - Compliance-Ready (SOC2, ISO 27001, GDPR, CNIL, PCI-DSS)
// ═══════════════════════════════════════════════════════════════════════════════
//
// This comprehensive action set covers:
// - SOC2 Trust Service Criteria (Security, Availability, Processing Integrity, Confidentiality, Privacy)
// - ISO 27001 Annex A Controls (A.12.4 Logging and Monitoring)
// - GDPR Article 30 (Records of Processing Activities) & Article 17 (Right to Erasure)
// - French CNIL Requirements (Data Processing Registry, Right to Information)
// - PCI-DSS Requirements 10.x (Track and Monitor All Access)
//
// ═══════════════════════════════════════════════════════════════════════════════

export const AuditAction = {
  // ─────────────────────────────────────────────────────────────────────────────
  // AUTHENTICATION & SESSION (SOC2 CC6.1, PCI-DSS 10.2.4-10.2.5, ISO A.9.4.2)
  // ─────────────────────────────────────────────────────────────────────────────
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGIN_BLOCKED: 'LOGIN_BLOCKED', // Account lockout after failed attempts
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  SESSION_TERMINATED: 'SESSION_TERMINATED', // Admin forced logout
  SESSION_HIJACK_DETECTED: 'SESSION_HIJACK_DETECTED', // Suspicious session activity
  IMPERSONATION_START: 'IMPERSONATION_START', // Admin impersonating user
  IMPERSONATION_END: 'IMPERSONATION_END',

  // ─────────────────────────────────────────────────────────────────────────────
  // PASSWORD & CREDENTIALS (SOC2 CC6.1, PCI-DSS 8.2, ISO A.9.4.3)
  // ─────────────────────────────────────────────────────────────────────────────
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  PASSWORD_RESET_REQUESTED: 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED: 'PASSWORD_RESET_COMPLETED',
  PASSWORD_EXPIRED: 'PASSWORD_EXPIRED',
  MFA_ENABLED: 'MFA_ENABLED',
  MFA_DISABLED: 'MFA_DISABLED',
  MFA_CHALLENGE_PASSED: 'MFA_CHALLENGE_PASSED',
  MFA_CHALLENGE_FAILED: 'MFA_CHALLENGE_FAILED',
  MFA_RECOVERY_USED: 'MFA_RECOVERY_USED', // Backup codes used
  SSO_LINKED: 'SSO_LINKED', // Auth0/OAuth linked
  SSO_UNLINKED: 'SSO_UNLINKED',

  // ─────────────────────────────────────────────────────────────────────────────
  // CRUD OPERATIONS (SOC2 CC6.1, ISO A.12.4.1, PCI-DSS 10.2.7)
  // ─────────────────────────────────────────────────────────────────────────────
  CREATE: 'CREATE',
  READ: 'READ', // For sensitive data access tracking
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  SOFT_DELETE: 'SOFT_DELETE',
  HARD_DELETE: 'HARD_DELETE', // Permanent deletion
  RESTORE: 'RESTORE',
  BULK_CREATE: 'BULK_CREATE',
  BULK_UPDATE: 'BULK_UPDATE',
  BULK_DELETE: 'BULK_DELETE',

  // ─────────────────────────────────────────────────────────────────────────────
  // DATA OPERATIONS (GDPR Art. 17, 20, SOC2 CC6.7)
  // ─────────────────────────────────────────────────────────────────────────────
  EXPORT: 'EXPORT', // GDPR Data Portability
  IMPORT: 'IMPORT',
  ARCHIVE: 'ARCHIVE',
  UNARCHIVE: 'UNARCHIVE',
  ANONYMIZE: 'ANONYMIZE', // GDPR Right to Erasure (pseudonymization)
  DATA_RETENTION_APPLIED: 'DATA_RETENTION_APPLIED', // Auto-deletion per policy
  DATA_PURGED: 'DATA_PURGED', // Complete data removal

  // ─────────────────────────────────────────────────────────────────────────────
  // PAYMENT & TRANSACTION (PCI-DSS 10.2.1, 10.2.5, SOC2 CC7.2)
  // ─────────────────────────────────────────────────────────────────────────────
  PAYMENT_INITIATED: 'PAYMENT_INITIATED',
  PAYMENT_AUTHORIZED: 'PAYMENT_AUTHORIZED',
  PAYMENT_CAPTURED: 'PAYMENT_CAPTURED',
  PAYMENT_COMPLETED: 'PAYMENT_COMPLETED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_DECLINED: 'PAYMENT_DECLINED',
  PAYMENT_VOIDED: 'PAYMENT_VOIDED',
  REFUND_REQUESTED: 'REFUND_REQUESTED',
  REFUND_APPROVED: 'REFUND_APPROVED',
  REFUND_REJECTED: 'REFUND_REJECTED',
  REFUND_INITIATED: 'REFUND_INITIATED',
  REFUND_COMPLETED: 'REFUND_COMPLETED',
  REFUND_FAILED: 'REFUND_FAILED',
  CHARGEBACK_RECEIVED: 'CHARGEBACK_RECEIVED',
  CHARGEBACK_RESPONDED: 'CHARGEBACK_RESPONDED',
  CHARGEBACK_WON: 'CHARGEBACK_WON',
  CHARGEBACK_LOST: 'CHARGEBACK_LOST',

  // ─────────────────────────────────────────────────────────────────────────────
  // PAYMENT VAULT & SENSITIVE DATA (PCI-DSS 3.x, 10.2.1)
  // ─────────────────────────────────────────────────────────────────────────────
  PAYMENT_METHOD_ADDED: 'PAYMENT_METHOD_ADDED',
  PAYMENT_METHOD_UPDATED: 'PAYMENT_METHOD_UPDATED',
  PAYMENT_METHOD_DELETED: 'PAYMENT_METHOD_DELETED',
  PAYMENT_METHOD_VERIFIED: 'PAYMENT_METHOD_VERIFIED',
  CARD_TOKENIZED: 'CARD_TOKENIZED',
  SENSITIVE_DATA_ACCESSED: 'SENSITIVE_DATA_ACCESSED', // PCI CHD access
  SENSITIVE_DATA_DECRYPTED: 'SENSITIVE_DATA_DECRYPTED',
  ENCRYPTION_KEY_ROTATED: 'ENCRYPTION_KEY_ROTATED', // Key management

  // ─────────────────────────────────────────────────────────────────────────────
  // ORDER & FULFILLMENT
  // ─────────────────────────────────────────────────────────────────────────────
  ORDER_PLACED: 'ORDER_PLACED',
  ORDER_CONFIRMED: 'ORDER_CONFIRMED',
  ORDER_MODIFIED: 'ORDER_MODIFIED',
  ORDER_CANCELED: 'ORDER_CANCELED',
  ORDER_COMPLETED: 'ORDER_COMPLETED',
  ORDER_ON_HOLD: 'ORDER_ON_HOLD',
  SHIPMENT_CREATED: 'SHIPMENT_CREATED',
  SHIPMENT_UPDATED: 'SHIPMENT_UPDATED',
  SHIPMENT_SHIPPED: 'SHIPMENT_SHIPPED',
  SHIPMENT_DELIVERED: 'SHIPMENT_DELIVERED',
  SHIPMENT_RETURNED: 'SHIPMENT_RETURNED',
  RMA_CREATED: 'RMA_CREATED',
  RMA_APPROVED: 'RMA_APPROVED',
  RMA_REJECTED: 'RMA_REJECTED',
  RMA_COMPLETED: 'RMA_COMPLETED',

  // ─────────────────────────────────────────────────────────────────────────────
  // SUBSCRIPTION & BILLING
  // ─────────────────────────────────────────────────────────────────────────────
  SUBSCRIPTION_CREATED: 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_ACTIVATED: 'SUBSCRIPTION_ACTIVATED',
  SUBSCRIPTION_PAUSED: 'SUBSCRIPTION_PAUSED',
  SUBSCRIPTION_RESUMED: 'SUBSCRIPTION_RESUMED',
  SUBSCRIPTION_CANCELED: 'SUBSCRIPTION_CANCELED',
  SUBSCRIPTION_RENEWED: 'SUBSCRIPTION_RENEWED',
  SUBSCRIPTION_UPGRADED: 'SUBSCRIPTION_UPGRADED',
  SUBSCRIPTION_DOWNGRADED: 'SUBSCRIPTION_DOWNGRADED',
  INVOICE_GENERATED: 'INVOICE_GENERATED',
  INVOICE_SENT: 'INVOICE_SENT',
  INVOICE_PAID: 'INVOICE_PAID',
  INVOICE_OVERDUE: 'INVOICE_OVERDUE',

  // ─────────────────────────────────────────────────────────────────────────────
  // INTEGRATION & SYNC (SOC2 CC6.6, ISO A.14.2.6)
  // ─────────────────────────────────────────────────────────────────────────────
  INTEGRATION_CONNECTED: 'INTEGRATION_CONNECTED',
  INTEGRATION_DISCONNECTED: 'INTEGRATION_DISCONNECTED',
  INTEGRATION_CONFIGURED: 'INTEGRATION_CONFIGURED',
  INTEGRATION_SYNCED: 'INTEGRATION_SYNCED',
  INTEGRATION_SYNC_FAILED: 'INTEGRATION_SYNC_FAILED',
  INTEGRATION_CREDENTIALS_UPDATED: 'INTEGRATION_CREDENTIALS_UPDATED',
  OAUTH_TOKEN_REFRESHED: 'OAUTH_TOKEN_REFRESHED',
  OAUTH_TOKEN_REVOKED: 'OAUTH_TOKEN_REVOKED',
  WEBHOOK_TRIGGERED: 'WEBHOOK_TRIGGERED',
  WEBHOOK_DELIVERED: 'WEBHOOK_DELIVERED',
  WEBHOOK_FAILED: 'WEBHOOK_FAILED',

  // ─────────────────────────────────────────────────────────────────────────────
  // ACCESS CONTROL & RBAC (SOC2 CC6.2-CC6.3, PCI-DSS 7.x, ISO A.9.2)
  // ─────────────────────────────────────────────────────────────────────────────
  ROLE_CREATED: 'ROLE_CREATED',
  ROLE_UPDATED: 'ROLE_UPDATED',
  ROLE_DELETED: 'ROLE_DELETED',
  ROLE_ASSIGNED: 'ROLE_ASSIGNED',
  ROLE_REVOKED: 'ROLE_REVOKED',
  PERMISSION_GRANTED: 'PERMISSION_GRANTED',
  PERMISSION_REVOKED: 'PERMISSION_REVOKED',
  PERMISSIONS_CHANGED: 'PERMISSIONS_CHANGED',
  ACCESS_DENIED: 'ACCESS_DENIED', // Unauthorized access attempts
  PRIVILEGE_ESCALATION: 'PRIVILEGE_ESCALATION', // Suspicious privilege change

  // ─────────────────────────────────────────────────────────────────────────────
  // USER MANAGEMENT (SOC2 CC6.2, ISO A.9.2.1-A.9.2.6)
  // ─────────────────────────────────────────────────────────────────────────────
  USER_INVITED: 'USER_INVITED',
  USER_REGISTERED: 'USER_REGISTERED',
  USER_ACTIVATED: 'USER_ACTIVATED',
  USER_DEACTIVATED: 'USER_DEACTIVATED',
  USER_SUSPENDED: 'USER_SUSPENDED',
  USER_REACTIVATED: 'USER_REACTIVATED',
  USER_PROFILE_UPDATED: 'USER_PROFILE_UPDATED',
  USER_EMAIL_CHANGED: 'USER_EMAIL_CHANGED',
  USER_EMAIL_VERIFIED: 'USER_EMAIL_VERIFIED',
  TEAM_MEMBER_ADDED: 'TEAM_MEMBER_ADDED',
  TEAM_MEMBER_REMOVED: 'TEAM_MEMBER_REMOVED',

  // ─────────────────────────────────────────────────────────────────────────────
  // API & SECURITY (PCI-DSS 10.2.2, SOC2 CC6.6, ISO A.9.4.4)
  // ─────────────────────────────────────────────────────────────────────────────
  API_KEY_CREATED: 'API_KEY_CREATED',
  API_KEY_ROTATED: 'API_KEY_ROTATED',
  API_KEY_REVOKED: 'API_KEY_REVOKED',
  API_KEY_EXPIRED: 'API_KEY_EXPIRED',
  API_RATE_LIMITED: 'API_RATE_LIMITED',
  API_ABUSE_DETECTED: 'API_ABUSE_DETECTED',
  SECURITY_ALERT: 'SECURITY_ALERT', // General security event
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  IP_BLOCKED: 'IP_BLOCKED',
  IP_WHITELISTED: 'IP_WHITELISTED',

  // ─────────────────────────────────────────────────────────────────────────────
  // CONFIGURATION & SETTINGS (SOC2 CC8.1, PCI-DSS 10.2.2)
  // ─────────────────────────────────────────────────────────────────────────────
  SETTINGS_CHANGED: 'SETTINGS_CHANGED',
  SECURITY_SETTINGS_CHANGED: 'SECURITY_SETTINGS_CHANGED',
  BILLING_SETTINGS_CHANGED: 'BILLING_SETTINGS_CHANGED',
  NOTIFICATION_SETTINGS_CHANGED: 'NOTIFICATION_SETTINGS_CHANGED',
  ROUTING_RULE_CREATED: 'ROUTING_RULE_CREATED',
  ROUTING_RULE_UPDATED: 'ROUTING_RULE_UPDATED',
  ROUTING_RULE_DELETED: 'ROUTING_RULE_DELETED',
  ACCOUNT_POOL_CREATED: 'ACCOUNT_POOL_CREATED',
  ACCOUNT_POOL_UPDATED: 'ACCOUNT_POOL_UPDATED',
  ACCOUNT_POOL_DELETED: 'ACCOUNT_POOL_DELETED',

  // ─────────────────────────────────────────────────────────────────────────────
  // MERCHANT ACCOUNT & FINANCIAL (PCI-DSS 10.2.3)
  // ─────────────────────────────────────────────────────────────────────────────
  MERCHANT_ACCOUNT_CREATED: 'MERCHANT_ACCOUNT_CREATED',
  MERCHANT_ACCOUNT_UPDATED: 'MERCHANT_ACCOUNT_UPDATED',
  MERCHANT_ACCOUNT_VERIFIED: 'MERCHANT_ACCOUNT_VERIFIED',
  MERCHANT_ACCOUNT_SUSPENDED: 'MERCHANT_ACCOUNT_SUSPENDED',
  MERCHANT_ACCOUNT_ACTIVATED: 'MERCHANT_ACCOUNT_ACTIVATED',
  PAYOUT_INITIATED: 'PAYOUT_INITIATED',
  PAYOUT_COMPLETED: 'PAYOUT_COMPLETED',
  PAYOUT_FAILED: 'PAYOUT_FAILED',

  // ─────────────────────────────────────────────────────────────────────────────
  // GATEWAY RISK & RESERVE MANAGEMENT (PCI-DSS 10.2.3, SOC2 CC7.2)
  // ─────────────────────────────────────────────────────────────────────────────
  RESERVE_HOLD_CREATED: 'RESERVE_HOLD_CREATED',
  RESERVE_RELEASED: 'RESERVE_RELEASED',
  RESERVE_ADJUSTED: 'RESERVE_ADJUSTED',
  RESERVE_CHARGEBACK_DEBIT: 'RESERVE_CHARGEBACK_DEBIT',
  RESERVE_SCHEDULED_RELEASE: 'RESERVE_SCHEDULED_RELEASE',
  MERCHANT_RISK_PROFILE_CREATED: 'MERCHANT_RISK_PROFILE_CREATED',
  MERCHANT_RISK_PROFILE_UPDATED: 'MERCHANT_RISK_PROFILE_UPDATED',
  MERCHANT_RISK_LEVEL_CHANGED: 'MERCHANT_RISK_LEVEL_CHANGED',
  MERCHANT_ACCOUNT_STATUS_CHANGED: 'MERCHANT_ACCOUNT_STATUS_CHANGED',
  CHARGEBACK_CREATED: 'CHARGEBACK_CREATED',
  CHARGEBACK_REPRESENTMENT_SUBMITTED: 'CHARGEBACK_REPRESENTMENT_SUBMITTED',
  CHARGEBACK_RESOLVED: 'CHARGEBACK_RESOLVED',

  // ─────────────────────────────────────────────────────────────────────────────
  // GDPR & PRIVACY (GDPR Art. 6, 7, 13-22, CNIL Requirements)
  // ─────────────────────────────────────────────────────────────────────────────
  CONSENT_GIVEN: 'CONSENT_GIVEN', // GDPR Art. 7
  CONSENT_WITHDRAWN: 'CONSENT_WITHDRAWN',
  PRIVACY_REQUEST_SUBMITTED: 'PRIVACY_REQUEST_SUBMITTED', // DSAR
  PRIVACY_REQUEST_COMPLETED: 'PRIVACY_REQUEST_COMPLETED',
  DATA_ACCESS_REQUEST: 'DATA_ACCESS_REQUEST', // GDPR Art. 15
  DATA_RECTIFICATION_REQUEST: 'DATA_RECTIFICATION_REQUEST', // GDPR Art. 16
  DATA_ERASURE_REQUEST: 'DATA_ERASURE_REQUEST', // GDPR Art. 17
  DATA_PORTABILITY_REQUEST: 'DATA_PORTABILITY_REQUEST', // GDPR Art. 20
  PROCESSING_RESTRICTION_REQUEST: 'PROCESSING_RESTRICTION_REQUEST', // GDPR Art. 18
  OBJECTION_TO_PROCESSING: 'OBJECTION_TO_PROCESSING', // GDPR Art. 21
  DATA_BREACH_DETECTED: 'DATA_BREACH_DETECTED', // GDPR Art. 33
  DATA_BREACH_REPORTED: 'DATA_BREACH_REPORTED',
  DPO_NOTIFIED: 'DPO_NOTIFIED', // Data Protection Officer notification

  // ─────────────────────────────────────────────────────────────────────────────
  // TERMS & LEGAL (GDPR Art. 7, Consumer Law)
  // ─────────────────────────────────────────────────────────────────────────────
  TERMS_ACCEPTED: 'TERMS_ACCEPTED',
  TERMS_DECLINED: 'TERMS_DECLINED',
  TERMS_VERSION_UPDATED: 'TERMS_VERSION_UPDATED',
  PRIVACY_POLICY_UPDATED: 'PRIVACY_POLICY_UPDATED',

  // ─────────────────────────────────────────────────────────────────────────────
  // INVENTORY & PRODUCT
  // ─────────────────────────────────────────────────────────────────────────────
  INVENTORY_ADJUSTED: 'INVENTORY_ADJUSTED',
  INVENTORY_RECEIVED: 'INVENTORY_RECEIVED',
  INVENTORY_TRANSFERRED: 'INVENTORY_TRANSFERRED',
  LOW_STOCK_ALERT: 'LOW_STOCK_ALERT',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  PRODUCT_PUBLISHED: 'PRODUCT_PUBLISHED',
  PRODUCT_UNPUBLISHED: 'PRODUCT_UNPUBLISHED',
  PRICE_CHANGED: 'PRICE_CHANGED',

  // ─────────────────────────────────────────────────────────────────────────────
  // VENDOR & MARKETPLACE
  // ─────────────────────────────────────────────────────────────────────────────
  VENDOR_REGISTERED: 'VENDOR_REGISTERED',
  VENDOR_APPROVED: 'VENDOR_APPROVED',
  VENDOR_REJECTED: 'VENDOR_REJECTED',
  VENDOR_SUSPENDED: 'VENDOR_SUSPENDED',
  VENDOR_CONNECTION_CREATED: 'VENDOR_CONNECTION_CREATED',
  VENDOR_CONNECTION_REMOVED: 'VENDOR_CONNECTION_REMOVED',
  VENDOR_PRODUCT_SYNCED: 'VENDOR_PRODUCT_SYNCED',
  VENDOR_ORDER_RECEIVED: 'VENDOR_ORDER_RECEIVED',
  VENDOR_PAYOUT_INITIATED: 'VENDOR_PAYOUT_INITIATED',

  // ─────────────────────────────────────────────────────────────────────────────
  // SYSTEM & INFRASTRUCTURE (SOC2 CC7.1, ISO A.12.4.3)
  // ─────────────────────────────────────────────────────────────────────────────
  SYSTEM_STARTUP: 'SYSTEM_STARTUP',
  SYSTEM_SHUTDOWN: 'SYSTEM_SHUTDOWN',
  CONFIG_CHANGED: 'CONFIG_CHANGED',
  BACKUP_CREATED: 'BACKUP_CREATED',
  BACKUP_RESTORED: 'BACKUP_RESTORED',
  MAINTENANCE_STARTED: 'MAINTENANCE_STARTED',
  MAINTENANCE_COMPLETED: 'MAINTENANCE_COMPLETED',
  AUDIT_LOG_ACCESSED: 'AUDIT_LOG_ACCESSED', // Meta-audit
  AUDIT_LOG_EXPORTED: 'AUDIT_LOG_EXPORTED',

  // ─────────────────────────────────────────────────────────────────────────────
  // AI & AUTOMATION (SOC2 CC7.4, GDPR Art. 22)
  // ─────────────────────────────────────────────────────────────────────────────
  AI_CONTENT_GENERATED: 'AI_CONTENT_GENERATED',
  AI_DECISION_MADE: 'AI_DECISION_MADE', // Automated decision-making
  AI_DECISION_REVIEWED: 'AI_DECISION_REVIEWED', // Human review of AI decision
  AUTOMATION_TRIGGERED: 'AUTOMATION_TRIGGERED',
  AUTOMATION_COMPLETED: 'AUTOMATION_COMPLETED',
  AUTOMATION_FAILED: 'AUTOMATION_FAILED',

  // ─────────────────────────────────────────────────────────────────────────────
  // EMAIL & COMMUNICATION (GDPR Art. 21, CAN-SPAM, CASL)
  // ─────────────────────────────────────────────────────────────────────────────
  EMAIL_QUEUED: 'EMAIL_QUEUED', // Email added to SQS queue
  EMAIL_SENT: 'EMAIL_SENT', // Email successfully sent via SES
  EMAIL_FAILED: 'EMAIL_FAILED', // Email send permanently failed
  EMAIL_RETRY: 'EMAIL_RETRY', // Email queued for retry after failure
  EMAIL_BOUNCED: 'EMAIL_BOUNCED', // Hard/soft bounce received
  EMAIL_COMPLAINT: 'EMAIL_COMPLAINT', // Spam complaint received
  EMAIL_DELIVERED: 'EMAIL_DELIVERED', // Delivery confirmation from SES
  EMAIL_OPENED: 'EMAIL_OPENED', // Email opened (tracking pixel)
  EMAIL_CLICKED: 'EMAIL_CLICKED', // Link clicked in email
  EMAIL_UNSUBSCRIBED: 'EMAIL_UNSUBSCRIBED', // User unsubscribed
  EMAIL_QUEUE_PURGED: 'EMAIL_QUEUE_PURGED', // Admin purged email queue
  EMAIL_QUEUE_FAILED: 'EMAIL_QUEUE_FAILED', // Failed to queue email
  EMAIL_TEMPLATE_CREATED: 'EMAIL_TEMPLATE_CREATED',
  EMAIL_TEMPLATE_UPDATED: 'EMAIL_TEMPLATE_UPDATED',
  EMAIL_TEMPLATE_DELETED: 'EMAIL_TEMPLATE_DELETED',
} as const;

export type AuditActionType = (typeof AuditAction)[keyof typeof AuditAction];

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT ENTITIES - All auditable system entities
// ═══════════════════════════════════════════════════════════════════════════════

export const AuditEntity = {
  // ─────────────────────────────────────────────────────────────────────────────
  // HIERARCHY
  // ─────────────────────────────────────────────────────────────────────────────
  ORGANIZATION: 'Organization',
  CLIENT: 'Client',
  COMPANY: 'Company',
  DEPARTMENT: 'Department',
  TEAM: 'Team',

  // ─────────────────────────────────────────────────────────────────────────────
  // USERS & ACCESS
  // ─────────────────────────────────────────────────────────────────────────────
  USER: 'User',
  USER_SESSION: 'UserSession',
  ROLE: 'Role',
  PERMISSION: 'Permission',
  API_KEY: 'ApiKey',

  // ─────────────────────────────────────────────────────────────────────────────
  // CUSTOMERS
  // ─────────────────────────────────────────────────────────────────────────────
  CUSTOMER: 'Customer',
  CUSTOMER_ADDRESS: 'CustomerAddress',
  CUSTOMER_NOTE: 'CustomerNote',
  CUSTOMER_TAG: 'CustomerTag',

  // ─────────────────────────────────────────────────────────────────────────────
  // COMMERCE
  // ─────────────────────────────────────────────────────────────────────────────
  ORDER: 'Order',
  ORDER_ITEM: 'OrderItem',
  PRODUCT: 'Product',
  PRODUCT_VARIANT: 'ProductVariant',
  CATEGORY: 'Category',
  COLLECTION: 'Collection',
  BUNDLE: 'Bundle',
  TAG: 'Tag',

  // ─────────────────────────────────────────────────────────────────────────────
  // PAYMENTS (PCI Scope)
  // ─────────────────────────────────────────────────────────────────────────────
  TRANSACTION: 'Transaction',
  PAYMENT_VAULT: 'PaymentVault',
  PAYMENT_PROVIDER: 'PaymentProvider',
  BILLING_ACCOUNT: 'BillingAccount',
  REFUND: 'Refund',
  CHARGEBACK: 'Chargeback',

  // ─────────────────────────────────────────────────────────────────────────────
  // SUBSCRIPTIONS & BILLING
  // ─────────────────────────────────────────────────────────────────────────────
  SUBSCRIPTION: 'Subscription',
  INVOICE: 'Invoice',
  PRICING_PLAN: 'PricingPlan',

  // ─────────────────────────────────────────────────────────────────────────────
  // FULFILLMENT
  // ─────────────────────────────────────────────────────────────────────────────
  SHIPMENT: 'Shipment',
  SHIPMENT_EVENT: 'ShipmentEvent',
  RMA: 'RMA',
  INVENTORY: 'Inventory',
  INVENTORY_LOCATION: 'InventoryLocation',
  INVENTORY_ADJUSTMENT: 'InventoryAdjustment',

  // ─────────────────────────────────────────────────────────────────────────────
  // ROUTING & MERCHANT
  // ─────────────────────────────────────────────────────────────────────────────
  MERCHANT_ACCOUNT: 'MerchantAccount',
  ROUTING_RULE: 'RoutingRule',
  ROUTING_DECISION: 'RoutingDecision',
  ACCOUNT_POOL: 'AccountPool',

  // ─────────────────────────────────────────────────────────────────────────────
  // INTEGRATIONS
  // ─────────────────────────────────────────────────────────────────────────────
  INTEGRATION: 'Integration',
  PLATFORM_INTEGRATION: 'PlatformIntegration',
  CLIENT_INTEGRATION: 'ClientIntegration',
  OAUTH_TOKEN: 'OAuthToken',
  WEBHOOK: 'Webhook',

  // ─────────────────────────────────────────────────────────────────────────────
  // VENDORS
  // ─────────────────────────────────────────────────────────────────────────────
  VENDOR: 'Vendor',
  VENDOR_PRODUCT: 'VendorProduct',
  VENDOR_ORDER: 'VendorOrder',
  VENDOR_CONNECTION: 'VendorConnection',

  // ─────────────────────────────────────────────────────────────────────────────
  // MOMENTUM INTELLIGENCE
  // ─────────────────────────────────────────────────────────────────────────────
  CUSTOMER_INTENT: 'CustomerIntent',
  INTERVENTION: 'Intervention',
  SAVE_ATTEMPT: 'SaveAttempt',
  UPSELL_OFFER: 'UpsellOffer',
  VOICE_CALL: 'VoiceCall',
  GENERATED_CONTENT: 'GeneratedContent',
  AUTOMATION: 'Automation',

  // ─────────────────────────────────────────────────────────────────────────────
  // LEGAL & COMPLIANCE
  // ─────────────────────────────────────────────────────────────────────────────
  TERMS_DOCUMENT: 'TermsDocument',
  TERMS_ACCEPTANCE: 'TermsAcceptance',
  PRIVACY_REQUEST: 'PrivacyRequest',
  CONSENT_RECORD: 'ConsentRecord',
  DATA_BREACH: 'DataBreach',

  // ─────────────────────────────────────────────────────────────────────────────
  // SETTINGS & CONFIG
  // ─────────────────────────────────────────────────────────────────────────────
  SETTINGS: 'Settings',
  REFUND_SETTINGS: 'RefundSettings',
  REFUND_POLICY: 'RefundPolicy',
  RMA_POLICY: 'RMAPolicy',

  // ─────────────────────────────────────────────────────────────────────────────
  // SYSTEM
  // ─────────────────────────────────────────────────────────────────────────────
  AUDIT_LOG: 'AuditLog',
  DELETION_LOG: 'DeletionLog',
  SYSTEM: 'System',
} as const;

export type AuditEntityType = typeof AuditEntity[keyof typeof AuditEntity];

// ═══════════════════════════════════════════════════════════════
// DTOs & INTERFACES
// ═══════════════════════════════════════════════════════════════

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  scopeType: ScopeType | null;
  scopeId: string | null;
  changes: Record<string, { before: unknown; after: unknown }> | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  dataClassification: DataClassification | null;
  createdAt: Date;
  user?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

export interface CreateAuditLogDto {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  scopeType?: ScopeType;
  scopeId?: string;
  changes?: Record<string, { before: unknown; after: unknown }>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  dataClassification?: DataClassification;
}

export interface AuditLogQueryDto {
  // Filters
  userId?: string;
  action?: string;
  actions?: string[];
  entity?: string;
  entities?: string[];
  entityId?: string;
  scopeType?: ScopeType;
  scopeId?: string;
  dataClassification?: DataClassification;
  search?: string;

  // Date range
  startDate?: Date;
  endDate?: Date;

  // Pagination
  limit?: number;
  offset?: number;
}

export interface AuditLogListResponse {
  items: AuditLogEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface AuditLogStats {
  totalLogs: number;
  logsByAction: Record<string, number>;
  logsByEntity: Record<string, number>;
  logsByClassification: Record<string, number>;
  recentActivity: { date: string; count: number }[];
}
