'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { useAuth } from './auth-context';
import { profileApi, UserPreferences, ThemePreference } from '@/lib/api/profile';

interface PreferencesContextType {
  // Preferences state
  preferences: UserPreferences;
  isLoading: boolean;

  // Sidebar collapsed state
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Theme (synced with next-themes)
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;

  // Save preferences to API
  savePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
}

const defaultPreferences: UserPreferences = {
  theme: 'system',
  sidebarCollapsed: false,
};

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const { setTheme: setNextTheme, theme: nextTheme } = useTheme();

  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Load preferences from API when authenticated
  useEffect(() => {
    async function loadPreferences() {
      if (!isAuthenticated || !user) {
        setIsLoading(false);
        return;
      }

      try {
        const prefs = await profileApi.getPreferences();
        setPreferences(prefs);

        // Sync theme with next-themes
        if (prefs.theme) {
          setNextTheme(prefs.theme);
        }

        setHasLoaded(true);
      } catch (error) {
        console.error('Failed to load preferences:', error);
        // Use defaults on error
        setPreferences(defaultPreferences);
      } finally {
        setIsLoading(false);
      }
    }

    loadPreferences();
  }, [isAuthenticated, user, setNextTheme]);

  // Save preferences to API (debounced)
  const savePreferences = useCallback(async (prefs: Partial<UserPreferences>) => {
    if (!isAuthenticated || !user) return;

    try {
      const updated = await profileApi.updatePreferences(prefs);
      setPreferences(updated);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  }, [isAuthenticated, user]);

  // Toggle sidebar collapsed state
  const toggleSidebar = useCallback(() => {
    const newCollapsed = !preferences.sidebarCollapsed;
    setPreferences(prev => ({ ...prev, sidebarCollapsed: newCollapsed }));

    // Save to API (fire and forget)
    if (hasLoaded) {
      savePreferences({ sidebarCollapsed: newCollapsed });
    }
  }, [preferences.sidebarCollapsed, hasLoaded, savePreferences]);

  // Set sidebar collapsed state
  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setPreferences(prev => ({ ...prev, sidebarCollapsed: collapsed }));

    // Save to API (fire and forget)
    if (hasLoaded) {
      savePreferences({ sidebarCollapsed: collapsed });
    }
  }, [hasLoaded, savePreferences]);

  // Set theme (syncs with next-themes and saves to API)
  const setTheme = useCallback((theme: ThemePreference) => {
    setPreferences(prev => ({ ...prev, theme }));
    setNextTheme(theme);

    // Save to API (fire and forget)
    if (hasLoaded) {
      savePreferences({ theme });
    }
  }, [hasLoaded, savePreferences, setNextTheme]);

  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        isLoading,
        sidebarCollapsed: preferences.sidebarCollapsed,
        toggleSidebar,
        setSidebarCollapsed,
        theme: preferences.theme,
        setTheme,
        savePreferences,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}
