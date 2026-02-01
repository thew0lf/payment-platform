'use client';

const credibilityPoints = [
  {
    icon: '🏗️',
    title: 'BUILT ON EXPERIENCE',
    description: '$400M+ in DTC transactions processed by our founding team',
  },
  {
    icon: '🔐',
    title: 'SECURITY-FIRST',
    description: 'SOC2 Type II compliant, PCI-DSS Level 1 certified',
  },
  {
    icon: '⚡',
    title: 'FAST TO VALUE',
    description: 'Average merchant live in under 24 hours',
  },
  {
    icon: '🤝',
    title: 'BACKED BY OPERATORS',
    description: 'Funded by founders who scaled brands from $1M to $100M+',
  },
];

export function GuideSection() {
  return (
    <section className="py-20 md:py-28 px-4 md:px-6 bg-zinc-50 dark:bg-zinc-900">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1 mb-4 text-sm font-medium text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 rounded-full">
            YOUR GUIDE
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-zinc-900 dark:text-white">
            Built by Operators Who Felt Your Pain
            <span className="text-purple-500"> (Literally)</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Story */}
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">
              We didn&apos;t build AVNZ because we thought the payment space needed another player.
            </p>
            <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">
              We built it because we ran DTC brands and lived the nightmare. We know what it&apos;s
              like to wake up to a Slack message that says &quot;Stripe is down and we have no backup.&quot;
              We&apos;ve felt the frustration of watching a $200 cart abandon because your checkout
              loaded 0.3 seconds too slow. We&apos;ve lost sleep over churn we didn&apos;t see coming.
            </p>
            <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">
              After years of cobbling together &quot;solutions&quot; that created more problems, we
              asked a simple question:
            </p>
            <p className="text-xl font-semibold text-zinc-900 dark:text-white">
              What if one platform could handle every revenue moment—from first click to
              lifetime customer—without the duct tape?
            </p>
            <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">
              AVNZ is that platform. We&apos;re not a payment processor pretending to do more,
              or a CRM bolting on payments. We&apos;re purpose-built for DTC revenue acceleration,
              because that&apos;s the problem we lived and the problem we solved.
            </p>
          </div>

          {/* Credibility points */}
          <div className="grid sm:grid-cols-2 gap-4">
            {credibilityPoints.map((point, index) => (
              <div
                key={index}
                className="p-6 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-sm"
              >
                <div className="text-3xl mb-3">{point.icon}</div>
                <h3 className="font-bold text-zinc-900 dark:text-white text-sm mb-2">
                  {point.title}
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {point.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Guide promise */}
        <div className="mt-16 p-8 rounded-2xl bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-700/30 text-center">
          <p className="text-lg text-zinc-700 dark:text-zinc-300 max-w-3xl mx-auto">
            We&apos;re not here to sell you software and disappear. As a Founding Member,
            you get direct access to our team. Your feedback shapes the roadmap.
            Your success is our proof point.
          </p>
          <p className="mt-4 text-xl font-bold text-purple-600 dark:text-purple-400">
            We&apos;re in this together.
          </p>
        </div>
      </div>
    </section>
  );
}
