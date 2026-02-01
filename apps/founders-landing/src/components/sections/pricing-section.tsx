'use client';

import { Suspense } from 'react';
import { SignupForm } from '@/components/signup-form';

const features = [
  { name: 'Full Platform Access', included: true, note: 'All four pillars: Convert, Collect, Care, Grow' },
  { name: 'CS AI (Voice + Chat)', included: true, note: 'Tiered escalation, trained on your brand' },
  { name: 'Smart Payment Routing', included: true, note: 'Multi-gateway with automatic failover' },
  { name: 'Funnel Builder', included: true, note: 'A/B testing, exit intent, progressive capture' },
  { name: 'Partner Momentum (Affiliate)', included: true, note: 'Early access when it launches' },
  { name: 'Analytics Dashboard', included: true, note: 'LTV, CAC, cohort analysis, attribution' },
  { name: 'Priority Support', included: true, note: 'Direct Slack channel with founding team' },
  { name: 'Feature Request Priority', included: true, note: 'Your feedback shapes the roadmap' },
  { name: 'Locked-In Rate Forever', included: true, note: 'Price never increases while subscribed' },
  { name: 'Migration Assistance', included: true, note: 'White-glove onboarding support' },
];

const bonuses = [
  { name: '1-on-1 Strategy Call', value: '$500', description: 'Personal session with a revenue optimization expert' },
  { name: 'Custom Integration Support', value: '$1,000', description: 'Help connecting your existing tools' },
  { name: 'Early Access: Partner Momentum', value: 'Priceless', description: 'Be first in line for our affiliate program' },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-20 md:py-28 px-4 md:px-6 bg-zinc-900 dark:bg-zinc-950">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1 mb-4 text-sm font-medium text-yellow-400 bg-yellow-900/30 rounded-full">
            FOUNDING MEMBER PRICING
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            Try Free for 30 Days. Then Lock In Your Rate.
          </h2>
          <p className="text-lg text-zinc-400">
            No credit card required. No hidden fees. Cancel anytime.
          </p>
        </div>

        {/* Pricing Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-purple-900/50 to-zinc-900 border border-purple-500/30 p-8 md:p-12">
          {/* Badge */}
          <div className="absolute top-4 right-4">
            <span className="px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-green-500 to-emerald-500 rounded-full">
              30 DAYS FREE
            </span>
          </div>

          {/* Price */}
          <div className="text-center mb-8">
            <div className="mb-4">
              <span className="text-5xl md:text-6xl font-bold text-white">$0</span>
              <span className="text-zinc-400 text-xl ml-2">for 30 days</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-zinc-400">
              <span>then</span>
              <span className="text-2xl text-zinc-500 line-through">$497/mo</span>
              <span className="text-3xl font-bold text-white">$297/mo</span>
            </div>
            <p className="mt-4 text-purple-400 font-semibold">
              Founders rate locked in forever while you remain a subscriber
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4 mb-8">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <span className="text-green-400 mt-0.5">✓</span>
                <div>
                  <span className="text-white font-medium">{feature.name}</span>
                  {feature.note && (
                    <span className="text-zinc-500 text-sm ml-2">— {feature.note}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Signup Form */}
          <div id="signup" className="max-w-md mx-auto">
            <Suspense fallback={<div className="animate-pulse h-48 bg-zinc-800 rounded-lg" />}>
              <SignupForm />
            </Suspense>
          </div>

          {/* Guarantee */}
          <p className="mt-6 text-center text-zinc-400 text-sm">
            🛡️ Start free today. No credit card required. Cancel anytime.
          </p>
        </div>

        {/* Bonus Stack */}
        <div className="mt-12">
          <h3 className="text-center text-xl font-bold text-white mb-6">
            Founding Member Bonuses
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            {bonuses.map((bonus, index) => (
              <div
                key={index}
                className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700"
              >
                <p className="text-purple-400 font-bold text-sm mb-1">
                  {bonus.value} VALUE
                </p>
                <p className="text-white font-semibold mb-1">{bonus.name}</p>
                <p className="text-zinc-500 text-sm">{bonus.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Urgency */}
        <div className="mt-12 p-6 rounded-xl bg-purple-900/20 border border-purple-700/30 text-center">
          <p className="text-purple-400 font-semibold text-lg">
            ⏳ Limited Founding Member spots available
          </p>
          <p className="text-zinc-400 mt-2">
            Lock in your founders rate before it&apos;s too late. Price goes to $497/mo after founding period.
          </p>
        </div>
      </div>
    </section>
  );
}
