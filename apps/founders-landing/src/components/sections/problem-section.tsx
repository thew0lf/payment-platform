'use client';

const painPoints = [
  {
    icon: '💸',
    title: 'The Payment Puzzle',
    quote: '"Why did that charge fail? Which gateway declined it? Was it fraud or just bad luck?"',
    description: "You're paying for multiple payment processors but have zero visibility into why transactions fail—or how to recover them. Every declined charge is a customer you might never see again.",
  },
  {
    icon: '🔥',
    title: 'The Support Spiral',
    quote: '"Another \'Where\'s my order?\' email. That\'s the 47th one today."',
    description: "Your support inbox is a black hole of repetitive questions your team answers manually, over and over. Meanwhile, the customers who actually need help wait in line behind password resets.",
  },
  {
    icon: '📊',
    title: 'The Growth Guessing Game',
    quote: '"Our CAC is... somewhere between $30 and $80? Depends who you ask."',
    description: "You're spending on ads, affiliates, and influencers but can't tell which channels actually drive profitable customers. So you keep funding what feels right instead of what works.",
  },
  {
    icon: '🔄',
    title: 'The Subscription Struggle',
    quote: '"We have a subscription program. Also a 40% churn rate."',
    description: "Customers sign up, then ghost. You have no early warning system, no save flows, no idea who's about to cancel until they already have. Retention feels like playing defense blindfolded.",
  },
];

export function ProblemSection() {
  return (
    <section className="py-20 md:py-28 px-4 md:px-6 bg-white dark:bg-zinc-950">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1 mb-4 text-sm font-medium text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 rounded-full">
            THE PROBLEM
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-zinc-900 dark:text-white mb-6">
            Your Revenue Has a Leak.
            <br />
            <span className="text-red-500">Actually, It Has Several.</span>
          </h2>
          <p className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 max-w-3xl mx-auto">
            You didn&apos;t start a DTC brand to become a full-time integration specialist. Yet here you are,
            juggling a dozen tools that don&apos;t talk to each other while revenue slips through the cracks.
          </p>
          <p className="mt-4 text-xl font-semibold text-zinc-900 dark:text-white">
            Sound familiar?
          </p>
        </div>

        {/* Pain point cards */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {painPoints.map((point, index) => (
            <div
              key={index}
              className="group p-6 md:p-8 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-red-300 dark:hover:border-red-700 transition-all duration-300 hover:shadow-lg"
            >
              <div className="text-4xl mb-4">{point.icon}</div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">
                {point.title}
              </h3>
              <p className="text-zinc-500 dark:text-zinc-500 italic text-sm mb-4">
                {point.quote}
              </p>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {point.description}
              </p>
            </div>
          ))}
        </div>

        {/* Transition copy */}
        <p className="mt-12 text-center text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
          These aren&apos;t minor inconveniences. They&apos;re compounding revenue losses
          that get worse every single month.{' '}
          <span className="font-semibold text-zinc-900 dark:text-white">
            Let&apos;s talk about what that actually costs you.
          </span>
        </p>
      </div>
    </section>
  );
}
