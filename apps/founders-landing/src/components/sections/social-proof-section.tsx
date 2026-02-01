'use client';

const metrics = [
  { value: '$400M+', label: 'DTC transactions processed by founding team' },
  { value: '23%', label: 'Average failed payment recovery rate' },
  { value: '70%', label: 'Support tickets resolved without human intervention' },
  { value: '35%', label: 'Average LTV increase within 6 months' },
];

const testimonials = [
  {
    quote: "We were losing thousands every month to failed payments we didn't even know about. AVNZ showed us exactly where the leaks were—and plugged them.",
    author: 'DTC Brand Founder',
    company: 'Early Beta Partner',
    avatar: '🧑‍💼',
  },
  {
    quote: "The support AI handles 80% of our tickets now. My team finally has time for the conversations that actually matter.",
    author: 'Head of Customer Experience',
    company: 'Early Beta Partner',
    avatar: '👩‍💻',
  },
  {
    quote: "I can finally see which channels drive profitable customers, not just clicks. Game changer for our ad spend.",
    author: 'Marketing Director',
    company: 'Early Beta Partner',
    avatar: '📊',
  },
];

export function SocialProofSection() {
  return (
    <section className="py-20 md:py-28 px-4 md:px-6 bg-white dark:bg-zinc-950">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1 mb-4 text-sm font-medium text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 rounded-full">
            PROOF IT WORKS
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-zinc-900 dark:text-white mb-6">
            Numbers Don&apos;t Lie
          </h2>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {metrics.map((metric, index) => (
            <div
              key={index}
              className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-200 dark:border-purple-700/30 text-center"
            >
              <p className="text-3xl md:text-4xl font-bold gradient-text mb-2">
                {metric.value}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {metric.label}
              </p>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
            >
              <div className="text-4xl mb-4">{testimonial.avatar}</div>
              <p className="text-zinc-600 dark:text-zinc-300 italic mb-4">
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              <div>
                <p className="font-semibold text-zinc-900 dark:text-white">
                  {testimonial.author}
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-500">
                  {testimonial.company}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Founder Note */}
        <div className="p-8 rounded-2xl bg-gradient-to-r from-purple-900 to-blue-900 text-white text-center">
          <p className="text-lg mb-4">
            <strong>A note on testimonials:</strong> We&apos;re still in beta. These
            quotes are from our early partners who helped shape the platform.
          </p>
          <p className="text-purple-200">
            As a Founding Member, you&apos;ll have the chance to be one of these
            voices—and shape the product that tells your story.
          </p>
        </div>
      </div>
    </section>
  );
}
