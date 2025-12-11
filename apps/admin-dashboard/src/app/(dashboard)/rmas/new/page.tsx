'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Package,
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  Check,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ordersApi, Order } from '@/lib/api/orders';
import { rmasApi, RMAType, ReturnReason, getReturnReasonLabel } from '@/lib/api/rmas';
import { formatOrderNumber } from '@/lib/order-utils';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const RMA_TYPES: { value: RMAType; label: string; description: string }[] = [
  { value: 'RETURN', label: 'Return', description: 'Customer wants a refund' },
  { value: 'EXCHANGE', label: 'Exchange', description: 'Replace with different item' },
  { value: 'WARRANTY', label: 'Warranty', description: 'Warranty claim for defective item' },
  { value: 'REPAIR', label: 'Repair', description: 'Item needs to be repaired' },
];

const RETURN_REASONS: ReturnReason[] = [
  'DEFECTIVE',
  'WRONG_SIZE',
  'WRONG_COLOR',
  'WRONG_ITEM',
  'NOT_AS_DESCRIBED',
  'DAMAGED_IN_SHIPPING',
  'ARRIVED_LATE',
  'NO_LONGER_NEEDED',
  'BETTER_PRICE_FOUND',
  'QUALITY_NOT_EXPECTED',
  'ACCIDENTAL_ORDER',
  'WARRANTY_CLAIM',
  'OTHER',
];

// ═══════════════════════════════════════════════════════════════
// FORM CONTENT COMPONENT
// ═══════════════════════════════════════════════════════════════

function CreateRMAFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const orderId = searchParams?.get('orderId') ?? null;
  const customerId = searchParams?.get('customerId') ?? null;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [rmaType, setRmaType] = useState<RMAType>('RETURN');
  const [reason, setReason] = useState<ReturnReason>('DEFECTIVE');
  const [reasonDetails, setReasonDetails] = useState('');
  const [selectedItems, setSelectedItems] = useState<Record<string, { selected: boolean; quantity: number }>>({});

  useEffect(() => {
    async function fetchOrder() {
      if (!orderId) {
        setLoading(false);
        return;
      }

      try {
        const data = await ordersApi.get(orderId);
        setOrder(data);

        // Initialize item selection
        const items: Record<string, { selected: boolean; quantity: number }> = {};
        data.items?.forEach((item) => {
          items[item.id] = { selected: false, quantity: item.quantity };
        });
        setSelectedItems(items);
      } catch (err) {
        console.error('Failed to fetch order:', err);
        setError('Failed to load order. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();
  }, [orderId]);

  const handleItemToggle = (itemId: string) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], selected: !prev[itemId].selected },
    }));
  };

  const handleQuantityChange = (itemId: string, quantity: number) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], quantity },
    }));
  };

  const handleSubmit = async () => {
    if (!orderId || !customerId) {
      setError('Missing order or customer information');
      return;
    }

    const itemsToReturn = Object.entries(selectedItems)
      .filter(([, item]) => item.selected)
      .map(([orderItemId, item]) => ({
        orderItemId,
        quantity: item.quantity,
        reason,
      }));

    if (itemsToReturn.length === 0) {
      setError('Please select at least one item to return');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const rma = await rmasApi.create({
        orderId,
        customerId,
        type: rmaType,
        reason,
        reasonDetails: reasonDetails || undefined,
        items: itemsToReturn,
        metadata: {
          channel: 'portal',
        },
      });

      router.push(`/rmas/${rma.id}`);
    } catch (err) {
      console.error('Failed to create RMA:', err);
      setError('Failed to create RMA. Please try again.');
      setSubmitting(false);
    }
  };

  const selectedCount = Object.values(selectedItems).filter((i) => i.selected).length;

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (!orderId || !customerId) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6 text-center">
          <AlertCircle className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-foreground mb-2">Missing Information</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Please navigate to an order and click "Issue RMA" to create a return.
          </p>
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
      {/* Order Info */}
      {order && (
        <div className="bg-card/50 border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Creating RMA for Order</p>
              <Link
                href={`/orders/${order.id}`}
                className="text-lg font-medium text-primary hover:text-primary"
              >
                {formatOrderNumber(order.orderNumber)}
              </Link>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Order Total</p>
              <p className="text-lg font-medium text-foreground">{formatCurrency(order.total, order.currency)}</p>
            </div>
          </div>
        </div>
      )}

      {/* RMA Type */}
      <div className="bg-card/50 border border-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-foreground mb-4">RMA Type</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {RMA_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => setRmaType(type.value)}
              className={cn(
                'p-3 rounded-lg border text-left transition-colors',
                rmaType === type.value
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-muted/50 hover:border-border'
              )}
            >
              <p className={cn('text-sm font-medium', rmaType === type.value ? 'text-primary' : 'text-foreground')}>
                {type.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{type.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Return Reason */}
      <div className="bg-card/50 border border-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-foreground mb-4">Return Reason</h3>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value as ReturnReason)}
          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          {RETURN_REASONS.map((r) => (
            <option key={r} value={r}>
              {getReturnReasonLabel(r)}
            </option>
          ))}
        </select>
        <textarea
          value={reasonDetails}
          onChange={(e) => setReasonDetails(e.target.value)}
          placeholder="Additional details (optional)"
          rows={3}
          className="mt-3 w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Select Items */}
      <div className="bg-card/50 border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-medium text-foreground">Select Items to Return</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{selectedCount} of {order?.items?.length || 0} items selected</p>
        </div>
        <div className="divide-y divide-border">
          {order?.items?.map((item) => {
            const itemState = selectedItems[item.id];
            const isSelected = itemState?.selected || false;

            return (
              <div
                key={item.id}
                className={cn(
                  'flex items-start gap-4 p-4 transition-colors',
                  isSelected ? 'bg-primary/5' : 'hover:bg-muted/30'
                )}
              >
                <button
                  onClick={() => handleItemToggle(item.id)}
                  className={cn(
                    'w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center mt-0.5',
                    isSelected
                      ? 'bg-primary border-primary'
                      : 'border-border hover:border-border'
                  )}
                >
                  {isSelected && <Check className="w-3 h-3 text-foreground" />}
                </button>
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatCurrency(item.unitPrice, order.currency)} each
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Qty:</span>
                  <select
                    value={itemState?.quantity || item.quantity}
                    onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value))}
                    disabled={!isSelected}
                    className="px-2 py-1 bg-muted border border-border rounded text-sm text-foreground disabled:opacity-50"
                  >
                    {Array.from({ length: item.quantity }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Link href={orderId ? `/orders/${orderId}` : '/orders'}>
          <Button variant="secondary">Cancel</Button>
        </Link>
        <Button
          onClick={handleSubmit}
          disabled={submitting || selectedCount === 0}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            'Create RMA'
          )}
        </Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE WITH SUSPENSE
// ═══════════════════════════════════════════════════════════════

export default function CreateRMAPage() {
  return (
    <>
      <Header
        title="Create RMA"
        subtitle="Issue a return merchandise authorization"
        backLink={{ href: '/rmas', label: 'Returns' }}
      />
      <Suspense fallback={
        <div className="flex items-center justify-center py-24">
          <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
        </div>
      }>
        <CreateRMAFormContent />
      </Suspense>
    </>
  );
}
