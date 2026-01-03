'use client';

/**
 * Welcome Step
 *
 * First step of the onboarding wizard introducing the user to AVNZ.
 */

import { Sparkles, Palette, Zap, Shield } from 'lucide-react';

const FEATURES = [
  {
    icon: Palette,
    title: 'Your Brand, Your Way',
    description: 'Set up your colors, fonts, and logo in seconds. Every checkout will feel 100% you.',
  },
  {
    icon: Zap,
    title: 'Smart Payment Routing',
    description: 'We automatically find the best path for every transaction. More approvals, less fees.',
  },
  {
    icon: Shield,
    title: 'Built for Security',
    description: 'SOC2 and PCI-DSS compliant. Sleep well knowing your data is protected.',
  },
];

export function WelcomeStep() {
  return (
    <div className="flex flex-col items-center text-center">
      {/* Hero */}
      <div className="mb-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-2xl font-bold text-foreground">
          Let&apos;s make this yours
        </h3>
        <p className="mt-2 text-muted-foreground max-w-md">
          We&apos;re about to set up your brand identity. It only takes a minute,
          and you can always change it later.
        </p>
      </div>

      {/* Features */}
      <div className="grid gap-4 sm:grid-cols-3 w-full max-w-2xl">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="rounded-lg border bg-muted/30 p-4 text-left transition-colors hover:bg-muted/50"
          >
            <feature.icon className="h-5 w-5 text-primary mb-2" />
            <h4 className="font-medium text-foreground text-sm">
              {feature.title}
            </h4>
            <p className="mt-1 text-xs text-muted-foreground">
              {feature.description}
            </p>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <p className="mt-8 text-sm text-muted-foreground">
        Ready when you are! Click &quot;Continue&quot; to start customizing.
      </p>
    </div>
  );
}
