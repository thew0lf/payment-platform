'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: 'How fresh is the coffee when it arrives?',
    answer:
      "We roast your coffee to order and ship within 24 hours of roasting. Depending on your location, you'll receive your coffee 2-5 days after roasting - peak freshness for optimal flavor!",
  },
  {
    question: 'Can I customize my subscription?',
    answer:
      'Absolutely! During signup, you can tell us your preferences for roast level (light, medium, dark), flavor profiles (fruity, chocolatey, nutty, etc.), and whether you prefer whole bean or ground. You can update these preferences anytime.',
  },
  {
    question: 'What if I receive a coffee I don\'t like?',
    answer:
      "We want you to love every cup! If you receive a coffee that doesn't suit your taste, let us know and we'll make it right with a replacement or credit. Your feedback also helps us refine future selections for you.",
  },
  {
    question: 'How do I pause or cancel my subscription?',
    answer:
      "You can pause or cancel your subscription anytime through your account dashboard - no questions asked, no hidden fees. If you're going on vacation, you can also skip individual shipments.",
  },
  {
    question: 'Do you ship internationally?',
    answer:
      'Currently, we ship to all 50 US states and Canada. International shipping to other countries is coming soon! Join our waitlist to be notified when we expand to your area.',
  },
  {
    question: 'Is your coffee ethically sourced?',
    answer:
      'Yes! We partner exclusively with farms that practice sustainable agriculture and pay fair wages. Many of our coffees are certified organic, Fair Trade, or Rainforest Alliance. We believe great coffee should be good for everyone.',
  },
  {
    question: 'What brewing equipment do I need?',
    answer:
      "Our coffee works with any brewing method - drip, pour-over, French press, espresso, you name it! Each bag includes suggested brewing parameters. If you're unsure, our Adventurer and Connoisseur plans include brewing guides.",
  },
  {
    question: 'Can I gift a subscription?',
    answer:
      "Yes! Coffee subscriptions make wonderful gifts. You can purchase a gift subscription for 3, 6, or 12 months. We'll send a beautiful digital gift card to the recipient on your chosen date.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="container mx-auto max-w-3xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-coffee-950 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-coffee-700">
            Got questions? We&apos;ve got answers.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border border-coffee-200 rounded-xl overflow-hidden"
            >
              <button
                className="w-full px-6 py-4 flex items-center justify-between text-left bg-cream-50 hover:bg-cream-100 transition-colors"
                onClick={() =>
                  setOpenIndex(openIndex === index ? null : index)
                }
              >
                <span className="font-medium text-coffee-900">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`h-5 w-5 text-coffee-500 transition-transform ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openIndex === index && (
                <div className="px-6 py-4 bg-white border-t border-coffee-100">
                  <p className="text-coffee-700">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
