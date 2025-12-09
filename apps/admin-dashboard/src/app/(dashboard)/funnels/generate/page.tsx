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
import { funnelsApi, FunnelType } from '@/lib/api/funnels';
import type {
  MarketingMethodology,
  MethodologySummary,
  DiscoveryQuestion,
  GeneratedFunnelContent,
} from '@/lib/api/ai-funnel';
import { ProductSelectionStep, type Product } from './steps/product-selection';
import { MethodologySelectionStep } from './steps/methodology-selection';
import { DiscoveryQuestionsStep } from './steps/discovery-questions';
import { GenerationProgressStep } from './steps/generation-progress';
import { ReviewEditStep } from './steps/review-edit';

type WizardStep = 'products' | 'methodology' | 'questions' | 'generating' | 'review';

interface WizardState {
  selectedProductIds: string[];
  primaryProductId?: string;
  selectedProducts: Product[];
  selectedMethodology?: MarketingMethodology;
  recommendedMethodology?: MarketingMethodology;
  methodologyQuestions: DiscoveryQuestion[];
  discoveryAnswers: Record<string, string>;
  miSuggestions: Record<string, string>;
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
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [wizardState, setWizardState] = useState<WizardState>({
    selectedProductIds: [],
    selectedProducts: [],
    methodologyQuestions: [],
    discoveryAnswers: {},
    miSuggestions: {},
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

  // Generate MI suggestions based on product descriptions
  const generateMISuggestions = useCallback((products: Product[], primaryProductId?: string): Record<string, string> => {
    const primaryProduct = products.find(p => p.id === primaryProductId) || products[0];
    if (!primaryProduct) return {};

    const description = primaryProduct.description || '';
    const name = primaryProduct.name || '';
    const price = primaryProduct.price || 0;
    const allDescriptions = products.map(p => p.description || '').join(' ');

    // Analyze product to generate smart prefills
    const suggestions: Record<string, string> = {};

    // Detect product characteristics from description
    const isPremium = price > 30 || /premium|luxury|artisan|craft|specialty|reserve/i.test(allDescriptions);
    const isCoffee = /coffee|roast|brew|espresso|bean/i.test(allDescriptions);
    const isExperience = /experience|journey|discover|transform/i.test(allDescriptions);
    const hasOrigin = /origin|source|farm|region/i.test(allDescriptions);

    // initial_emotion - based on product type
    if (isPremium || isExperience) {
      suggestions.initial_emotion = 'Desire - wanting what they see';
    } else if (isCoffee) {
      suggestions.initial_emotion = 'Curiosity - intrigued and wanting more';
    } else {
      suggestions.initial_emotion = 'Excitement - energized and eager';
    }

    // transformation - who customer wants to become
    if (isCoffee) {
      suggestions.transformation = `A discerning coffee connoisseur who appreciates quality and craftsmanship. Someone who starts each day with an exceptional cup that elevates their morning ritual.`;
    } else if (isPremium) {
      suggestions.transformation = `Someone who invests in quality over quantity. A person who appreciates the finer things and isn't willing to settle for less.`;
    }

    // current_pain - the trigger moment
    if (isCoffee) {
      suggestions.current_pain = `That disappointing moment when they take a sip of their usual coffee and realize it tastes flat, bitter, or just... mediocre. They know there's better out there, but haven't found it yet.`;
    } else {
      suggestions.current_pain = `The frustration of settling for products that don't meet their standards. They've tried cheaper alternatives and been disappointed every time.`;
    }

    // main_objection
    if (price > 20) {
      suggestions.main_objection = `"I can get coffee/products cheaper elsewhere"`;
    } else {
      suggestions.main_objection = `"I'm not sure if this is right for me"`;
    }

    // credibility_proof - based on product info
    if (hasOrigin) {
      suggestions.credibility_proof = `Direct relationships with farmers and artisan producers worldwide`;
    } else if (isPremium) {
      suggestions.credibility_proof = `Trusted by thousands of discerning customers`;
    }

    // unique_mechanism
    if (isCoffee && hasOrigin) {
      suggestions.unique_mechanism = `We source directly from small-batch farms and roast within days of shipping, so you taste the coffee at peak freshness with distinct regional flavors you won't find anywhere else.`;
    } else if (isPremium) {
      suggestions.unique_mechanism = `Our careful curation process ensures only the highest quality products make it to your door.`;
    }

    // urgency_reason (optional)
    if (/limited|small.?batch|seasonal/i.test(allDescriptions)) {
      suggestions.urgency_reason = `Small-batch production means limited availability`;
    }

    return suggestions;
  }, []);

  // Determine recommended methodology based on product analysis
  const getRecommendedMethodology = useCallback((products: Product[], primaryProductId?: string): MarketingMethodology => {
    const primaryProduct = products.find(p => p.id === primaryProductId) || products[0];
    if (!primaryProduct) return 'NCI'; // Default

    const allDescriptions = products.map(p => (p.description || '') + ' ' + p.name).join(' ').toLowerCase();
    const price = primaryProduct.price || 0;

    // Analyze product characteristics
    const isPremium = price > 30 || /premium|luxury|artisan|craft|specialty|reserve|exclusive/i.test(allDescriptions);
    const isProblemSolver = /solve|fix|relief|cure|eliminate|stop|reduce|prevent/i.test(allDescriptions);
    const hasStory = /story|journey|tradition|heritage|founder|family|generation|handcraft/i.test(allDescriptions);
    const isTechProduct = /software|app|platform|saas|digital|online|automated/i.test(allDescriptions);
    const isService = /service|consulting|coaching|training|support|help/i.test(allDescriptions);

    // Methodology selection logic
    if (hasStory) {
      return 'STORYBRAND'; // Story-driven products
    }
    if (isProblemSolver) {
      return 'PAS'; // Problem-Agitate-Solve for pain points
    }
    if (isTechProduct || isService) {
      return 'AIDA'; // Attention-Interest-Desire-Action for tech/services
    }
    if (isPremium) {
      return 'NCI'; // Non-verbal Communication Influence for premium
    }
    // Default to NCI for most consumer products
    return 'NCI';
  }, []);

  const handleProductsSelected = useCallback((productIds: string[], primaryId: string | undefined, selectedProducts: Product[]) => {
    const miSuggestions = generateMISuggestions(selectedProducts, primaryId);
    const recommendedMethodology = getRecommendedMethodology(selectedProducts, primaryId);

    setWizardState(prev => ({
      ...prev,
      selectedProductIds: productIds,
      primaryProductId: primaryId,
      selectedProducts,
      miSuggestions,
      recommendedMethodology,
      // Pre-fill answers with MI suggestions
      discoveryAnswers: { ...miSuggestions },
    }));
    setCurrentStep('methodology');
  }, [generateMISuggestions, getRecommendedMethodology]);

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

  const handleSaveDraft = useCallback(
    async (answers: Record<string, string>) => {
      if (!selectedCompanyId) {
        toast.error('Please select a company first');
        return;
      }

      setIsSavingDraft(true);
      try {
        // Generate a name from the primary product
        const primaryProduct = wizardState.selectedProducts.find(
          p => p.id === wizardState.primaryProductId
        ) || wizardState.selectedProducts[0];

        const funnelName = primaryProduct
          ? `${primaryProduct.name} Funnel (Draft)`
          : 'New Funnel (Draft)';

        // Create a draft funnel with basic settings
        const funnel = await funnelsApi.create(
          {
            name: funnelName,
            type: FunnelType.FULL_FUNNEL,
            settings: {
              methodology: wizardState.selectedMethodology,
              discoveryAnswers: answers,
              productIds: wizardState.selectedProductIds,
              primaryProductId: wizardState.primaryProductId,
              generatedWithAI: false,
              draftSavedAt: new Date().toISOString(),
            },
          },
          selectedCompanyId
        );

        toast.success('Draft saved! You can continue editing anytime.');
        router.push(`/funnels/${funnel.id}`);
      } catch (error) {
        toast.error('Failed to save draft');
      } finally {
        setIsSavingDraft(false);
      }
    },
    [selectedCompanyId, wizardState.selectedProducts, wizardState.selectedMethodology, wizardState.selectedProductIds, wizardState.primaryProductId, router]
  );

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
                  Powered by Momentum Intelligence™ — Create a professional funnel in minutes
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
            recommendedMethodology={wizardState.recommendedMethodology}
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
            miSuggestions={wizardState.miSuggestions}
            onSubmit={handleQuestionsAnswered}
            onSaveDraft={handleSaveDraft}
            onBack={handleBack}
            isSavingDraft={isSavingDraft}
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
