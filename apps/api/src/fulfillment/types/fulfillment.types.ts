/**
 * Fulfillment Types
 */

export {
  ShippingCarrier,
  ShippingMethod,
  ShipmentStatus,
  ShipmentEventType,
} from '@prisma/client';

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
