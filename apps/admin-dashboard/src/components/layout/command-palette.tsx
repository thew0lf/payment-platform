'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  LayoutDashboard,
  Receipt,
  Users,
  CreditCard,
  Settings,
  Building2,
  GitBranch,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CommandItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  category: string;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands: CommandItem[] = [
    // Navigation
    { id: 'dashboard', label: 'Go to Dashboard', icon: LayoutDashboard, action: () => router.push('/'), category: 'Navigation' },
    { id: 'transactions', label: 'Go to Transactions', icon: Receipt, action: () => router.push('/transactions'), category: 'Navigation' },
    { id: 'customers', label: 'Go to Customers', icon: Users, action: () => router.push('/customers'), category: 'Navigation' },
    { id: 'payments', label: 'Go to Payment Methods', icon: CreditCard, action: () => router.push('/payments'), category: 'Navigation' },
    { id: 'routing', label: 'Go to Routing Rules', icon: GitBranch, action: () => router.push('/routing'), category: 'Navigation' },
    { id: 'settings', label: 'Go to Settings', icon: Settings, action: () => router.push('/settings'), category: 'Navigation' },
    // Actions
    { id: 'new-transaction', label: 'Create Transaction', icon: Plus, action: () => router.push('/transactions/new'), category: 'Actions' },
    { id: 'new-customer', label: 'Add Customer', icon: Plus, action: () => router.push('/customers/new'), category: 'Actions' },
    { id: 'new-company', label: 'Add Company', icon: Building2, action: () => router.push('/companies/new'), category: 'Actions' },
  ];

  const filteredCommands = query
    ? commands.filter(cmd =>
        cmd.label.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open with Cmd+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }

      if (!open) return;

      // Close with Escape
      if (e.key === 'Escape') {
        onOpenChange(false);
        setQuery('');
      }

      // Navigate with arrows
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      }

      // Select with Enter
      if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
        onOpenChange(false);
        setQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange, filteredCommands, selectedIndex]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-24"
      onClick={() => {
        onOpenChange(false);
        setQuery('');
      }}
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg mx-4 shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
          <Search className="w-5 h-5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search commands..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-white placeholder-zinc-500"
            autoFocus
          />
          <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-500">ESC</kbd>
        </div>

        {/* Commands List */}
        <div className="max-h-80 overflow-y-auto p-2">
          {Object.entries(groupedCommands).map(([category, items]) => (
            <div key={category}>
              <p className="px-3 py-2 text-xs text-zinc-600 font-medium uppercase tracking-wider">
                {category}
              </p>
              {items.map((cmd, index) => {
                const Icon = cmd.icon;
                const globalIndex = filteredCommands.indexOf(cmd);
                const isSelected = globalIndex === selectedIndex;

                return (
                  <button
                    key={cmd.id}
                    onClick={() => {
                      cmd.action();
                      onOpenChange(false);
                      setQuery('');
                    }}
                    onMouseEnter={() => setSelectedIndex(globalIndex)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                      isSelected
                        ? "bg-zinc-800 text-white"
                        : "text-zinc-300 hover:bg-zinc-800/50"
                    )}
                  >
                    <Icon className="w-4 h-4 text-zinc-400" />
                    <span className="flex-1 text-left">{cmd.label}</span>
                    {isSelected && <ArrowRight className="w-4 h-4 text-zinc-500" />}
                  </button>
                );
              })}
            </div>
          ))}

          {filteredCommands.length === 0 && (
            <div className="px-3 py-8 text-center text-zinc-500">
              No commands found for "{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
