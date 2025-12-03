'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Funnel, FunnelStage, FunnelSession } from '@/lib/api';
import { startSession, advanceStage, trackEvent, updateSession } from '@/lib/api';
import { LandingStage } from '@/components/stages/landing-stage';
import { ProductSelectionStage } from '@/components/stages/product-selection-stage';
import { CheckoutStage } from '@/components/stages/checkout-stage';

interface Props {
  funnel: Funnel;
}

export function FunnelRenderer({ funnel }: Props) {
  const [session, setSession] = useState<FunnelSession | null>(null);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [stageData, setStageData] = useState<Record<string, unknown>>({});

  // Initialize session on mount
  useEffect(() => {
    const initSession = async () => {
      try {
        // Check for existing session in localStorage
        const sessionToken = localStorage.getItem(`funnel_session_${funnel.id}`);

        if (sessionToken) {
          // Resume existing session (would need getSession API call)
          // For now, start fresh
        }

        // Start new session
        const newSession = await startSession(funnel.id, {
          referrer: typeof document !== 'undefined' ? document.referrer : undefined,
          utmParams: getUtmParams(),
        });

        setSession(newSession);
        setCurrentStageIndex(newSession.currentStageOrder);
        localStorage.setItem(`funnel_session_${funnel.id}`, newSession.sessionToken);

        // Track page view
        await trackEvent(newSession.sessionToken, 'PAGE_VIEW', {
          funnelId: funnel.id,
          stageName: funnel.stages[0]?.name,
        });
      } catch (error) {
        console.error('Failed to initialize session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initSession();
  }, [funnel.id, funnel.stages]);

  // Get UTM parameters from URL
  const getUtmParams = (): Record<string, string> => {
    if (typeof window === 'undefined') return {};
    const params = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach((key) => {
      const value = params.get(key);
      if (value) utm[key] = value;
    });
    return utm;
  };

  const currentStage = funnel.stages[currentStageIndex];

  // Handle advancing to next stage
  const handleAdvance = useCallback(
    async (data?: Record<string, unknown>) => {
      if (!session) return;

      const nextIndex = currentStageIndex + 1;
      if (nextIndex >= funnel.stages.length) {
        // Funnel completed - would redirect to confirmation or handle order
        return;
      }

      try {
        // Save stage data
        if (data) {
          setStageData((prev) => ({ ...prev, [currentStage.id]: data }));
          await updateSession(session.sessionToken, { stageData: data });
        }

        // Advance to next stage
        const updatedSession = await advanceStage(session.sessionToken, nextIndex);
        setSession(updatedSession);
        setCurrentStageIndex(nextIndex);

        // Track stage advancement
        await trackEvent(session.sessionToken, 'STAGE_ADVANCED', {
          fromStage: currentStage.name,
          toStage: funnel.stages[nextIndex].name,
        });

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (error) {
        console.error('Failed to advance stage:', error);
      }
    },
    [session, currentStageIndex, funnel.stages, currentStage]
  );

  // Handle going back
  const handleBack = useCallback(() => {
    if (currentStageIndex > 0 && funnel.settings?.behavior?.allowBackNavigation !== false) {
      setCurrentStageIndex((prev) => prev - 1);
    }
  }, [currentStageIndex, funnel.settings?.behavior?.allowBackNavigation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!currentStage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Funnel configuration error</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Progress bar */}
      {funnel.settings?.behavior?.showProgressBar !== false && funnel.stages.length > 1 && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-gray-200 z-50">
          <div
            className="h-full bg-[var(--primary-color)] transition-all duration-300"
            style={{ width: `${((currentStageIndex + 1) / funnel.stages.length) * 100}%` }}
          />
        </div>
      )}

      {/* Stage renderer */}
      <div className="pt-2">
        <StageRenderer
          stage={currentStage}
          funnel={funnel}
          stageData={stageData}
          onAdvance={handleAdvance}
          onBack={handleBack}
          canGoBack={currentStageIndex > 0 && funnel.settings?.behavior?.allowBackNavigation !== false}
          isLastStage={currentStageIndex === funnel.stages.length - 1}
        />
      </div>
    </div>
  );
}

interface StageRendererProps {
  stage: FunnelStage;
  funnel: Funnel;
  stageData: Record<string, unknown>;
  onAdvance: (data?: Record<string, unknown>) => void;
  onBack: () => void;
  canGoBack: boolean;
  isLastStage: boolean;
}

function StageRenderer({
  stage,
  funnel,
  stageData,
  onAdvance,
  onBack,
  canGoBack,
  isLastStage,
}: StageRendererProps) {
  switch (stage.type) {
    case 'LANDING':
      return (
        <LandingStage
          stage={stage}
          funnel={funnel}
          onAdvance={onAdvance}
        />
      );

    case 'PRODUCT_SELECTION':
      return (
        <ProductSelectionStage
          stage={stage}
          funnel={funnel}
          stageData={stageData}
          onAdvance={onAdvance}
          onBack={onBack}
          canGoBack={canGoBack}
        />
      );

    case 'CHECKOUT':
      return (
        <CheckoutStage
          stage={stage}
          funnel={funnel}
          stageData={stageData}
          onAdvance={onAdvance}
          onBack={onBack}
          canGoBack={canGoBack}
          isLastStage={isLastStage}
        />
      );

    default:
      return (
        <div className="max-w-2xl mx-auto p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">{stage.name}</h2>
          <p className="text-gray-600 mb-8">Stage type "{stage.type}" is not yet implemented.</p>
          <button
            onClick={() => onAdvance()}
            className="px-6 py-3 bg-[var(--primary-color)] text-white rounded-lg hover:opacity-90"
          >
            Continue
          </button>
        </div>
      );
  }
}
