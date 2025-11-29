'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import {
  getDefaultExpandedState,
  findSectionByPath,
  SIDEBAR_STORAGE_KEY,
} from '@/lib/navigation';

/**
 * Hook for managing sidebar section expanded/collapsed state
 * - Persists state to localStorage with debouncing
 * - Auto-expands section containing active route
 * - Provides toggle and expand functions
 */
export function useSidebarState() {
  const pathname = usePathname();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    // Initialize with defaults (will be overwritten by localStorage on mount)
    return getDefaultExpandedState();
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setExpandedSections((prev) => ({ ...prev, ...parsed }));
      }
    } catch (e) {
      // localStorage not available or invalid JSON
      console.warn('Failed to load sidebar state:', e);
    }
    setIsInitialized(true);
  }, []);

  // Debounced save to localStorage
  const saveToStorage = useCallback((state: Record<string, boolean>) => {
    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce by 300ms
    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
        console.warn('Failed to save sidebar state:', e);
      }
    }, 300);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Auto-expand section containing current route
  useEffect(() => {
    if (!isInitialized || !pathname) return;

    const activeSection = findSectionByPath(pathname);
    if (activeSection && !expandedSections[activeSection.id]) {
      setExpandedSections((prev) => {
        const newState = { ...prev, [activeSection.id]: true };
        saveToStorage(newState);
        return newState;
      });
    }
  }, [pathname, isInitialized, expandedSections, saveToStorage]);

  // Toggle a section's expanded state
  const toggleSection = useCallback(
    (sectionId: string) => {
      setExpandedSections((prev) => {
        const newState = { ...prev, [sectionId]: !prev[sectionId] };
        saveToStorage(newState);
        return newState;
      });
    },
    [saveToStorage]
  );

  // Expand a specific section (useful for keyboard navigation)
  const expandSection = useCallback(
    (sectionId: string) => {
      setExpandedSections((prev) => {
        if (prev[sectionId]) return prev; // Already expanded
        const newState = { ...prev, [sectionId]: true };
        saveToStorage(newState);
        return newState;
      });
    },
    [saveToStorage]
  );

  // Collapse a specific section
  const collapseSection = useCallback(
    (sectionId: string) => {
      setExpandedSections((prev) => {
        if (!prev[sectionId]) return prev; // Already collapsed
        const newState = { ...prev, [sectionId]: false };
        saveToStorage(newState);
        return newState;
      });
    },
    [saveToStorage]
  );

  // Expand all sections
  const expandAll = useCallback(() => {
    setExpandedSections((prev) => {
      const newState = Object.keys(prev).reduce(
        (acc, key) => ({ ...acc, [key]: true }),
        {} as Record<string, boolean>
      );
      saveToStorage(newState);
      return newState;
    });
  }, [saveToStorage]);

  // Collapse all sections
  const collapseAll = useCallback(() => {
    setExpandedSections((prev) => {
      const newState = Object.keys(prev).reduce(
        (acc, key) => ({ ...acc, [key]: false }),
        {} as Record<string, boolean>
      );
      saveToStorage(newState);
      return newState;
    });
  }, [saveToStorage]);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    const defaults = getDefaultExpandedState();
    setExpandedSections(defaults);
    saveToStorage(defaults);
  }, [saveToStorage]);

  return {
    expandedSections,
    isInitialized,
    toggleSection,
    expandSection,
    collapseSection,
    expandAll,
    collapseAll,
    resetToDefaults,
  };
}
