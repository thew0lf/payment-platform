import { ArrowRight, Star } from 'lucide-react';

export function Hero() {
  return (
    <section className="pt-24 pb-16 md:pt-32 md:pb-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-cream-50 to-cream-100">
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-coffee-100 text-coffee-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Star className="h-4 w-4 fill-coffee-500 text-coffee-500" />
              Rated 4.9/5 by 10,000+ coffee lovers
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-coffee-950 leading-tight mb-6">
              Discover Your
              <span className="text-coffee-600 block">Perfect Brew</span>
            </h1>

            <p className="text-lg text-coffee-700 mb-8 max-w-lg mx-auto md:mx-0">
              Handpicked specialty coffee from the world&apos;s best roasters,
              delivered fresh to your door. Start your coffee journey today.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <a
                href="#plans"
                className="inline-flex items-center justify-center gap-2 bg-coffee-600 hover:bg-coffee-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105"
              >
                Start Your Subscription
                <ArrowRight className="h-5 w-5" />
              </a>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 bg-cream-50 hover:bg-cream-200 text-coffee-800 border-2 border-coffee-300 px-8 py-4 rounded-xl font-semibold text-lg transition-colors"
              >
                Learn More
              </a>
            </div>

            {/* Trust badges */}
            <div className="mt-10 flex items-center justify-center md:justify-start gap-6 text-coffee-600">
              <div className="flex items-center gap-2">
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm">Free Shipping</span>
              </div>
              <div className="flex items-center gap-2">
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm">Cancel Anytime</span>
              </div>
              <div className="flex items-center gap-2">
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm">Fresh Roasted</span>
              </div>
            </div>
          </div>

          {/* Right Content - Hero Image */}
          <div className="relative">
            <div className="aspect-square rounded-3xl bg-gradient-to-br from-coffee-400 to-coffee-700 p-8 shadow-2xl">
              <div className="w-full h-full rounded-2xl bg-coffee-50 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-8xl mb-4">&#9749;</div>
                  <p className="text-coffee-600 font-medium">
                    Premium Coffee Delivered Fresh
                  </p>
                </div>
              </div>
            </div>

            {/* Floating badge */}
            <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg p-4 border border-coffee-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-coffee-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">&#127796;</span>
                </div>
                <div>
                  <div className="font-semibold text-coffee-900">
                    50+ Origins
                  </div>
                  <div className="text-sm text-coffee-600">
                    From around the world
                  </div>
                </div>
              </div>
            </div>

            {/* Another floating badge */}
            <div className="absolute -top-4 -right-4 bg-white rounded-xl shadow-lg p-4 border border-coffee-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-cream-200 rounded-full flex items-center justify-center">
                  <span className="text-2xl">&#128293;</span>
                </div>
                <div>
                  <div className="font-semibold text-coffee-900">
                    Roasted Weekly
                  </div>
                  <div className="text-sm text-coffee-600">
                    Maximum freshness
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
