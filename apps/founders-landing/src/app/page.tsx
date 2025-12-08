import { Suspense } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import { SignupForm } from '@/components/signup-form';
import { FeatureCards } from '@/components/feature-cards';
import { BenefitsList } from '@/components/benefits-list';
import { FounderCounter } from '@/components/founder-counter';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-bold text-xl text-zinc-900 dark:text-white">
              avnz<span className="text-brand-600">.io</span>
            </span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Hero Section */}
      <main className="pt-32 pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Copy */}
            <div className="space-y-6 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-sm text-brand-600 dark:text-brand-400">
                <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                <span>Now accepting founders</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-zinc-900 dark:text-white leading-tight">
                Let&apos;s Build Something{' '}
                <span className="gradient-text">Great Together</span>
              </h1>

              <p className="text-xl text-zinc-600 dark:text-zinc-400">
                Join{' '}
                <Suspense fallback={<span className="text-brand-600">...</span>}>
                  <FounderCounter />
                </Suspense>{' '}
                shaping the future of intelligent commerce with{' '}
                <span className="font-semibold text-zinc-900 dark:text-white">
                  Momentum Intelligence&trade;
                </span>
                <span className="block mt-2 text-sm text-brand-600 dark:text-brand-400">
                  Limited to 10,000 founding members
                </span>
              </p>

              <p className="text-lg text-zinc-500 dark:text-zinc-500 italic">
                &quot;You build it, we take it to market&quot;
              </p>

              {/* Mobile signup form */}
              <div className="lg:hidden">
                <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl">
                  <Suspense fallback={<div className="animate-pulse h-48 bg-zinc-100 dark:bg-zinc-800 rounded-lg" />}>
                    <SignupForm />
                  </Suspense>
                </div>
              </div>
            </div>

            {/* Right: Signup Form (desktop) */}
            <div className="hidden lg:block animate-slide-up">
              <div className="p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
                    Claim Your Founder Number
                  </h2>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Only <span className="font-semibold text-brand-600">9,168 spots</span> remaining
                  </p>
                </div>
                <Suspense fallback={<div className="animate-pulse h-48 bg-zinc-100 dark:bg-zinc-800 rounded-lg" />}>
                  <SignupForm />
                </Suspense>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="max-w-6xl mx-auto mt-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-4">
              What We&apos;re Building
            </h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              A complete platform for modern commerce, powered by AI
            </p>
          </div>
          <FeatureCards />
        </div>

        {/* Benefits Section */}
        <div className="max-w-6xl mx-auto mt-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-4">
                Founder Benefits
              </h2>
              <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-8">
                As a founder, you&apos;re not just an early user &mdash; you&apos;re a co-creator
                shaping the future of avnz.io
              </p>
              <BenefitsList />
            </div>
            <div className="p-8 rounded-2xl bg-gradient-to-br from-brand-500/10 to-blue-500/10 border border-brand-500/20">
              <div className="text-center">
                <div className="text-5xl md:text-6xl font-bold gradient-text font-mono">FND-0832</div>
                <p className="mt-4 text-zinc-600 dark:text-zinc-400">
                  Your unique founder identity
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-zinc-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-brand-500 to-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">A</span>
            </div>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              &copy; {new Date().getFullYear()} avnz.io. All rights reserved.
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-zinc-600 dark:text-zinc-400">
            <a href="/privacy" className="hover:text-brand-600 transition-colors">
              Privacy
            </a>
            <a href="/terms" className="hover:text-brand-600 transition-colors">
              Terms
            </a>
            <a href="/contact" className="hover:text-brand-600 transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
