'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100 dark:bg-muted">
        <div className="w-8 h-8" />
        <div className="w-8 h-8" />
        <div className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100 dark:bg-muted">
      <button
        onClick={() => setTheme('light')}
        className={`p-2 rounded-md transition-colors ${
          theme === 'light'
            ? 'bg-white dark:bg-muted text-amber-500 shadow-sm'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
        }`}
        title="Light mode"
        aria-label="Light mode"
      >
        <SunIcon className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme('system')}
        className={`p-2 rounded-md transition-colors ${
          theme === 'system'
            ? 'bg-white dark:bg-muted text-blue-500 shadow-sm'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
        }`}
        title="System preference"
        aria-label="System preference"
      >
        <ComputerDesktopIcon className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`p-2 rounded-md transition-colors ${
          theme === 'dark'
            ? 'bg-white dark:bg-muted text-indigo-500 shadow-sm'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
        }`}
        title="Dark mode"
        aria-label="Dark mode"
      >
        <MoonIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

// Compact dropdown version for tight spaces
export function ThemeDropdown() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-8 h-8" />;
  }

  const Icon = resolvedTheme === 'dark' ? MoonIcon : SunIcon;

  return (
    <div className="relative group">
      <button
        className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-muted transition-colors"
        aria-label="Toggle theme"
      >
        <Icon className="w-5 h-5" />
      </button>
      <div className="absolute right-0 mt-2 py-1 w-36 bg-white dark:bg-muted rounded-lg shadow-lg border border-gray-200 dark:border-border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        <button
          onClick={() => setTheme('light')}
          className={`flex items-center gap-2 w-full px-3 py-2 text-sm ${
            theme === 'light'
              ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-muted'
          }`}
        >
          <SunIcon className="w-4 h-4" />
          Light
        </button>
        <button
          onClick={() => setTheme('dark')}
          className={`flex items-center gap-2 w-full px-3 py-2 text-sm ${
            theme === 'dark'
              ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-muted'
          }`}
        >
          <MoonIcon className="w-4 h-4" />
          Dark
        </button>
        <button
          onClick={() => setTheme('system')}
          className={`flex items-center gap-2 w-full px-3 py-2 text-sm ${
            theme === 'system'
              ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-muted'
          }`}
        >
          <ComputerDesktopIcon className="w-4 h-4" />
          System
        </button>
      </div>
    </div>
  );
}
