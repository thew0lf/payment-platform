'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Package,
  Calendar,
  DollarSign,
  ShoppingCart,
  Clock,
  FileText,
  Plus,
  MoreHorizontal,
  Ban,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Truck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { customersApi, Customer, CustomerNote, CustomerAddress } from '@/lib/api/customers';
import { Order } from '@/lib/api/orders';
import { formatOrderNumber } from '@/lib/order-utils';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ComponentType<{ className?: string }> }> = {
  ACTIVE: { label: 'Active', color: 'text-green-400', bgColor: 'bg-green-500/10 border-green-500/20', icon: CheckCircle2 },
  INACTIVE: { label: 'Inactive', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10 border-yellow-500/20', icon: Clock },
  SUSPENDED: { label: 'Suspended', color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/20', icon: Ban },
};

const NOTE_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  INTERNAL: { label: 'Internal', color: 'bg-blue-500/10 text-blue-400' },
  CUSTOMER_SERVICE: { label: 'Customer Service', color: 'bg-purple-500/10 text-purple-400' },
  SYSTEM: { label: 'System', color: 'bg-muted text-muted-foreground' },
};

const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'text-yellow-400' },
  CONFIRMED: { label: 'Confirmed', color: 'text-blue-400' },
  PROCESSING: { label: 'Processing', color: 'text-primary' },
  SHIPPED: { label: 'Shipped', color: 'text-purple-400' },
  DELIVERED: { label: 'Delivered', color: 'text-green-400' },
  COMPLETED: { label: 'Completed', color: 'text-emerald-400' },
  CANCELED: { label: 'Canceled', color: 'text-red-400' },
  REFUNDED: { label: 'Refunded', color: 'text-orange-400' },
};

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

function StatCard({
  title,
  value,
  subValue,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  subValue?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="bg-card/50 border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">{title}</span>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="text-lg font-semibold text-foreground">{value}</div>
      {subValue && (
        <div className="text-xs text-muted-foreground mt-1">{subValue}</div>
      )}
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

function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn('text-sm text-foreground text-right', mono && 'font-mono text-xs')}>{value}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function CustomerDetailPage() {
  const params = useParams();
  const customerId = params?.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState<'INTERNAL' | 'CUSTOMER_SERVICE'>('INTERNAL');
  const [addingNote, setAddingNote] = useState(false);
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    async function fetchCustomer() {
      setLoading(true);
      setError(null);

      try {
        const [customerData, addressesData, notesData, ordersData] = await Promise.all([
          customersApi.get(customerId),
          customersApi.getAddresses(customerId).catch(() => []),
          customersApi.getNotes(customerId).catch(() => []),
          customersApi.getOrders(customerId, { limit: 10 }).then(r => r.items as Order[]).catch(() => []),
        ]);

        setCustomer(customerData);
        setAddresses(addressesData);
        setNotes(notesData);
        setOrders(ordersData);
      } catch (err) {
        console.error('Failed to fetch customer:', err);
        setError('Failed to load customer. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchCustomer();
  }, [customerId]);

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

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setAddingNote(true);
    try {
      const note = await customersApi.addNote(customerId, newNote, noteType);
      setNotes([note, ...notes]);
      setNewNote('');
      setShowAddNote(false);
    } catch (err) {
      console.error('Failed to add note:', err);
    } finally {
      setAddingNote(false);
    }
  };

  // Calculate stats
  const totalSpent = customer?._stats?.totalSpent || 0;
  const avgOrderValue = customer?._stats?.averageOrderValue || 0;
  const orderCount = customer?._stats?.orderCount || 0;
  const customerDuration = customer?.createdAt
    ? Math.floor((Date.now() - new Date(customer.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <h2 className="text-lg font-medium text-foreground mb-2">Customer Not Found</h2>
        <p className="text-sm text-muted-foreground mb-4">{error || "The customer you're looking for doesn't exist."}</p>
        <Link
          href="/customers"
          className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted transition-colors"
        >
          Back to Customers
        </Link>
      </div>
    );
  }

  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || 'Unknown Customer';
  const initials = [customer.firstName?.[0], customer.lastName?.[0]].filter(Boolean).join('').toUpperCase() || 'U';

  return (
    <>
      <Header
        title={fullName}
        subtitle={`Customer since ${formatDate(customer.createdAt)}`}
        backLink={{ href: '/customers', label: 'Customers' }}
        badge={<StatusBadge status={customer.status} />}
        actions={
          <div className="relative">
            <Button variant="secondary" size="sm" onClick={() => setShowActions(!showActions)}>
              Actions
              <MoreHorizontal className="w-4 h-4 ml-2" />
            </Button>

            {showActions && (
              <div className="absolute right-0 mt-2 w-48 bg-muted border border-border rounded-lg shadow-xl z-10">
                <div className="p-1">
                  <Link
                    href={`/orders/new?customerId=${customerId}`}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md"
                  >
                    <Plus className="w-4 h-4" />
                    Create Order
                  </Link>
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md">
                    <Mail className="w-4 h-4" />
                    Send Email
                  </button>
                </div>
              </div>
            )}
          </div>
        }
      />

      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
        {/* Row 1: Stats (4 cards) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Spent"
            value={formatCurrency(totalSpent)}
            icon={DollarSign}
          />
          <StatCard
            title="Avg Order Value"
            value={formatCurrency(avgOrderValue)}
            icon={ShoppingCart}
          />
          <StatCard
            title="Total Orders"
            value={orderCount}
            icon={Package}
          />
          <StatCard
            title="Customer Since"
            value={customerDuration > 0 ? `${customerDuration}d` : '0d'}
            subValue={formatDate(customer.createdAt)}
            icon={Calendar}
          />
        </div>

        {/* Row 2: Profile & Contact & Details (3 columns) */}
        <Card>
          <CardHeader title="Profile & Contact" icon={User} />
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Profile */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Profile</span>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                    {initials}
                  </div>
                  <div>
                    <p className="text-base font-medium text-foreground">{fullName}</p>
                    <p className="text-xs text-muted-foreground capitalize">{customer.status.toLowerCase()}</p>
                  </div>
                </div>
                <Link
                  href={`/orders/new?customerId=${customerId}`}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/80 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Create Order
                </Link>
              </div>

              {/* Contact */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contact</span>
                </div>
                <div className="space-y-2">
                  {customer.email && (
                    <a href={`mailto:${customer.email}`} className="flex items-center gap-2 text-sm text-primary hover:text-primary">
                      <Mail className="w-3.5 h-3.5" />
                      {customer.email}
                    </a>
                  )}
                  {customer.phone && (
                    <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                      <Phone className="w-3.5 h-3.5" />
                      {customer.phone}
                    </a>
                  )}
                  {!customer.email && !customer.phone && (
                    <p className="text-sm text-muted-foreground">No contact info</p>
                  )}
                </div>
                <button className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-muted text-foreground rounded-lg hover:bg-muted transition-colors text-sm">
                  <Mail className="w-4 h-4" />
                  Send Email
                </button>
              </div>

              {/* Details */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Details</span>
                </div>
                <div className="space-y-0 divide-y divide-border/50">
                  <InfoRow
                    label="Customer ID"
                    value={
                      <span className="flex items-center gap-1">
                        {customer.id.slice(0, 8)}...
                        <CopyButton text={customer.id} />
                      </span>
                    }
                  />
                  <InfoRow label="Status" value={<span className="capitalize">{customer.status.toLowerCase()}</span>} />
                  <InfoRow label="Created" value={formatDate(customer.createdAt)} />
                  <InfoRow label="Updated" value={formatDate(customer.updatedAt)} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Row 3: Addresses (full-width) */}
        <Card>
          <CardHeader
            title="Addresses"
            icon={MapPin}
            action={
              <button className="flex items-center gap-1 text-xs text-primary hover:text-primary">
                <Plus className="w-3 h-3" /> Add Address
              </button>
            }
          />
          <CardContent>
            {addresses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {addresses.map((address) => (
                  <div key={address.id} className="p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-primary font-medium uppercase">
                        {address.type.replace('_', ' ')}
                      </span>
                      {address.isDefault && (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Default</span>
                      )}
                    </div>
                    <div className="text-sm text-foreground space-y-0.5">
                      <p className="font-medium text-foreground">
                        {address.firstName} {address.lastName}
                      </p>
                      {address.company && <p className="text-muted-foreground">{address.company}</p>}
                      <p>{address.address1}</p>
                      {address.address2 && <p>{address.address2}</p>}
                      <p>
                        {address.city}, {address.state} {address.postalCode}
                      </p>
                      <p>{address.country}</p>
                      {address.phone && (
                        <p className="text-muted-foreground pt-1">{address.phone}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No addresses on file</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Row 4: Recent Orders (full-width) */}
        <Card>
          <CardHeader
            title="Recent Orders"
            icon={Package}
            action={
              orders.length > 0 ? (
                <Link
                  href={`/orders?customerId=${customerId}`}
                  className="text-xs text-primary hover:text-primary flex items-center gap-1"
                >
                  View All <ExternalLink className="w-3 h-3" />
                </Link>
              ) : null
            }
          />
          <div className="divide-y divide-border">
            {orders.length > 0 ? (
              orders.map((order) => {
                const statusConfig = ORDER_STATUS_CONFIG[order.status] || { label: order.status, color: 'text-muted-foreground' };
                return (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {formatOrderNumber(order.orderNumber)}
                        </span>
                        <span className={cn('text-xs font-medium', statusConfig.color)}>
                          {statusConfig.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(order.orderedAt)} · {order.items?.length || 0} items
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">
                        {formatCurrency(order.total, order.currency)}
                      </p>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="text-center py-8">
                <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No orders yet</p>
              </div>
            )}
          </div>
        </Card>

        {/* Row 5: Notes (full-width) */}
        <Card>
          <CardHeader
            title="Notes"
            icon={FileText}
            action={
              <button
                onClick={() => setShowAddNote(!showAddNote)}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary"
              >
                <Plus className="w-3 h-3" /> Add Note
              </button>
            }
          />
          <CardContent>
            {showAddNote && (
              <div className="mb-4 p-4 bg-muted/30 rounded-lg">
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setNoteType('INTERNAL')}
                    className={cn(
                      'px-3 py-1 rounded text-xs font-medium transition-colors',
                      noteType === 'INTERNAL'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-muted text-muted-foreground hover:bg-muted'
                    )}
                  >
                    Internal
                  </button>
                  <button
                    onClick={() => setNoteType('CUSTOMER_SERVICE')}
                    className={cn(
                      'px-3 py-1 rounded text-xs font-medium transition-colors',
                      noteType === 'CUSTOMER_SERVICE'
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'bg-muted text-muted-foreground hover:bg-muted'
                    )}
                  >
                    Customer Service
                  </button>
                </div>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary mb-3"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddNote}
                    disabled={addingNote || !newNote.trim()}
                    className="px-3 py-1.5 bg-primary text-foreground rounded-lg hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {addingNote ? 'Adding...' : 'Add Note'}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddNote(false);
                      setNewNote('');
                    }}
                    className="px-3 py-1.5 bg-muted text-foreground rounded-lg hover:bg-muted text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {notes.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {notes.map((note) => (
                  <div key={note.id} className="p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <span className={cn(
                        'px-2 py-0.5 rounded text-xs font-medium',
                        NOTE_TYPE_CONFIG[note.type]?.color || 'bg-muted text-muted-foreground'
                      )}>
                        {NOTE_TYPE_CONFIG[note.type]?.label || note.type}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(note.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                    {note.user && (
                      <p className="text-xs text-muted-foreground mt-2">
                        by {note.user.name || note.user.email}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No notes on this customer</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
