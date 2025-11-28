'use client';

import React, { useState } from 'react';
import { Search, Bell, Settings, ChevronRight, Menu } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useHierarchy } from '@/contexts/hierarchy-context';
import { useMobileMenu } from '@/contexts/mobile-menu-context';
import { CommandPalette } from './command-palette';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const { user } = useAuth();
  const { selectedClient, selectedCompany } = useHierarchy();
  const { openMenu } = useMobileMenu();
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // Build breadcrumb based on hierarchy
  const breadcrumbs: Array<{ label: string; href?: string }> = [];

  if (selectedClient) {
    breadcrumbs.push({ label: selectedClient.name, href: `/clients/${selectedClient.id}` });
  }
  if (selectedCompany) {
    breadcrumbs.push({ label: selectedCompany.name, href: `/companies/${selectedCompany.id}` });
  }

  return (
    <>
      <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-4 md:px-6 bg-zinc-950/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex items-center gap-2 md:gap-4">
          {/* Hamburger Menu - Mobile Only */}
          <button
            onClick={openMenu}
            className="p-2 -ml-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors md:hidden"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Search */}
          <button
            onClick={() => setShowCommandPalette(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-400 hover:border-zinc-700 hover:text-zinc-300 transition-colors"
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Search...</span>
            <div className="hidden sm:flex items-center gap-1 ml-4">
              <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-xs">⌘</kbd>
              <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-xs">K</kbd>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Notifications */}
          <button className="relative p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-cyan-400 rounded-full" />
          </button>

          {/* Settings */}
          <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
            <Settings className="w-5 h-5" />
          </button>

          {/* User Avatar */}
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-sm font-bold text-white">
            {user?.firstName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
          </div>
        </div>
      </header>

      {/* Page Header */}
      <div className="px-4 md:px-6 py-4 md:py-6 border-b border-zinc-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            {/* Breadcrumbs */}
            {breadcrumbs.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-zinc-500 mb-1">
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && <ChevronRight className="w-4 h-4" />}
                    <span className={index === breadcrumbs.length - 1 ? 'text-zinc-300' : ''}>
                      {crumb.label}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            )}
            <h1 className="text-xl md:text-2xl font-semibold text-white">{title}</h1>
            {subtitle && <p className="text-sm text-zinc-400 mt-1">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
        </div>
      </div>

      {/* Command Palette */}
      <CommandPalette
        open={showCommandPalette}
        onOpenChange={setShowCommandPalette}
      />
    </>
  );
}
