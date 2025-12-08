'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeftIcon,
  SparklesIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { useHierarchy } from '@/contexts/hierarchy-context';
import * as aiFunnelApi from '@/lib/api/ai-funnel';
import type {
  MarketingMethodology,
  MethodologySummary,
  DiscoveryQuestion,
  GeneratedFunnelContent,
} from '@/lib/api/ai-funnel';
import { ProductSelectionStep } from './steps/product-selection';
import { MethodologySelectionStep } from './steps/methodology-selection';
import { DiscoveryQuestionsStep } from './steps/discovery-questions';
import { GenerationProgressStep } from './steps/generation-progress';
import { ReviewEditStep } from './steps/review-edit';

type WizardStep = 'products' | 'methodology' | 'questions' | 'generating' | 'review';

interface WizardState {
  selectedProductIds: string[];
  primaryProductId?: string;
  selectedMethodology?: MarketingMethodology;
  methodologyQuestions: DiscoveryQuestion[];
  discoveryAnswers: Record<string, string>;
  generationId?: string;
  generatedContent?: GeneratedFunnelContent;
}

const STEP_ORDER: WizardStep[] = ['products', 'methodology', 'questions', 'generating', 'review'];

const STEP_LABELS: Record<WizardStep, string> = {
  products: 'Select Products',
  methodology: 'Choose Methodology',
  questions: 'Answer Questions',
  generating: 'Generating',
  review: 'Review & Save',
};

export default function AIFunnelGeneratorPage() {
  const router = useRouter();
  const { selectedCompanyId } = useHierarchy();
  const [currentStep, setCurrentStep] = useState<WizardStep>('products');
  const [methodologies, setMethodologies] = useState<MethodologySummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [wizardState, setWizardState] = useState<WizardState>({
    selectedProductIds: [],
    methodologyQuestions: [],
    discoveryAnswers: {},
  });

  // Load methodologies on mount
  useEffect(() => {
    async function loadMethodologies() {
      try {
        const data = await aiFunnelApi.getMethodologies();
        setMethodologies(data.methodologies);
      } catch {
        toast.error('Failed to load methodologies');
      }
    }
    loadMethodologies();
  }, []);

  const currentStepIndex = STEP_ORDER.indexOf(currentStep);

  const handleProductsSelected = useCallback((productIds: string[], primaryId?: string) => {
    setWizardState(prev => ({
      ...prev,
      selectedProductIds: productIds,
      primaryProductId: primaryId,
    }));
    setCurrentStep('methodology');
  }, []);

  const handleMethodologySelected = useCallback(async (methodology: MarketingMethodology) => {
    setIsLoading(true);
    try {
      const data = await aiFunnelApi.getMethodologyQuestions(methodology);
      setWizardState(prev => ({
        ...prev,
        selectedMethodology: methodology,
        methodologyQuestions: data.questions,
      }));
      setCurrentStep('questions');
    } catch {
      toast.error('Failed to load questions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleQuestionsAnswered = useCallback(
    async (answers: Record<string, string>) => {
      if (!wizardState.selectedMethodology) return;

      setWizardState(prev => ({ ...prev, discoveryAnswers: answers }));
      setCurrentStep('generating');

      try {
        const result = await aiFunnelApi.startGeneration(
          {
            productIds: wizardState.selectedProductIds,
            primaryProductId: wizardState.primaryProductId,
            methodology: wizardState.selectedMethodology,
            discoveryAnswers: answers,
          },
          selectedCompanyId || undefined
        );

        setWizardState(prev => ({ ...prev, generationId: result.generationId }));
      } catch {
        toast.error('Failed to start generation');
        setCurrentStep('questions');
      }
    },
    [wizardState.selectedMethodology, wizardState.selectedProductIds, wizardState.primaryProductId, selectedCompanyId]
  );

  const handleGenerationComplete = useCallback((content: GeneratedFunnelContent) => {
    setWizardState(prev => ({ ...prev, generatedContent: content }));
    setCurrentStep('review');
  }, []);

  const handleGenerationFailed = useCallback(() => {
    setCurrentStep('questions');
  }, []);

  const handleSaveFunnel = useCallback(
    async (name: string, content: GeneratedFunnelContent) => {
      if (!wizardState.generationId) return;

      setIsLoading(true);
      try {
        const result = await aiFunnelApi.saveAsFunnel(
          wizardState.generationId,
          name,
          content,
          selectedCompanyId || undefined
        );
        toast.success('Funnel created successfully!');
        router.push(`/funnels/${result.funnelId}`);
      } catch {
        toast.error('Failed to save funnel');
      } finally {
        setIsLoading(false);
      }
    },
    [wizardState.generationId, selectedCompanyId, router]
  );

  const handleBack = useCallback(() => {
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    if (currentIndex > 0 && currentStep !== 'generating') {
      setCurrentStep(STEP_ORDER[currentIndex - 1]);
    }
  }, [currentStep]);

  const canGoBack = currentStepIndex > 0 && currentStep !== 'generating';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/funnels')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                <SparklesIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  AI Funnel Generator
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Create a professional funnel in minutes
                </p>
              </div>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="mt-6 flex items-center justify-between">
            {STEP_ORDER.slice(0, -1).map((step, index) => {
              const isComplete = index < currentStepIndex;
              const isCurrent = step === currentStep;
              const isPast = index < currentStepIndex;

              return (
                <div key={step} className="flex items-center">
                  <div className="flex items-center">
                    <div
                      className={`
                        flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                        ${isComplete ? 'bg-green-500 text-white' : ''}
                        ${isCurrent ? 'bg-purple-600 text-white' : ''}
                        ${!isComplete && !isCurrent ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400' : ''}
                      `}
                    >
                      {isComplete ? <CheckCircleIcon className="h-5 w-5" /> : index + 1}
                    </div>
                    <span
                      className={`
                        ml-2 text-sm font-medium hidden sm:block
                        ${isCurrent ? 'text-purple-600 dark:text-purple-400' : ''}
                        ${isPast ? 'text-gray-900 dark:text-white' : ''}
                        ${!isCurrent && !isPast ? 'text-gray-500 dark:text-gray-400' : ''}
                      `}
                    >
                      {STEP_LABELS[step]}
                    </span>
                  </div>
                  {index < STEP_ORDER.length - 2 && (
                    <div
                      className={`
                        w-12 sm:w-24 h-0.5 mx-2 sm:mx-4
                        ${isPast ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}
                      `}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentStep === 'products' && (
          <ProductSelectionStep
            selectedProductIds={wizardState.selectedProductIds}
            primaryProductId={wizardState.primaryProductId}
            onNext={handleProductsSelected}
            companyId={selectedCompanyId || undefined}
          />
        )}

        {currentStep === 'methodology' && (
          <MethodologySelectionStep
            methodologies={methodologies}
            selectedMethodology={wizardState.selectedMethodology}
            onSelect={handleMethodologySelected}
            onBack={handleBack}
            isLoading={isLoading}
          />
        )}

        {currentStep === 'questions' && wizardState.selectedMethodology && (
          <DiscoveryQuestionsStep
            methodology={wizardState.selectedMethodology}
            questions={wizardState.methodologyQuestions}
            answers={wizardState.discoveryAnswers}
            onSubmit={handleQuestionsAnswered}
            onBack={handleBack}
          />
        )}

        {currentStep === 'generating' && wizardState.generationId && (
          <GenerationProgressStep
            generationId={wizardState.generationId}
            companyId={selectedCompanyId || undefined}
            onComplete={handleGenerationComplete}
            onFailed={handleGenerationFailed}
          />
        )}

        {currentStep === 'review' && wizardState.generatedContent && (
          <ReviewEditStep
            content={wizardState.generatedContent}
            generationId={wizardState.generationId!}
            companyId={selectedCompanyId || undefined}
            onSave={handleSaveFunnel}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
}
