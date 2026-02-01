'use client';

const channels = [
  {
    icon: '🎙️',
    name: 'Voice AI',
    description: 'Customers call, get real answers. Not a phone tree—actual conversation with context.',
  },
  {
    icon: '💬',
    name: 'Live Chat',
    description: 'Instant responses 24/7. Trained on your products, policies, and brand voice.',
  },
  {
    icon: '📧',
    name: 'Email & SMS',
    description: 'Async support that feels personal. No more "We\'ll get back to you in 2-3 business days."',
  },
];

const tiers = [
  {
    level: 'Tier 1',
    name: 'AI Rep',
    color: 'blue',
    gradient: 'from-blue-500 to-blue-600',
    bgClass: 'bg-blue-500/10',
    borderClass: 'border-blue-500/30',
    handles: [
      '"Where\'s my order?"',
      '"How do I return this?"',
      'Password resets',
      'Basic product questions',
    ],
    resolution: '70% resolved instantly',
  },
  {
    level: 'Tier 2',
    name: 'AI Manager',
    color: 'purple',
    gradient: 'from-purple-500 to-purple-600',
    bgClass: 'bg-purple-500/10',
    borderClass: 'border-purple-500/30',
    handles: [
      'Refund requests (up to threshold)',
      'Account credits',
      'Escalated complaints',
      'Complex policy questions',
    ],
    resolution: '25% elevated authority',
  },
  {
    level: 'Tier 3',
    name: 'Human Agent',
    color: 'orange',
    gradient: 'from-orange-500 to-orange-600',
    bgClass: 'bg-orange-500/10',
    borderClass: 'border-orange-500/30',
    handles: [
      'High-value exceptions',
      'Legal/compliance issues',
      'VIP customer requests',
      'Complex disputes',
    ],
    resolution: '5% need human touch',
  },
];

export function CSAISection() {
  return (
    <section className="py-20 md:py-28 px-4 md:px-6 bg-white dark:bg-zinc-950">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1 mb-4 text-sm font-medium text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 rounded-full">
            MOMENTUM INTELLIGENCE
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-zinc-900 dark:text-white mb-6">
            CS AI That Actually Works
            <br />
            <span className="gradient-text">(And Sounds Human)</span>
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-3xl mx-auto">
            Your customers don&apos;t want to talk to a bot. Good news: our AI doesn&apos;t
            sound like one. It&apos;s trained on your brand, knows your policies, and
            escalates intelligently when it needs to.
          </p>
        </div>

        {/* Channels */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {channels.map((channel, index) => (
            <div
              key={index}
              className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
            >
              <div className="text-4xl mb-4">{channel.icon}</div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                {channel.name}
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                {channel.description}
              </p>
            </div>
          ))}
        </div>

        {/* Three-Tier System */}
        <div className="mb-12">
          <h3 className="text-center text-2xl font-bold text-zinc-900 dark:text-white mb-8">
            Intelligent Three-Tier Escalation
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            {tiers.map((tier, index) => (
              <div
                key={index}
                className={`p-6 rounded-2xl ${tier.bgClass} border ${tier.borderClass}`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-bold text-white bg-gradient-to-r ${tier.gradient}`}>
                    {tier.level}
                  </span>
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    {tier.name}
                  </span>
                </div>
                <ul className="space-y-2 mb-4">
                  {tier.handles.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                  {tier.resolution}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Flow Diagram */}
        <div className="text-center p-8 rounded-2xl bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-700/30">
          <p className="text-lg text-zinc-700 dark:text-zinc-300 mb-4">
            <strong>The Result:</strong> 70% of tickets resolved without human
            intervention. Your team focuses on the 5% that actually need them.
          </p>
          <p className="text-zinc-600 dark:text-zinc-400">
            As a Founding Member, you get early access to CS AI—including Voice AI
            integration with your existing phone system.
          </p>
        </div>
      </div>
    </section>
  );
}
