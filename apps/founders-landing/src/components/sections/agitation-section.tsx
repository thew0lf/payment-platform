'use client';

import { useState, useEffect, useRef } from 'react';

const leakageItems = [
  { label: 'Failed Payments You Don\'t Retry', range: '3-5%' },
  { label: 'Customers Who Leave Without Buying', range: '4-8%' },
  { label: 'Support Tickets That Become Refund Requests', range: '2-4%' },
  { label: 'Subscribers Who Churn (and you never saw coming)', range: '5-8%' },
];

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  return `$${(amount / 1000).toFixed(0)}K`;
}

export function AgitationSection() {
  const [revenue, setRevenue] = useState(5000000);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const lowLoss = revenue * 0.15;
  const highLoss = revenue * 0.25;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-20 md:py-28 px-4 md:px-6 bg-zinc-900 dark:bg-zinc-950">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1 mb-4 text-sm font-medium text-orange-400 bg-orange-900/30 rounded-full">
            THE REAL COST
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
            While You&apos;re Reading This,
            <br />
            <span className="text-orange-400">You&apos;re Losing Money</span>
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Let&apos;s do some uncomfortable math.
          </p>
          <p className="mt-4 text-zinc-300">
            The average DTC brand at your stage loses{' '}
            <span className="font-bold text-red-400">15-25% of potential revenue</span> to:
          </p>
        </div>

        {/* Leakage breakdown */}
        <div className="max-w-2xl mx-auto mb-12 space-y-4">
          {leakageItems.map((item, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-4 rounded-lg bg-zinc-800/50 border border-zinc-700 transition-all duration-500 ${
                isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <span className="text-zinc-300">{item.label}</span>
              <span className="font-mono font-bold text-red-400">{item.range} of revenue</span>
            </div>
          ))}
          <div className="flex items-center justify-between p-4 rounded-lg bg-red-900/30 border border-red-700">
            <span className="font-semibold text-white">TOTAL REVENUE LEAKAGE</span>
            <span className="font-mono font-bold text-red-400">15-25% annually</span>
          </div>
        </div>

        {/* Calculator */}
        <div className="max-w-xl mx-auto p-8 rounded-2xl bg-zinc-800 border border-zinc-700">
          <h3 className="text-center text-white font-semibold mb-6">YOUR ANNUAL REVENUE</h3>
          <div className="flex items-center gap-4 mb-6">
            <span className="text-2xl text-zinc-400">$</span>
            <input
              type="range"
              min="1000000"
              max="50000000"
              step="500000"
              value={revenue}
              onChange={(e) => setRevenue(Number(e.target.value))}
              className="flex-1 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <span className="text-2xl font-bold text-white w-24 text-right">
              {formatCurrency(revenue)}
            </span>
          </div>

          {/* Results */}
          <div className="text-center p-6 rounded-xl bg-zinc-900 border border-zinc-700">
            <p className="text-zinc-400 mb-2">At {formatCurrency(revenue)}/year, you&apos;re losing:</p>
            <p className="text-3xl md:text-4xl font-bold text-red-400">
              {formatCurrency(lowLoss)} - {formatCurrency(highLoss)}
            </p>
            <p className="text-zinc-400 mt-2">annually</p>
          </div>

          <p className="mt-6 text-center text-zinc-400 text-sm">
            That&apos;s not a rounding error.{' '}
            <span className="text-white font-semibold">That&apos;s a business.</span>
          </p>
        </div>

        {/* Urgency copy */}
        <div className="mt-16 text-center max-w-3xl mx-auto">
          <p className="text-lg text-zinc-400 mb-6">
            Every day without a unified revenue system is another day your
            competitors—the ones who figured this out—pull further ahead.
          </p>
          <p className="text-zinc-300">
            They&apos;re not smarter than you.{' '}
            <span className="text-white font-semibold">
              They just stopped accepting &quot;good enough&quot; from their tech stack.
            </span>
          </p>
        </div>

        {/* Emotional close */}
        <div className="mt-12 p-8 rounded-2xl bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-700/30 max-w-3xl mx-auto text-center">
          <p className="text-xl text-white leading-relaxed">
            You built something incredible. A brand people love. Products that sell.
          </p>
          <p className="mt-4 text-lg text-zinc-300">
            You didn&apos;t do all that just to watch 20% of your hard-earned revenue
            leak out through gaps in your Frankenstein tech stack.
          </p>
          <p className="mt-6 text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            There&apos;s a better way.
          </p>
        </div>
      </div>
    </section>
  );
}
