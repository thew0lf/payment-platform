'use client';

const comparisons = [
  {
    before: 'Checking 4 dashboards to find a failed payment',
    after: 'One dashboard shows everything—and auto-retries failures',
  },
  {
    before: 'Manually answering "Where\'s my order?" 50x/day',
    after: 'AI handles it instantly, 24/7, in your voice',
  },
  {
    before: 'Finding out about churn when customers are already gone',
    after: 'Predictive alerts let you save them before they leave',
  },
  {
    before: 'Guessing which traffic sources actually convert',
    after: 'Real attribution data shows exactly what works',
  },
  {
    before: 'Cobbling together 8+ tools that barely talk to each other',
    after: 'One platform, unified data, seamless workflows',
  },
  {
    before: 'Losing 15-25% of revenue to system gaps',
    after: 'Recovering every dollar your business earns',
  },
];

export function TransformationSection() {
  return (
    <section className="py-20 md:py-28 px-4 md:px-6 bg-zinc-50 dark:bg-zinc-900">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1 mb-4 text-sm font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 rounded-full">
            THE TRANSFORMATION
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-zinc-900 dark:text-white mb-6">
            From Chaos to Control
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Here&apos;s what changes when you stop fighting your tools and start
            accelerating your revenue:
          </p>
        </div>

        {/* Before/After Table */}
        <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700">
          {/* Header Row */}
          <div className="grid grid-cols-2">
            <div className="p-4 md:p-6 bg-red-500/10 border-b border-r border-zinc-200 dark:border-zinc-700">
              <h3 className="text-lg font-bold text-red-600 dark:text-red-400">
                😤 Before AVNZ
              </h3>
            </div>
            <div className="p-4 md:p-6 bg-green-500/10 border-b border-zinc-200 dark:border-zinc-700">
              <h3 className="text-lg font-bold text-green-600 dark:text-green-400">
                🚀 After AVNZ
              </h3>
            </div>
          </div>

          {/* Comparison Rows */}
          {comparisons.map((item, index) => (
            <div
              key={index}
              className={`grid grid-cols-2 ${
                index !== comparisons.length - 1
                  ? 'border-b border-zinc-200 dark:border-zinc-700'
                  : ''
              }`}
            >
              <div className="p-4 md:p-6 border-r border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950">
                <p className="text-zinc-600 dark:text-zinc-400 text-sm md:text-base">
                  {item.before}
                </p>
              </div>
              <div className="p-4 md:p-6 bg-white dark:bg-zinc-950">
                <p className="text-zinc-900 dark:text-white font-medium text-sm md:text-base">
                  {item.after}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-12 text-center">
          <p className="text-xl text-zinc-900 dark:text-white font-semibold">
            Same product. Same customers. Same team.
          </p>
          <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
            Different results.{' '}
            <span className="gradient-text font-bold">Better revenue.</span>
          </p>
        </div>
      </div>
    </section>
  );
}
