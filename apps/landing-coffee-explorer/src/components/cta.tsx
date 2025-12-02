import { ArrowRight, Coffee } from 'lucide-react';

export function CTA() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-coffee-800 to-coffee-950">
      <div className="container mx-auto max-w-4xl text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-coffee-700 rounded-2xl mb-8">
          <Coffee className="h-10 w-10 text-coffee-200" />
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
          Ready to Transform Your
          <span className="text-coffee-400 block">Coffee Experience?</span>
        </h2>

        <p className="text-lg text-coffee-200 mb-8 max-w-2xl mx-auto">
          Join thousands of coffee enthusiasts who&apos;ve discovered their
          perfect brew with Coffee Explorer. Your first bag ships free!
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="#plans"
            className="inline-flex items-center justify-center gap-2 bg-coffee-500 hover:bg-coffee-400 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105"
          >
            Start Your Free Trial
            <ArrowRight className="h-5 w-5" />
          </a>
          <a
            href="/gift"
            className="inline-flex items-center justify-center gap-2 bg-transparent hover:bg-coffee-700 text-white border-2 border-coffee-600 px-8 py-4 rounded-xl font-semibold text-lg transition-colors"
          >
            Give a Gift
          </a>
        </div>

        <p className="text-coffee-400 mt-6 text-sm">
          No commitment required. Cancel anytime.
        </p>
      </div>
    </section>
  );
}
