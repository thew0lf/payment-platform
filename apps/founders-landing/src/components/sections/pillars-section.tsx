'use client';

import { useState } from 'react';

const pillars = [
  {
    id: 'convert',
    icon: '🎯',
    name: 'CONVERT',
    title: 'Turn Browsers Into Buyers',
    color: 'blue',
    gradient: 'from-blue-500 to-blue-700',
    bgClass: 'bg-blue-500/10 dark:bg-blue-500/20',
    borderClass: 'border-blue-500/30',
    textClass: 'text-blue-600 dark:text-blue-400',
    description: "Your funnel is leaking. Visitors land, look around, and leave. AVNZ's conversion engine turns casual browsers into committed customers with intelligent funnels, real-time interventions, and checkout experiences that actually close.",
    features: [
      { name: 'Smart Sales Funnels', desc: 'Drag-and-drop builder with A/B testing built in. Know exactly which version converts—no more guessing.' },
      { name: 'Exit Intent Interventions', desc: 'Catch abandoning visitors with perfectly-timed offers. Urgency timers, discount pop-ups, and social proof that actually works.' },
      { name: 'Lightning Checkout', desc: 'One-page checkout that loads fast, remembers customers, and supports every payment method your customers want.' },
      { name: 'Progressive Lead Capture', desc: "Collect emails before they bounce. Build relationships even when they don't buy today." },
    ],
    impact: 'Brands using AVNZ Convert see 15-30% improvement in checkout completion rates.',
  },
  {
    id: 'collect',
    icon: '💳',
    name: 'COLLECT',
    title: "Capture Every Dollar You've Earned",
    color: 'green',
    gradient: 'from-green-500 to-green-700',
    bgClass: 'bg-green-500/10 dark:bg-green-500/20',
    borderClass: 'border-green-500/30',
    textClass: 'text-green-600 dark:text-green-400',
    description: "Failed payments aren't just annoying—they're expensive. AVNZ's collection engine ensures you get paid, with intelligent routing, automatic retries, and recovery flows that rescue revenue you'd otherwise lose forever.",
    features: [
      { name: 'Multi-Gateway Intelligence', desc: 'Route transactions to the gateway most likely to approve. Automatic failover means no single point of failure.' },
      { name: 'Smart Retry Logic', desc: "Failed charge? We'll retry at the optimal time with the optimal method. Most \"declined\" cards actually go through on attempt #2 or #3." },
      { name: 'Dunning Management', desc: 'Automated sequences that recover failed subscription payments without annoying your customers or making you look desperate.' },
      { name: 'Payment Analytics', desc: 'See exactly why transactions fail, which gateways perform best, and where your payment stack has room to improve.' },
    ],
    impact: 'AVNZ Collect recovers an average of 23% of initially-failed transactions.',
  },
  {
    id: 'care',
    icon: '💬',
    name: 'CARE',
    title: 'Support That Scales (Without Scaling Your Team)',
    color: 'purple',
    gradient: 'from-purple-500 to-purple-700',
    bgClass: 'bg-purple-500/10 dark:bg-purple-500/20',
    borderClass: 'border-purple-500/30',
    textClass: 'text-purple-600 dark:text-purple-400',
    description: "Great customer service shouldn't require an army. AVNZ's AI-powered support handles the repetitive questions instantly, escalates the complex ones intelligently, and keeps your customers happy without burning out your team.",
    features: [
      { name: 'AI Customer Service Rep', desc: 'Trained on your products, policies, and brand voice. Handles "Where\'s my order?" and "How do I return this?" 24/7, instantly.' },
      { name: 'Voice AI Support', desc: "Customers can call and get real answers—not a phone tree. Our voice AI sounds human because it understands context." },
      { name: 'Smart Escalation', desc: 'AI knows when to hand off to a human. Seamless transfers with full context, so customers never repeat themselves.' },
      { name: 'Proactive Outreach', desc: 'Identify at-risk customers before they complain. Turn potential refund requests into loyalty moments.' },
    ],
    impact: 'AVNZ Care resolves 70% of support tickets without human intervention.',
  },
  {
    id: 'grow',
    icon: '📈',
    name: 'GROW',
    title: 'Turn Customers Into Revenue Engines',
    color: 'orange',
    gradient: 'from-orange-500 to-orange-700',
    bgClass: 'bg-orange-500/10 dark:bg-orange-500/20',
    borderClass: 'border-orange-500/30',
    textClass: 'text-orange-600 dark:text-orange-400',
    description: "Acquiring customers is expensive. Keeping them is profitable. AVNZ's growth engine maximizes lifetime value with intelligent subscriptions, perfectly-timed upsells, and a partner program that turns customers into advocates.",
    features: [
      { name: 'Subscription Intelligence', desc: 'Predict churn before it happens. Trigger save flows at the right moment. Turn cancellation pages into retention opportunities.' },
      { name: 'Smart Upsells & Cross-sells', desc: 'AI-powered recommendations based on purchase history, browsing behavior, and what actually converts—not generic "you might also like."' },
      { name: 'Partner Momentum (Affiliate Program)', desc: 'Built-in affiliate management. Track referrals, automate payouts, and turn your best customers into your best salespeople.' },
      { name: 'Revenue Analytics', desc: 'See LTV, CAC, and cohort analysis without a data science degree. Know exactly which customers are profitable and why.' },
    ],
    impact: 'Brands using AVNZ Grow see average LTV increase of 35% within 6 months.',
  },
];

export function PillarsSection() {
  const [activePillar, setActivePillar] = useState('convert');
  const active = pillars.find((p) => p.id === activePillar) || pillars[0];

  return (
    <section id="how-it-works" className="py-20 md:py-28 px-4 md:px-6 bg-white dark:bg-zinc-950">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1 mb-4 text-sm font-medium text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 rounded-full">
            THE SOLUTION
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-zinc-900 dark:text-white mb-6">
            Four Pillars. One Platform.
            <br />
            <span className="gradient-text">Every Revenue Moment Covered.</span>
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-3xl mx-auto">
            AVNZ isn&apos;t a collection of features—it&apos;s a complete revenue system.
            Each pillar handles a critical stage of the customer journey, working
            together to convert more, collect more, care better, and grow faster.
          </p>
          <p className="mt-4 text-xl font-semibold text-zinc-900 dark:text-white">
            Here&apos;s the plan:
          </p>
        </div>

        {/* Pillar tabs */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {pillars.map((pillar) => (
            <button
              key={pillar.id}
              onClick={() => setActivePillar(pillar.id)}
              className={`px-6 py-3 rounded-full font-semibold text-sm transition-all duration-300 ${
                activePillar === pillar.id
                  ? `bg-gradient-to-r ${pillar.gradient} text-white shadow-lg`
                  : `${pillar.bgClass} ${pillar.textClass} hover:opacity-80`
              }`}
            >
              <span className="mr-2">{pillar.icon}</span>
              {pillar.name}
            </button>
          ))}
        </div>

        {/* Active pillar content */}
        <div className={`p-8 md:p-12 rounded-3xl ${active.bgClass} border ${active.borderClass}`}>
          <div className="flex items-center gap-4 mb-6">
            <span className="text-5xl">{active.icon}</span>
            <div>
              <span className={`text-sm font-bold ${active.textClass}`}>{active.name}</span>
              <h3 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white">
                {active.title}
              </h3>
            </div>
          </div>

          <p className="text-lg text-zinc-600 dark:text-zinc-300 mb-8 max-w-3xl">
            {active.description}
          </p>

          {/* Features grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {active.features.map((feature, index) => (
              <div key={index} className="flex gap-4">
                <div className={`flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-r ${active.gradient} flex items-center justify-center mt-1`}>
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-zinc-900 dark:text-white mb-1">
                    {feature.name}
                  </h4>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {feature.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Impact statement */}
          <div className={`p-4 rounded-xl bg-gradient-to-r ${active.gradient} text-white`}>
            <p className="font-semibold text-center">
              {active.impact}
            </p>
          </div>
        </div>

        {/* Summary */}
        <p className="mt-12 text-center text-lg text-zinc-600 dark:text-zinc-400 max-w-3xl mx-auto">
          That&apos;s the AVNZ system: Convert visitors into customers. Collect every
          dollar they spend. Care for them like they matter (because they do).
          Grow their value over their entire lifetime.
        </p>
        <p className="mt-4 text-center text-xl font-bold text-zinc-900 dark:text-white">
          Four pillars. One platform.{' '}
          <span className="gradient-text">Revenue happens here.</span>
        </p>
      </div>
    </section>
  );
}
