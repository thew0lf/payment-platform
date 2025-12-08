'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { PublicOrder, lookupOrder, getCustomerOrders } from '@/lib/api';
import {
  MagnifyingGlassIcon,
  TruckIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ChevronRightIcon,
  PackageIcon,
} from '@heroicons/react/24/outline';

type ViewMode = 'lookup' | 'orders';

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircleIcon; color: string; bg: string }> = {
  PENDING: { icon: ClockIcon, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  CONFIRMED: { icon: CheckCircleIcon, color: 'text-blue-600', bg: 'bg-blue-50' },
  PROCESSING: { icon: ClockIcon, color: 'text-blue-600', bg: 'bg-blue-50' },
  SHIPPED: { icon: TruckIcon, color: 'text-purple-600', bg: 'bg-purple-50' },
  DELIVERED: { icon: CheckCircleIcon, color: 'text-green-600', bg: 'bg-green-50' },
  COMPLETED: { icon: CheckCircleIcon, color: 'text-green-600', bg: 'bg-green-50' },
  CANCELLED: { icon: XCircleIcon, color: 'text-red-600', bg: 'bg-red-50' },
  REFUNDED: { icon: XCircleIcon, color: 'text-gray-600', bg: 'bg-gray-50' },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
      <Icon className="h-3.5 w-3.5" />
      {status.replace('_', ' ')}
    </span>
  );
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

export default function OrdersPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('lookup');
  const [email, setEmail] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<PublicOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<PublicOrder | null>(null);

  const handleLookup = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const order = await lookupOrder(orderNumber, email);
      setSelectedOrder(order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Order not found');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewAllOrders = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await getCustomerOrders(email);
      setOrders(result.orders);
      setViewMode('orders');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setSelectedOrder(null);
    setOrders([]);
    setViewMode('lookup');
  };

  // Single Order Detail View
  if (selectedOrder) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={handleBack}
            className="mb-6 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            &larr; Back to order lookup
          </button>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Order Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Order {selectedOrder.orderNumber}</h1>
                  <p className="text-sm text-gray-500 mt-1">
                    Placed on {formatDate(selectedOrder.createdAt)}
                  </p>
                </div>
                <StatusBadge status={selectedOrder.status} />
              </div>
            </div>

            {/* Tracking Info */}
            {selectedOrder.trackingNumber && (
              <div className="p-6 border-b border-gray-200 bg-blue-50">
                <div className="flex items-center gap-3">
                  <TruckIcon className="h-6 w-6 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">Tracking Number</p>
                    {selectedOrder.trackingUrl ? (
                      <a
                        href={selectedOrder.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {selectedOrder.trackingNumber}
                      </a>
                    ) : (
                      <p className="text-gray-600">{selectedOrder.trackingNumber}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Order Items */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900 mb-4">Items</h2>
              <div className="space-y-4">
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.productName}
                        className="w-16 h-16 rounded-lg object-cover bg-gray-100"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
                        <PackageIcon className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.productName}</p>
                      <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-medium text-gray-900">
                      {formatCurrency(item.total, selectedOrder.currency)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900 mb-4">Order Summary</h2>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-900">{formatCurrency(selectedOrder.subtotal, selectedOrder.currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span className="text-gray-900">{formatCurrency(selectedOrder.shippingAmount, selectedOrder.currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax</span>
                  <span className="text-gray-900">{formatCurrency(selectedOrder.taxAmount, selectedOrder.currency)}</span>
                </div>
                <div className="flex justify-between text-base font-semibold pt-2 border-t border-gray-200">
                  <span className="text-gray-900">Total</span>
                  <span className="text-gray-900">{formatCurrency(selectedOrder.total, selectedOrder.currency)}</span>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            {selectedOrder.shippingAddress && (
              <div className="p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Shipping Address</h2>
                <address className="not-italic text-gray-600">
                  {selectedOrder.shippingAddress.firstName} {selectedOrder.shippingAddress.lastName}<br />
                  {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} {selectedOrder.shippingAddress.postalCode}<br />
                  {selectedOrder.shippingAddress.country}
                </address>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Order List View
  if (viewMode === 'orders' && orders.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={handleBack}
            className="mb-6 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            &larr; Back to order lookup
          </button>

          <h1 className="text-2xl font-bold text-gray-900 mb-6">Your Orders</h1>

          <div className="space-y-4">
            {orders.map((order) => (
              <button
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:border-blue-300 transition-colors text-left"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{order.orderNumber}</p>
                    <p className="text-sm text-gray-500 mt-1">{formatDate(order.createdAt)}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {order.items.length} item{order.items.length !== 1 ? 's' : ''} &bull; {formatCurrency(order.total, order.currency)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={order.status} />
                    <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Lookup Form
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <MagnifyingGlassIcon className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Track Your Order</h1>
          <p className="text-gray-600 mt-2">
            Enter your order number and email to view your order status
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleLookup} className="space-y-4">
            <div>
              <label htmlFor="orderNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Order Number
              </label>
              <input
                id="orderNumber"
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="e.g., A-000-000-001"
                required
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-gray-900"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-gray-900"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Looking up...
                </>
              ) : (
                <>
                  <MagnifyingGlassIcon className="h-5 w-5" />
                  Track Order
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center mb-4">
              Or view all your orders
            </p>
            <form onSubmit={handleViewAllOrders} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-gray-900"
              />
              <button
                type="submit"
                disabled={isLoading || !email}
                className="w-full py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                View All My Orders
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
