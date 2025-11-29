'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Zap,
  ChevronDown,
  Check,
  Plus,
  Building,
  Building2,
  LogOut,
  User,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { useHierarchy } from '@/contexts/hierarchy-context';
import { NavSection } from './nav-section';
import { useSidebarState } from '@/hooks/use-sidebar-state';
import {
  getNavigationSections,
  NavBadges,
  ScopeType,
  UserRole,
} from '@/lib/navigation';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  badges?: NavBadges;
}

export function Sidebar({ isOpen, onClose, badges }: SidebarProps) {
  const { user, logout } = useAuth();
  const {
    accessLevel,
    availableClients,
    availableCompanies,
    selectedClientId,
    selectedCompanyId,
    setSelectedClientId,
    setSelectedCompanyId,
  } = useHierarchy();

  const [showClientSwitcher, setShowClientSwitcher] = useState(false);
  const [showCompanySwitcher, setShowCompanySwitcher] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const { expandedSections, toggleSection, isInitialized } = useSidebarState();

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-switcher]')) {
        setShowClientSwitcher(false);
        setShowCompanySwitcher(false);
      }
      if (!target.closest('[data-user-menu]')) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  if (!user) return null;

  // Map access level to scope type
  const scopeType: ScopeType = (accessLevel as ScopeType) || 'COMPANY';
  const userRole: UserRole = (user.role as UserRole) || 'USER';

  // Get filtered navigation sections based on user scope and role
  const navSections = getNavigationSections(scopeType, userRole);

  const isOrgLevel = accessLevel === 'ORGANIZATION';
  const isClientLevel = accessLevel === 'CLIENT';

  const selectedClient = availableClients.find((c) => c.id === selectedClientId);
  const selectedCompany = availableCompanies.find((c) => c.id === selectedCompanyId);

  // Filter companies based on selected client (for org level)
  const companiesForDisplay =
    isOrgLevel && selectedClientId
      ? availableCompanies.filter((c) => c.clientId === selectedClientId)
      : availableCompanies;

  return (
    <aside
      className={cn(
        'w-64 bg-zinc-900/50 border-r border-zinc-800 flex flex-col h-screen',
        // Mobile: slide in/out
        'fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 ease-in-out',
        'md:relative md:translate-x-0',
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-zinc-800">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            avnz.io
          </span>
        </Link>
      </div>

      {/* Client Switcher - Organization Level Only */}
      {isOrgLevel && (
        <div className="p-3 border-b border-zinc-800" data-switcher>
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowClientSwitcher(!showClientSwitcher);
              }}
              className="w-full flex items-center gap-2 p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
              aria-expanded={showClientSwitcher}
              aria-haspopup="listbox"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center text-sm font-bold text-white">
                {selectedClient?.name.charAt(0) || 'A'}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-white truncate">
                  {selectedClient?.name || 'All Clients'}
                </p>
                <p className="text-xs text-zinc-500">
                  {selectedClient
                    ? `${selectedClient._count?.companies || 0} companies`
                    : 'Platform view'}
                </p>
              </div>
              <ChevronDown
                className={cn(
                  'w-4 h-4 text-zinc-500 transition-transform',
                  showClientSwitcher && 'rotate-180'
                )}
              />
            </button>

            {showClientSwitcher && (
              <div
                className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden z-50 shadow-xl"
                role="listbox"
              >
                <button
                  onClick={() => {
                    setSelectedClientId(null);
                    setSelectedCompanyId(null);
                    setShowClientSwitcher(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 p-2 text-sm hover:bg-zinc-700',
                    !selectedClientId && 'bg-zinc-700'
                  )}
                  role="option"
                  aria-selected={!selectedClientId}
                >
                  <Building className="w-4 h-4 text-zinc-400" />
                  <span className="text-zinc-300">All Clients</span>
                  {!selectedClientId && <Check className="w-4 h-4 text-cyan-400 ml-auto" />}
                </button>
                <div className="border-t border-zinc-700" />
                {availableClients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => {
                      setSelectedClientId(client.id);
                      setSelectedCompanyId(null);
                      setShowClientSwitcher(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 p-2 text-sm hover:bg-zinc-700',
                      selectedClientId === client.id && 'bg-zinc-700'
                    )}
                    role="option"
                    aria-selected={selectedClientId === client.id}
                  >
                    <div className="w-6 h-6 bg-gradient-to-br from-violet-500 to-purple-600 rounded flex items-center justify-center text-xs font-bold text-white">
                      {client.name.charAt(0)}
                    </div>
                    <span className="text-zinc-300 flex-1 text-left">{client.name}</span>
                    {selectedClientId === client.id && (
                      <Check className="w-4 h-4 text-cyan-400" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Company Selector */}
      {(isOrgLevel || isClientLevel) && companiesForDisplay.length > 0 && (
        <div className="px-3 py-2 border-b border-zinc-800" data-switcher>
          <p className="text-xs text-zinc-600 font-medium mb-2 px-2 uppercase tracking-wider">
            Companies
          </p>
          <button
            onClick={() => setSelectedCompanyId(null)}
            className={cn(
              'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors',
              !selectedCompanyId
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            )}
          >
            <Building2 className="w-4 h-4" />
            All Companies
          </button>
          {companiesForDisplay.slice(0, 5).map((company) => (
            <button
              key={company.id}
              onClick={() => setSelectedCompanyId(company.id)}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors',
                selectedCompanyId === company.id
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              )}
            >
              <div className="w-4 h-4 rounded bg-zinc-700 flex items-center justify-center text-[10px] font-medium">
                {company.name.charAt(0)}
              </div>
              <span className="truncate">{company.name}</span>
            </button>
          ))}
          {companiesForDisplay.length > 5 && (
            <button className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-zinc-500 hover:text-zinc-300">
              <Plus className="w-4 h-4" />
              {companiesForDisplay.length - 5} more...
            </button>
          )}
        </div>
      )}

      {/* Navigation Sections */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto" aria-label="Sidebar navigation">
        {isInitialized &&
          navSections.map((section) => (
            <NavSection
              key={section.id}
              section={section}
              isExpanded={expandedSections[section.id] ?? section.defaultExpanded}
              onToggle={() => toggleSection(section.id)}
              badges={badges}
            />
          ))}
      </nav>

      {/* Value Metric - NCI: Continuous value reminder */}
      <div className="p-3 mx-3 mb-3 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-xl">
        <p className="text-xs text-emerald-400 font-medium">TIME SAVED THIS MONTH</p>
        <p className="text-2xl font-bold text-white mt-1">18.5 hrs</p>
        <p className="text-xs text-zinc-500 mt-1">≈ $1,110 in labor costs</p>
      </div>

      {/* User Menu */}
      <div className="p-3 border-t border-zinc-800" data-user-menu>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowUserMenu(!showUserMenu);
            }}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800 transition-colors"
            aria-expanded={showUserMenu}
            aria-haspopup="menu"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-sm font-bold text-white">
              {user.firstName?.charAt(0) || user.email.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-white truncate">
                {user.firstName ? `${user.firstName} ${user.lastName || ''}` : user.email}
              </p>
              <p className="text-xs text-zinc-500 capitalize">
                {user.role.toLowerCase().replace('_', ' ')}
              </p>
            </div>
            <ChevronDown
              className={cn(
                'w-4 h-4 text-zinc-500 transition-transform',
                showUserMenu && 'rotate-180'
              )}
            />
          </button>

          {showUserMenu && (
            <div
              className="absolute bottom-full left-0 right-0 mb-1 bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden z-50 shadow-xl"
              role="menu"
            >
              <Link
                href="/settings/profile"
                className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
                onClick={() => setShowUserMenu(false)}
                role="menuitem"
              >
                <User className="w-4 h-4" />
                Profile
              </Link>
              <Link
                href="/settings/general"
                className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
                onClick={() => setShowUserMenu(false)}
                role="menuitem"
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>
              <div className="border-t border-zinc-700" />
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  logout();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-zinc-700"
                role="menuitem"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[-1] md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
    </aside>
  );
}
