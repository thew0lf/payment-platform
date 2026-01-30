'use client';

import { useEffect } from 'react';
import { Funnel } from '@/lib/api';
import { useFunnel } from '@/contexts/funnel-context';
import { CheckCircleIcon, EnvelopeIcon, TruckIcon } from '@heroicons/react/24/outline';
import confetti from 'canvas-confetti';

interface SuccessStageProps {
  funnel: Funnel;
}

export function SuccessStage({ funnel }: SuccessStageProps) {
  const { session, cart, cartTotal, customerInfo } = useFunnel();

  useEffect(() => {
    // Celebrate!
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto text-center">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircleIcon className="h-12 w-12 text-green-500 dark:text-green-400" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Thank you for your order!
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
          Your order has been confirmed and will be shipped soon.
        </p>

        {/* Order Details Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-left mb-8">
          <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Order number</p>
              <p className="font-mono font-medium text-gray-900 dark:text-gray-100">
                {session?.id?.slice(-8).toUpperCase() || 'XXXXXXXX'}
              </p>
            </div>
            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium rounded-full">
              Confirmed
            </span>
          </div>

          {/* Items */}
          <div className="py-4 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Items ordered</p>
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={`${item.productId}-${item.variantId || ''}`} className="flex items-center gap-3">
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-12 h-12 rounded-lg object-cover bg-gray-100 dark:bg-gray-700"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    ${(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="pt-4">
            <div className="flex justify-between text-lg font-semibold">
              <span className="text-gray-900 dark:text-gray-100">Total</span>
              <span className="text-gray-900 dark:text-gray-100">${cartTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-left mb-8">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">What&apos;s next?</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-[var(--primary-color)]/10 rounded-full flex items-center justify-center flex-shrink-0">
                <EnvelopeIcon className="h-4 w-4 text-[var(--primary-color)]" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">Confirmation email sent</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  We&apos;ve sent a confirmation to {customerInfo?.email || 'your email'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-[var(--primary-color)]/10 rounded-full flex items-center justify-center flex-shrink-0">
                <TruckIcon className="h-4 w-4 text-[var(--primary-color)]" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">Shipping updates</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  You&apos;ll receive tracking information once your order ships
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {funnel.settings.urls.successUrl ? (
            <a
              href={funnel.settings.urls.successUrl}
              className="px-6 py-3 bg-[var(--primary-color)] text-white font-medium rounded-xl hover:opacity-90"
            >
              Continue Shopping
            </a>
          ) : (
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-[var(--primary-color)] text-white font-medium rounded-xl hover:opacity-90"
            >
              Continue Shopping
            </button>
          )}
        </div>

        {/* Support Link */}
        <p className="mt-8 text-sm text-gray-500 dark:text-gray-400">
          Need help?{' '}
          <a href="#" className="text-[var(--primary-color)] hover:underline">
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}
