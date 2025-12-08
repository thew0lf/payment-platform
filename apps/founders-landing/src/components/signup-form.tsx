'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, ArrowRight, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { cn, validateEmail, validatePhone } from '@/lib/utils';
import { LegalModal } from '@/components/legal-modal';
import type { SignupResponse } from '@/types';

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const referralCode = searchParams.get('ref');

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; phone?: string }>({});
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate
    const newErrors: { email?: string; phone?: string } = {};
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (phone && !validatePhone(phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          phone: phone || undefined,
          referralCode: referralCode || undefined,
          metadata: {
            utm_source: searchParams.get('utm_source'),
            utm_medium: searchParams.get('utm_medium'),
            utm_campaign: searchParams.get('utm_campaign'),
          },
        }),
      });

      const data: SignupResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Something went wrong');
      }

      // Success - redirect to success page
      router.push(`/success/${data.founder.founderNumber}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to sign up');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {referralCode && (
        <div className="flex items-center gap-2 px-4 py-2 bg-brand-500/10 border border-brand-500/20 rounded-lg text-sm text-brand-600 dark:text-brand-400">
          <Sparkles className="w-4 h-4" />
          <span>Referred by founder {referralCode}</span>
        </div>
      )}

      <div>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          className={cn(
            'w-full px-4 py-3 rounded-lg border bg-white dark:bg-zinc-900 transition-colors',
            'focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
            errors.email
              ? 'border-red-500'
              : 'border-zinc-300 dark:border-zinc-700'
          )}
          disabled={isLoading}
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-500">{errors.email}</p>
        )}
      </div>

      <div>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone number (optional)"
          className={cn(
            'w-full px-4 py-3 rounded-lg border bg-white dark:bg-zinc-900 transition-colors',
            'focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
            errors.phone
              ? 'border-red-500'
              : 'border-zinc-300 dark:border-zinc-700'
          )}
          disabled={isLoading}
        />
        {errors.phone && (
          <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className={cn(
          'w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-white transition-all',
          'bg-gradient-to-r from-brand-600 to-blue-600 hover:from-brand-500 hover:to-blue-500',
          'focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'glow'
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Claiming your number...</span>
          </>
        ) : (
          <>
            <span>Claim Your Founder Number</span>
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </button>

      <p className="text-xs text-center text-zinc-500 dark:text-zinc-400">
        By signing up, you agree to our{' '}
        <button
          type="button"
          onClick={() => setLegalModal('terms')}
          className="underline hover:text-brand-600 transition-colors"
        >
          Terms
        </button>{' '}
        and{' '}
        <button
          type="button"
          onClick={() => setLegalModal('privacy')}
          className="underline hover:text-brand-600 transition-colors"
        >
          Privacy Policy
        </button>
      </p>

      <LegalModal
        isOpen={legalModal !== null}
        onClose={() => setLegalModal(null)}
        type={legalModal || 'terms'}
      />
    </form>
  );
}
