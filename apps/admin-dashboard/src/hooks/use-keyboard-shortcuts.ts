'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface ShortcutDefinition {
  key: string;
  modifiers?: {
    meta?: boolean;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
  };
  action: () => void;
  description: string;
}

interface UseKeyboardShortcutsOptions {
  onCommandPalette?: () => void;
  enabled?: boolean;
}

/**
 * Keyboard shortcuts hook for navigation and command palette
 *
 * Shortcuts:
 * - Cmd/Ctrl+K: Open command palette
 * - g then o: Go to Orders
 * - g then t: Go to Transactions
 * - g then c: Go to Customers
 * - g then p: Go to Products
 * - g then s: Go to Shipments
 * - g then i: Go to Integrations
 * - g then h: Go to Home/Dashboard
 * - ?: Open keyboard shortcuts help
 */
export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const { onCommandPalette, enabled = true } = options;
  const router = useRouter();
  const lastKeyRef = useRef<string | null>(null);
  const lastKeyTimeRef = useRef<number>(0);

  // G-key navigation sequences
  const gKeyMappings: Record<string, string> = {
    o: '/orders',
    t: '/transactions',
    c: '/customers',
    p: '/products',
    s: '/shipments',
    i: '/integrations',
    h: '/',
    m: '/settings/merchant-accounts',
    r: '/routing',
    a: '/settings/api-keys',
  };

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore if user is typing in an input, textarea, or contenteditable
      const target = event.target as HTMLElement;
      const isInputElement =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('[role="dialog"]'); // Ignore in modals

      // Command palette: Cmd/Ctrl+K (works everywhere except in input fields)
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        onCommandPalette?.();
        return;
      }

      // Skip other shortcuts if in input
      if (isInputElement) return;

      // Escape: Close any open dialogs (handled by components)
      if (event.key === 'Escape') {
        return;
      }

      // G-key sequences: g then another key within 500ms
      const now = Date.now();
      const timeSinceLastKey = now - lastKeyTimeRef.current;

      if (lastKeyRef.current === 'g' && timeSinceLastKey < 500) {
        const destination = gKeyMappings[event.key.toLowerCase()];
        if (destination) {
          event.preventDefault();
          router.push(destination);
          lastKeyRef.current = null;
          return;
        }
      }

      // Track 'g' key press
      if (event.key === 'g' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        lastKeyRef.current = 'g';
        lastKeyTimeRef.current = now;
        return;
      }

      // Question mark: Show shortcuts help
      if (event.key === '?' && event.shiftKey) {
        event.preventDefault();
        // Could open a help modal here
        console.log('Keyboard shortcuts help');
        return;
      }

      // Reset sequence tracking for other keys
      lastKeyRef.current = null;
    },
    [enabled, onCommandPalette, router]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);

  // Return shortcut definitions for display in help/command palette
  const shortcuts: ShortcutDefinition[] = [
    {
      key: 'k',
      modifiers: { meta: true },
      action: () => onCommandPalette?.(),
      description: 'Open command palette',
    },
    {
      key: 'g o',
      action: () => router.push('/orders'),
      description: 'Go to Orders',
    },
    {
      key: 'g t',
      action: () => router.push('/transactions'),
      description: 'Go to Transactions',
    },
    {
      key: 'g c',
      action: () => router.push('/customers'),
      description: 'Go to Customers',
    },
    {
      key: 'g p',
      action: () => router.push('/products'),
      description: 'Go to Products',
    },
    {
      key: 'g s',
      action: () => router.push('/shipments'),
      description: 'Go to Shipments',
    },
    {
      key: 'g i',
      action: () => router.push('/integrations'),
      description: 'Go to Integrations',
    },
    {
      key: 'g h',
      action: () => router.push('/'),
      description: 'Go to Dashboard',
    },
    {
      key: 'g m',
      action: () => router.push('/settings/merchant-accounts'),
      description: 'Go to Merchant Accounts',
    },
    {
      key: 'g r',
      action: () => router.push('/routing'),
      description: 'Go to Routing Rules',
    },
    {
      key: 'g a',
      action: () => router.push('/settings/api-keys'),
      description: 'Go to API Keys',
    },
  ];

  return { shortcuts };
}
