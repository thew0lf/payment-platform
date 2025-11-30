/**
 * Soft Delete Configuration Constants
 *
 * Defines which models support soft delete, retention periods,
 * and cascade relationships for the enterprise soft delete system.
 */

// ═══════════════════════════════════════════════════════════════
// SOFT DELETE MODELS
// ═══════════════════════════════════════════════════════════════

/**
 * Models that support soft delete
 */
export const SOFT_DELETE_MODELS = [
  'Client',
  'Company',
  'Department',
  'User',
  'Customer',
  'CustomerAddress',
  'Subscription',
  'Order',
  'Product',
  'ProductVariant',
  'Category',
  'MerchantAccount',
  'RoutingRule',
  'Webhook',
] as const;

export type SoftDeleteModel = (typeof SOFT_DELETE_MODELS)[number];

/**
 * Type guard to check if a string is a valid SoftDeleteModel
 */
export function isSoftDeleteModel(value: string): value is SoftDeleteModel {
  return SOFT_DELETE_MODELS.includes(value as SoftDeleteModel);
}

// ═══════════════════════════════════════════════════════════════
// RETENTION PERIODS
// ═══════════════════════════════════════════════════════════════

/**
 * Retention periods in days before permanent deletion
 * After this period, records are eligible for purge
 */
export const RETENTION_PERIODS: Record<SoftDeleteModel, number> = {
  Client: 730,           // 2 years - high-level entity
  Company: 365,          // 1 year - contains business data
  Department: 90,        // 90 days
  User: 180,             // 6 months - may need for audit trail
  Customer: 90,          // 90 days
  CustomerAddress: 90,   // 90 days
  Subscription: 365,     // 1 year - billing history
  Order: 365,            // 1 year - dispute resolution
  Product: 90,           // 90 days
  ProductVariant: 90,    // 90 days - linked to products
  Category: 90,          // 90 days - product taxonomy
  MerchantAccount: 365,  // 1 year - transaction references
  RoutingRule: 90,       // 90 days
  Webhook: 90,           // 90 days
};

// ═══════════════════════════════════════════════════════════════
// CASCADE RELATIONSHIPS
// ═══════════════════════════════════════════════════════════════

/**
 * Cascade delete relationships
 * When parent is deleted, children are also soft-deleted
 */
export const CASCADE_RELATIONSHIPS: Partial<Record<SoftDeleteModel, SoftDeleteModel[]>> = {
  Client: ['Company'],
  Company: ['Customer', 'Product', 'Category', 'Order', 'Department', 'RoutingRule', 'Webhook'],
  Customer: ['CustomerAddress', 'Subscription'],
  Product: ['ProductVariant'],
  Department: [], // Users are not cascade deleted, they should be reassigned
};

/**
 * Get the parent field name for a child model
 */
export function getParentField(parentType: SoftDeleteModel, childType: SoftDeleteModel): string {
  const mapping: Record<string, string> = {
    'Client:Company': 'clientId',
    'Company:Customer': 'companyId',
    'Company:Product': 'companyId',
    'Company:Category': 'companyId',
    'Company:Order': 'companyId',
    'Company:Department': 'companyId',
    'Company:RoutingRule': 'companyId',
    'Company:Webhook': 'companyId',
    'Customer:CustomerAddress': 'customerId',
    'Customer:Subscription': 'customerId',
    'Product:ProductVariant': 'productId',
    'Department:User': 'departmentId',
  };

  return mapping[`${parentType}:${childType}`] || `${parentType.toLowerCase()}Id`;
}

// ═══════════════════════════════════════════════════════════════
// IMMUTABLE MODELS (Never delete)
// ═══════════════════════════════════════════════════════════════

/**
 * Models that should NEVER be deleted (immutable for compliance)
 * These contain financial/legal data that must be retained
 */
export const IMMUTABLE_MODELS = [
  'Transaction',
  'Payment',
  'Refund',
  'Invoice',
  'AuditLog',
  'ShipmentEvent',
  'DeletionLog',
] as const;

export type ImmutableModel = (typeof IMMUTABLE_MODELS)[number];

// ═══════════════════════════════════════════════════════════════
// HARD DELETE MODELS
// ═══════════════════════════════════════════════════════════════

/**
 * Models that support hard delete (security-sensitive, ephemeral)
 */
export const HARD_DELETE_MODELS = [
  'ApiKey',
  'Session',
  'PasswordResetToken',
  'RefreshToken',
] as const;

export type HardDeleteModel = (typeof HARD_DELETE_MODELS)[number];

// ═══════════════════════════════════════════════════════════════
// PERMANENT DELETE REASONS
// ═══════════════════════════════════════════════════════════════

export const PERMANENT_DELETE_REASONS = [
  'RETENTION_EXPIRED',
  'GDPR_REQUEST',
  'ADMIN_REQUEST',
] as const;

export type PermanentDeleteReason = (typeof PERMANENT_DELETE_REASONS)[number];

// ═══════════════════════════════════════════════════════════════
// ROLE PERMISSIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Minimum role required to delete each entity type
 * Role names: platform_admin, client_admin, company_admin, company_user
 */
export const DELETE_PERMISSIONS: Record<SoftDeleteModel, string[]> = {
  Client: ['platform_admin'],
  Company: ['platform_admin', 'client_admin'],
  Department: ['platform_admin', 'client_admin', 'company_admin'],
  User: ['platform_admin', 'client_admin'],
  Customer: ['platform_admin', 'client_admin', 'company_admin'],
  CustomerAddress: ['platform_admin', 'client_admin', 'company_admin'],
  Subscription: ['platform_admin', 'client_admin', 'company_admin'],
  Order: ['platform_admin', 'client_admin'],
  Product: ['platform_admin', 'client_admin', 'company_admin'],
  ProductVariant: ['platform_admin', 'client_admin', 'company_admin'],
  Category: ['platform_admin', 'client_admin', 'company_admin'],
  MerchantAccount: ['platform_admin', 'client_admin'],
  RoutingRule: ['platform_admin', 'client_admin', 'company_admin'],
  Webhook: ['platform_admin', 'client_admin', 'company_admin'],
};

/**
 * Minimum role required to restore each entity type
 * Role names: platform_admin, client_admin, company_admin, company_user
 */
export const RESTORE_PERMISSIONS: Record<SoftDeleteModel, string[]> = {
  Client: ['platform_admin'],
  Company: ['platform_admin', 'client_admin'],
  Department: ['platform_admin', 'client_admin'],
  User: ['platform_admin', 'client_admin'],
  Customer: ['platform_admin', 'client_admin'],
  CustomerAddress: ['platform_admin', 'client_admin'],
  Subscription: ['platform_admin', 'client_admin'],
  Order: ['platform_admin', 'client_admin'],
  Product: ['platform_admin', 'client_admin'],
  ProductVariant: ['platform_admin', 'client_admin'],
  Category: ['platform_admin', 'client_admin'],
  MerchantAccount: ['platform_admin', 'client_admin'],
  RoutingRule: ['platform_admin', 'client_admin'],
  Webhook: ['platform_admin', 'client_admin'],
};

/**
 * Check if user role can perform delete on entity type
 */
export function canDelete(role: string, entityType: SoftDeleteModel): boolean {
  return DELETE_PERMISSIONS[entityType]?.includes(role) ?? false;
}

/**
 * Check if user role can restore entity type
 */
export function canRestore(role: string, entityType: SoftDeleteModel): boolean {
  return RESTORE_PERMISSIONS[entityType]?.includes(role) ?? false;
}
