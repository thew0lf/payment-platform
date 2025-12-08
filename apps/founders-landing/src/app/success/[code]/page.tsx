'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trophy, Users, TrendingUp, Loader2 } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { ReferralShare } from '@/components/referral-share';
import { formatNumber, generateReferralLink } from '@/lib/utils';
import type { PositionResponse } from '@/types';

export default function SuccessPage() {
  const params = useParams();
  const founderNumber = params.code as string;

  const [data, setData] = useState<PositionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosition = async () => {
      try {
        const response = await fetch(`/api/position/${founderNumber}`);
        if (!response.ok) {
          throw new Error('Failed to fetch position');
        }
        const positionData: PositionResponse = await response.json();
        setData(positionData);
      } catch (err) {
        setError('Could not load your founder information');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosition();
  }, [founderNumber]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">
            {error || 'Something went wrong'}
          </h1>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-brand-600 hover:text-brand-500"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const referralLink = generateReferralLink(data.referralCode);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-bold text-xl text-zinc-900 dark:text-white">
              avnz<span className="text-brand-600">.io</span>
            </span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-32 pb-20 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-12 animate-fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-brand-500 to-blue-600 mb-6">
              <Trophy className="w-10 h-10 text-white" />
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
              Welcome, Founder{' '}
              <span className="gradient-text">{data.founderNumber}</span>
            </h1>

            <p className="text-xl text-zinc-600 dark:text-zinc-400">
              You&apos;re officially part of the avnz.io founding team!
            </p>
          </div>

          {/* Position Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl mb-8 animate-slide-up">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="flex items-center justify-center gap-2 text-zinc-500 dark:text-zinc-400 mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm">Your Position</span>
                </div>
                <div className="text-3xl font-bold text-zinc-900 dark:text-white">
                  #{formatNumber(data.currentPosition)}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-center gap-2 text-zinc-500 dark:text-zinc-400 mb-1">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">Total Founders</span>
                </div>
                <div className="text-3xl font-bold text-zinc-900 dark:text-white">
                  {formatNumber(data.totalFounders)}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-center gap-2 text-zinc-500 dark:text-zinc-400 mb-1">
                  <Trophy className="w-4 h-4" />
                  <span className="text-sm">Referrals</span>
                </div>
                <div className="text-3xl font-bold text-zinc-900 dark:text-white">
                  {data.referralCount}
                </div>
              </div>
            </div>
          </div>

          {/* Referral Section */}
          <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl animate-slide-up">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
              Share & Move Up
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              Invite friends and move up the waitlist. Each referral = +10 positions!
            </p>

            <ReferralShare
              referralCode={data.referralCode}
              referralLink={referralLink}
            />
          </div>

          {/* What's Next */}
          <div className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-brand-500/10 to-blue-500/10 border border-brand-500/20">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
              What&apos;s Next?
            </h3>
            <ul className="space-y-3 text-zinc-700 dark:text-zinc-300">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-500 text-white text-sm flex items-center justify-center">
                  1
                </span>
                <span>Check your email for a confirmation message</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-500 text-white text-sm flex items-center justify-center">
                  2
                </span>
                <span>Share your link to move up the waitlist</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-500 text-white text-sm flex items-center justify-center">
                  3
                </span>
                <span>We&apos;ll notify you when it&apos;s time to build together</span>
              </li>
            </ul>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-zinc-200 dark:border-zinc-800">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            &copy; {new Date().getFullYear()} avnz.io. All rights reserved.
          </span>
          <div className="flex items-center gap-6 text-sm text-zinc-600 dark:text-zinc-400">
            <a href="#" className="hover:text-brand-600 transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-brand-600 transition-colors">
              Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
