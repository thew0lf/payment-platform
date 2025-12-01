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
} from 'lucide-react';
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
  PICKED_UP: { label: 'Picked Up', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', icon: Package },
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
  const config = STATUS_CONFIG[status] || { label: status, color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20', icon: Package };
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

  // Pagination
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

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
          <h1 className="text-2xl font-bold text-white">Shipments</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {total > 0 ? `${total} shipments` : 'Track and manage shipments'}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by shipment number, tracking..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              showFilters
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
            )}
          >
            <Filter className="w-4 h-4" />
            Filters
            {(statusFilter || carrierFilter) && (
              <span className="w-2 h-2 bg-cyan-400 rounded-full" />
            )}
          </button>

          <button
            onClick={fetchShipments}
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-4 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-500">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                <option value="">All Statuses</option>
                {Object.entries(STATUS_CONFIG).map(([value, { label }]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-500">Carrier</label>
              <select
                value={carrierFilter}
                onChange={(e) => setCarrierFilter(e.target.value)}
                className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
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
                className="self-end px-3 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
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
          <RefreshCw className="w-6 h-6 text-zinc-500 animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!loading && shipments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Truck className="w-12 h-12 text-zinc-600 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No shipments found</h3>
          <p className="text-sm text-zinc-500 max-w-md">
            {search || statusFilter || carrierFilter
              ? 'Try adjusting your search or filters.'
              : 'Shipments will appear here once orders are fulfilled.'}
          </p>
        </div>
      )}

      {/* Shipments Table */}
      {shipments.length > 0 && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Shipment</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Order</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Carrier</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Tracking</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Destination</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Ship Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {shipments.map((shipment) => (
                  <tr key={shipment.id} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="px-4 py-4">
                      <p className="text-sm font-medium text-white">
                        {formatShipmentNumber(shipment.shipmentNumber)}
                      </p>
                      <p className="text-xs text-zinc-500">{shipment.shippingMethod}</p>
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/orders/${shipment.orderId}`}
                        className="text-sm text-cyan-400 hover:underline"
                      >
                        {formatOrderNumber(shipment.orderNumber)}
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={shipment.status} />
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-zinc-300">{shipment.carrier}</p>
                      {shipment.carrierService && (
                        <p className="text-xs text-zinc-500">{shipment.carrierService}</p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {shipment.trackingNumber ? (
                        shipment.trackingUrl ? (
                          <a
                            href={shipment.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-cyan-400 hover:underline"
                          >
                            {shipment.trackingNumber}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-sm text-zinc-300">{shipment.trackingNumber}</span>
                        )
                      ) : (
                        <span className="text-sm text-zinc-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {shipment.destination ? (
                        <div className="flex items-center gap-1.5 text-sm text-zinc-300">
                          <MapPin className="w-3 h-3 text-zinc-500" />
                          {shipment.destination.city}, {shipment.destination.state}
                        </div>
                      ) : (
                        <span className="text-sm text-zinc-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-zinc-300">
                        {shipment.shippedAt ? formatDate(shipment.shippedAt) : formatDate(shipment.createdAt)}
                      </p>
                      {shipment.estimatedDeliveryDate && shipment.status !== 'DELIVERED' && (
                        <p className="text-xs text-zinc-500">
                          Est. {formatDate(shipment.estimatedDeliveryDate)}
                        </p>
                      )}
                      {shipment.deliveredAt && (
                        <p className="text-xs text-green-400">
                          Delivered {formatDate(shipment.deliveredAt)}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
              <p className="text-sm text-zinc-500">
                Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-zinc-400">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
