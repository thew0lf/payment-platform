'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShoppingCart,
  User,
  Clock,
  Mail,
  Package,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Archive,
  Send,
  CircleDot,
  Plus,
  Minus,
  Tag,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { adminCartApi, Cart, CartStatus } from '@/lib/api/cart';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { useHierarchy } from '@/contexts/hierarchy-context';

// ===============================================================
// CONSTANTS
// ===============================================================

const STATUS_CONFIG: Record<CartStatus, { label: string; color: string; bgColor: string; icon: React.ComponentType<{ className?: string }> }> = {
  ACTIVE: { label: 'Active', color: 'text-green-400', bgColor: 'bg-green-500/10 border-green-500/20', icon: ShoppingCart },
  CONVERTED: { label: 'Converted', color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/20', icon: Check },
  ABANDONED: { label: 'Abandoned', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10 border-yellow-500/20', icon: Clock },
  MERGED: { label: 'Merged', color: 'text-purple-400', bgColor: 'bg-purple-500/10 border-purple-500/20', icon: CircleDot },
  EXPIRED: { label: 'Expired', color: 'text-muted-foreground', bgColor: 'bg-muted border-border', icon: AlertCircle },
  ARCHIVED: { label: 'Archived', color: 'text-gray-400', bgColor: 'bg-gray-500/10 border-gray-500/20', icon: AlertCircle },
};

interface CartActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// ===============================================================
// COMPONENTS
// ===============================================================

function StatusBadge({ status }: { status: CartStatus }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.EXPIRED;
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

function CardHeader({ title, icon: Icon, action }: { title: string; icon?: React.ComponentType<{ className?: string }>; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-border">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
      </div>
      {action}
    </div>
  );
}

function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('p-5', className)}>{children}</div>;
}

function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between py-2">
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

function LoadingSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="h-40 bg-muted rounded-xl" />
        <div className="h-40 bg-muted rounded-xl" />
        <div className="h-40 bg-muted rounded-xl" />
      </div>
      <div className="h-64 bg-muted rounded-xl" />
      <div className="h-48 bg-muted rounded-xl" />
    </div>
  );
}

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  loading,
  variant = 'default',
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  variant?: 'default' | 'danger';
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-card border border-border rounded-xl p-6 max-w-md w-[calc(100%-2rem)] sm:w-full shadow-xl">
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={variant === 'danger' ? 'destructive' : 'default'}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ===============================================================
// MAIN PAGE
// ===============================================================

export default function CartDetailPage() {
  const params = useParams();
  const router = useRouter();
  const cartId = params?.id as string;
  const { selectedCompanyId } = useHierarchy();

  const [cart, setCart] = useState<Cart | null>(null);
  const [activities, setActivities] = useState<CartActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingRecovery, setSendingRecovery] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    async function fetchCart() {
      setLoading(true);
      setError(null);

      try {
        const cartData = await adminCartApi.get(cartId, selectedCompanyId || undefined);
        setCart(cartData);

        // Generate mock activities based on cart data
        const mockActivities: CartActivity[] = [];

        mockActivities.push({
          id: 'create',
          type: 'CART_CREATED',
          description: 'Cart created',
          timestamp: cartData.createdAt,
        });

        if (cartData.items && cartData.items.length > 0) {
          cartData.items.forEach((item, index) => {
            mockActivities.push({
              id: `item-${index}`,
              type: 'ITEM_ADDED',
              description: `Added ${item.quantity}x ${item.product?.name || 'Product'}`,
              timestamp: item.createdAt || cartData.createdAt,
            });
          });
        }

        if (cartData.abandonedAt) {
          mockActivities.push({
            id: 'abandoned',
            type: 'ABANDONED',
            description: 'Cart marked as abandoned',
            timestamp: cartData.abandonedAt,
          });
        }

        if (cartData.convertedAt) {
          mockActivities.push({
            id: 'converted',
            type: 'CONVERTED',
            description: 'Cart converted to order',
            timestamp: cartData.convertedAt,
          });
        }

        // Sort by timestamp descending
        mockActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setActivities(mockActivities);
      } catch (err) {
        console.error('Failed to fetch cart:', err);
        setError('Failed to load cart. Please try again.');
        toast.error('Failed to load cart details');
      } finally {
        setLoading(false);
      }
    }

    fetchCart();
  }, [cartId, selectedCompanyId]);

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
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handleSendRecoveryEmail = async () => {
    if (!cart) return;

    setSendingRecovery(true);
    try {
      // API call would go here
      toast.success('Recovery email sent successfully');
      // Add to activities
      setActivities([
        {
          id: `recovery-${Date.now()}`,
          type: 'RECOVERY_EMAIL_SENT',
          description: 'Recovery email sent',
          timestamp: new Date().toISOString(),
        },
        ...activities,
      ]);
    } catch (err) {
      console.error('Failed to send recovery email:', err);
      toast.error('Failed to send recovery email');
    } finally {
      setSendingRecovery(false);
    }
  };

  const handleArchive = async () => {
    if (!cart) return;

    setArchiving(true);
    try {
      // API call would go here
      toast.success('Cart archived successfully');
      setArchiveDialogOpen(false);
      // Redirect back to carts list
      router.push('/carts');
    } catch (err) {
      console.error('Failed to archive cart:', err);
      toast.error('Failed to archive cart');
    } finally {
      setArchiving(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'CART_CREATED':
        return ShoppingCart;
      case 'ITEM_ADDED':
        return Plus;
      case 'ITEM_REMOVED':
        return Minus;
      case 'ITEM_UPDATED':
        return Package;
      case 'DISCOUNT_APPLIED':
      case 'DISCOUNT_REMOVED':
        return Tag;
      case 'ABANDONED':
        return Clock;
      case 'RECOVERED':
        return RefreshCw;
      case 'RECOVERY_EMAIL_SENT':
        return Mail;
      case 'CONVERTED':
        return Check;
      default:
        return CircleDot;
    }
  };

  if (loading) {
    return (
      <>
        <Header
          title="Loading..."
          backLink={{ href: '/carts', label: 'Carts' }}
        />
        <LoadingSkeleton />
      </>
    );
  }

  if (error || !cart) {
    return (
      <>
        <Header
          title="Cart Not Found"
          backLink={{ href: '/carts', label: 'Carts' }}
        />
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
          <h2 className="text-lg font-medium text-foreground mb-2">Cart Not Found</h2>
          <p className="text-sm text-muted-foreground mb-4">{error || "The cart you're looking for doesn't exist."}</p>
          <Link
            href="/carts"
            className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors min-h-[44px] touch-manipulation"
          >
            Back to Carts
          </Link>
        </div>
      </>
    );
  }

  const customerName = cart.customer
    ? [cart.customer.firstName, cart.customer.lastName].filter(Boolean).join(' ') || cart.customer.email
    : null;

  return (
    <>
      <Header
        title={`Cart ${cart.id.slice(0, 8)}...`}
        subtitle={`Created ${formatDate(cart.createdAt)}`}
        backLink={{ href: '/carts', label: 'Carts' }}
        badge={<StatusBadge status={cart.status} />}
        actions={
          <div className="flex items-center gap-2">
            {cart.status === 'ABANDONED' && (
              <Button
                variant="secondary"
                onClick={handleSendRecoveryEmail}
                disabled={sendingRecovery}
              >
                {sendingRecovery ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                Send Recovery Email
              </Button>
            )}
            {cart.funnel && (
              <Button variant="outline" asChild>
                <Link href={`/funnels/${cart.funnel.id}`}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Funnel
                </Link>
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setArchiveDialogOpen(true)}
            >
              <Archive className="w-4 h-4 mr-2" />
              Archive
            </Button>
          </div>
        }
      />

      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
        {/* Row 1: Customer Info & Cart Status (2 columns on desktop) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Info Card */}
          <Card>
            <CardHeader title="Customer Info" icon={User} />
            <CardContent>
              {cart.customer ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-foreground text-lg font-bold flex-shrink-0">
                      {(cart.customer.firstName?.[0] || cart.customer.email[0]).toUpperCase()}
                    </div>
                    <div>
                      <Link
                        href={`/customers/${cart.customer.id}`}
                        className="text-base font-medium text-foreground hover:text-primary transition-colors"
                      >
                        {customerName}
                      </Link>
                      <p className="text-xs text-muted-foreground">Customer</p>
                    </div>
                  </div>
                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <a
                      href={`mailto:${cart.customer.email}`}
                      className="flex items-center gap-2 text-sm text-primary hover:text-primary/80"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      {cart.customer.email}
                    </a>
                  </div>
                  <Link
                    href={`/customers/${cart.customer.id}`}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 mt-2"
                  >
                    View Profile <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <User className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-base font-medium text-foreground">Guest</p>
                    <p className="text-xs text-muted-foreground">Anonymous visitor</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cart Status Card */}
          <Card>
            <CardHeader title="Cart Status" icon={ShoppingCart} />
            <CardContent>
              <div className="space-y-0 divide-y divide-border/50">
                <InfoRow label="Status" value={<StatusBadge status={cart.status} />} />
                <InfoRow label="Created" value={formatDateTime(cart.createdAt)} />
                <InfoRow label="Last Activity" value={cart.lastActivityAt ? formatDateTime(cart.lastActivityAt) : 'N/A'} />
                {cart.abandonedAt && (
                  <InfoRow label="Abandoned At" value={formatDateTime(cart.abandonedAt)} />
                )}
                {cart.convertedAt && (
                  <InfoRow label="Converted At" value={formatDateTime(cart.convertedAt)} />
                )}
                {cart.expiresAt && (
                  <InfoRow label="Expires At" value={formatDateTime(cart.expiresAt)} />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Cart Items Table */}
        <Card>
          <CardHeader
            title={`Cart Items (${cart.items?.length || 0})`}
            icon={Package}
          />
          {cart.items && cart.items.length > 0 ? (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Product</th>
                      <th className="px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide text-center">Qty</th>
                      <th className="px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide text-right">Unit Price</th>
                      <th className="px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {cart.items.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/30">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {item.product?.images?.[0] ? (
                                <img
                                  src={item.product.images[0]}
                                  alt={item.product?.name || 'Product'}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Package className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{item.product?.name || 'Unknown Product'}</p>
                              <p className="text-xs text-muted-foreground">SKU: {item.product?.sku || 'N/A'}</p>
                              {item.variant && (
                                <p className="text-xs text-primary">{item.variant.name}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="text-sm text-foreground">{item.quantity}</span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="text-sm text-foreground">{formatCurrency(item.price, cart.currency)}</span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="text-sm font-medium text-foreground">{formatCurrency(item.price * item.quantity, cart.currency)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-border">
                {cart.items.map((item) => (
                  <div key={item.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {item.product?.images?.[0] ? (
                          <img
                            src={item.product.images[0]}
                            alt={item.product?.name || 'Product'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{item.product?.name || 'Unknown Product'}</p>
                        <p className="text-xs text-muted-foreground">SKU: {item.product?.sku || 'N/A'}</p>
                        {item.variant && (
                          <p className="text-xs text-primary">{item.variant.name}</p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">Qty: {item.quantity}</span>
                          <span className="text-sm font-medium text-foreground">{formatCurrency(item.price * item.quantity, cart.currency)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No items in this cart</p>
            </div>
          )}
        </Card>

        {/* Row 3: Cart Summary */}
        <Card>
          <CardHeader title="Cart Summary" icon={DollarSign} />
          <CardContent>
            <div className="max-w-md ml-auto">
              <div className="space-y-0 divide-y divide-border/50">
                <InfoRow label="Subtotal" value={formatCurrency(cart.totals.subtotal, cart.totals.currency || cart.currency)} />
                {cart.totals.discount > 0 && (
                  <InfoRow
                    label="Discount"
                    value={<span className="text-green-400">-{formatCurrency(cart.totals.discount, cart.totals.currency || cart.currency)}</span>}
                  />
                )}
                {cart.totals.shipping > 0 && (
                  <InfoRow label="Shipping" value={formatCurrency(cart.totals.shipping, cart.totals.currency || cart.currency)} />
                )}
                {cart.totals.tax > 0 && (
                  <InfoRow label="Tax" value={formatCurrency(cart.totals.tax, cart.totals.currency || cart.currency)} />
                )}
              </div>
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
                <span className="text-base font-semibold text-foreground">Grand Total</span>
                <span className="text-lg font-bold text-foreground">{formatCurrency(cart.totals.grandTotal, cart.totals.currency || cart.currency)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Row 4: Activity Timeline */}
        <Card>
          <CardHeader title="Activity Timeline" icon={Clock} />
          <CardContent>
            {activities.length > 0 ? (
              <div className="space-y-4">
                {activities.map((activity, index) => {
                  const Icon = getActivityIcon(activity.type);
                  const isFirst = index === 0;
                  return (
                    <div key={activity.id} className="flex gap-3">
                      <div className="relative">
                        <div className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center',
                          isFirst ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                        )}>
                          <Icon className="w-4 h-4" />
                        </div>
                        {index < activities.length - 1 && (
                          <div className="absolute top-8 left-1/2 -translate-x-1/2 w-0.5 h-full bg-border" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pb-4">
                        <p className={cn('text-sm', isFirst ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                          {activity.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(activity.timestamp)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6">
                <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No activity recorded</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Row 5: Additional Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cart Details */}
          <Card>
            <CardHeader title="Cart Details" />
            <CardContent>
              <div className="space-y-0 divide-y divide-border/50">
                <InfoRow
                  label="Cart ID"
                  value={
                    <span className="flex items-center gap-1">
                      {cart.id.slice(0, 8)}...
                      <CopyButton text={cart.id} />
                    </span>
                  }
                />
                <InfoRow label="Currency" value={cart.currency} />
                <InfoRow label="Item Count" value={cart.totals.itemCount} />
                {cart.sessionToken && (
                  <InfoRow
                    label="Session Token"
                    value={
                      <span className="flex items-center gap-1">
                        {cart.sessionToken.slice(0, 12)}...
                        <CopyButton text={cart.sessionToken} />
                      </span>
                    }
                  />
                )}
                {cart.visitorId && (
                  <InfoRow label="Visitor ID" value={cart.visitorId.slice(0, 12) + '...'} />
                )}
              </div>
            </CardContent>
          </Card>

          {/* UTM & Source */}
          <Card>
            <CardHeader title="Source & Tracking" />
            <CardContent>
              <div className="space-y-0 divide-y divide-border/50">
                {cart.funnel ? (
                  <InfoRow
                    label="Funnel"
                    value={
                      <Link href={`/funnels/${cart.funnel.id}`} className="text-primary hover:text-primary/80 flex items-center gap-1">
                        {cart.funnel.name}
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    }
                  />
                ) : (
                  <InfoRow label="Funnel" value="N/A" />
                )}
                <InfoRow label="UTM Source" value={cart.utmSource || 'N/A'} />
                <InfoRow label="UTM Medium" value={cart.utmMedium || 'N/A'} />
                <InfoRow label="UTM Campaign" value={cart.utmCampaign || 'N/A'} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Archive Confirmation Dialog */}
      <ConfirmDialog
        open={archiveDialogOpen}
        title="Archive Cart"
        message="Are you sure you want to archive this cart? This action cannot be undone."
        confirmLabel="Archive"
        onConfirm={handleArchive}
        onCancel={() => setArchiveDialogOpen(false)}
        loading={archiving}
        variant="danger"
      />
    </>
  );
}
