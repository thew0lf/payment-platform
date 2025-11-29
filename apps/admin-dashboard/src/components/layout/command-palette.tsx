'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  ArrowRight,
  Command,
  CornerDownLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAllNavItems } from '@/lib/navigation';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CommandItem {
  id: string;
  label: string;
  section: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Get all navigation items from centralized config
  const allItems = useMemo((): CommandItem[] => {
    return getAllNavItems().map((item) => ({
      id: item.id,
      label: item.label,
      section: item.section,
      href: item.href,
      icon: item.icon,
    }));
  }, []);

  // Filter items based on query
  const filteredItems = useMemo(() => {
    if (!query.trim()) return allItems;

    const searchTerms = query.toLowerCase().split(/\s+/);
    return allItems.filter((item) => {
      const searchableText = `${item.label} ${item.section}`.toLowerCase();
      return searchTerms.every((term) => searchableText.includes(term));
    });
  }, [query, allItems]);

  // Group items by section
  const groupedItems = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    filteredItems.forEach((item) => {
      if (!groups[item.section]) {
        groups[item.section] = [];
      }
      groups[item.section].push(item);
    });
    return groups;
  }, [filteredItems]);

  // Flatten for keyboard navigation
  const flatItems = useMemo(() => {
    return Object.values(groupedItems).flat();
  }, [groupedItems]);

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, flatItems.length - 1));
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          event.preventDefault();
          if (flatItems[selectedIndex]) {
            router.push(flatItems[selectedIndex].href);
            onOpenChange(false);
            setQuery('');
          }
          break;
        case 'Escape':
          event.preventDefault();
          onOpenChange(false);
          setQuery('');
          break;
      }
    },
    [flatItems, selectedIndex, router, onOpenChange]
  );

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && selectedIndex >= 0) {
      const selectedElement = listRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      );
      selectedElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Global keyboard shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Open with Cmd+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }

      // Close with Escape
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
        setQuery('');
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  let itemIndex = -1;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={() => {
          onOpenChange(false);
          setQuery('');
        }}
        aria-hidden="true"
      />

      {/* Command Palette Dialog */}
      <div
        className="fixed inset-x-4 top-[20%] mx-auto max-w-xl z-50 md:inset-x-auto"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
            <Search className="w-5 h-5 text-zinc-500" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search pages..."
              className="flex-1 bg-transparent text-white placeholder-zinc-500 outline-none text-sm"
              aria-label="Search navigation"
              autoComplete="off"
            />
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-400">
              <span>esc</span>
            </kbd>
          </div>

          {/* Results */}
          <div
            ref={listRef}
            className="max-h-[60vh] overflow-y-auto py-2"
            role="listbox"
          >
            {flatItems.length === 0 ? (
              <div className="px-4 py-8 text-center text-zinc-500">
                <p className="text-sm">No results found</p>
                <p className="text-xs mt-1">Try a different search term</p>
              </div>
            ) : (
              Object.entries(groupedItems).map(([section, items]) => (
                <div key={section}>
                  <div className="px-4 py-2">
                    <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      {section}
                    </span>
                  </div>
                  {items.map((item) => {
                    itemIndex++;
                    const currentIndex = itemIndex;
                    const Icon = item.icon;
                    const isSelected = selectedIndex === currentIndex;

                    return (
                      <button
                        key={item.id}
                        data-index={currentIndex}
                        onClick={() => {
                          router.push(item.href);
                          onOpenChange(false);
                          setQuery('');
                        }}
                        onMouseEnter={() => setSelectedIndex(currentIndex)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-2 text-left transition-colors',
                          isSelected
                            ? 'bg-zinc-800 text-white'
                            : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                        )}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                        <span className="flex-1 text-sm">{item.label}</span>
                        {isSelected && (
                          <ArrowRight className="w-4 h-4 text-zinc-500" aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer with keyboard hints */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-800 text-xs text-zinc-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">↓</kbd>
                <span className="ml-1">to navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded flex items-center">
                  <CornerDownLeft className="w-3 h-3" />
                </kbd>
                <span className="ml-1">to select</span>
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded flex items-center">
                <Command className="w-3 h-3" />
              </kbd>
              <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">K</kbd>
              <span className="ml-1">to open</span>
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
