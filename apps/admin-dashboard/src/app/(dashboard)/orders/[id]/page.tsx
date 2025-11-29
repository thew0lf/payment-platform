'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  AlertCircle,
  RefreshCw,
  CreditCard,
  MapPin,
  User,
  FileText,
  MoreHorizontal,
  Printer,
  Mail,
  Ban,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ordersApi, Order, shipmentsApi, Shipment } from '@/lib/api/orders';
import { formatOrderNumber, formatShipmentNumber } from '@/lib/order-utils';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  PENDING: { label: 'Pending', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', icon: Clock },
  CONFIRMED: { label: 'Confirmed', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: CheckCircle2 },
  PROCESSING: { label: 'Processing', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', icon: Package },
  SHIPPED: { label: 'Shipped', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', icon: Truck },
  DELIVERED: { label: 'Delivered', color: 'bg-green-500/10 text-green-400 border-green-500/20', icon: CheckCircle2 },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle2 },
  CANCELED: { label: 'Canceled', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: XCircle },
  REFUNDED: { label: 'Refunded', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', icon: RefreshCw },
};

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'bg-yellow-500/10 text-yellow-400' },
  AUTHORIZED: { label: 'Authorized', color: 'bg-blue-500/10 text-blue-400' },
  PAID: { label: 'Paid', color: 'bg-green-500/10 text-green-400' },
  PARTIALLY_PAID: { label: 'Partial', color: 'bg-orange-500/10 text-orange-400' },
  REFUNDED: { label: 'Refunded', color: 'bg-red-500/10 text-red-400' },
  FAILED: { label: 'Failed', color: 'bg-red-500/10 text-red-400' },
};

const SHIPMENT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'bg-yellow-500/10 text-yellow-400' },
  LABEL_CREATED: { label: 'Label Created', color: 'bg-blue-500/10 text-blue-400' },
  PICKED_UP: { label: 'Picked Up', color: 'bg-cyan-500/10 text-cyan-400' },
  IN_TRANSIT: { label: 'In Transit', color: 'bg-purple-500/10 text-purple-400' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: 'bg-indigo-500/10 text-indigo-400' },
  DELIVERED: { label: 'Delivered', color: 'bg-green-500/10 text-green-400' },
  EXCEPTION: { label: 'Exception', color: 'bg-red-500/10 text-red-400' },
  RETURNED: { label: 'Returned', color: 'bg-orange-500/10 text-orange-400' },
};

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || { label: status, color: 'bg-zinc-500/10 text-zinc-400', icon: AlertCircle };
  const Icon = config.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border', config.color)}>
      <Icon className="w-4 h-4" />
      {config.label}
    </span>
  );
}

function SectionCard({ title, icon: Icon, children, action }: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-zinc-500" />
          <h3 className="text-sm font-medium text-white">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    async function fetchOrder() {
      setLoading(true);
      setError(null);

      try {
        const data = await ordersApi.get(orderId);
        setOrder(data);
      } catch (err) {
        console.error('Failed to fetch order:', err);
        setError('Failed to load order. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();
  }, [orderId]);

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handleAction = async (action: string) => {
    if (!order) return;
    setActionLoading(action);

    try {
      let updatedOrder: Order;
      switch (action) {
        case 'confirm':
          updatedOrder = await ordersApi.confirm(order.id);
          break;
        case 'process':
          updatedOrder = await ordersApi.process(order.id);
          break;
        case 'complete':
          updatedOrder = await ordersApi.complete(order.id);
          break;
        case 'cancel':
          updatedOrder = await ordersApi.cancel(order.id);
          break;
        case 'mark-paid':
          updatedOrder = await ordersApi.markPaid(order.id);
          break;
        default:
          return;
      }
      setOrder(updatedOrder);
    } catch (err) {
      console.error(`Failed to ${action} order:`, err);
    } finally {
      setActionLoading(null);
      setShowActions(false);
    }
  };

  // Get shipping address from snapshot
  const shippingAddress = order?.shippingSnapshot as {
    firstName?: string;
    lastName?: string;
    company?: string;
    address1?: string;
    address2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    phone?: string;
    email?: string;
  } | undefined;

  // Available actions based on status
  const availableActions: { id: string; label: string; icon: React.ComponentType<{ className?: string }>; variant?: 'danger' }[] = [];
  if (order) {
    if (order.status === 'PENDING') {
      availableActions.push({ id: 'confirm', label: 'Confirm Order', icon: CheckCircle2 });
    }
    if (order.status === 'CONFIRMED') {
      availableActions.push({ id: 'process', label: 'Start Processing', icon: Package });
    }
    if (order.status === 'PROCESSING' || order.status === 'CONFIRMED') {
      availableActions.push({ id: 'complete', label: 'Mark Complete', icon: CheckCircle2 });
    }
    if (order.paymentStatus === 'PENDING' || order.paymentStatus === 'AUTHORIZED') {
      availableActions.push({ id: 'mark-paid', label: 'Mark as Paid', icon: CreditCard });
    }
    if (!['COMPLETED', 'CANCELED', 'REFUNDED'].includes(order.status)) {
      availableActions.push({ id: 'cancel', label: 'Cancel Order', icon: Ban, variant: 'danger' });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-6 h-6 text-zinc-500 animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <h2 className="text-lg font-medium text-white mb-2">Order Not Found</h2>
        <p className="text-sm text-zinc-500 mb-4">{error || 'The order you\'re looking for doesn\'t exist.'}</p>
        <Link
          href="/orders"
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link
            href="/orders"
            className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Orders
          </Link>
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-white">
              {formatOrderNumber(order.orderNumber)}
            </h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            Placed on {formatDate(order.orderedAt)}
          </p>
        </div>

        {/* Actions */}
        <div className="relative">
          <button
            onClick={() => setShowActions(!showActions)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
          >
            Actions
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showActions && (
            <div className="absolute right-0 mt-2 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-10">
              {/* Quick Actions */}
              <div className="p-1">
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 rounded-md">
                  <Printer className="w-4 h-4" />
                  Print Order
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 rounded-md">
                  <Mail className="w-4 h-4" />
                  Email Customer
                </button>
              </div>

              {availableActions.length > 0 && (
                <>
                  <div className="border-t border-zinc-700" />
                  <div className="p-1">
                    {availableActions.map((action) => {
                      const Icon = action.icon;
                      return (
                        <button
                          key={action.id}
                          onClick={() => handleAction(action.id)}
                          disabled={actionLoading === action.id}
                          className={cn(
                            'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md',
                            action.variant === 'danger'
                              ? 'text-red-400 hover:bg-red-500/10'
                              : 'text-zinc-300 hover:bg-zinc-700'
                          )}
                        >
                          {actionLoading === action.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Icon className="w-4 h-4" />
                          )}
                          {action.label}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Order Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <SectionCard title="Order Items" icon={Package}>
            <div className="space-y-4">
              {order.items?.map((item) => (
                <div key={item.id} className="flex items-start gap-4 p-3 bg-zinc-800/50 rounded-lg">
                  <div className="w-12 h-12 bg-zinc-700 rounded-lg flex items-center justify-center">
                    <Package className="w-6 h-6 text-zinc-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{item.name}</p>
                    <p className="text-xs text-zinc-500">SKU: {item.sku}</p>
                    <p className="text-xs text-zinc-500">Qty: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">
                      {formatCurrency(item.totalPrice, order.currency)}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {formatCurrency(item.unitPrice, order.currency)} each
                    </p>
                  </div>
                </div>
              ))}

              {(!order.items || order.items.length === 0) && (
                <p className="text-sm text-zinc-500 text-center py-4">No items in this order</p>
              )}
            </div>
          </SectionCard>

          {/* Shipments */}
          {order.shipments && order.shipments.length > 0 && (
            <SectionCard title="Shipments" icon={Truck}>
              <div className="space-y-3">
                {order.shipments.map((shipment) => {
                  const statusConfig = SHIPMENT_STATUS_CONFIG[shipment.status] || { label: shipment.status, color: 'bg-zinc-500/10 text-zinc-400' };
                  return (
                    <div key={shipment.id} className="p-3 bg-zinc-800/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-white">
                          {formatShipmentNumber(shipment.shipmentNumber)}
                        </p>
                        <span className={cn('px-2 py-0.5 rounded text-xs font-medium', statusConfig.color)}>
                          {statusConfig.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-zinc-500">
                        <span>{shipment.carrier}</span>
                        {shipment.trackingNumber && (
                          <a
                            href={shipment.trackingUrl || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:underline"
                          >
                            {shipment.trackingNumber}
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {/* Notes */}
          {(order.customerNotes || order.internalNotes) && (
            <SectionCard title="Notes" icon={FileText}>
              {order.customerNotes && (
                <div className="mb-3">
                  <p className="text-xs text-zinc-500 mb-1">Customer Notes</p>
                  <p className="text-sm text-zinc-300">{order.customerNotes}</p>
                </div>
              )}
              {order.internalNotes && (
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Internal Notes</p>
                  <p className="text-sm text-zinc-300">{order.internalNotes}</p>
                </div>
              )}
            </SectionCard>
          )}
        </div>

        {/* Right Column - Summary */}
        <div className="space-y-6">
          {/* Order Summary */}
          <SectionCard title="Summary" icon={CreditCard}>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Subtotal</span>
                <span className="text-zinc-300">{formatCurrency(order.subtotal, order.currency)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Discount</span>
                  <span className="text-green-400">-{formatCurrency(order.discountAmount, order.currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Shipping</span>
                <span className="text-zinc-300">{formatCurrency(order.shippingAmount, order.currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Tax</span>
                <span className="text-zinc-300">{formatCurrency(order.taxAmount, order.currency)}</span>
              </div>
              <div className="border-t border-zinc-700 my-2" />
              <div className="flex justify-between text-sm font-medium">
                <span className="text-white">Total</span>
                <span className="text-white">{formatCurrency(order.total, order.currency)}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-zinc-700">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Payment Status</span>
                <span className={cn(
                  'px-2 py-0.5 rounded text-xs font-medium',
                  PAYMENT_STATUS_CONFIG[order.paymentStatus]?.color || 'bg-zinc-500/10 text-zinc-400'
                )}>
                  {PAYMENT_STATUS_CONFIG[order.paymentStatus]?.label || order.paymentStatus}
                </span>
              </div>
              {order.paymentMethod && (
                <p className="text-xs text-zinc-500 mt-2">
                  Paid via {order.paymentMethod}
                </p>
              )}
            </div>
          </SectionCard>

          {/* Shipping Address */}
          {shippingAddress && (
            <SectionCard title="Shipping Address" icon={MapPin}>
              <div className="text-sm text-zinc-300">
                <p className="font-medium">
                  {shippingAddress.firstName} {shippingAddress.lastName}
                </p>
                {shippingAddress.company && <p>{shippingAddress.company}</p>}
                <p>{shippingAddress.address1}</p>
                {shippingAddress.address2 && <p>{shippingAddress.address2}</p>}
                <p>
                  {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}
                </p>
                <p>{shippingAddress.country}</p>
                {shippingAddress.phone && (
                  <p className="text-zinc-500 mt-2">{shippingAddress.phone}</p>
                )}
              </div>
            </SectionCard>
          )}

          {/* Customer */}
          <SectionCard title="Customer" icon={User}>
            <div className="text-sm text-zinc-300">
              <p className="font-medium">Customer ID: {order.customerId}</p>
              {shippingAddress?.email && (
                <a
                  href={`mailto:${shippingAddress.email}`}
                  className="text-cyan-400 hover:underline"
                >
                  {shippingAddress.email}
                </a>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
