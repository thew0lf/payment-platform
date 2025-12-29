'use client';

/**
 * Wizard Progress Indicator
 *
 * Displays a horizontal step progress bar showing:
 * - Completed steps (with checkmark)
 * - Current step (highlighted)
 * - Upcoming steps (dimmed)
 */

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WizardStep } from '@/stores/import-wizard.store';

interface WizardProgressProps {
  steps: Array<{ id: WizardStep; label: string; description: string }>;
  currentStep: WizardStep;
  completedSteps: Set<WizardStep>;
  onStepClick?: (step: WizardStep) => void;
  className?: string;
}

export function WizardProgress({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
  className,
}: WizardProgressProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <nav aria-label="Import progress" className={cn('px-6 py-4', className)}>
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.has(step.id);
          const isCurrent = step.id === currentStep;
          const isPast = index < currentIndex;
          const isFuture = index > currentIndex;
          const isClickable = onStepClick && (isCompleted || isPast);

          return (
            <li
              key={step.id}
              className={cn('flex flex-1 items-center', {
                'cursor-pointer': isClickable,
              })}
            >
              {/* Step circle and label */}
              <div
                className={cn('flex flex-col items-center', {
                  'cursor-pointer': isClickable,
                })}
                onClick={isClickable ? () => onStepClick(step.id) : undefined}
                role={isClickable ? 'button' : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onKeyDown={
                  isClickable
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          onStepClick(step.id);
                        }
                      }
                    : undefined
                }
              >
                {/* Circle indicator */}
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors',
                    {
                      // Completed step
                      'border-primary bg-primary text-primary-foreground':
                        isCompleted && !isCurrent,
                      // Current step
                      'border-primary bg-primary/10 text-primary': isCurrent,
                      // Future step
                      'border-muted-foreground/30 bg-muted text-muted-foreground':
                        isFuture && !isCompleted,
                    }
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isCompleted && !isCurrent ? (
                    <Check className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>

                {/* Step label - visible on larger screens */}
                <span
                  className={cn(
                    'mt-2 hidden text-xs font-medium sm:block',
                    {
                      'text-primary': isCurrent || isCompleted,
                      'text-muted-foreground': isFuture && !isCompleted,
                    }
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line (except for last step) */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'mx-2 h-0.5 flex-1',
                    {
                      'bg-primary': isPast || isCompleted,
                      'bg-muted-foreground/30': !isPast && !isCompleted,
                    }
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* Mobile step label */}
      <div className="mt-2 text-center text-sm font-medium text-primary sm:hidden">
        Step {currentIndex + 1}: {steps[currentIndex]?.label}
      </div>
    </nav>
  );
}
