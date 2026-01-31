'use client';

import { useEffect, useState, type ReactNode } from 'react';

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Simple theme provider that syncs with system preferences
 * Adds 'dark' class to document element when system prefers dark mode
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Function to update theme based on system preference
    const updateTheme = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    // Check initial preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    updateTheme(mediaQuery);

    // Listen for changes
    mediaQuery.addEventListener('change', updateTheme);

    return () => {
      mediaQuery.removeEventListener('change', updateTheme);
    };
  }, []);

  // Prevent flash of incorrect theme
  if (!mounted) {
    return null;
  }

  return <>{children}</>;
}

export default ThemeProvider;
