'use client';

interface AnchoringPriceProps {
  currentPrice: number;
  originalPrice?: number;
  currency?: string;
  locale?: string;
  showSavings?: boolean;
  showPercentage?: boolean;
  size?: 'small' | 'medium' | 'large';
  layout?: 'inline' | 'stacked';
}

function formatPrice(amount: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

function calculateSavings(
  original: number,
  current: number
): { amount: number; percentage: number } {
  const amount = original - current;
  const percentage = Math.round((amount / original) * 100);
  return { amount, percentage };
}

const SIZE_CLASSES = {
  small: {
    current: 'text-sm font-semibold',
    original: 'text-xs',
    savings: 'text-xs',
  },
  medium: {
    current: 'text-base font-semibold',
    original: 'text-sm',
    savings: 'text-sm',
  },
  large: {
    current: 'text-xl font-bold',
    original: 'text-base',
    savings: 'text-sm',
  },
};

export function AnchoringPrice({
  currentPrice,
  originalPrice,
  currency = 'USD',
  locale = 'en-US',
  showSavings = true,
  showPercentage = true,
  size = 'medium',
  layout = 'inline',
}: AnchoringPriceProps) {
  const hasDiscount = originalPrice && originalPrice > currentPrice;
  const savings = hasDiscount
    ? calculateSavings(originalPrice, currentPrice)
    : null;

  const sizeClasses = SIZE_CLASSES[size];
  const isStacked = layout === 'stacked';

  // No discount - just show current price
  if (!hasDiscount) {
    return (
      <span className={`text-gray-900 ${sizeClasses.current}`}>
        {formatPrice(currentPrice, currency, locale)}
      </span>
    );
  }

  return (
    <div
      className={`${isStacked ? 'flex flex-col gap-0.5' : 'flex items-center gap-2 flex-wrap'}`}
      aria-label={`Price: ${formatPrice(currentPrice, currency, locale)}, was ${formatPrice(originalPrice, currency, locale)}`}
    >
      {/* Current price */}
      <span className={`text-gray-900 ${sizeClasses.current}`}>
        {formatPrice(currentPrice, currency, locale)}
      </span>

      {/* Original price (strikethrough) */}
      <span
        className={`text-gray-500 line-through ${sizeClasses.original}`}
        aria-label={`Original price: ${formatPrice(originalPrice, currency, locale)}`}
      >
        {formatPrice(originalPrice, currency, locale)}
      </span>

      {/* Savings badge */}
      {showSavings && savings && (
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded bg-green-100 text-green-800 font-medium ${sizeClasses.savings}`}
          aria-label={`You save ${formatPrice(savings.amount, currency, locale)}`}
        >
          {showPercentage ? (
            <>Save {savings.percentage}%</>
          ) : (
            <>Save {formatPrice(savings.amount, currency, locale)}</>
          )}
        </span>
      )}
    </div>
  );
}

// Per-unit price display for bulk purchases
interface PerUnitPriceProps {
  totalPrice: number;
  quantity: number;
  originalUnitPrice?: number;
  currency?: string;
  locale?: string;
}

export function PerUnitPrice({
  totalPrice,
  quantity,
  originalUnitPrice,
  currency = 'USD',
  locale = 'en-US',
}: PerUnitPriceProps) {
  if (quantity <= 1) return null;

  const currentUnitPrice = totalPrice / quantity;
  const hasDiscount = originalUnitPrice && originalUnitPrice > currentUnitPrice;

  return (
    <div className="text-xs text-gray-500">
      <span>{formatPrice(currentUnitPrice, currency, locale)} each</span>
      {hasDiscount && originalUnitPrice && (
        <span className="ml-1">
          <span className="line-through">{formatPrice(originalUnitPrice, currency, locale)}</span>
        </span>
      )}
    </div>
  );
}
