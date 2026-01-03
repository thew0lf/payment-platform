'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLandingPage } from '@/contexts/landing-page-context';

// ============================================================================
// Types
// ============================================================================

export interface PostPurchaseProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  imageUrl?: string;
  description?: string;
  /** Limited time offer message */
  urgencyMessage?: string;
}

export interface PostPurchaseUpsellProps {
  /** Product to offer as upsell */
  product: PostPurchaseProduct;
  /** Order ID this upsell is for */
  orderId: string;
  /** Discount percentage for one-click add (optional) */
  discountPercent?: number;
  /** Time limit for the offer in seconds (optional) */
  offerTimeLimit?: number;
  /** Title for the upsell */
  title?: string;
  /** Subtitle/description */
  subtitle?: string;
  /** CTA button text */
  ctaText?: string;
  /** Decline button text */
  declineText?: string;
  /** Callback when accepted */
  onAccept?: (product: PostPurchaseProduct) => Promise<void>;
  /** Callback when declined */
  onDecline?: () => void;
  /** Callback when timer expires */
  onTimerExpire?: () => void;
  /** Currency symbol (default: $) */
  currencySymbol?: string;
  /** Optional className */
  className?: string;
}

// ============================================================================
// Post Purchase Upsell Component
// ============================================================================

/**
 * PostPurchaseUpsell - Thank you page one-click upsell
 *
 * Features:
 * - One-click purchase (uses existing payment method)
 * - Optional countdown timer for urgency
 * - Discount display
 * - Smooth animations
 * - Analytics tracking
 */
export function PostPurchaseUpsell({
  product,
  orderId,
  discountPercent,
  offerTimeLimit,
  title = 'Wait! Special One-Time Offer',
  subtitle = 'Add this to your order now and save',
  ctaText = 'Yes, Add to My Order!',
  declineText = 'No thanks, I\'ll pass',
  onAccept,
  onDecline,
  onTimerExpire,
  currencySymbol = '$',
  className = '',
}: PostPurchaseUpsellProps) {
  const { trackEvent } = useLandingPage();
  const [isLoading, setIsLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(offerTimeLimit || 0);
  const [isExpired, setIsExpired] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasTrackedImpressionRef = useRef(false);

  // Calculate prices
  const finalPrice = discountPercent
    ? product.price * (1 - discountPercent / 100)
    : product.price;
  const savings = discountPercent
    ? product.price * (discountPercent / 100)
    : product.originalPrice
      ? product.originalPrice - product.price
      : 0;

  // Track impression on mount
  useEffect(() => {
    if (!hasTrackedImpressionRef.current) {
      hasTrackedImpressionRef.current = true;
      trackEvent('POST_PURCHASE_UPSELL_SHOWN', {
        productId: product.id,
        productName: product.name,
        orderId,
        discountPercent,
        offerTimeLimit,
      });
    }
  }, [product, orderId, discountPercent, offerTimeLimit, trackEvent]);

  // Countdown timer
  useEffect(() => {
    if (!offerTimeLimit || isExpired || isDismissed) return;

    setTimeRemaining(offerTimeLimit);

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsExpired(true);
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          trackEvent('POST_PURCHASE_UPSELL_EXPIRED', {
            productId: product.id,
            orderId,
          });
          onTimerExpire?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [offerTimeLimit, isExpired, isDismissed, product.id, orderId, onTimerExpire, trackEvent]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPrice = (price: number): string => {
    return `${currencySymbol}${price.toFixed(2)}`;
  };

  const handleAccept = async () => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      trackEvent('POST_PURCHASE_UPSELL_ACCEPTED', {
        productId: product.id,
        productName: product.name,
        orderId,
        finalPrice,
        savings,
        timeRemaining,
      });

      await onAccept?.(product);
      setIsDismissed(true);
    } catch (error) {
      console.error('Failed to process upsell:', error);
      trackEvent('POST_PURCHASE_UPSELL_ERROR', {
        productId: product.id,
        orderId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = () => {
    trackEvent('POST_PURCHASE_UPSELL_DECLINED', {
      productId: product.id,
      orderId,
      timeRemaining,
    });
    setIsDismissed(true);
    onDecline?.();
  };

  // Don't render if dismissed or expired
  if (isDismissed || isExpired) {
    return null;
  }

  return (
    <section
      className={`bg-gradient-to-br from-primary-50 to-white rounded-2xl p-6 md:p-8
                  border border-primary-100 shadow-lg ${className}`}
      aria-labelledby="post-purchase-upsell-heading"
    >
      {/* Timer */}
      {offerTimeLimit && timeRemaining > 0 && (
        <div className="text-center mb-4">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-medium">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                clipRule="evenodd"
              />
            </svg>
            <span>Offer expires in {formatTime(timeRemaining)}</span>
          </span>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-6">
        <h2
          id="post-purchase-upsell-heading"
          className="text-xl md:text-2xl font-bold text-gray-900 mb-2"
        >
          {title}
        </h2>
        <p className="text-gray-600">{subtitle}</p>
      </div>

      {/* Product Card */}
      <div className="flex flex-col md:flex-row gap-6 items-center bg-white rounded-xl p-4 md:p-6 shadow-sm mb-6">
        {/* Image */}
        {product.imageUrl ? (
          <div className="flex-shrink-0 w-32 h-32 md:w-40 md:h-40 rounded-lg overflow-hidden bg-gray-100">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="flex-shrink-0 w-32 h-32 md:w-40 md:h-40 rounded-lg bg-gray-200 flex items-center justify-center">
            <svg
              className="w-12 h-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {/* Info */}
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{product.name}</h3>
          {product.description && (
            <p className="text-gray-600 text-sm mb-3">{product.description}</p>
          )}

          {/* Pricing */}
          <div className="flex items-center justify-center md:justify-start gap-3">
            <span className="text-2xl font-bold text-primary-600">
              {formatPrice(finalPrice)}
            </span>
            {(discountPercent || product.originalPrice) && (
              <span className="text-lg text-gray-400 line-through">
                {formatPrice(discountPercent ? product.price : product.originalPrice!)}
              </span>
            )}
            {savings > 0 && (
              <span className="px-2 py-1 bg-green-100 text-green-700 text-sm font-medium rounded">
                Save {formatPrice(savings)}
              </span>
            )}
          </div>

          {/* Urgency message */}
          {product.urgencyMessage && (
            <p className="mt-2 text-sm text-orange-600 font-medium">{product.urgencyMessage}</p>
          )}
        </div>
      </div>

      {/* CTAs */}
      <div className="flex flex-col gap-3">
        <button
          onClick={handleAccept}
          disabled={isLoading}
          className="w-full py-4 px-6 bg-primary-600 hover:bg-primary-700 text-white
                     font-semibold text-lg rounded-xl transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed
                     min-h-[56px] touch-manipulation active:scale-[0.98]
                     flex items-center justify-center gap-2"
          aria-busy={isLoading}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Adding to order...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{ctaText}</span>
            </>
          )}
        </button>

        <button
          onClick={handleDecline}
          disabled={isLoading}
          className="w-full py-3 px-6 text-gray-500 hover:text-gray-700
                     font-medium text-sm transition-colors
                     min-h-[44px] touch-manipulation"
        >
          {declineText}
        </button>
      </div>

      {/* Trust indicators */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clipRule="evenodd"
            />
          </svg>
          Secure checkout
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"
              clipRule="evenodd"
            />
          </svg>
          Same payment method
        </span>
      </div>
    </section>
  );
}

export default PostPurchaseUpsell;
