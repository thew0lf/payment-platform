'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';

interface FunnelStage {
  id: string;
  name: string;
  type: string;
  order: number;
}

interface UseFunnelUrlSyncOptions {
  stages: FunnelStage[];
  currentStageIndex: number;
  setCurrentStageIndex: (index: number) => void;
  isInitialized: boolean;
}

/**
 * Hook to sync funnel stage navigation with browser URL
 * Simplified version for admin-dashboard preview pages
 *
 * Features:
 * - Reads stage from URL query params on initial load
 * - Updates URL when stage changes
 * - Handles browser back/forward navigation
 *
 * URL format: /f/funnel-slug?stage=checkout
 */
export function useFunnelUrlSync({
  stages,
  currentStageIndex,
  setCurrentStageIndex,
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
    if (!stages || stages.length === 0) return -1;
    const normalizedType = stageType.toUpperCase().replace(/-/g, '_');
    return stages.findIndex(
      (s) => s.type.toUpperCase() === normalizedType
    );
  }, [stages]);

  /**
   * Get stage type name from index
   */
  const getStageTypeByIndex = useCallback((index: number): string | null => {
    if (!stages || index < 0 || index >= stages.length) {
      return null;
    }
    // Convert PRODUCT_SELECTION to product-selection for URL friendliness
    return stages[index].type.toLowerCase().replace(/_/g, '-');
  }, [stages]);

  /**
   * Update URL with current stage (without adding to history)
   */
  const updateUrlWithStage = useCallback((stageIndex: number) => {
    if (typeof window === 'undefined' || !stages || stages.length === 0) return;

    const stageType = getStageTypeByIndex(stageIndex);
    if (!stageType) return;

    // Build new URL preserving existing params
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('stage', stageType);

    const newUrl = `${pathname}?${params.toString()}`;

    // Use replaceState for programmatic navigation
    window.history.replaceState(
      { stageIndex, stageType },
      '',
      newUrl
    );

    lastSyncedIndexRef.current = stageIndex;
  }, [stages, pathname, searchParams, getStageTypeByIndex]);

  /**
   * Push to history when advancing stages (for back button support)
   */
  const pushStageToHistory = useCallback((stageIndex: number) => {
    if (typeof window === 'undefined' || !stages || stages.length === 0) return;

    const stageType = getStageTypeByIndex(stageIndex);
    if (!stageType) return;

    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('stage', stageType);

    const newUrl = `${pathname}?${params.toString()}`;

    // Use pushState to add to history (enables back button)
    window.history.pushState(
      { stageIndex, stageType },
      '',
      newUrl
    );

    lastSyncedIndexRef.current = stageIndex;
  }, [stages, pathname, searchParams, getStageTypeByIndex]);

  /**
   * Handle initial URL -> state sync
   */
  useEffect(() => {
    if (!isInitialized || !stages || stages.length === 0 || hasInitialSyncRef.current) {
      return;
    }

    const stageParam = searchParams?.get('stage') ?? null;

    if (stageParam) {
      const targetIndex = getStageIndexByType(stageParam);

      if (targetIndex >= 0 && targetIndex !== currentStageIndex) {
        // Navigate to the stage from URL
        hasInitialSyncRef.current = true;
        isNavigatingRef.current = true;
        setCurrentStageIndex(targetIndex);
        lastSyncedIndexRef.current = targetIndex;
        isNavigatingRef.current = false;
        return;
      }
    }

    // No stage in URL or already at correct stage
    hasInitialSyncRef.current = true;
    updateUrlWithStage(currentStageIndex);
  }, [
    isInitialized,
    stages,
    searchParams,
    currentStageIndex,
    getStageIndexByType,
    setCurrentStageIndex,
    updateUrlWithStage,
  ]);

  /**
   * Handle state -> URL sync
   */
  useEffect(() => {
    if (!hasInitialSyncRef.current || !stages || stages.length === 0 || isNavigatingRef.current) {
      return;
    }

    // Only sync if stage actually changed
    if (lastSyncedIndexRef.current !== currentStageIndex) {
      // Push to history for forward navigation (enables back button)
      if (currentStageIndex > lastSyncedIndexRef.current) {
        pushStageToHistory(currentStageIndex);
      } else {
        // Replace for back navigation
        updateUrlWithStage(currentStageIndex);
      }
    }
  }, [currentStageIndex, stages, pushStageToHistory, updateUrlWithStage]);

  /**
   * Handle browser back/forward navigation (popstate)
   */
  useEffect(() => {
    if (typeof window === 'undefined' || !stages || stages.length === 0) return;

    const handlePopState = (event: PopStateEvent) => {
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
        isNavigatingRef.current = true;
        setCurrentStageIndex(targetIndex);
        lastSyncedIndexRef.current = targetIndex;
        isNavigatingRef.current = false;
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [
    stages,
    currentStageIndex,
    getStageIndexByType,
    setCurrentStageIndex,
  ]);

  return {
    getStageFromUrl: useCallback(() => {
      return searchParams?.get('stage') ?? null;
    }, [searchParams]),
  };
}
