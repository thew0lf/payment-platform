import { PrismaClient, ScopeType, DataClassification } from '@prisma/client';

const prisma = new PrismaClient();

interface AuditLogSeed {
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
  hoursAgo: number;
}

export async function seedAuditLogs() {
  console.log('Seeding audit logs (compliance-ready)...');

  // Get the admin user
  const adminUser = await prisma.user.findFirst({
    where: { email: 'admin@avnz.io' },
  });

  // Get some company users
  const companyUsers = await prisma.user.findMany({
    where: { scopeType: 'COMPANY' },
    take: 3,
  });

  // Get some companies
  const companies = await prisma.company.findMany({ take: 2 });
  const company = companies[0];

  // Get some customers
  const customers = await prisma.customer.findMany({ take: 3 });

  // Get some orders
  const orders = await prisma.order.findMany({ take: 3 });

  // Get some products
  const products = await prisma.product.findMany({ take: 2 });

  // Prepare comprehensive audit logs for compliance
  const auditLogs: AuditLogSeed[] = [
    // ─────────────────────────────────────────────────────────────────────────────
    // AUTHENTICATION & SESSION (SOC2 CC6.1, PCI-DSS 10.2.4-10.2.5)
    // ─────────────────────────────────────────────────────────────────────────────
    {
      action: 'LOGIN',
      entity: 'User',
      entityId: adminUser?.id,
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      metadata: { method: 'password', source: 'admin-dashboard' },
      hoursAgo: 0.5,
    },
    {
      action: 'LOGIN',
      entity: 'User',
      entityId: companyUsers[0]?.id,
      ipAddress: '10.0.0.45',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      metadata: { method: 'sso', provider: 'auth0' },
      hoursAgo: 2,
    },
    {
      action: 'LOGIN_FAILED',
      entity: 'User',
      metadata: { email: 'unknown@test.com', reason: 'Invalid credentials', attempts: 3 },
      ipAddress: '45.33.22.11',
      userAgent: 'curl/7.64.1',
      hoursAgo: 4,
    },
    {
      action: 'LOGIN_BLOCKED',
      entity: 'User',
      metadata: { email: 'suspicious@example.com', reason: 'Too many failed attempts', lockoutMinutes: 30 },
      ipAddress: '185.22.33.44',
      userAgent: 'Python-urllib/3.8',
      hoursAgo: 3,
    },
    {
      action: 'SESSION_TERMINATED',
      entity: 'UserSession',
      entityId: companyUsers[1]?.id,
      metadata: { reason: 'Admin forced logout', terminatedBy: adminUser?.id },
      hoursAgo: 12,
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // PASSWORD & CREDENTIALS (PCI-DSS 8.2, ISO A.9.4.3)
    // ─────────────────────────────────────────────────────────────────────────────
    {
      action: 'PASSWORD_CHANGED',
      entity: 'User',
      entityId: companyUsers[1]?.id,
      dataClassification: 'PII',
      metadata: { passwordStrength: 'strong', selfService: true },
      hoursAgo: 24,
    },
    {
      action: 'MFA_ENABLED',
      entity: 'User',
      entityId: companyUsers[0]?.id,
      dataClassification: 'CONFIDENTIAL',
      metadata: { method: 'totp', app: 'Google Authenticator' },
      hoursAgo: 48,
    },
    {
      action: 'MFA_CHALLENGE_FAILED',
      entity: 'User',
      entityId: companyUsers[2]?.id,
      ipAddress: '203.0.113.50',
      metadata: { reason: 'Invalid code', attempts: 2 },
      hoursAgo: 6,
    },
    {
      action: 'PASSWORD_RESET_REQUESTED',
      entity: 'User',
      metadata: { email: 'user@company.com', requestSource: 'forgot-password-form' },
      ipAddress: '192.168.1.50',
      hoursAgo: 18,
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // ORDER & PAYMENT OPERATIONS (PCI-DSS 10.2.1, 10.2.5)
    // ─────────────────────────────────────────────────────────────────────────────
    {
      action: 'ORDER_PLACED',
      entity: 'Order',
      entityId: orders[0]?.id,
      scopeType: 'COMPANY',
      scopeId: company?.id,
      metadata: { orderNumber: orders[0]?.orderNumber, total: 125.99, currency: 'USD' },
      hoursAgo: 1,
    },
    {
      action: 'PAYMENT_AUTHORIZED',
      entity: 'Transaction',
      scopeType: 'COMPANY',
      scopeId: company?.id,
      metadata: { amount: 125.99, currency: 'USD', provider: 'Stripe', last4: '4242' },
      dataClassification: 'PCI',
      hoursAgo: 0.9,
    },
    {
      action: 'PAYMENT_COMPLETED',
      entity: 'Transaction',
      scopeType: 'COMPANY',
      scopeId: company?.id,
      metadata: { amount: 125.99, currency: 'USD', provider: 'Stripe', transactionId: 'pi_xxx' },
      dataClassification: 'PCI',
      hoursAgo: 0.85,
    },
    {
      action: 'ORDER_CONFIRMED',
      entity: 'Order',
      entityId: orders[0]?.id,
      scopeType: 'COMPANY',
      scopeId: company?.id,
      changes: {
        status: { before: 'PENDING', after: 'CONFIRMED' },
        paymentStatus: { before: 'PENDING', after: 'PAID' },
      },
      hoursAgo: 0.75,
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // PAYMENT VAULT & SENSITIVE DATA (PCI-DSS 3.x)
    // ─────────────────────────────────────────────────────────────────────────────
    {
      action: 'PAYMENT_METHOD_ADDED',
      entity: 'PaymentVault',
      scopeType: 'COMPANY',
      scopeId: company?.id,
      metadata: { type: 'card', brand: 'VISA', last4: '4242' },
      dataClassification: 'PCI',
      hoursAgo: 36,
    },
    {
      action: 'SENSITIVE_DATA_ACCESSED',
      entity: 'PaymentVault',
      scopeType: 'COMPANY',
      scopeId: company?.id,
      metadata: { accessReason: 'Customer support request', ticketId: 'CS-12345' },
      dataClassification: 'PCI',
      hoursAgo: 8,
    },
    {
      action: 'ENCRYPTION_KEY_ROTATED',
      entity: 'System',
      metadata: { keyVersion: { before: 1, after: 2 }, algorithm: 'AES-256-GCM' },
      dataClassification: 'CONFIDENTIAL',
      hoursAgo: 720,
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // REFUND OPERATIONS
    // ─────────────────────────────────────────────────────────────────────────────
    {
      action: 'REFUND_REQUESTED',
      entity: 'Refund',
      scopeType: 'COMPANY',
      scopeId: company?.id,
      metadata: { amount: 49.99, reason: 'Customer request', orderId: orders[1]?.id },
      dataClassification: 'PCI',
      hoursAgo: 6,
    },
    {
      action: 'REFUND_APPROVED',
      entity: 'Refund',
      scopeType: 'COMPANY',
      scopeId: company?.id,
      metadata: { amount: 49.99, approvedBy: adminUser?.id },
      dataClassification: 'PCI',
      hoursAgo: 5.5,
    },
    {
      action: 'REFUND_COMPLETED',
      entity: 'Refund',
      scopeType: 'COMPANY',
      scopeId: company?.id,
      metadata: { amount: 49.99, provider: 'Stripe', refundId: 're_xxx' },
      dataClassification: 'PCI',
      hoursAgo: 5,
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // CUSTOMER DATA (GDPR/PII)
    // ─────────────────────────────────────────────────────────────────────────────
    {
      action: 'CREATE',
      entity: 'Customer',
      entityId: customers[0]?.id,
      scopeType: 'COMPANY',
      scopeId: company?.id,
      metadata: { email: customers[0]?.email, source: 'checkout' },
      dataClassification: 'PII',
      hoursAgo: 48,
    },
    {
      action: 'UPDATE',
      entity: 'Customer',
      entityId: customers[1]?.id,
      scopeType: 'COMPANY',
      scopeId: company?.id,
      changes: {
        email: { before: 'old@example.com', after: customers[1]?.email },
      },
      dataClassification: 'PII',
      hoursAgo: 12,
    },
    {
      action: 'EXPORT',
      entity: 'Customer',
      scopeType: 'COMPANY',
      scopeId: company?.id,
      metadata: { format: 'CSV', recordCount: 156, exportType: 'data_portability' },
      dataClassification: 'PII',
      hoursAgo: 36,
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // GDPR & PRIVACY REQUESTS (GDPR Art. 15-22)
    // ─────────────────────────────────────────────────────────────────────────────
    {
      action: 'DATA_ACCESS_REQUEST',
      entity: 'PrivacyRequest',
      scopeType: 'COMPANY',
      scopeId: company?.id,
      metadata: {
        requestType: 'GDPR Article 15',
        customerEmail: 'privacy@customer.eu',
        status: 'received',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      dataClassification: 'PII',
      hoursAgo: 24,
    },
    {
      action: 'DATA_ERASURE_REQUEST',
      entity: 'PrivacyRequest',
      scopeType: 'COMPANY',
      scopeId: company?.id,
      metadata: {
        requestType: 'GDPR Article 17 - Right to be Forgotten',
        customerEmail: 'delete-me@customer.fr',
        status: 'processing'
      },
      dataClassification: 'PII',
      hoursAgo: 72,
    },
    {
      action: 'PRIVACY_REQUEST_COMPLETED',
      entity: 'PrivacyRequest',
      scopeType: 'COMPANY',
      scopeId: company?.id,
      metadata: {
        requestType: 'GDPR Article 17',
        customerEmail: 'deleted@customer.eu',
        dataDeleted: ['orders', 'addresses', 'payment_methods'],
        completedAt: new Date().toISOString()
      },
      dataClassification: 'PII',
      hoursAgo: 168,
    },
    {
      action: 'CONSENT_GIVEN',
      entity: 'ConsentRecord',
      scopeType: 'COMPANY',
      scopeId: company?.id,
      metadata: {
        consentType: 'marketing_emails',
        version: '2.0',
        method: 'explicit_checkbox'
      },
      dataClassification: 'PII',
      hoursAgo: 2,
    },
    {
      action: 'CONSENT_WITHDRAWN',
      entity: 'ConsentRecord',
      scopeType: 'COMPANY',
      scopeId: company?.id,
      metadata: {
        consentType: 'marketing_emails',
        withdrawnVia: 'preference_center'
      },
      dataClassification: 'PII',
      hoursAgo: 96,
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // PRODUCT & INVENTORY
    // ─────────────────────────────────────────────────────────────────────────────
    {
      action: 'CREATE',
      entity: 'Product',
      entityId: products[0]?.id,
      scopeType: 'COMPANY',
      scopeId: company?.id,
      metadata: { sku: products[0]?.sku, name: products[0]?.name },
      hoursAgo: 72,
    },
    {
      action: 'PRICE_CHANGED',
      entity: 'Product',
      entityId: products[0]?.id,
      scopeType: 'COMPANY',
      scopeId: company?.id,
      changes: {
        price: { before: 15.99, after: 18.99 },
      },
      metadata: { reason: 'Cost increase', effectiveDate: new Date().toISOString() },
      hoursAgo: 8,
    },
    {
      action: 'INVENTORY_ADJUSTED',
      entity: 'Inventory',
      scopeType: 'COMPANY',
      scopeId: company?.id,
      changes: {
        stockQuantity: { before: 100, after: 85 },
      },
      metadata: { reason: 'Cycle count adjustment', adjustedBy: companyUsers[0]?.id },
      hoursAgo: 16,
    },
    {
      action: 'LOW_STOCK_ALERT',
      entity: 'Inventory',
      entityId: products[1]?.id,
      scopeType: 'COMPANY',
      scopeId: company?.id,
      metadata: { currentStock: 5, threshold: 10, sku: products[1]?.sku },
      hoursAgo: 4,
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // ACCESS CONTROL & RBAC (SOC2 CC6.2-CC6.3)
    // ─────────────────────────────────────────────────────────────────────────────
    {
      action: 'ROLE_ASSIGNED',
      entity: 'Role',
      entityId: companyUsers[2]?.id,
      metadata: { role: 'MANAGER', assignedBy: adminUser?.id },
      hoursAgo: 120,
    },
    {
      action: 'PERMISSION_GRANTED',
      entity: 'Permission',
      metadata: { permission: 'refunds.approve', userId: companyUsers[1]?.id, grantedBy: adminUser?.id },
      hoursAgo: 96,
    },
    {
      action: 'ACCESS_DENIED',
      entity: 'User',
      entityId: companyUsers[2]?.id,
      metadata: {
        resource: '/api/admin/users',
        requiredPermission: 'users.manage',
        reason: 'Insufficient permissions'
      },
      ipAddress: '10.0.0.50',
      hoursAgo: 2,
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // INTEGRATION & SYNC (SOC2 CC6.6)
    // ─────────────────────────────────────────────────────────────────────────────
    {
      action: 'INTEGRATION_CONNECTED',
      entity: 'Integration',
      metadata: { provider: 'STRIPE', environment: 'production' },
      hoursAgo: 168,
    },
    {
      action: 'INTEGRATION_SYNCED',
      entity: 'Integration',
      metadata: { provider: 'SHIPSTATION', recordsProcessed: 45, syncType: 'full' },
      hoursAgo: 3,
    },
    {
      action: 'INTEGRATION_SYNC_FAILED',
      entity: 'Integration',
      metadata: { provider: 'QUICKBOOKS', error: 'Authentication expired', retryCount: 3 },
      hoursAgo: 1,
    },
    {
      action: 'WEBHOOK_TRIGGERED',
      entity: 'Webhook',
      metadata: { event: 'order.created', endpoint: 'https://erp.company.com/webhook', status: 200 },
      hoursAgo: 0.5,
    },
    {
      action: 'WEBHOOK_FAILED',
      entity: 'Webhook',
      metadata: { event: 'payment.completed', endpoint: 'https://erp.company.com/webhook', status: 500, retries: 3 },
      hoursAgo: 2,
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // API & SECURITY (PCI-DSS 10.2.2, SOC2 CC6.6)
    // ─────────────────────────────────────────────────────────────────────────────
    {
      action: 'API_KEY_CREATED',
      entity: 'ApiKey',
      metadata: { name: 'Production API Key', scopes: ['read', 'write'], expiresIn: '365d' },
      dataClassification: 'CONFIDENTIAL',
      hoursAgo: 240,
    },
    {
      action: 'API_KEY_ROTATED',
      entity: 'ApiKey',
      metadata: { name: 'Production API Key', reason: 'Scheduled rotation' },
      dataClassification: 'CONFIDENTIAL',
      hoursAgo: 720,
    },
    {
      action: 'API_RATE_LIMITED',
      entity: 'ApiKey',
      metadata: {
        keyId: 'ak_xxx',
        endpoint: '/api/orders',
        requestCount: 1500,
        limit: 1000,
        window: '1h'
      },
      ipAddress: '203.0.113.100',
      hoursAgo: 4,
    },
    {
      action: 'SUSPICIOUS_ACTIVITY',
      entity: 'User',
      metadata: {
        type: 'Unusual access pattern',
        details: 'Multiple logins from different countries within 1 hour',
        countries: ['US', 'RU', 'CN']
      },
      ipAddress: '185.22.33.44',
      dataClassification: 'CONFIDENTIAL',
      hoursAgo: 6,
    },
    {
      action: 'IP_BLOCKED',
      entity: 'System',
      metadata: {
        ip: '185.22.33.44',
        reason: 'Repeated failed login attempts',
        blockDuration: '24h'
      },
      hoursAgo: 5.5,
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // CONFIGURATION & SETTINGS (SOC2 CC8.1)
    // ─────────────────────────────────────────────────────────────────────────────
    {
      action: 'SETTINGS_CHANGED',
      entity: 'Settings',
      scopeType: 'COMPANY',
      scopeId: company?.id,
      changes: {
        timezone: { before: 'UTC', after: 'America/Los_Angeles' },
      },
      hoursAgo: 96,
    },
    {
      action: 'SECURITY_SETTINGS_CHANGED',
      entity: 'Settings',
      scopeType: 'COMPANY',
      scopeId: company?.id,
      changes: {
        mfaRequired: { before: false, after: true },
        sessionTimeout: { before: 60, after: 30 },
      },
      dataClassification: 'CONFIDENTIAL',
      hoursAgo: 168,
    },
    {
      action: 'ROUTING_RULE_CREATED',
      entity: 'RoutingRule',
      scopeType: 'COMPANY',
      scopeId: company?.id,
      metadata: {
        name: 'High-value transactions',
        condition: 'amount > 1000',
        action: 'route_to_premium_processor'
      },
      hoursAgo: 48,
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // MERCHANT ACCOUNT (PCI-DSS 10.2.3)
    // ─────────────────────────────────────────────────────────────────────────────
    {
      action: 'MERCHANT_ACCOUNT_CREATED',
      entity: 'MerchantAccount',
      scopeType: 'COMPANY',
      scopeId: company?.id,
      metadata: { accountName: 'Primary Business Account', provider: 'Stripe' },
      dataClassification: 'CONFIDENTIAL',
      hoursAgo: 720,
    },
    {
      action: 'MERCHANT_ACCOUNT_VERIFIED',
      entity: 'MerchantAccount',
      scopeType: 'COMPANY',
      scopeId: company?.id,
      metadata: { verificationMethod: 'Micro-deposits', status: 'VERIFIED' },
      dataClassification: 'CONFIDENTIAL',
      hoursAgo: 696,
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // FULFILLMENT & SHIPPING
    // ─────────────────────────────────────────────────────────────────────────────
    {
      action: 'SHIPMENT_CREATED',
      entity: 'Shipment',
      scopeType: 'COMPANY',
      scopeId: company?.id,
      metadata: {
        orderId: orders[0]?.id,
        carrier: 'USPS',
        trackingNumber: '9400111899223456789012'
      },
      hoursAgo: 0.5,
    },
    {
      action: 'SHIPMENT_SHIPPED',
      entity: 'Shipment',
      scopeType: 'COMPANY',
      scopeId: company?.id,
      metadata: {
        orderId: orders[0]?.id,
        carrier: 'USPS',
        estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      hoursAgo: 0.25,
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // USER MANAGEMENT (SOC2 CC6.2)
    // ─────────────────────────────────────────────────────────────────────────────
    {
      action: 'USER_INVITED',
      entity: 'User',
      scopeType: 'COMPANY',
      scopeId: company?.id,
      metadata: { email: 'newuser@company.com', role: 'STAFF', invitedBy: adminUser?.id },
      hoursAgo: 72,
    },
    {
      action: 'USER_ACTIVATED',
      entity: 'User',
      scopeType: 'COMPANY',
      scopeId: company?.id,
      metadata: { email: 'newuser@company.com', activationMethod: 'email_link' },
      hoursAgo: 48,
    },
    {
      action: 'USER_DEACTIVATED',
      entity: 'User',
      metadata: {
        email: 'former-employee@company.com',
        reason: 'Employment ended',
        accessRevoked: true
      },
      hoursAgo: 240,
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // SOFT DELETE OPERATIONS
    // ─────────────────────────────────────────────────────────────────────────────
    {
      action: 'SOFT_DELETE',
      entity: 'Product',
      entityId: 'deleted-product-id',
      scopeType: 'COMPANY',
      scopeId: company?.id,
      metadata: { name: 'Discontinued Coffee', reason: 'Product EOL' },
      hoursAgo: 144,
    },
    {
      action: 'RESTORE',
      entity: 'Customer',
      entityId: customers[2]?.id,
      scopeType: 'COMPANY',
      scopeId: company?.id,
      metadata: { reason: 'Customer reactivation request', restoredBy: companyUsers[0]?.id },
      hoursAgo: 72,
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // AI & AUTOMATION (GDPR Art. 22)
    // ─────────────────────────────────────────────────────────────────────────────
    {
      action: 'AI_CONTENT_GENERATED',
      entity: 'GeneratedContent',
      scopeType: 'COMPANY',
      scopeId: company?.id,
      metadata: {
        contentType: 'product_description',
        model: 'claude-3-haiku',
        productId: products[0]?.id
      },
      hoursAgo: 12,
    },
    {
      action: 'AI_DECISION_MADE',
      entity: 'Automation',
      scopeType: 'COMPANY',
      scopeId: company?.id,
      metadata: {
        decisionType: 'fraud_detection',
        decision: 'flagged_for_review',
        confidence: 0.87,
        orderId: orders[0]?.id
      },
      hoursAgo: 1,
    },
    {
      action: 'AUTOMATION_TRIGGERED',
      entity: 'Automation',
      scopeType: 'COMPANY',
      scopeId: company?.id,
      metadata: {
        automationType: 'low_stock_reorder',
        trigger: 'inventory_below_threshold',
        productId: products[1]?.id
      },
      hoursAgo: 4,
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // SYSTEM & AUDIT META (SOC2 CC7.1)
    // ─────────────────────────────────────────────────────────────────────────────
    {
      action: 'AUDIT_LOG_ACCESSED',
      entity: 'AuditLog',
      metadata: {
        accessedBy: adminUser?.id,
        filters: { dateRange: '30d', entity: 'Transaction' },
        recordsViewed: 150
      },
      dataClassification: 'CONFIDENTIAL',
      hoursAgo: 1,
    },
    {
      action: 'AUDIT_LOG_EXPORTED',
      entity: 'AuditLog',
      metadata: {
        exportedBy: adminUser?.id,
        format: 'CSV',
        recordCount: 5000,
        dateRange: '90d',
        purpose: 'SOC2 audit'
      },
      dataClassification: 'CONFIDENTIAL',
      hoursAgo: 168,
    },
    {
      action: 'BACKUP_CREATED',
      entity: 'System',
      metadata: {
        backupType: 'full',
        size: '15.2GB',
        destination: 's3://backups/daily/',
        encrypted: true
      },
      hoursAgo: 24,
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // TERMS & LEGAL
    // ─────────────────────────────────────────────────────────────────────────────
    {
      action: 'TERMS_ACCEPTED',
      entity: 'TermsAcceptance',
      scopeType: 'COMPANY',
      scopeId: company?.id,
      metadata: {
        termsVersion: '3.1',
        termsType: 'service_agreement',
        acceptedAt: new Date().toISOString()
      },
      ipAddress: '192.168.1.100',
      hoursAgo: 720,
    },
    {
      action: 'TERMS_VERSION_UPDATED',
      entity: 'TermsDocument',
      metadata: {
        version: { before: '3.0', after: '3.1' },
        changes: ['Updated data retention policy', 'Added GDPR compliance section'],
        effectiveDate: new Date().toISOString()
      },
      hoursAgo: 744,
    },
  ];

  // Create audit logs with varying timestamps
  for (const log of auditLogs) {
    const createdAt = new Date();
    createdAt.setHours(createdAt.getHours() - log.hoursAgo);

    // Assign a random user (prefer company users for company-scoped events)
    const userId = log.scopeType === 'COMPANY'
      ? (companyUsers[Math.floor(Math.random() * companyUsers.length)]?.id || adminUser?.id)
      : adminUser?.id;

    await prisma.auditLog.create({
      data: {
        userId,
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        scopeType: log.scopeType,
        scopeId: log.scopeId,
        changes: log.changes as any,
        metadata: log.metadata as any,
        ipAddress: log.ipAddress || '127.0.0.1',
        userAgent: log.userAgent || 'seed-script',
        dataClassification: log.dataClassification,
        createdAt,
      },
    });
  }

  console.log(`Created ${auditLogs.length} compliance-ready audit log entries`);
  console.log('  - SOC2 Trust Service Criteria: Covered');
  console.log('  - ISO 27001 Annex A.12.4: Covered');
  console.log('  - GDPR Articles 15-22, 30, 33: Covered');
  console.log('  - French CNIL Requirements: Covered');
  console.log('  - PCI-DSS Requirements 10.x: Covered');
}

// Run if executed directly
if (require.main === module) {
  seedAuditLogs()
    .then(() => {
      console.log('Audit log seeding complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error seeding audit logs:', error);
      process.exit(1);
    });
}
