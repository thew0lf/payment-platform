'use client';

import { useState } from 'react';

const faqs = [
  {
    question: "What exactly is AVNZ?",
    answer: "AVNZ is a revenue acceleration platform for DTC brands. We combine payment processing, AI-powered customer service, smart funnels, and growth tools into one unified system. Think of it as your entire revenue stack—payments, support, conversion, retention—in one place, talking to each other.",
  },
  {
    question: "I already have Stripe/PayPal. Why do I need this?",
    answer: "Great—we integrate with both. AVNZ isn't replacing your payment processor; we're making it smarter. We add intelligent routing (so failed transactions try another gateway), automated retry logic, dunning management, and unified analytics. Most brands recover 15-25% of revenue they were losing to payment failures alone.",
  },
  {
    question: "How is the CS AI different from chatbots I've tried?",
    answer: "Most chatbots are glorified FAQ search engines. Our CS AI is trained on YOUR products, policies, and brand voice. It handles real conversations—including voice calls—with context awareness. When it can't solve something, it escalates intelligently to human agents with full conversation history. 70% resolution rate without human intervention.",
  },
  {
    question: "What's included in the Founding Member deal?",
    answer: "Everything. Full platform access across all four pillars (Convert, Collect, Care, Grow), CS AI with voice and chat, smart payment routing, funnel builder with A/B testing, analytics dashboard, priority support with direct Slack access to our team, and early access to Partner Momentum (our affiliate program). Plus migration assistance to get you set up.",
  },
  {
    question: "Is $297/mo really locked in forever?",
    answer: "Yes. As long as you remain an active subscriber, your rate never increases—even when we add new features or raise prices for new customers. If you cancel and come back later, you'll pay the then-current price. But stay subscribed? $297/mo for life.",
  },
  {
    question: "What if it doesn't work for my business?",
    answer: "30-day money-back guarantee. No questions asked. If AVNZ isn't delivering value in the first month, we'll refund you completely. We're confident in the platform, but we know trust is earned.",
  },
  {
    question: "How long does setup take?",
    answer: "Most merchants are live within 24 hours. We handle the heavy lifting—payment gateway connections, data migration, AI training on your products. You'll have a dedicated onboarding specialist (yes, a real human) to make sure everything's running smoothly.",
  },
  {
    question: "Why only 47 Founding Member spots?",
    answer: "We're being intentional about our early community. Founding Members get direct access to our team, their feedback shapes the roadmap, and they get priority support. We can only do that well with a limited group. When the spots are gone, the price goes to $497/mo and the founding benefits are retired.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-20 md:py-28 px-4 md:px-6 bg-zinc-50 dark:bg-zinc-900">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1 mb-4 text-sm font-medium text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 rounded-full">
            FAQ
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white">
            Questions? We&apos;ve Got Answers.
          </h2>
        </div>

        {/* Accordion */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-800"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors"
              >
                <span className="font-semibold text-zinc-900 dark:text-white pr-4">
                  {faq.question}
                </span>
                <svg
                  className={`w-5 h-5 text-zinc-500 transition-transform duration-200 flex-shrink-0 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {openIndex === index && (
                <div className="px-6 pb-4">
                  <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-12 text-center">
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">
            Still have questions?
          </p>
          <a
            href="mailto:founders@avnz.io"
            className="inline-flex items-center gap-2 text-purple-600 dark:text-purple-400 font-semibold hover:underline"
          >
            <span>Email us at founders@avnz.io</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
