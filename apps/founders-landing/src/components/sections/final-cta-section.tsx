'use client';

import Link from 'next/link';

export function FinalCTASection() {
  return (
    <section className="py-20 md:py-28 px-4 md:px-6 bg-gradient-to-r from-purple-900 via-purple-800 to-blue-900">
      <div className="max-w-4xl mx-auto text-center">
        {/* Emotional Hook */}
        <p className="text-xl md:text-2xl text-purple-200 mb-6">
          You didn&apos;t start this business to spend your days fighting
          Frankenstein tech stacks and watching revenue slip away.
        </p>

        {/* Headline */}
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-8">
          You started it to build something{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-pink-300">
            amazing
          </span>
          .
        </h2>

        {/* Body */}
        <p className="text-lg text-purple-100 mb-8 max-w-2xl mx-auto">
          AVNZ is the platform that lets you do exactly that—while we handle
          the revenue operations that keep you up at night.
        </p>

        {/* Value Restatement */}
        <div className="grid md:grid-cols-4 gap-4 mb-12">
          <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm">
            <span className="text-2xl">🎯</span>
            <p className="text-white font-semibold mt-2">Convert</p>
            <p className="text-purple-200 text-sm">More buyers</p>
          </div>
          <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm">
            <span className="text-2xl">💳</span>
            <p className="text-white font-semibold mt-2">Collect</p>
            <p className="text-purple-200 text-sm">Every dollar</p>
          </div>
          <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm">
            <span className="text-2xl">💬</span>
            <p className="text-white font-semibold mt-2">Care</p>
            <p className="text-purple-200 text-sm">At scale</p>
          </div>
          <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm">
            <span className="text-2xl">📈</span>
            <p className="text-white font-semibold mt-2">Grow</p>
            <p className="text-purple-200 text-sm">Lifetime value</p>
          </div>
        </div>

        {/* CTA */}
        <Link
          href="#signup"
          className="inline-flex items-center justify-center px-10 py-5 text-xl font-semibold text-white rounded-full cta-gradient shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105 transition-all duration-300"
        >
          Start Free for 30 Days
          <svg
            className="ml-3 w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 8l4 4m0 0l-4 4m4-4H3"
            />
          </svg>
        </Link>

        {/* Subtext */}
        <p className="mt-6 text-purple-300">
          Free for 30 days • Then $297/mo (normally $497) • Locked in forever
        </p>

        {/* Final Line */}
        <p className="mt-12 text-2xl font-bold text-white">
          Your customers are waiting. Your revenue is waiting.
          <br />
          <span className="gradient-text">Let&apos;s stop leaving money on the table.</span>
        </p>
      </div>
    </section>
  );
}
