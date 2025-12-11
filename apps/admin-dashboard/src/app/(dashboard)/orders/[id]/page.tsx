'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  AlertCircle,
  RefreshCw,
  CreditCard,
  User,
  FileText,
  MoreHorizontal,
  Printer,
  Mail,
  Ban,
  ExternalLink,
  Globe,
  CircleDot,
  Hash,
  Copy,
  Check,
  MapPin,
  Phone,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ordersApi, Order } from '@/lib/api/orders';
import { customersApi, Customer } from '@/lib/api/customers';
import { formatOrderNumber, formatShipmentNumber } from '@/lib/order-utils';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ComponentType<{ className?: string }> }> = {
  PENDING: { label: 'Pending', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10 border-yellow-500/20', icon: Clock },
  CONFIRMED: { label: 'Confirmed', color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/20', icon: CheckCircle2 },
  PROCESSING: { label: 'Processing', color: 'text-primary', bgColor: 'bg-primary/10 border-primary/20', icon: Package },
  SHIPPED: { label: 'Shipped', color: 'text-purple-400', bgColor: 'bg-purple-500/10 border-purple-500/20', icon: Truck },
  DELIVERED: { label: 'Delivered', color: 'text-green-400', bgColor: 'bg-green-500/10 border-green-500/20', icon: CheckCircle2 },
  COMPLETED: { label: 'Completed', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 },
  CANCELED: { label: 'Canceled', color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/20', icon: XCircle },
  REFUNDED: { label: 'Refunded', color: 'text-orange-400', bgColor: 'bg-orange-500/10 border-orange-500/20', icon: RefreshCw },
};

const PAYMENT_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Unpaid', color: 'text-yellow-400' },
  AUTHORIZED: { label: 'Authorized', color: 'text-blue-400' },
  PAID: { label: 'Paid', color: 'text-green-400' },
  PARTIALLY_PAID: { label: 'Partial', color: 'text-orange-400' },
  REFUNDED: { label: 'Refunded', color: 'text-red-400' },
  FAILED: { label: 'Failed', color: 'text-red-400' },
};

const FULFILLMENT_CONFIG: Record<string, { label: string; color: string }> = {
  UNFULFILLED: { label: 'Unfulfilled', color: 'text-yellow-400' },
  PARTIALLY_FULFILLED: { label: 'Partial', color: 'text-orange-400' },
  FULFILLED: { label: 'Fulfilled', color: 'text-green-400' },
};

const SHIPMENT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'text-yellow-400' },
  LABEL_CREATED: { label: 'Label Created', color: 'text-blue-400' },
  PICKED_UP: { label: 'Picked Up', color: 'text-primary' },
  IN_TRANSIT: { label: 'In Transit', color: 'text-purple-400' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: 'text-indigo-400' },
  DELIVERED: { label: 'Delivered', color: 'text-green-400' },
  EXCEPTION: { label: 'Exception', color: 'text-red-400' },
  RETURNED: { label: 'Returned', color: 'text-orange-400' },
};

// Order flow for timeline
const ORDER_FLOW = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'];

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface AddressSnapshot {
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
}

interface ShipmentEvent {
  id: string;
  status: string;
  description: string;
  location?: string;
  occurredAt: string;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || { label: status, color: 'text-muted-foreground', bgColor: 'bg-muted border-border', icon: AlertCircle };
  const Icon = config.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border', config.bgColor, config.color)}>
      <Icon className="w-4 h-4" />
      {config.label}
    </span>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-card/50 border border-border rounded-xl', className)}>
      {children}
    </div>
  );
}

function CardHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-border">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {action}
    </div>
  );
}

function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('p-5', className)}>{children}</div>;
}

function InfoRow({ label, value, mono, className }: { label: string; value: React.ReactNode; mono?: boolean; className?: string }) {
  return (
    <div className={cn('flex items-start justify-between py-2', className)}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn('text-sm text-foreground text-right', mono && 'font-mono text-xs')}>{value}</span>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button onClick={handleCopy} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// Payment method type icons and colors
const PAYMENT_TYPE_CONFIG: Record<string, { bg: string; text: string; label: string; icon?: string }> = {
  // Card brands
  VISA: { bg: 'bg-blue-500', text: 'text-foreground', label: 'VISA' },
  MASTERCARD: { bg: 'bg-orange-500', text: 'text-foreground', label: 'MC' },
  AMEX: { bg: 'bg-blue-600', text: 'text-foreground', label: 'AMEX' },
  DISCOVER: { bg: 'bg-orange-400', text: 'text-foreground', label: 'DISC' },
  JCB: { bg: 'bg-green-600', text: 'text-foreground', label: 'JCB' },
  DINERS: { bg: 'bg-blue-400', text: 'text-foreground', label: 'DC' },
  UNIONPAY: { bg: 'bg-red-600', text: 'text-foreground', label: 'UP' },
  // Payment types
  CARD: { bg: 'bg-purple-500', text: 'text-foreground', label: 'CARD' },
  CHECK: { bg: 'bg-emerald-600', text: 'text-foreground', label: 'CHECK' },
  ACH: { bg: 'bg-primary', text: 'text-foreground', label: 'ACH' },
  WIRE: { bg: 'bg-indigo-600', text: 'text-foreground', label: 'WIRE' },
  CASH: { bg: 'bg-green-500', text: 'text-foreground', label: 'CASH' },
  INVOICE: { bg: 'bg-amber-600', text: 'text-foreground', label: 'INV' },
  PAYPAL: { bg: 'bg-blue-700', text: 'text-foreground', label: 'PP' },
  WALLET_APPLE: { bg: 'bg-muted', text: 'text-foreground', label: 'APPLE' },
  WALLET_GOOGLE: { bg: 'bg-red-500', text: 'text-foreground', label: 'GPAY' },
};

function PaymentMethodIcon({ type, brand }: { type?: string; brand?: string }) {
  // Use brand for cards, otherwise use type
  const key = (brand || type || '').toUpperCase();
  const config = PAYMENT_TYPE_CONFIG[key] || { bg: 'bg-muted', text: 'text-foreground', label: '?' };

  return (
    <div className={cn('px-2 py-1 rounded flex items-center justify-center text-xs font-bold', config.bg, config.text)}>
      {config.label}
    </div>
  );
}

function PaymentMethodDisplay({ snapshot }: { snapshot: NonNullable<Order['paymentSnapshot']> }) {
  const paymentType = snapshot.type;

  // Card payment
  if (paymentType === 'CARD') {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <PaymentMethodIcon type={paymentType} brand={snapshot.brand} />
          <span className="text-sm font-medium text-foreground">
            {snapshot.brand || 'Card'} •••• {snapshot.last4 || '****'}
          </span>
        </div>
        {snapshot.cardholderName && (
          <p className="text-sm text-muted-foreground">{snapshot.cardholderName}</p>
        )}
        <div className="text-xs text-muted-foreground space-y-1">
          {snapshot.expMonth && snapshot.expYear && (
            <p>Expires {String(snapshot.expMonth).padStart(2, '0')}/{snapshot.expYear}</p>
          )}
          {snapshot.bin && (
            <p>BIN: {snapshot.bin}</p>
          )}
          {snapshot.funding && (
            <p className="capitalize">{snapshot.funding} card</p>
          )}
        </div>
      </div>
    );
  }

  // Check payment
  if (paymentType === 'CHECK') {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <PaymentMethodIcon type={paymentType} />
          <span className="text-sm font-medium text-foreground">
            Check {snapshot.checkNumberLast4 ? `#••••${snapshot.checkNumberLast4}` : ''}
          </span>
        </div>
        {snapshot.bankName && (
          <p className="text-sm text-muted-foreground">{snapshot.bankName}</p>
        )}
        <div className="text-xs text-muted-foreground space-y-1">
          {snapshot.accountType && (
            <p className="capitalize">{snapshot.accountType} account</p>
          )}
          {snapshot.routingLast4 && (
            <p>Routing ••••{snapshot.routingLast4}</p>
          )}
          {snapshot.last4 && (
            <p>Account ••••{snapshot.last4}</p>
          )}
        </div>
      </div>
    );
  }

  // ACH payment
  if (paymentType === 'ACH') {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <PaymentMethodIcon type={paymentType} />
          <span className="text-sm font-medium text-foreground">
            ACH Transfer ••••{snapshot.last4 || '****'}
          </span>
        </div>
        {snapshot.bankName && (
          <p className="text-sm text-muted-foreground">{snapshot.bankName}</p>
        )}
        <div className="text-xs text-muted-foreground space-y-1">
          {snapshot.accountType && (
            <p className="capitalize">{snapshot.accountType} account</p>
          )}
        </div>
      </div>
    );
  }

  // Wire transfer
  if (paymentType === 'WIRE') {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <PaymentMethodIcon type={paymentType} />
          <span className="text-sm font-medium text-foreground">Wire Transfer</span>
        </div>
        {snapshot.bankName && (
          <p className="text-sm text-muted-foreground">{snapshot.bankName}</p>
        )}
      </div>
    );
  }

  // Invoice
  if (paymentType === 'INVOICE') {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <PaymentMethodIcon type={paymentType} />
          <span className="text-sm font-medium text-foreground">
            Invoice {snapshot.invoiceNumber ? `#${snapshot.invoiceNumber}` : ''}
          </span>
        </div>
        {snapshot.invoiceDueDate && (
          <p className="text-xs text-muted-foreground">Due: {snapshot.invoiceDueDate}</p>
        )}
      </div>
    );
  }

  // Cash
  if (paymentType === 'CASH') {
    return (
      <div className="flex items-center gap-2">
        <PaymentMethodIcon type={paymentType} />
        <span className="text-sm font-medium text-foreground">Cash Payment</span>
      </div>
    );
  }

  // PayPal and Wallets
  if (['PAYPAL', 'WALLET_APPLE', 'WALLET_GOOGLE'].includes(paymentType)) {
    const labels: Record<string, string> = {
      PAYPAL: 'PayPal',
      WALLET_APPLE: 'Apple Pay',
      WALLET_GOOGLE: 'Google Pay',
    };
    return (
      <div className="flex items-center gap-2">
        <PaymentMethodIcon type={paymentType} />
        <span className="text-sm font-medium text-foreground">{labels[paymentType] || paymentType}</span>
      </div>
    );
  }

  // Default fallback
  return (
    <div className="flex items-center gap-2">
      <PaymentMethodIcon type={paymentType} />
      <span className="text-sm font-medium text-foreground">{paymentType}</span>
    </div>
  );
}

function AddressCard({ title, address, icon: Icon }: {
  title: string;
  address: AddressSnapshot | undefined;
  icon: React.ComponentType<{ className?: string }>;
}) {
  if (!address || !address.address1) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
        </div>
        <p className="text-sm text-muted-foreground">Not provided</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
      </div>
      <div className="text-sm text-foreground space-y-0.5">
        <p className="font-medium">{address.firstName} {address.lastName}</p>
        {address.company && <p className="text-muted-foreground">{address.company}</p>}
        <p>{address.address1}</p>
        {address.address2 && <p>{address.address2}</p>}
        <p>{address.city}, {address.state} {address.postalCode}</p>
        <p>{address.country}</p>
        {address.phone && <p className="text-muted-foreground pt-1">{address.phone}</p>}
      </div>
    </div>
  );
}

function OrderTimeline({ currentStatus, order }: { currentStatus: string; order: Order }) {
  // Handle terminal states
  if (currentStatus === 'CANCELED' || currentStatus === 'REFUNDED') {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
        <XCircle className="w-5 h-5 text-red-400" />
        <div>
          <p className="text-sm font-medium text-red-400">
            Order {currentStatus === 'CANCELED' ? 'Canceled' : 'Refunded'}
          </p>
          {order.cancelReason && (
            <p className="text-xs text-muted-foreground mt-0.5">{order.cancelReason}</p>
          )}
        </div>
      </div>
    );
  }

  const currentIndex = ORDER_FLOW.indexOf(currentStatus);

  return (
    <div className="flex items-center gap-2">
      {ORDER_FLOW.map((status, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const config = STATUS_CONFIG[status];

        return (
          <div key={status} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors',
                  isCompleted && 'bg-primary text-foreground',
                  isCurrent && 'bg-primary/20 border-2 border-primary text-primary',
                  !isCompleted && !isCurrent && 'bg-muted border border-border text-muted-foreground'
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : isCurrent ? (
                  <CircleDot className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </div>
              <span className={cn(
                'text-xs mt-1.5 text-center',
                isCurrent ? 'text-primary font-medium' : 'text-muted-foreground'
              )}>
                {config?.label || status}
              </span>
            </div>
            {index < ORDER_FLOW.length - 1 && (
              <div className={cn(
                'h-0.5 flex-1 -mt-5',
                isCompleted ? 'bg-primary' : 'bg-muted'
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ShipmentCard({ shipment, currency, formatDate, formatCurrency }: {
  shipment: any;
  currency: string;
  formatDate: (date: string) => string;
  formatCurrency: (amount: number, currency: string) => string;
}) {
  const statusConfig = SHIPMENT_STATUS_CONFIG[shipment.status] || { label: shipment.status, color: 'text-muted-foreground' };
  const events = shipment.events as ShipmentEvent[] | undefined;

  return (
    <div className="p-4 bg-muted/30 rounded-lg">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{formatShipmentNumber(shipment.shipmentNumber)}</span>
            <span className={cn('text-xs font-medium', statusConfig.color)}>{statusConfig.label}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{shipment.carrier} {shipment.carrierService && `• ${shipment.carrierService}`}</p>
        </div>
      </div>

      {/* Tracking */}
      {shipment.trackingNumber && (
        <div className="flex items-center gap-2 p-2 bg-card/50 rounded mb-3">
          <Hash className="w-3.5 h-3.5 text-muted-foreground" />
          <code className="text-xs text-foreground flex-1">{shipment.trackingNumber}</code>
          <CopyButton text={shipment.trackingNumber} />
          {shipment.trackingUrl && (
            <a href={shipment.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:text-primary flex items-center gap-1">
              Track <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        {shipment.shippedAt && (
          <div>
            <span className="text-muted-foreground">Shipped</span>
            <p className="text-foreground">{formatDate(shipment.shippedAt)}</p>
          </div>
        )}
        {shipment.deliveredAt && (
          <div>
            <span className="text-muted-foreground">Delivered</span>
            <p className="text-foreground">{formatDate(shipment.deliveredAt)}</p>
          </div>
        )}
        {shipment.estimatedDeliveryDate && !shipment.deliveredAt && (
          <div>
            <span className="text-muted-foreground">Est. Delivery</span>
            <p className="text-foreground">{formatDate(shipment.estimatedDeliveryDate)}</p>
          </div>
        )}
        {shipment.weight && (
          <div>
            <span className="text-muted-foreground">Weight</span>
            <p className="text-foreground">{shipment.weight} {shipment.weightUnit}</p>
          </div>
        )}
      </div>

      {/* Events */}
      {events && events.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-2">Recent Activity</p>
          <div className="space-y-2">
            {events.slice(0, 3).map((event, i) => (
              <div key={event.id} className="flex items-start gap-2">
                <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5', i === 0 ? 'bg-primary' : 'bg-muted')} />
                <div className="flex-1 min-w-0">
                  <p className={cn('text-xs', i === 0 ? 'text-foreground' : 'text-muted-foreground')}>{event.description}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(event.occurredAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
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

        if (data.customerId) {
          try {
            const customerData = await customersApi.get(data.customerId);
            setCustomer(customerData);
          } catch (err) {
            console.error('Failed to fetch customer:', err);
          }
        }
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
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
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
        case 'confirm': updatedOrder = await ordersApi.confirm(order.id); break;
        case 'process': updatedOrder = await ordersApi.process(order.id); break;
        case 'complete': updatedOrder = await ordersApi.complete(order.id); break;
        case 'cancel': updatedOrder = await ordersApi.cancel(order.id); break;
        case 'mark-paid': updatedOrder = await ordersApi.markPaid(order.id); break;
        default: return;
      }
      setOrder(updatedOrder);
    } catch (err) {
      console.error(`Failed to ${action} order:`, err);
    } finally {
      setActionLoading(null);
      setShowActions(false);
    }
  };

  // Parse data
  const shippingAddress = order?.shippingSnapshot as AddressSnapshot | undefined;
  const billingAddress = order?.billingSnapshot as AddressSnapshot | undefined;
  const metadata = order?.metadata as Record<string, unknown> | undefined;
  const ipAddress = metadata?.ipAddress as string | undefined;
  const source = metadata?.source as string | undefined;

  // Available actions
  const availableActions: { id: string; label: string; icon: React.ComponentType<{ className?: string }>; variant?: 'danger' }[] = [];
  if (order) {
    if (order.status === 'PENDING') availableActions.push({ id: 'confirm', label: 'Confirm Order', icon: CheckCircle2 });
    if (order.status === 'CONFIRMED') availableActions.push({ id: 'process', label: 'Start Processing', icon: Package });
    if (['PROCESSING', 'CONFIRMED'].includes(order.status)) availableActions.push({ id: 'complete', label: 'Mark Complete', icon: CheckCircle2 });
    if (['PENDING', 'AUTHORIZED'].includes(order.paymentStatus)) availableActions.push({ id: 'mark-paid', label: 'Mark as Paid', icon: CreditCard });
    if (!['COMPLETED', 'CANCELED', 'REFUNDED'].includes(order.status)) availableActions.push({ id: 'cancel', label: 'Cancel Order', icon: Ban, variant: 'danger' });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <h2 className="text-lg font-medium text-foreground mb-2">Order Not Found</h2>
        <p className="text-sm text-muted-foreground mb-4">{error || "The order you're looking for doesn't exist."}</p>
        <Link href="/orders" className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted">
          Back to Orders
        </Link>
      </div>
    );
  }

  const paymentConfig = PAYMENT_CONFIG[order.paymentStatus] || { label: order.paymentStatus, color: 'text-muted-foreground' };
  const fulfillmentConfig = FULFILLMENT_CONFIG[order.fulfillmentStatus] || { label: order.fulfillmentStatus, color: 'text-muted-foreground' };

  return (
    <>
      <Header
        title={formatOrderNumber(order.orderNumber)}
        subtitle={`Placed ${formatDate(order.orderedAt)}`}
        backLink={{ href: '/orders', label: 'Orders' }}
        badge={<StatusBadge status={order.status} />}
        actions={
          <div className="relative">
            <Button variant="secondary" size="sm" onClick={() => setShowActions(!showActions)}>
              Actions
              <MoreHorizontal className="w-4 h-4 ml-2" />
            </Button>

            {showActions && (
              <div className="absolute right-0 mt-2 w-48 bg-muted border border-border rounded-lg shadow-xl z-10">
                <div className="p-1">
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md">
                    <Printer className="w-4 h-4" />
                    Print Order
                  </button>
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md">
                    <Mail className="w-4 h-4" />
                    Email Customer
                  </button>
                  <Link
                    href={`/rmas/new?orderId=${order.id}&customerId=${order.customerId}`}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Issue RMA
                  </Link>
                </div>
                {availableActions.length > 0 && (
                  <>
                    <div className="border-t border-border" />
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
                              action.variant === 'danger' ? 'text-red-400 hover:bg-red-500/10' : 'text-foreground hover:bg-muted'
                            )}
                          >
                            {actionLoading === action.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
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
        }
      />

      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
        {/* Row 1: Order Progress Timeline */}
        <Card>
          <CardContent>
            <OrderTimeline currentStatus={order.status} order={order} />
          </CardContent>
        </Card>

        {/* Row 2: Customer & Payment (4 columns) */}
        <Card>
          <CardHeader
            title="Customer & Payment"
            action={
              <Link href={`/customers/${order.customerId}`} className="text-xs text-primary hover:text-primary flex items-center gap-1">
                View Profile <ExternalLink className="w-3 h-3" />
              </Link>
            }
          />
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Contact Info */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contact</span>
                </div>
                {customer ? (
                  <div className="space-y-2">
                    <Link href={`/customers/${order.customerId}`} className="text-base font-medium text-foreground hover:text-primary transition-colors block">
                      {customer.firstName && customer.lastName ? `${customer.firstName} ${customer.lastName}` : customer.email.split('@')[0]}
                    </Link>
                    <a href={`mailto:${customer.email}`} className="text-sm text-primary hover:text-primary flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" />
                      {customer.email}
                    </a>
                    {customer.phone && (
                      <a href={`tel:${customer.phone}`} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" />
                        {customer.phone}
                      </a>
                    )}
                    <div className="pt-2 mt-2 border-t border-border/50">
                      <span className="text-xs text-muted-foreground">{customer._count?.orders ?? 0} total orders</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Customer ID: {order.customerId}</p>
                )}
              </div>

              {/* Payment Method */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Payment Method</span>
                </div>
                {order.paymentSnapshot ? (
                  <PaymentMethodDisplay snapshot={order.paymentSnapshot} />
                ) : order.paymentMethod ? (
                  <p className="text-sm text-foreground">{order.paymentMethod}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No payment method</p>
                )}
              </div>

              {/* Shipping Address */}
              <div>
                <AddressCard title="Shipping Address" address={shippingAddress} icon={Truck} />
              </div>

              {/* Billing Address */}
              <div>
                <AddressCard title="Billing Address" address={billingAddress} icon={MapPin} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Row 3: Details + Shipments (2 columns, 50/50) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Order Details */}
          <Card>
            <CardHeader title="Details" />
            <CardContent>
              <div className="space-y-0 divide-y divide-border/50">
                <InfoRow label="Order ID" value={<span className="flex items-center gap-1">{order.id.slice(0, 8)}... <CopyButton text={order.id} /></span>} />
                <InfoRow label="Type" value={order.type} />
                <InfoRow label="Currency" value={order.currency} />
                <InfoRow label="Created" value={formatDate(order.createdAt)} />
                {order.confirmedAt && <InfoRow label="Confirmed" value={formatDate(order.confirmedAt)} />}
                {order.addressLockedAt && <InfoRow label="Address Locked" value={formatDate(order.addressLockedAt)} />}
                {ipAddress && <InfoRow label="IP Address" value={ipAddress} mono />}
                {source && <InfoRow label="Source" value={source} />}
              </div>
            </CardContent>
          </Card>

          {/* Shipments */}
          <Card>
            <CardHeader
              title="Shipments"
              action={<span className={cn('text-xs font-medium', fulfillmentConfig.color)}>{fulfillmentConfig.label}</span>}
            />
            <CardContent>
              {order.shipments && order.shipments.length > 0 ? (
                <div className="space-y-4">
                  {order.shipments.map((shipment) => (
                    <ShipmentCard
                      key={shipment.id}
                      shipment={shipment}
                      currency={order.currency}
                      formatDate={formatDate}
                      formatCurrency={formatCurrency}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Truck className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No shipments yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row 4: Items (full width) */}
        <Card>
          <CardHeader title={`Items (${order.items?.length || 0})`} />
          <div className="divide-y divide-border">
            {order.items?.map((item) => (
              <div key={item.id} className="flex items-start gap-4 p-5">
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.quantity} × {formatCurrency(item.unitPrice, order.currency)}
                    {item.fulfilledQuantity > 0 && (
                      <span className="text-primary ml-2">({item.fulfilledQuantity} fulfilled)</span>
                    )}
                  </p>
                </div>
                <p className="text-sm font-medium text-foreground">{formatCurrency(item.totalPrice, order.currency)}</p>
              </div>
            ))}
            {(!order.items || order.items.length === 0) && (
              <p className="text-sm text-muted-foreground text-center p-8">No items in this order</p>
            )}
          </div>
        </Card>

        {/* Row 5: Payment Summary (full width) */}
        <Card>
          <CardHeader
            title="Payment Summary"
            action={<span className={cn('text-xs font-medium', paymentConfig.color)}>{paymentConfig.label}</span>}
          />
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Line items breakdown */}
              <div className="space-y-2">
                <InfoRow label="Subtotal" value={formatCurrency(order.subtotal, order.currency)} />
                {order.discountAmount > 0 && (
                  <InfoRow
                    label={order.discountCode ? `Discount (${order.discountCode})` : 'Discount'}
                    value={<span className="text-green-400">-{formatCurrency(order.discountAmount, order.currency)}</span>}
                  />
                )}
                <InfoRow label="Shipping" value={formatCurrency(order.shippingAmount, order.currency)} />
                <InfoRow label="Tax" value={formatCurrency(order.taxAmount, order.currency)} />
              </div>
              {/* Right: Total and payment info */}
              <div className="flex flex-col justify-center lg:items-end lg:text-right">
                <div className="p-4 bg-muted/30 rounded-lg lg:inline-block">
                  <p className="text-xs text-muted-foreground mb-1">Order Total</p>
                  <p className="text-lg font-semibold text-foreground">{formatCurrency(order.total, order.currency)}</p>
                  {order.paymentMethod && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Paid via {order.paymentMethod}
                      {order.paidAt && ` on ${formatDate(order.paidAt)}`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Row 6: Notes (full width) */}
        <Card>
          <CardHeader title="Notes" action={
            <button className="text-xs text-primary hover:text-primary flex items-center gap-1">
              <FileText className="w-3 h-3" /> Add Note
            </button>
          } />
          <CardContent>
            {order.customerNotes || order.internalNotes ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {order.customerNotes && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                      <User className="w-3 h-3" /> Customer Note
                    </p>
                    <p className="text-sm text-foreground p-3 bg-muted/50 rounded-lg border border-border/50">{order.customerNotes}</p>
                  </div>
                )}
                {order.internalNotes && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Internal Note
                    </p>
                    <p className="text-sm text-foreground p-3 bg-amber-500/5 rounded-lg border border-amber-500/20">{order.internalNotes}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No notes on this order</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
