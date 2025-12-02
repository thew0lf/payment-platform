'use client';

import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Explorer',
    price: 19,
    interval: 'month',
    description: 'Perfect for the curious coffee drinker',
    features: [
      '1 bag of coffee per month (12oz)',
      'Rotating single origin selections',
      'Tasting notes & brewing tips',
      'Cancel anytime',
    ],
    popular: false,
    cta: 'Start Exploring',
  },
  {
    name: 'Adventurer',
    price: 35,
    interval: 'month',
    description: 'For the dedicated coffee enthusiast',
    features: [
      '2 bags of coffee per month (12oz each)',
      'Mix of single origins & blends',
      'Priority access to rare coffees',
      'Free brewing guide ebook',
      'Member-only discounts',
    ],
    popular: true,
    cta: 'Choose Adventurer',
  },
  {
    name: 'Connoisseur',
    price: 59,
    interval: 'month',
    description: 'The ultimate coffee experience',
    features: [
      '4 bags of coffee per month (12oz each)',
      'Exclusive micro-lot selections',
      'Direct farm relationship coffees',
      'Quarterly cupping sessions (virtual)',
      'Premium member perks',
      'Priority customer support',
    ],
    popular: false,
    cta: 'Go Connoisseur',
  },
];

export function SubscriptionPlans() {
  return (
    <section id="plans" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-coffee-950 mb-4">
            Choose Your Journey
          </h2>
          <p className="text-lg text-coffee-700 max-w-2xl mx-auto">
            Pick the subscription that matches your coffee consumption and
            curiosity level.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative rounded-2xl p-8 ${
                plan.popular
                  ? 'bg-coffee-900 text-white ring-4 ring-coffee-500 scale-105'
                  : 'bg-cream-50 border border-coffee-200'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-coffee-500 text-white text-sm font-semibold px-4 py-1 rounded-full">
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <h3
                  className={`text-2xl font-bold mb-2 ${
                    plan.popular ? 'text-white' : 'text-coffee-900'
                  }`}
                >
                  {plan.name}
                </h3>
                <p
                  className={`text-sm ${
                    plan.popular ? 'text-coffee-200' : 'text-coffee-600'
                  }`}
                >
                  {plan.description}
                </p>
              </div>

              <div className="mb-6">
                <span
                  className={`text-5xl font-bold ${
                    plan.popular ? 'text-white' : 'text-coffee-900'
                  }`}
                >
                  ${plan.price}
                </span>
                <span
                  className={`text-sm ${
                    plan.popular ? 'text-coffee-200' : 'text-coffee-600'
                  }`}
                >
                  /{plan.interval}
                </span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check
                      className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                        plan.popular ? 'text-coffee-400' : 'text-coffee-500'
                      }`}
                    />
                    <span
                      className={`text-sm ${
                        plan.popular ? 'text-coffee-100' : 'text-coffee-700'
                      }`}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                className={`w-full py-3 px-6 rounded-xl font-semibold transition-all hover:scale-105 ${
                  plan.popular
                    ? 'bg-white text-coffee-900 hover:bg-cream-100'
                    : 'bg-coffee-600 text-white hover:bg-coffee-700'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-coffee-600 mt-8">
          All plans include free shipping and our satisfaction guarantee.
        </p>
      </div>
    </section>
  );
}
