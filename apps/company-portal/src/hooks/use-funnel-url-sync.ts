'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import { Funnel } from '@/lib/api';

interface UseFunnelUrlSyncOptions {
  funnel: Funnel | null;
  currentStageIndex: number;
  goToStage: (index: number) => Promise<void>;
  isInitialized: boolean;
}

/**
 * Hook to sync funnel stage navigation with browser URL
 *
 * Features:
 * - Reads stage from URL query params on initial load
 * - Updates URL when stage changes
 * - Handles browser back/forward navigation
 * - Maintains other query params (utm_*, etc.)
 *
 * URL format: /f/funnel-slug?stage=checkout
 */
export function useFunnelUrlSync({
  funnel,
  currentStageIndex,
  goToStage,
  isInitialized,
}: UseFunnelUrlSyncOptions) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Track if we've done initial sync to prevent infinite loops
  const hasInitialSyncRef = useRef(false);
  const lastSyncedIndexRef = useRef<number>(-1);
  const isNavigatingRef = useRef(false);

  /**
   * Get stage index from stage type name
   */
  const getStageIndexByType = useCallback((stageType: string): number => {
    if (!funnel?.stages) return -1;
    const normalizedType = stageType.toUpperCase().replace(/-/g, '_');
    return funnel.stages.findIndex(
      (s) => s.type.toUpperCase() === normalizedType
    );
  }, [funnel?.stages]);

  /**
   * Get stage type name from index
   */
  const getStageTypeByIndex = useCallback((index: number): string | null => {
    if (!funnel?.stages || index < 0 || index >= funnel.stages.length) {
      return null;
    }
    // Convert PRODUCT_SELECTION to product-selection for URL friendliness
    return funnel.stages[index].type.toLowerCase().replace(/_/g, '-');
  }, [funnel?.stages]);

  /**
   * Update URL with current stage (without adding to history)
   */
  const updateUrlWithStage = useCallback((stageIndex: number) => {
    if (typeof window === 'undefined' || !funnel?.stages) return;

    const stageType = getStageTypeByIndex(stageIndex);
    if (!stageType) return;

    // Build new URL preserving existing params
    const params = new URLSearchParams(searchParams.toString());
    params.set('stage', stageType);

    const newUrl = `${pathname}?${params.toString()}`;

    // Use replaceState for programmatic navigation (forward navigation)
    // This prevents polluting history with every stage change
    window.history.replaceState(
      { stageIndex, stageType },
      '',
      newUrl
    );

    lastSyncedIndexRef.current = stageIndex;
  }, [funnel?.stages, pathname, searchParams, getStageTypeByIndex]);

  /**
   * Push to history when advancing stages (for back button support)
   */
  const pushStageToHistory = useCallback((stageIndex: number) => {
    if (typeof window === 'undefined' || !funnel?.stages) return;

    const stageType = getStageTypeByIndex(stageIndex);
    if (!stageType) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set('stage', stageType);

    const newUrl = `${pathname}?${params.toString()}`;

    // Use pushState to add to history (enables back button)
    window.history.pushState(
      { stageIndex, stageType },
      '',
      newUrl
    );

    lastSyncedIndexRef.current = stageIndex;
  }, [funnel?.stages, pathname, searchParams, getStageTypeByIndex]);

  /**
   * Handle initial URL -> state sync
   * Reads stage from URL and navigates to it
   */
  useEffect(() => {
    if (!isInitialized || !funnel?.stages || hasInitialSyncRef.current) {
      return;
    }

    const stageParam = searchParams.get('stage');

    if (stageParam) {
      const targetIndex = getStageIndexByType(stageParam);

      if (targetIndex >= 0 && targetIndex !== currentStageIndex) {
        // Navigate to the stage from URL
        hasInitialSyncRef.current = true;
        isNavigatingRef.current = true;

        goToStage(targetIndex).then(() => {
          isNavigatingRef.current = false;
          lastSyncedIndexRef.current = targetIndex;
        }).catch((err) => {
          console.error('Failed to navigate to stage from URL:', err);
          isNavigatingRef.current = false;
        });
        return;
      }
    }

    // No stage in URL or already at correct stage
    // Set initial URL to current stage
    hasInitialSyncRef.current = true;
    updateUrlWithStage(currentStageIndex);
  }, [
    isInitialized,
    funnel?.stages,
    searchParams,
    currentStageIndex,
    getStageIndexByType,
    goToStage,
    updateUrlWithStage,
  ]);

  /**
   * Handle state -> URL sync
   * Updates URL when stage changes programmatically
   */
  useEffect(() => {
    if (!hasInitialSyncRef.current || !funnel?.stages || isNavigatingRef.current) {
      return;
    }

    // Only sync if stage actually changed
    if (lastSyncedIndexRef.current !== currentStageIndex) {
      // Push to history for forward navigation (enables back button)
      if (currentStageIndex > lastSyncedIndexRef.current) {
        pushStageToHistory(currentStageIndex);
      } else {
        // Replace for back navigation (don't double up history)
        updateUrlWithStage(currentStageIndex);
      }
    }
  }, [currentStageIndex, funnel?.stages, pushStageToHistory, updateUrlWithStage]);

  /**
   * Handle browser back/forward navigation (popstate)
   */
  useEffect(() => {
    if (typeof window === 'undefined' || !funnel?.stages) return;

    const handlePopState = (event: PopStateEvent) => {
      // Check if we have state with stage info
      const stageIndex = event.state?.stageIndex;
      const stageType = event.state?.stageType;

      let targetIndex = -1;

      if (typeof stageIndex === 'number' && stageIndex >= 0) {
        targetIndex = stageIndex;
      } else if (typeof stageType === 'string') {
        targetIndex = getStageIndexByType(stageType);
      } else {
        // Fallback: read from URL
        const params = new URLSearchParams(window.location.search);
        const urlStage = params.get('stage');
        if (urlStage) {
          targetIndex = getStageIndexByType(urlStage);
        }
      }

      if (targetIndex >= 0 && targetIndex !== currentStageIndex) {
        // Check if back navigation is allowed
        if (targetIndex < currentStageIndex) {
          if (!funnel.settings?.behavior?.allowBackNavigation) {
            // Back navigation not allowed - push current state back
            pushStageToHistory(currentStageIndex);
            return;
          }
        }

        isNavigatingRef.current = true;
        goToStage(targetIndex).then(() => {
          isNavigatingRef.current = false;
          lastSyncedIndexRef.current = targetIndex;
        }).catch((err) => {
          console.error('Failed to navigate via popstate:', err);
          isNavigatingRef.current = false;
        });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [
    funnel?.stages,
    funnel?.settings?.behavior?.allowBackNavigation,
    currentStageIndex,
    getStageIndexByType,
    goToStage,
    pushStageToHistory,
  ]);

  /**
   * Return helpers for manual URL manipulation
   */
  return {
    /**
     * Get the current stage type from URL
     */
    getStageFromUrl: useCallback(() => {
      return searchParams.get('stage');
    }, [searchParams]),

    /**
     * Navigate to a stage by type name
     */
    navigateToStage: useCallback(async (stageType: string) => {
      const index = getStageIndexByType(stageType);
      if (index >= 0) {
        await goToStage(index);
      }
    }, [getStageIndexByType, goToStage]),
  };
}
