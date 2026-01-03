'use client';

/**
 * Company Onboarding Wizard
 *
 * A multi-step wizard for onboarding new companies with brand kit setup.
 * Features:
 * - Step-by-step progress indicator
 * - Brand kit configuration
 * - Skip/complete options
 * - Keyboard navigation (Escape to close)
 * - Focus trap for accessibility
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Sparkles, Palette, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  useOnboardingWizardStore,
  ONBOARDING_STEPS,
  getStepIndex,
  type OnboardingStep,
} from '@/stores/onboarding-wizard.store';
import { WelcomeStep } from './steps/welcome-step';
import { BrandKitStep } from './steps/brand-kit-step';
import { CompleteStep } from './steps/complete-step';

// Focusable elements selector
const FOCUSABLE_ELEMENTS =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function OnboardingWizard() {
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);
  const lastFocusedElement = useRef<HTMLElement | null>(null);

  const {
    isWizardOpen,
    closeWizard,
    resetWizard,
    currentStep,
    completedSteps,
    nextStep,
    prevStep,
    skipOnboarding,
    isLoading,
    isSaving,
    error,
  } = useOnboardingWizardStore();

  // FOCUS TRAP: Handle keyboard navigation within the modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isWizardOpen || !dialogRef.current) return;

      // Escape to close (unless saving)
      if (e.key === 'Escape' && !isSaving) {
        e.preventDefault();
        closeWizard();
        return;
      }

      // Tab trap: keep focus within the modal
      if (e.key === 'Tab') {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          FOCUSABLE_ELEMENTS
        );
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        if (!firstFocusable || !lastFocusable) return;

        // Shift+Tab on first element -> go to last
        if (e.shiftKey && document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
          return;
        }

        // Tab on last element -> go to first
        if (!e.shiftKey && document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
          return;
        }
      }
    };

    if (isWizardOpen) {
      // Store the currently focused element to restore later
      lastFocusedElement.current = document.activeElement as HTMLElement;

      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isWizardOpen, isSaving, closeWizard]);

  // FOCUS MANAGEMENT: Focus first element on open, restore on close
  useEffect(() => {
    if (isWizardOpen) {
      // Delay to ensure DOM is ready
      const timer = setTimeout(() => {
        if (firstFocusableRef.current) {
          firstFocusableRef.current.focus();
        } else if (dialogRef.current) {
          const firstFocusable = dialogRef.current.querySelector<HTMLElement>(
            FOCUSABLE_ELEMENTS
          );
          firstFocusable?.focus();
        }
      }, 10);
      return () => clearTimeout(timer);
    } else {
      // Restore focus to the element that was focused before opening
      if (lastFocusedElement.current) {
        lastFocusedElement.current.focus();
      }
    }
  }, [isWizardOpen]);

  // Handle skip
  const handleSkip = useCallback(() => {
    skipOnboarding();
    resetWizard();
  }, [skipOnboarding, resetWizard]);

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'welcome':
        return <WelcomeStep />;
      case 'brand-kit':
        return <BrandKitStep />;
      case 'complete':
        return <CompleteStep />;
      default:
        return null;
    }
  };

  // Get step icon
  const getStepIcon = (step: OnboardingStep, index: number) => {
    const isCompleted = completedSteps.has(step);
    const isCurrent = currentStep === step;

    if (isCompleted && !isCurrent) {
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    }

    switch (step) {
      case 'welcome':
        return <Sparkles className={cn('h-5 w-5', isCurrent ? 'text-primary' : 'text-muted-foreground')} />;
      case 'brand-kit':
        return <Palette className={cn('h-5 w-5', isCurrent ? 'text-primary' : 'text-muted-foreground')} />;
      case 'complete':
        return <CheckCircle2 className={cn('h-5 w-5', isCurrent ? 'text-primary' : 'text-muted-foreground')} />;
      default:
        return <span className="text-sm font-medium">{index + 1}</span>;
    }
  };

  // Get step title
  const getStepTitle = () => {
    switch (currentStep) {
      case 'welcome':
        return 'Welcome to AVNZ!';
      case 'brand-kit':
        return 'Set Up Your Brand';
      case 'complete':
        return "You're All Set!";
      default:
        return 'Onboarding';
    }
  };

  // Navigation visibility
  const currentIndex = getStepIndex(currentStep);
  const showBack = currentIndex > 0 && currentStep !== 'complete';
  const showNext = currentStep !== 'complete';
  const showSkip = currentStep !== 'complete';

  if (!isWizardOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div
        ref={dialogRef}
        className={cn(
          'relative flex h-[calc(100vh-4rem)] w-[calc(100%-2rem)] max-w-3xl flex-col rounded-xl border bg-card shadow-2xl',
          'sm:h-auto sm:max-h-[85vh] sm:min-h-[500px]'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2
              id="onboarding-title"
              className="text-xl font-semibold text-foreground"
            >
              {getStepTitle()}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {ONBOARDING_STEPS[currentIndex]?.description}
            </p>
          </div>
          {showSkip && (
            <Button
              ref={firstFocusableRef}
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-muted-foreground hover:text-foreground"
              disabled={isSaving}
              aria-label="Skip onboarding"
            >
              Skip for now
            </Button>
          )}
        </div>

        {/* Progress indicator */}
        <div className="border-b px-6 py-3">
          <div className="flex items-center justify-center gap-2">
            {ONBOARDING_STEPS.map((step, index) => {
              const isCurrent = currentStep === step.id;
              const isCompleted = completedSteps.has(step.id);
              const isPast = index < currentIndex;

              return (
                <div key={step.id} className="flex items-center">
                  {index > 0 && (
                    <div
                      className={cn(
                        'mx-2 h-0.5 w-12 transition-colors',
                        isPast || isCompleted ? 'bg-primary' : 'bg-border'
                      )}
                    />
                  )}
                  <div
                    className={cn(
                      'flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors',
                      isCurrent && 'bg-primary/10 text-primary',
                      isCompleted && !isCurrent && 'text-green-600',
                      !isCurrent && !isCompleted && 'text-muted-foreground'
                    )}
                  >
                    {getStepIcon(step.id, index)}
                    <span className="hidden sm:inline font-medium">{step.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div
            className="mx-6 mt-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-6 py-4">
          <div>
            {showBack && (
              <Button
                variant="ghost"
                onClick={prevStep}
                disabled={isSaving}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            {showNext && (
              <Button
                onClick={nextStep}
                disabled={isSaving || isLoading}
                className="gap-2"
              >
                {currentStep === 'brand-kit' ? 'Save & Continue' : 'Continue'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
