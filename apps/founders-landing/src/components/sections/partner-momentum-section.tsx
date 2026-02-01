'use client';

import Link from 'next/link';

export function PartnerMomentumSection() {
  return (
    <section className="py-20 md:py-28 px-4 md:px-6 bg-gradient-to-r from-purple-900 via-purple-800 to-pink-900">
      <div className="max-w-6xl mx-auto">
        <div className="text-center">
          {/* Badge */}
          <span className="inline-block px-4 py-2 mb-6 text-sm font-bold text-white bg-white/20 backdrop-blur-sm rounded-full border border-white/30">
            COMING SOON — FOUNDING MEMBERS GET EARLY ACCESS
          </span>

          {/* Title */}
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            Partner Momentum
          </h2>
          <p className="text-2xl text-purple-200 font-semibold mb-8">
            Track Smarter. Earn Faster.
          </p>

          {/* Description */}
          <div className="max-w-3xl mx-auto text-left space-y-6 text-lg text-purple-100">
            <p>
              Your customers love your brand. Some of them would happily tell their
              friends—if you made it worth their while.
            </p>
            <p>
              Partner Momentum is AVNZ&apos;s built-in affiliate program that turns
              satisfied customers into your sales team:
            </p>

            {/* Features */}
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-pink-400">→</span>
                <span>One-click affiliate signup embedded in your post-purchase flow</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-pink-400">→</span>
                <span>Real-time tracking that actually works (no &quot;trust us&quot; spreadsheets)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-pink-400">→</span>
                <span>Automated payouts so you&apos;re not chasing PayPal requests</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-pink-400">→</span>
                <span>Tiered rewards that incentivize your best partners to do more</span>
              </li>
            </ul>

            <p className="font-semibold text-white">
              As a Founding Member, you&apos;ll be first in line when Partner Momentum
              launches—with zero additional setup.
            </p>

            <p className="text-purple-200">
              Your customers are already talking about you. Let&apos;s make sure they
              get paid for it.
            </p>
          </div>

          {/* CTA */}
          <Link
            href="#pricing"
            className="inline-flex items-center justify-center mt-10 px-8 py-4 text-lg font-semibold text-white rounded-full cta-gradient shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105 transition-all duration-300"
          >
            Claim My Founder Spot & Get Early Access
            <svg className="ml-2 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
