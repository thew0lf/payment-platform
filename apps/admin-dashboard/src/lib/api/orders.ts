import { apiRequest } from '../api';

// ═══════════════════════════════════════════════════════════════
// TYPES
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
  createdAt: string;
  updatedAt: string;
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
  shippingSnapshot: Record<string, unknown>;
  billingSnapshot: Record<string, unknown>;
  addressLockedAt?: string;
  subtotal: number;
  discountAmount: number;
  discountCode?: string;
  shippingAmount: number;
  taxAmount: number;
  total: number;
  currency: string;
  paymentStatus: string;
  paidAt?: string;
  paymentMethod?: string;
  paymentVaultId?: string;   // Reference to vault for sensitive data

  // Display-only payment snapshot (NO SENSITIVE DATA stored here)
  paymentSnapshot?: {
    // Common fields
    type: 'CARD' | 'CHECK' | 'ACH' | 'WIRE' | 'CASH' | 'INVOICE' | 'PAYPAL' | 'WALLET_APPLE' | 'WALLET_GOOGLE';
    last4?: string;          // Last 4 digits of card/account

    // Card-specific
    brand?: string;          // VISA, MASTERCARD, AMEX, DISCOVER
    bin?: string;            // First 6 digits (BIN) - for search/fraud detection
    expMonth?: number;       // Expiry month
    expYear?: number;        // Expiry year
    cardholderName?: string;
    funding?: string;        // credit, debit, prepaid

    // Check-specific (display only - sensitive data in vault)
    checkNumberLast4?: string; // Last 4 of check number
    bankName?: string;         // Bank name
    accountType?: string;      // checking, savings

    // ACH/Wire-specific
    routingLast4?: string;     // Last 4 of routing number

    // Invoice-specific
    invoiceNumber?: string;
    invoiceDueDate?: string;
  };
  fulfillmentStatus: string;
  fulfilledAt?: string;
  customerNotes?: string;
  internalNotes?: string;
  metadata: Record<string, unknown>;
  orderedAt: string;
  confirmedAt?: string;
  canceledAt?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
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
  status: string;
  weight?: number;
  weightUnit?: string;
  length?: number;
  width?: number;
  height?: number;
  dimensionUnit?: string;
  shippingCost?: number;
  insuranceAmount?: number;
  shippingLabelUrl?: string;
  returnLabelUrl?: string;
  estimatedShipDate?: string;
  estimatedDeliveryDate?: string;
  shippedAt?: string;
  deliveredAt?: string;
  signatureRequired?: boolean;
  signedBy?: string;
  events?: ShipmentEvent[];
}

export interface ShipmentEvent {
  id: string;
  shipmentId: string;
  status: string;
  description: string;
  location?: string;
  occurredAt: string;
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

export interface Address {
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  email?: string;
}

export interface CreateOrderItemInput {
  productId?: string;
  sku: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  taxAmount?: number;
}

export interface CreateOrderInput {
  customerId: string;
  subscriptionId?: string;
  billingAccountId?: string;
  externalId?: string;
  type?: string;
  shippingAddress: Address;
  billingAddress?: Address;
  items: CreateOrderItemInput[];
  discountCode?: string;
  shippingAmount?: number;
  currency?: string;
  customerNotes?: string;
  internalNotes?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateOrderInput {
  shippingAddress?: Address;
  billingAddress?: Address;
  shippingAmount?: number;
  discountCode?: string;
  discountAmount?: number;
  customerNotes?: string;
  internalNotes?: string;
  metadata?: Record<string, unknown>;
}

export interface OrderQueryParams {
  customerId?: string;
  status?: string;
  fulfillmentStatus?: string;
  paymentStatus?: string;
  type?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  cursor?: string;
}

export interface OrderCursorPaginatedResponse {
  items: Order[];
  pagination: {
    nextCursor: string | null;
    prevCursor: string | null;
    hasMore: boolean;
    count: number;
    estimatedTotal?: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// API CLIENT
// ═══════════════════════════════════════════════════════════════

export const ordersApi = {
  // List orders (legacy offset pagination)
  list: async (params: OrderQueryParams = {}): Promise<{ orders: Order[]; total: number }> => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    });
    return apiRequest.get<{ orders: Order[]; total: number }>(`/api/orders?${query}`);
  },

  // List orders with cursor-based pagination (scalable for millions of rows)
  listWithCursor: async (params: OrderQueryParams = {}): Promise<OrderCursorPaginatedResponse> => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    });
    return apiRequest.get<OrderCursorPaginatedResponse>(`/api/orders?${query}`);
  },

  // Get order by ID
  get: async (id: string): Promise<Order> => {
    return apiRequest.get<Order>(`/api/orders/${id}`);
  },

  // Get order by order number
  getByNumber: async (orderNumber: string): Promise<Order> => {
    return apiRequest.get<Order>(`/api/orders/number/${orderNumber}`);
  },

  // Get order stats
  getStats: async (startDate?: string, endDate?: string): Promise<OrderStats> => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    return apiRequest.get<OrderStats>(`/api/orders/stats?${params}`);
  },

  // Create order
  create: async (data: CreateOrderInput): Promise<Order> => {
    return apiRequest.post<Order>('/api/orders', data);
  },

  // Update order
  update: async (id: string, data: UpdateOrderInput): Promise<Order> => {
    return apiRequest.patch<Order>(`/api/orders/${id}`, data);
  },

  // Confirm order
  confirm: async (id: string): Promise<Order> => {
    return apiRequest.post<Order>(`/api/orders/${id}/confirm`);
  },

  // Process order
  process: async (id: string): Promise<Order> => {
    return apiRequest.post<Order>(`/api/orders/${id}/process`);
  },

  // Cancel order
  cancel: async (id: string, reason?: string): Promise<Order> => {
    return apiRequest.post<Order>(`/api/orders/${id}/cancel`, { reason });
  },

  // Complete order
  complete: async (id: string): Promise<Order> => {
    return apiRequest.post<Order>(`/api/orders/${id}/complete`);
  },

  // Mark order as paid
  markPaid: async (id: string, paymentMethod?: string): Promise<Order> => {
    return apiRequest.post<Order>(`/api/orders/${id}/mark-paid`, { paymentMethod });
  },

  // Lock address
  lockAddress: async (id: string): Promise<Order> => {
    return apiRequest.post<Order>(`/api/orders/${id}/lock-address`);
  },
};

// ═══════════════════════════════════════════════════════════════
// SHIPMENTS API
// ═══════════════════════════════════════════════════════════════

export interface CreateShipmentInput {
  orderId: string;
  carrier: string;
  carrierService?: string;
  shippingMethod?: string;
  trackingNumber?: string;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  shippingCost?: number;
  insuranceAmount?: number;
  estimatedShipDate?: string;
  estimatedDeliveryDate?: string;
  signatureRequired?: boolean;
}

export interface UpdateShipmentInput {
  carrier?: string;
  carrierService?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shippingLabelUrl?: string;
  returnLabelUrl?: string;
  estimatedDeliveryDate?: string;
}

export interface AddTrackingEventInput {
  status: string;
  description: string;
  location?: string;
  carrierCode?: string;
  carrierMessage?: string;
  occurredAt?: string;
}

export const shipmentsApi = {
  // Create shipment
  create: async (data: CreateShipmentInput): Promise<Shipment> => {
    return apiRequest.post<Shipment>('/api/fulfillment/shipments', data);
  },

  // Get shipments by order
  getByOrder: async (orderId: string): Promise<Shipment[]> => {
    return apiRequest.get<Shipment[]>(`/api/fulfillment/shipments?orderId=${orderId}`);
  },

  // Get shipment by ID
  get: async (id: string): Promise<Shipment> => {
    return apiRequest.get<Shipment>(`/api/fulfillment/shipments/${id}`);
  },

  // Update shipment
  update: async (id: string, data: UpdateShipmentInput): Promise<Shipment> => {
    return apiRequest.patch<Shipment>(`/api/fulfillment/shipments/${id}`, data);
  },

  // Mark shipped
  markShipped: async (id: string, trackingNumber?: string): Promise<Shipment> => {
    return apiRequest.post<Shipment>(`/api/fulfillment/shipments/${id}/ship`, { trackingNumber });
  },

  // Mark delivered
  markDelivered: async (id: string, signedBy?: string): Promise<Shipment> => {
    return apiRequest.post<Shipment>(`/api/fulfillment/shipments/${id}/deliver`, { signedBy });
  },

  // Add tracking event
  addEvent: async (id: string, event: AddTrackingEventInput): Promise<ShipmentEvent> => {
    return apiRequest.post<ShipmentEvent>(`/api/fulfillment/shipments/${id}/events`, event);
  },
};
