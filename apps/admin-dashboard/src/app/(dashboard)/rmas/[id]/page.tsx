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
  User,
  FileText,
  ExternalLink,
  Hash,
  Copy,
  Check,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  rmasApi,
  RMA,
  getRMAStatusColor,
  getRMAStatusLabel,
  getRMATypeLabel,
  getReturnReasonLabel,
  formatRMANumber,
  canApproveRMA,
  canRejectRMA,
} from '@/lib/api/rmas';
import { formatOrderNumber } from '@/lib/order-utils';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border', getRMAStatusColor(status as any))}>
      {getRMAStatusLabel(status as any)}
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

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground text-right">{value}</span>
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

function TimelineEvent({ event, isLast }: { event: any; isLast: boolean }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-2 h-2 rounded-full bg-primary" />
        {!isLast && <div className="w-0.5 flex-1 bg-muted mt-1" />}
      </div>
      <div className="pb-4">
        <p className="text-sm font-medium text-foreground">{getRMAStatusLabel(event.status)}</p>
        <p className="text-xs text-muted-foreground">
          {new Date(event.timestamp).toLocaleString()}
          {event.actor && ` by ${event.actorType === 'system' ? 'System' : event.actor}`}
        </p>
        {event.notes && <p className="text-xs text-muted-foreground mt-1">{event.notes}</p>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function RMADetailPage() {
  const params = useParams();
  const rmaId = params?.id as string;

  const [rma, setRma] = useState<RMA | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    async function fetchRMA() {
      setLoading(true);
      setError(null);

      try {
        const data = await rmasApi.get(rmaId);
        setRma(data);
      } catch (err) {
        console.error('Failed to fetch RMA:', err);
        setError('Failed to load RMA. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchRMA();
  }, [rmaId]);

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!rma) return;

    if (action === 'reject') {
      setShowRejectModal(true);
      setShowActions(false);
      return;
    }

    setActionLoading(action);
    try {
      const updatedRMA = await rmasApi.approve(rma.id);
      setRma(updatedRMA);
    } catch (err) {
      console.error(`Failed to ${action} RMA:`, err);
    } finally {
      setActionLoading(null);
      setShowActions(false);
    }
  };

  const confirmReject = async () => {
    if (!rma || !rejectionReason.trim()) return;

    setActionLoading('reject');
    try {
      const updatedRMA = await rmasApi.reject(rma.id, rejectionReason.trim());
      setRma(updatedRMA);
      setShowRejectModal(false);
      setRejectionReason('');
    } catch (err) {
      console.error('Failed to reject RMA:', err);
    } finally {
      setActionLoading(null);
    }
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (error || !rma) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <h2 className="text-lg font-medium text-foreground mb-2">RMA Not Found</h2>
        <p className="text-sm text-muted-foreground mb-4">{error || "The RMA you're looking for doesn't exist."}</p>
        <Link href="/rmas" className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted">
          Back to Returns
        </Link>
      </div>
    );
  }

  const totalValue = rma.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

  return (
    <>
      <Header
        title={formatRMANumber(rma.rmaNumber)}
        subtitle={`Created ${formatDate(rma.createdAt)}`}
        backLink={{ href: '/rmas', label: 'Returns' }}
        badge={<StatusBadge status={rma.status} />}
        actions={
          <div className="relative">
            <Button variant="secondary" size="sm" onClick={() => setShowActions(!showActions)}>
              Actions
              <MoreHorizontal className="w-4 h-4 ml-2" />
            </Button>

            {showActions && (
              <div className="absolute right-0 mt-2 w-48 bg-muted border border-border rounded-lg shadow-xl z-10">
                <div className="p-1">
                  {canApproveRMA(rma) && (
                    <button
                      onClick={() => handleAction('approve')}
                      disabled={actionLoading === 'approve'}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-400 hover:bg-green-500/10 rounded-md"
                    >
                      {actionLoading === 'approve' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Approve RMA
                    </button>
                  )}
                  {canRejectRMA(rma) && (
                    <button
                      onClick={() => handleAction('reject')}
                      disabled={actionLoading === 'reject'}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-md"
                    >
                      {actionLoading === 'reject' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                      Reject RMA
                    </button>
                  )}
                  <Link
                    href={`/orders/${rma.orderId}`}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Order
                  </Link>
                </div>
              </div>
            )}
          </div>
        }
      />

      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
        {/* Row 1: Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Type</p>
            <p className="text-sm font-medium text-foreground">{getRMATypeLabel(rma.type)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Reason</p>
            <p className="text-sm font-medium text-foreground">{getReturnReasonLabel(rma.reason)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Items</p>
            <p className="text-sm font-medium text-foreground">{rma.items.length} items</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Value</p>
            <p className="text-sm font-medium text-foreground">{formatCurrency(totalValue)}</p>
          </Card>
        </div>

        {/* Row 2: Details & Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Details */}
          <Card>
            <CardHeader
              title="Details"
              action={
                <Link href={`/orders/${rma.orderId}`} className="text-xs text-primary hover:text-primary flex items-center gap-1">
                  View Order <ExternalLink className="w-3 h-3" />
                </Link>
              }
            />
            <CardContent>
              <div className="space-y-0 divide-y divide-border/50">
                <InfoRow label="RMA ID" value={<span className="flex items-center gap-1">{rma.id.slice(0, 8)}... <CopyButton text={rma.id} /></span>} />
                <InfoRow
                  label="Order"
                  value={
                    <Link href={`/orders/${rma.orderId}`} className="text-primary hover:text-primary">
                      {rma.order?.orderNumber ? formatOrderNumber(rma.order.orderNumber) : rma.orderId.slice(0, 8)}
                    </Link>
                  }
                />
                <InfoRow label="Initiated By" value={rma.metadata.initiatedBy} />
                <InfoRow label="Channel" value={rma.metadata.channel || 'N/A'} />
                <InfoRow label="Created" value={formatDate(rma.createdAt)} />
                <InfoRow label="Expires" value={formatDate(rma.expiresAt)} />
                {rma.reasonDetails && <InfoRow label="Details" value={rma.reasonDetails} />}
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader title="Timeline" />
            <CardContent>
              {rma.timeline && rma.timeline.length > 0 ? (
                <div>
                  {rma.timeline.map((event, i) => (
                    <TimelineEvent
                      key={i}
                      event={event}
                      isLast={i === rma.timeline.length - 1}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No timeline events</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row 3: Items */}
        <Card>
          <CardHeader title={`Items (${rma.items.length})`} />
          <div className="divide-y divide-border">
            {rma.items.map((item) => (
              <div key={item.id} className="flex items-start gap-4 p-5">
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.quantity} × {formatCurrency(item.unitPrice)}
                  </p>
                  {item.reason && (
                    <p className="text-xs text-muted-foreground mt-1">Reason: {getReturnReasonLabel(item.reason)}</p>
                  )}
                </div>
                <p className="text-sm font-medium text-foreground">
                  {formatCurrency(item.unitPrice * item.quantity)}
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* Row 4: Shipping */}
        {rma.shipping && (
          <Card>
            <CardHeader title="Shipping" />
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Label Type</p>
                  <p className="text-sm text-foreground capitalize">{rma.shipping.labelType.replace('_', ' ')}</p>

                  {rma.shipping.trackingNumber && (
                    <div className="mt-4">
                      <p className="text-xs text-muted-foreground mb-2">Tracking Number</p>
                      <div className="flex items-center gap-2 p-2 bg-muted rounded">
                        <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                        <code className="text-xs text-foreground flex-1">{rma.shipping.trackingNumber}</code>
                        <CopyButton text={rma.shipping.trackingNumber} />
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Return Address</p>
                  <div className="text-sm text-foreground space-y-0.5">
                    <p>{rma.shipping.returnAddress.name}</p>
                    <p>{rma.shipping.returnAddress.street1}</p>
                    <p>
                      {rma.shipping.returnAddress.city}, {rma.shipping.returnAddress.state}{' '}
                      {rma.shipping.returnAddress.postalCode}
                    </p>
                    <p>{rma.shipping.returnAddress.country}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Row 5: Resolution */}
        {rma.resolution && (
          <Card>
            <CardHeader title="Resolution" />
            <CardContent>
              <div className="space-y-2">
                <InfoRow label="Resolution Type" value={rma.resolution.type} />
                <InfoRow label="Status" value={rma.resolution.status} />
                {rma.resolution.refund && (
                  <>
                    <InfoRow label="Refund Amount" value={formatCurrency(rma.resolution.refund.amount)} />
                    <InfoRow label="Refund Method" value={rma.resolution.refund.method} />
                    {rma.resolution.refund.processedAt && (
                      <InfoRow label="Processed At" value={formatDate(rma.resolution.refund.processedAt)} />
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Reject RMA Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowRejectModal(false);
              setRejectionReason('');
            }}
          />
          <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-red-500/10">
                <XCircle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Reject RMA</h3>
                <p className="text-sm text-muted-foreground">
                  Please provide a reason for rejecting this return request
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-2">
                Rejection Reason
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500/50 min-h-[100px]"
                placeholder="Enter the reason for rejection..."
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmReject}
                disabled={actionLoading === 'reject' || !rejectionReason.trim()}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-foreground rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {actionLoading === 'reject' ? 'Rejecting...' : 'Reject RMA'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
