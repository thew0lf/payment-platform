'use client';

import { Shield, RefreshCw, Headphones, CreditCard, Lock, CheckCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type TrustSignalType =
  | 'secure'
  | 'returns'
  | 'support'
  | 'payment'
  | 'guarantee'
  | 'verified';

interface TrustSignal {
  type: TrustSignalType;
  text?: string;
}

interface TrustSignalsProps {
  signals?: TrustSignal[];
  layout?: 'horizontal' | 'vertical' | 'grid';
  showIcons?: boolean;
  className?: string;
}

const DEFAULT_SIGNALS: TrustSignal[] = [
  { type: 'secure', text: 'Secure checkout' },
  { type: 'returns', text: '30-day returns' },
  { type: 'support', text: '24/7 support' },
];

const SIGNAL_ICONS: Record<TrustSignalType, LucideIcon> = {
  secure: Lock,
  returns: RefreshCw,
  support: Headphones,
  payment: CreditCard,
  guarantee: Shield,
  verified: CheckCircle,
};

const SIGNAL_DEFAULTS: Record<TrustSignalType, string> = {
  secure: 'Secure checkout',
  returns: 'Easy returns',
  support: '24/7 support',
  payment: 'Multiple payment options',
  guarantee: 'Money-back guarantee',
  verified: 'Verified seller',
};

export function TrustSignals({
  signals = DEFAULT_SIGNALS,
  layout = 'horizontal',
  showIcons = true,
  className = '',
}: TrustSignalsProps) {
  const layoutClasses = {
    horizontal: 'flex items-center justify-center flex-wrap gap-x-4 gap-y-2',
    vertical: 'flex flex-col gap-2',
    grid: 'grid grid-cols-2 gap-2',
  };

  return (
    <div
      className={`${layoutClasses[layout]} text-xs text-gray-500 ${className}`}
      role="list"
      aria-label="Trust signals"
    >
      {signals.map((signal, index) => {
        const Icon = SIGNAL_ICONS[signal.type];
        const text = signal.text || SIGNAL_DEFAULTS[signal.type];

        return (
          <div
            key={`${signal.type}-${index}`}
            className="flex items-center gap-1.5"
            role="listitem"
          >
            {showIcons && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
            <span>{text}</span>
          </div>
        );
      })}
    </div>
  );
}

// Payment icons component
interface PaymentIconsProps {
  cards?: ('visa' | 'mastercard' | 'amex' | 'discover' | 'paypal' | 'applepay' | 'googlepay')[];
  className?: string;
}

export function PaymentIcons({
  cards = ['visa', 'mastercard', 'amex', 'paypal'],
  className = '',
}: PaymentIconsProps) {
  // Using text placeholders - in production, replace with actual card SVGs
  const cardLabels: Record<string, string> = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    amex: 'Amex',
    discover: 'Discover',
    paypal: 'PayPal',
    applepay: 'Apple Pay',
    googlepay: 'Google Pay',
  };

  return (
    <div
      className={`flex items-center gap-2 ${className}`}
      role="list"
      aria-label="Accepted payment methods"
    >
      {cards.map((card) => (
        <div
          key={card}
          className="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-600"
          role="listitem"
          aria-label={cardLabels[card]}
        >
          {cardLabels[card]}
        </div>
      ))}
    </div>
  );
}
