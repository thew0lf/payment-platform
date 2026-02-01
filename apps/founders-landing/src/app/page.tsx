import { ThemeToggle } from '@/components/theme-toggle';
import {
  HeroSection,
  ProblemSection,
  AgitationSection,
  GuideSection,
  PillarsSection,
  PartnerMomentumSection,
  CSAISection,
  TransformationSection,
  SocialProofSection,
  PricingSection,
  FinalCTASection,
  FAQSection,
} from '@/components/sections';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-bold text-xl text-zinc-900 dark:text-white">
              avnz<span className="text-purple-600">.io</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="#pricing"
              className="hidden sm:inline-flex px-4 py-2 text-sm font-medium text-white rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 transition-opacity"
            >
              Become a Founder
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content - StoryBrand + PAS Structure */}
      <main>
        {/* 1. HERO - The Hook */}
        <HeroSection />

        {/* 2. PROBLEM - Identify the Pain */}
        <ProblemSection />

        {/* 3. AGITATION - Emotional Cost Calculator */}
        <AgitationSection />

        {/* 4. GUIDE - Credibility & Empathy */}
        <GuideSection />

        {/* 5. THE PLAN - Four Pillars Solution */}
        <PillarsSection />

        {/* 6. PARTNER MOMENTUM - Coming Soon Teaser */}
        <PartnerMomentumSection />

        {/* 7. CS AI - Feature Highlight */}
        <CSAISection />

        {/* 8. TRANSFORMATION - Before/After */}
        <TransformationSection />

        {/* 9. SOCIAL PROOF - Testimonials & Metrics */}
        <SocialProofSection />

        {/* 10. PRICING - The Offer */}
        <PricingSection />

        {/* 11. FINAL CTA - Emotional Close */}
        <FinalCTASection />

        {/* 12. FAQ - Objection Handling */}
        <FAQSection />
      </main>

      {/* Footer */}
      <footer className="py-12 px-4 bg-zinc-900 dark:bg-black border-t border-zinc-800">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">A</span>
                </div>
                <span className="font-bold text-xl text-white">
                  avnz<span className="text-purple-400">.io</span>
                </span>
              </div>
              <p className="text-zinc-400 text-sm max-w-xs">
                The revenue acceleration platform for DTC brands. Convert more.
                Collect everything. Care at scale. Grow forever.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold text-white mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li>
                  <a href="#how-it-works" className="hover:text-purple-400 transition-colors">
                    How It Works
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-purple-400 transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-purple-400 transition-colors">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li>
                  <a href="/privacy" className="hover:text-purple-400 transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="/terms" className="hover:text-purple-400 transition-colors">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="mailto:founders@avnz.io" className="hover:text-purple-400 transition-colors">
                    Contact Us
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-zinc-500">
              &copy; {new Date().getFullYear()} avnz.io. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <span className="text-xs text-zinc-600">
                🔒 SOC2 Type II &bull; PCI-DSS Level 1 &bull; GDPR Compliant
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
