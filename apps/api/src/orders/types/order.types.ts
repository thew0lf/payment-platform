/**
 * Order Types
 * Re-exports Prisma enums for convenience
 */

export {
  OrderType,
  OrderStatus,
  FulfillmentStatus,
  PaymentStatus,
} from '@prisma/client';

// ═══════════════════════════════════════════════════════════════
// ORDER INTERFACES
// ═══════════════════════════════════════════════════════════════

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string | null;
  sku: string;
  name: string;
  description?: string;
  productSnapshot: Record<string, unknown>;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  totalPrice: number;
  fulfilledQuantity: number;
  fulfillmentStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  companyId: string;
  customerId: string;
  subscriptionId?: string;
  billingAccountId?: string;
  orderNumber: string;
  externalId?: string;
  type: string;
  status: string;

  // Address snapshots
  shippingSnapshot: Record<string, unknown>;
  shippingAddressId?: string;
  billingSnapshot: Record<string, unknown>;
  billingAddressId?: string;
  addressLockedAt?: Date;
  addressLockedBy?: string;

  // Totals
  subtotal: number;
  discountAmount: number;
  discountCode?: string;
  shippingAmount: number;
  taxAmount: number;
  total: number;
  currency: string;

  // Payment
  paymentStatus: string;
  paidAt?: Date;
  paymentMethod?: string;

  // Fulfillment
  fulfillmentStatus: string;
  fulfilledAt?: Date;

  // Notes
  customerNotes?: string;
  internalNotes?: string;
  metadata: Record<string, unknown>;

  // Timestamps
  orderedAt: Date;
  confirmedAt?: Date;
  canceledAt?: Date;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;

  // Relations (when included)
  items?: OrderItem[];
  shipments?: Shipment[];
}

export interface Shipment {
  id: string;
  orderId: string;
  shipmentNumber: string;
  carrier: string;
  carrierService?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shippingMethod: string;
  weight?: number;
  weightUnit: string;
  length?: number;
  width?: number;
  height?: number;
  dimensionUnit: string;
  shippingCost?: number;
  insuranceAmount?: number;
  shippingLabelUrl?: string;
  returnLabelUrl?: string;
  shippingAddressSnapshot: Record<string, unknown>;
  status: string;
  estimatedShipDate?: Date;
  estimatedDeliveryDate?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  signatureRequired: boolean;
  signedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  events?: ShipmentEvent[];
}

export interface ShipmentEvent {
  id: string;
  shipmentId: string;
  status: string;
  description: string;
  location?: string;
  carrierCode?: string;
  carrierMessage?: string;
  carrierData?: Record<string, unknown>;
  occurredAt: Date;
  createdAt: Date;
}

export interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  completedOrders: number;
  canceledOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
}

// ═══════════════════════════════════════════════════════════════
// ORDER STATUS STATE MACHINE
// ═══════════════════════════════════════════════════════════════

export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELED'],
  CONFIRMED: ['PROCESSING', 'CANCELED'],
  PROCESSING: ['SHIPPED', 'CANCELED'],
  SHIPPED: ['DELIVERED', 'RETURNED'],
  DELIVERED: ['COMPLETED', 'RETURNED'],
  COMPLETED: [], // Terminal state
  CANCELED: [], // Terminal state
  RETURNED: ['REFUNDED'],
  REFUNDED: [], // Terminal state
};

export function isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
  const validTransitions = ORDER_STATUS_TRANSITIONS[currentStatus] || [];
  return validTransitions.includes(newStatus);
}
