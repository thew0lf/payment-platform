'use client';

/**
 * Product Import Wizard
 *
 * A multi-step wizard for importing products from external sources.
 * Features:
 * - Step-by-step progress indicator
 * - Keyboard navigation support (Escape to close)
 * - Focus trap for accessibility
 * - Responsive full-screen modal
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useImportWizardStore,
  WIZARD_STEPS,
  getStepIndex,
  type WizardStep,
} from '@/stores/import-wizard.store';
import { WizardProgress } from './wizard-progress';
import { ProviderStep } from '../steps/provider-step';
import { ConnectionStep } from '../steps/connection-step';
import { PreviewStep } from '../steps/preview-step';
import { MappingStep } from '../steps/mapping-step';
import { ImportingStep } from '../steps/importing-step';

export function ImportWizard() {
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const {
    isWizardOpen,
    closeWizard,
    resetWizard,
    currentStep,
    completedSteps,
    selectedProvider,
    error,
  } = useImportWizardStore();

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isWizardOpen) {
        // Don't close if we're in the middle of importing
        if (currentStep !== 'importing') {
          closeWizard();
        }
      }
    };

    if (isWizardOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent background scrolling
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isWizardOpen, currentStep, closeWizard]);

  // Focus management
  useEffect(() => {
    if (isWizardOpen && firstFocusableRef.current) {
      firstFocusableRef.current.focus();
    }
  }, [isWizardOpen]);

  // Handle close with confirmation
  const handleClose = useCallback(() => {
    // If we're importing, don't allow closing
    if (currentStep === 'importing') {
      return;
    }

    // If we have progress, show confirmation modal
    if (currentStep !== 'provider' && completedSteps.size > 0) {
      setShowCloseConfirm(true);
      return;
    }

    closeWizard();
    resetWizard();
  }, [currentStep, completedSteps, closeWizard, resetWizard]);

  // Confirm close action
  const handleConfirmClose = useCallback(() => {
    setShowCloseConfirm(false);
    closeWizard();
    resetWizard();
  }, [closeWizard, resetWizard]);

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'provider':
        return <ProviderStep />;
      case 'connection':
        return <ConnectionStep />;
      case 'preview':
        return <PreviewStep />;
      case 'mapping':
        return <MappingStep />;
      case 'importing':
        return <ImportingStep />;
      default:
        return null;
    }
  };

  // Get step title
  const getStepTitle = () => {
    switch (currentStep) {
      case 'provider':
        return 'Choose Your Source';
      case 'connection':
        return selectedProvider
          ? `Connect to ${selectedProvider.name}`
          : 'Connect to Provider';
      case 'preview':
        return 'Preview Products';
      case 'mapping':
        return 'Map Your Fields';
      case 'importing':
        return 'Importing Products';
      default:
        return 'Import Products';
    }
  };

  if (!isWizardOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wizard-title"
    >
      <div
        ref={dialogRef}
        className={cn(
          'relative flex h-[calc(100vh-4rem)] w-[calc(100%-2rem)] max-w-5xl flex-col rounded-xl border bg-card shadow-2xl',
          'sm:h-[85vh] sm:max-h-[800px]'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2
              id="wizard-title"
              className="text-xl font-semibold text-foreground"
            >
              {getStepTitle()}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {WIZARD_STEPS[getStepIndex(currentStep)]?.description}
            </p>
          </div>
          <Button
            ref={firstFocusableRef}
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-8 w-8 rounded-full"
            aria-label="Close wizard"
            disabled={currentStep === 'importing'}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress indicator */}
        <WizardProgress
          steps={WIZARD_STEPS}
          currentStep={currentStep}
          completedSteps={completedSteps}
        />

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
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {renderStepContent()}
        </div>
      </div>

      {/* Close confirmation dialog */}
      <Dialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Discard progress?
            </DialogTitle>
            <DialogDescription>
              You have unsaved progress in your import wizard. Are you sure you want to close? All your progress will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowCloseConfirm(false)}
            >
              Keep working
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmClose}
            >
              Discard and close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
