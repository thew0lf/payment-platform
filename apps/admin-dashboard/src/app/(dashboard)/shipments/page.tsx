'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  Truck,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MapPin,
  ExternalLink,
  MoreHorizontal,
  Eye,
  Edit,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatShipmentNumber, formatOrderNumber } from '@/lib/order-utils';
import { apiRequest } from '@/lib/api';

// ═══════════════════════════════════════════════════════════════
// TYPES (since we don't have a dedicated fulfillment API client yet)
// ═══════════════════════════════════════════════════════════════

interface Shipment {
  id: string;
  orderId: string;
  orderNumber: string;
  shipmentNumber: string;
  carrier: string;
  carrierService?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shippingMethod: string;
  status: string;
  weight?: number;
  weightUnit?: string;
  shippingCost?: number;
  estimatedDeliveryDate?: string;
  shippedAt?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
  destination?: {
    city: string;
    state: string;
    country: string;
  };
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  PENDING: { label: 'Pending', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', icon: Clock },
  LABEL_CREATED: { label: 'Label Created', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Package },
  PICKED_UP: { label: 'Picked Up', color: 'bg-primary/10 text-primary border-primary/20', icon: Package },
  IN_TRANSIT: { label: 'In Transit', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', icon: Truck },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', icon: Truck },
  DELIVERED: { label: 'Delivered', color: 'bg-green-500/10 text-green-400 border-green-500/20', icon: CheckCircle2 },
  EXCEPTION: { label: 'Exception', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: AlertCircle },
  RETURNED: { label: 'Returned', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', icon: Package },
};

const CARRIERS = ['USPS', 'UPS', 'FedEx', 'DHL', 'Other'];

const PAGE_SIZE = 20;

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || { label: status, color: 'bg-muted text-muted-foreground border-border', icon: Package };
  const Icon = config.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border', config.color)}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [carrierFilter, setCarrierFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Actions
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [statusModalShipment, setStatusModalShipment] = useState<Shipment | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleUpdateStatus = async () => {
    if (!statusModalShipment || !newStatus) return;

    setUpdating(true);
    try {
      await apiRequest.patch(`/api/fulfillment/shipments/${statusModalShipment.id}`, { status: newStatus });
      toast.success(`Shipment status updated to ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
      setStatusModalShipment(null);
      setNewStatus('');
      fetchShipments();
    } catch (err) {
      console.error('Failed to update shipment status:', err);
      toast.error('Failed to update shipment status');
    } finally {
      setUpdating(false);
    }
  };

  const fetchShipments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Build query params
      const params = new URLSearchParams();
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String((page - 1) * PAGE_SIZE));
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (carrierFilter) params.set('carrier', carrierFilter);

      const data = await apiRequest.get<Shipment[] | { shipments: Shipment[]; total: number }>(
        `/api/fulfillment/shipments?${params}`
      );

      // Handle both array response and paginated response
      if (Array.isArray(data)) {
        setShipments(data);
        setTotal(data.length);
      } else {
        setShipments(data.shipments || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch shipments:', err);
      setError('Failed to load shipments. Please try again.');
      setShipments([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, carrierFilter]);

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, carrierFilter]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Shipments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total > 0 ? `${total} shipments` : 'Track and manage shipments'}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by shipment number, tracking..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              showFilters
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'bg-card text-muted-foreground border border-border hover:text-foreground'
            )}
          >
            <Filter className="w-4 h-4" />
            Filters
            {(statusFilter || carrierFilter) && (
              <span className="w-2 h-2 bg-primary rounded-full" />
            )}
          </button>

          <button
            onClick={fetchShipments}
            className="p-2 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-4 p-4 bg-card/50 border border-border rounded-lg">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">All Statuses</option>
                {Object.entries(STATUS_CONFIG).map(([value, { label }]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Carrier</label>
              <select
                value={carrierFilter}
                onChange={(e) => setCarrierFilter(e.target.value)}
                className="px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">All Carriers</option>
                {CARRIERS.map((carrier) => (
                  <option key={carrier} value={carrier}>{carrier}</option>
                ))}
              </select>
            </div>

            {(statusFilter || carrierFilter) && (
              <button
                onClick={() => {
                  setStatusFilter('');
                  setCarrierFilter('');
                }}
                className="self-end px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && shipments.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!loading && shipments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Truck className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No shipments found</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {search || statusFilter || carrierFilter
              ? 'Try adjusting your search or filters.'
              : 'Shipments will appear here once orders are fulfilled.'}
          </p>
        </div>
      )}

      {/* Shipments Table */}
      {shipments.length > 0 && (
        <div className="bg-card/50 border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Shipment</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Order</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Carrier</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Tracking</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Destination</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Ship Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {shipments.map((shipment) => (
                  <tr key={shipment.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-4">
                      <p className="text-sm font-medium text-foreground">
                        {formatShipmentNumber(shipment.shipmentNumber)}
                      </p>
                      <p className="text-xs text-muted-foreground">{shipment.shippingMethod}</p>
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/orders/${shipment.orderId}`}
                        className="text-sm text-primary hover:underline"
                      >
                        {formatOrderNumber(shipment.orderNumber)}
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={shipment.status} />
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-foreground">{shipment.carrier}</p>
                      {shipment.carrierService && (
                        <p className="text-xs text-muted-foreground">{shipment.carrierService}</p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {shipment.trackingNumber ? (
                        shipment.trackingUrl ? (
                          <a
                            href={shipment.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            {shipment.trackingNumber}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-sm text-foreground">{shipment.trackingNumber}</span>
                        )
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {shipment.destination ? (
                        <div className="flex items-center gap-1.5 text-sm text-foreground">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          {shipment.destination.city}, {shipment.destination.state}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-foreground">
                        {shipment.shippedAt ? formatDate(shipment.shippedAt) : formatDate(shipment.createdAt)}
                      </p>
                      {shipment.estimatedDeliveryDate && shipment.status !== 'DELIVERED' && (
                        <p className="text-xs text-muted-foreground">
                          Est. {formatDate(shipment.estimatedDeliveryDate)}
                        </p>
                      )}
                      {shipment.deliveredAt && (
                        <p className="text-xs text-green-400">
                          Delivered {formatDate(shipment.deliveredAt)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === shipment.id ? null : shipment.id)}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {openMenuId === shipment.id && (
                          <div className="absolute right-0 mt-1 w-48 bg-card border border-border rounded-lg shadow-lg z-10">
                            <Link
                              href={`/orders/${shipment.orderId}`}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                              onClick={() => setOpenMenuId(null)}
                            >
                              <Eye className="w-4 h-4" />
                              View Order
                            </Link>
                            <button
                              onClick={() => {
                                setStatusModalShipment(shipment);
                                setNewStatus(shipment.status);
                                setOpenMenuId(null);
                              }}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                              Update Status
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status Update Modal */}
      {statusModalShipment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">Update Shipment Status</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Shipment: {formatShipmentNumber(statusModalShipment.shipmentNumber)}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {Object.entries(STATUS_CONFIG).map(([value, { label }]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setStatusModalShipment(null);
                    setNewStatus('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateStatus}
                  disabled={updating || newStatus === statusModalShipment.status}
                  className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {updating ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
