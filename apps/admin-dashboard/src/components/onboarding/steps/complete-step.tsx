'use client';

/**
 * Complete Step
 *
 * Final step of the onboarding wizard celebrating success.
 */

import { CheckCircle2, ArrowRight, Palette, Settings, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOnboardingWizardStore } from '@/stores/onboarding-wizard.store';
import { useRouter } from 'next/navigation';

const NEXT_ACTIONS = [
  {
    icon: LayoutDashboard,
    title: 'Explore Your Dashboard',
    description: 'See your metrics and start tracking performance',
    href: '/',
  },
  {
    icon: Palette,
    title: 'Fine-tune Your Branding',
    description: 'Adjust colors, fonts, and upload additional assets',
    href: '/settings/brand-kit',
  },
  {
    icon: Settings,
    title: 'Configure Settings',
    description: 'Set up payment methods, team members, and more',
    href: '/settings',
  },
];

export function CompleteStep() {
  const router = useRouter();
  const { completeOnboarding, brandKit } = useOnboardingWizardStore();

  const handleAction = (href: string) => {
    completeOnboarding();
    router.push(href);
  };

  return (
    <div className="flex flex-col items-center text-center">
      {/* Success animation */}
      <div className="mb-6 relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-green-500/20" />
        <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
        </div>
      </div>

      {/* Message */}
      <h3 className="text-2xl font-bold text-foreground mb-2">
        You&apos;re ready to roll!
      </h3>
      <p className="text-muted-foreground max-w-md mb-8">
        Your brand is all set up. Your checkouts will now look and feel uniquely yours.
        Here&apos;s what you can do next:
      </p>

      {/* Brand preview */}
      <div className="w-full max-w-sm rounded-lg border bg-muted/30 p-4 mb-8">
        <p className="text-xs font-medium text-muted-foreground mb-3">
          Your Brand Colors
        </p>
        <div className="flex justify-center gap-2">
          {(Object.entries(brandKit.colors) as [string, string][]).slice(0, 5).map(([key, color]) => (
            <div key={key} className="text-center">
              <div
                className="h-8 w-8 rounded-full border-2 border-white shadow-sm mx-auto"
                style={{ backgroundColor: color }}
              />
              <span className="text-[10px] text-muted-foreground mt-1 block capitalize">
                {key}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Next actions */}
      <div className="w-full max-w-lg space-y-3">
        {NEXT_ACTIONS.map((action) => (
          <button
            key={action.href}
            type="button"
            onClick={() => handleAction(action.href)}
            className="w-full flex items-center gap-4 rounded-lg border bg-background p-4 text-left transition-colors hover:bg-muted/50 hover:border-primary/50 group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <action.icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">
                {action.title}
              </h4>
              <p className="text-sm text-muted-foreground">
                {action.description}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
}
