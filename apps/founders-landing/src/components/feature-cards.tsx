'use client';

import { Sparkles, Users, Network, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const features = [
  {
    icon: Sparkles,
    title: 'MI\u2122 AI',
    description: 'Momentum Intelligence that learns and grows with your business',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    icon: Users,
    title: 'Social Payments',
    description: 'Connect with vendors and founders in a unified network',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Network,
    title: 'Vendor Network',
    description: 'Access pre-vetted fulfillment and service partners',
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    icon: TrendingUp,
    title: 'Growth Tools',
    description: 'Funnels, subscriptions, and analytics built-in',
    gradient: 'from-orange-500 to-red-500',
  },
];

export function FeatureCards() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {features.map((feature) => (
        <div
          key={feature.title}
          className={cn(
            'group relative p-6 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800',
            'hover:border-brand-500/50 transition-all duration-300',
            'hover:shadow-lg dark:hover:shadow-brand-500/10'
          )}
        >
          <div
            className={cn(
              'w-12 h-12 rounded-lg flex items-center justify-center mb-4',
              'bg-gradient-to-br',
              feature.gradient
            )}
          >
            <feature.icon className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-semibold text-zinc-900 dark:text-white mb-2">
            {feature.title}
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {feature.description}
          </p>
        </div>
      ))}
    </div>
  );
}
