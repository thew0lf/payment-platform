'use client';

import {
  SparklesIcon,
  BoltIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  BookOpenIcon,
  ChartBarIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';
import type { MarketingMethodology, MethodologySummary } from '@/lib/api/ai-funnel';

interface MethodologySelectionStepProps {
  methodologies: MethodologySummary[];
  selectedMethodology?: MarketingMethodology;
  recommendedMethodology?: MarketingMethodology;
  onSelect: (methodology: MarketingMethodology) => void;
  onBack: () => void;
  isLoading: boolean;
}

const METHODOLOGY_ICONS: Record<MarketingMethodology, typeof SparklesIcon> = {
  NCI: SparklesIcon,
  AIDA: BoltIcon,
  PAS: ExclamationTriangleIcon,
  BAB: ArrowPathIcon,
  STORYBRAND: BookOpenIcon,
  FOUR_PS: ChartBarIcon,
  PASTOR: LightBulbIcon,
  QUEST: LightBulbIcon,
  FAB: LightBulbIcon,
  CUSTOM: LightBulbIcon,
};

const METHODOLOGY_COLORS: Record<MarketingMethodology, string> = {
  NCI: 'from-purple-500 to-pink-500',
  AIDA: 'from-blue-500 to-cyan-500',
  PAS: 'from-red-500 to-orange-500',
  BAB: 'from-green-500 to-teal-500',
  STORYBRAND: 'from-yellow-500 to-amber-500',
  FOUR_PS: 'from-indigo-500 to-violet-500',
  PASTOR: 'from-emerald-500 to-lime-500',
  QUEST: 'from-sky-500 to-blue-500',
  FAB: 'from-rose-500 to-pink-500',
  CUSTOM: 'from-gray-500 to-slate-500',
};

export function MethodologySelectionStep({
  methodologies,
  selectedMethodology,
  recommendedMethodology,
  onSelect,
  onBack,
  isLoading,
}: MethodologySelectionStepProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-foreground">
          Choose Your Marketing Methodology
        </h2>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Each methodology creates different types of funnel copy. NCI is recommended for premium products.
        </p>
      </div>

      {/* MI Recommendation Banner */}
      {recommendedMethodology && (
        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
            <SparklesIcon className="h-5 w-5 text-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
              MI recommends <span className="font-bold">{methodologies.find(m => m.id === recommendedMethodology)?.name || recommendedMethodology}</span> for your products
            </p>
            <p className="text-xs text-purple-600 dark:text-purple-400">
              Based on product type, price point, and target audience analysis
            </p>
          </div>
        </div>
      )}

      {/* Methodology grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {methodologies.map(methodology => {
          const Icon = METHODOLOGY_ICONS[methodology.id] || LightBulbIcon;
          const gradient = METHODOLOGY_COLORS[methodology.id] || 'from-gray-500 to-slate-500';
          const isRecommended = recommendedMethodology === methodology.id;
          const isSelected = selectedMethodology === methodology.id;

          return (
            <button
              key={methodology.id}
              onClick={() => onSelect(methodology.id)}
              disabled={isLoading}
              className={`
                relative p-5 rounded-xl border-2 text-left transition-all
                ${isSelected
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600'}
                ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {/* MI Recommended badge */}
              {isRecommended && (
                <div className="absolute -top-2 -right-2">
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gradient-to-r from-purple-600 to-pink-600 text-foreground rounded-full">
                    <SparklesIcon className="h-3 w-3" />
                    MI Pick
                  </span>
                </div>
              )}

              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient}`}>
                  <Icon className="h-6 w-6 text-foreground" />
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-foreground">
                      {methodology.name}
                    </h3>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                      {methodology.tagline}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {methodology.description}
                  </p>

                  {/* Best for tags */}
                  {methodology.bestFor && methodology.bestFor.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {methodology.bestFor.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Loading indicator */}
              {isLoading && isSelected && (
                <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 rounded-xl flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-600 border-t-transparent" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          disabled={isLoading}
          className="px-6 py-3 text-gray-600 dark:text-gray-400 font-medium hover:text-gray-900 dark:hover:text-foreground transition-colors disabled:opacity-50"
        >
          Back
        </button>
      </div>
    </div>
  );
}
