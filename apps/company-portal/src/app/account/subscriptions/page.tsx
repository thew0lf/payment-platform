'use client';

import { useState, FormEvent } from 'react';
import {
  PublicSubscription,
  getCustomerSubscriptions,
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
} from '@/lib/api';
import {
  ArrowPathIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  CreditCardIcon,
  PauseCircleIcon,
  PlayCircleIcon,
  XCircleIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircleIcon; color: string; bg: string; label: string }> = {
  ACTIVE: { icon: CheckCircleIcon, color: 'text-green-600', bg: 'bg-green-50', label: 'Active' },
  TRIALING: { icon: ClockIcon, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Trial' },
  PAUSED: { icon: PauseCircleIcon, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Paused' },
  PAST_DUE: { icon: XCircleIcon, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Past Due' },
  CANCELED: { icon: XCircleIcon, color: 'text-red-600', bg: 'bg-red-50', label: 'Canceled' },
  EXPIRED: { icon: XCircleIcon, color: 'text-gray-600', bg: 'bg-gray-50', label: 'Expired' },
};

const INTERVAL_LABELS: Record<string, string> = {
  DAILY: 'day',
  WEEKLY: 'week',
  BIWEEKLY: 'every 2 weeks',
  MONTHLY: 'month',
  BIMONTHLY: 'every 2 months',
  QUARTERLY: 'quarter',
  SEMIANNUALLY: 'every 6 months',
  ANNUALLY: 'year',
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.ACTIVE;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A';
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

function formatInterval(interval: string): string {
  return INTERVAL_LABELS[interval] || interval.toLowerCase();
}

export default function SubscriptionsPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscriptions, setSubscriptions] = useState<PublicSubscription[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [cancelModal, setCancelModal] = useState<{ subscription: PublicSubscription; reason: string; feedback: string } | null>(null);
  const [pauseModal, setPauseModal] = useState<{ subscription: PublicSubscription; reason: string } | null>(null);

  const handleLookup = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    setHasSearched(true);

    try {
      const result = await getCustomerSubscriptions(email);
      setSubscriptions(result.subscriptions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch subscriptions');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePause = async () => {
    if (!pauseModal) return;
    setActionLoading(pauseModal.subscription.id);
    try {
      const updated = await pauseSubscription(email, pauseModal.subscription.id, pauseModal.reason);
      setSubscriptions((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s))
      );
      setPauseModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause subscription');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async (subscription: PublicSubscription) => {
    setActionLoading(subscription.id);
    try {
      const updated = await resumeSubscription(email, subscription.id);
      setSubscriptions((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume subscription');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!cancelModal) return;
    setActionLoading(cancelModal.subscription.id);
    try {
      const updated = await cancelSubscription(
        email,
        cancelModal.subscription.id,
        cancelModal.reason,
        cancelModal.feedback
      );
      setSubscriptions((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s))
      );
      setCancelModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBack = () => {
    setSubscriptions([]);
    setHasSearched(false);
    setError(null);
  };

  // Subscription List View
  if (hasSearched && subscriptions.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={handleBack}
            className="mb-6 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            &larr; Back to lookup
          </button>

          <h1 className="text-2xl font-bold text-gray-900 mb-6">Your Subscriptions</h1>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {subscriptions.map((subscription) => (
              <div
                key={subscription.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
              >
                {/* Header */}
                <div className="p-5 border-b border-gray-100">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {subscription.productImageUrl ? (
                        <img
                          src={subscription.productImageUrl}
                          alt={subscription.productName || subscription.planName}
                          className="w-12 h-12 rounded-lg object-cover bg-gray-100"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                          <CreditCardIcon className="h-6 w-6 text-white" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {subscription.planDisplayName || subscription.planName}
                        </h3>
                        {subscription.productName && (
                          <p className="text-sm text-gray-500">{subscription.productName}</p>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={subscription.status} />
                  </div>
                </div>

                {/* Details */}
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Price</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(subscription.amount, subscription.currency)} / {formatInterval(subscription.interval)}
                    </span>
                  </div>

                  {subscription.nextBillingDate && subscription.status === 'ACTIVE' && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 flex items-center gap-1.5">
                        <CalendarIcon className="h-4 w-4" />
                        Next billing
                      </span>
                      <span className="text-gray-900">{formatDate(subscription.nextBillingDate)}</span>
                    </div>
                  )}

                  {subscription.trialEndsAt && subscription.status === 'TRIALING' && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 flex items-center gap-1.5">
                        <ClockIcon className="h-4 w-4" />
                        Trial ends
                      </span>
                      <span className="text-gray-900">{formatDate(subscription.trialEndsAt)}</span>
                    </div>
                  )}

                  {subscription.pausedUntil && subscription.status === 'PAUSED' && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 flex items-center gap-1.5">
                        <PauseCircleIcon className="h-4 w-4" />
                        Paused until
                      </span>
                      <span className="text-gray-900">{formatDate(subscription.pausedUntil)}</span>
                    </div>
                  )}

                  {subscription.canceledAt && subscription.status === 'CANCELED' && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 flex items-center gap-1.5">
                        <XCircleIcon className="h-4 w-4" />
                        Canceled on
                      </span>
                      <span className="text-gray-900">{formatDate(subscription.canceledAt)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Started</span>
                    <span className="text-gray-900">{formatDate(subscription.createdAt)}</span>
                  </div>
                </div>

                {/* Actions */}
                {(subscription.canPause || subscription.canResume || subscription.canCancel) && (
                  <div className="px-5 pb-5 pt-2 flex flex-wrap gap-2">
                    {subscription.canResume && (
                      <button
                        onClick={() => handleResume(subscription)}
                        disabled={actionLoading === subscription.id}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 disabled:opacity-50"
                      >
                        {actionLoading === subscription.id ? (
                          <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        ) : (
                          <PlayCircleIcon className="h-4 w-4" />
                        )}
                        Resume
                      </button>
                    )}
                    {subscription.canPause && (
                      <button
                        onClick={() => setPauseModal({ subscription, reason: '' })}
                        disabled={actionLoading === subscription.id}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-yellow-700 bg-yellow-50 rounded-lg hover:bg-yellow-100 disabled:opacity-50"
                      >
                        <PauseCircleIcon className="h-4 w-4" />
                        Pause
                      </button>
                    )}
                    {subscription.canCancel && (
                      <button
                        onClick={() => setCancelModal({ subscription, reason: '', feedback: '' })}
                        disabled={actionLoading === subscription.id}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50"
                      >
                        <XCircleIcon className="h-4 w-4" />
                        Cancel
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Pause Modal */}
        {pauseModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Pause Subscription</h3>
              <p className="text-sm text-gray-600 mb-4">
                Your subscription will be paused and you won&apos;t be charged until you resume.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason (optional)
                </label>
                <select
                  value={pauseModal.reason}
                  onChange={(e) => setPauseModal({ ...pauseModal, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                >
                  <option value="">Select a reason...</option>
                  <option value="too_expensive">Too expensive right now</option>
                  <option value="not_using">Not using it enough</option>
                  <option value="traveling">Traveling / away</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setPauseModal(null)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePause}
                  disabled={actionLoading === pauseModal.subscription.id}
                  className="flex-1 py-2.5 bg-yellow-600 text-white font-medium rounded-lg hover:bg-yellow-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actionLoading === pauseModal.subscription.id && (
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  )}
                  Pause Subscription
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Modal */}
        {cancelModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Cancel Subscription</h3>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure? You&apos;ll lose access at the end of your current billing period.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Why are you canceling?
                </label>
                <select
                  value={cancelModal.reason}
                  onChange={(e) => setCancelModal({ ...cancelModal, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                >
                  <option value="">Select a reason...</option>
                  <option value="too_expensive">Too expensive</option>
                  <option value="not_using">Not using it</option>
                  <option value="found_alternative">Found an alternative</option>
                  <option value="missing_features">Missing features I need</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Any feedback? (optional)
                </label>
                <textarea
                  value={cancelModal.feedback}
                  onChange={(e) => setCancelModal({ ...cancelModal, feedback: e.target.value })}
                  rows={3}
                  placeholder="Help us improve..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setCancelModal(null)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
                >
                  Keep Subscription
                </button>
                <button
                  onClick={handleCancel}
                  disabled={actionLoading === cancelModal.subscription.id}
                  className="flex-1 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actionLoading === cancelModal.subscription.id && (
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  )}
                  Cancel Subscription
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Empty State (after search)
  if (hasSearched && subscriptions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <button
            onClick={handleBack}
            className="mb-6 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            &larr; Try another email
          </button>

          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <CreditCardIcon className="h-8 w-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Subscriptions Found</h2>
            <p className="text-gray-600">
              No active subscriptions were found for this email address.
            </p>
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
            <CreditCardIcon className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Subscriptions</h1>
          <p className="text-gray-600 mt-2">
            Enter your email to view and manage your subscriptions
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleLookup} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-gray-900"
                />
              </div>
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
                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  Looking up...
                </>
              ) : (
                <>
                  View My Subscriptions
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Looking for your orders?{' '}
          <a href="/account/orders" className="text-blue-600 hover:underline">
            Track an order
          </a>
        </p>
      </div>
    </div>
  );
}
