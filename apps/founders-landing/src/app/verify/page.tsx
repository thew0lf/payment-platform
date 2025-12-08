'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Suspense } from 'react';

function VerifyContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get('success') === 'true';
  const error = searchParams.get('error');
  const founderNumber = searchParams.get('founder');

  const getErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case 'missing_token':
        return 'No verification token provided.';
      case 'Invalid verification link':
        return 'This verification link is invalid or has already been used.';
      case 'This link has already been used':
        return 'This verification link has already been used.';
      case 'This link has expired':
        return 'This verification link has expired. Please request a new one.';
      case 'server_error':
        return 'Something went wrong. Please try again later.';
      default:
        return errorCode || 'Verification failed.';
    }
  };

  return (
    <main className="pt-32 pb-20 px-4">
      <div className="max-w-md mx-auto">
        <div className="p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl text-center">
          {success ? (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
                Email Verified!
              </h1>
              {founderNumber && (
                <p className="text-brand-600 font-semibold mb-4">
                  Founder {founderNumber}
                </p>
              )}
              <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                Your email has been successfully verified. You&apos;re all set to receive updates about avnz.io!
              </p>
              <Link
                href="/"
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold transition-colors"
              >
                Back to Home
              </Link>
            </>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                {error === 'This link has expired' ? (
                  <AlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                )}
              </div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
                Verification Failed
              </h1>
              <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                {getErrorMessage(error)}
              </p>
              <div className="flex flex-col gap-3">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold transition-colors"
                >
                  Back to Home
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Contact Support
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function VerifyPage() {
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

      <Suspense fallback={
        <main className="pt-32 pb-20 px-4">
          <div className="max-w-md mx-auto text-center">
            <div className="animate-pulse">Verifying...</div>
          </div>
        </main>
      }>
        <VerifyContent />
      </Suspense>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-zinc-200 dark:border-zinc-800">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            &copy; {new Date().getFullYear()} avnz.io. All rights reserved.
          </span>
          <div className="flex items-center gap-6 text-sm text-zinc-600 dark:text-zinc-400">
            <Link href="/privacy" className="hover:text-brand-600 transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-brand-600 transition-colors">
              Terms
            </Link>
            <Link href="/contact" className="hover:text-brand-600 transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
