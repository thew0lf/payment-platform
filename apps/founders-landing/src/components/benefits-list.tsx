'use client';

import { Check } from 'lucide-react';

const benefits = [
  'Early access to all platform features',
  'Direct input on product roadmap',
  'Lifetime founder pricing locked in',
  'Priority support channel',
  'Exclusive founder community access',
  'First look at new integrations',
];

export function BenefitsList() {
  return (
    <div className="space-y-3">
      {benefits.map((benefit) => (
        <div key={benefit} className="flex items-start gap-3">
          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-500/20 flex items-center justify-center mt-0.5">
            <Check className="w-3 h-3 text-brand-600 dark:text-brand-400" />
          </div>
          <span className="text-zinc-700 dark:text-zinc-300">{benefit}</span>
        </div>
      ))}
    </div>
  );
}
