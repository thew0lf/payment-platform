'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Zap,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Plus,
  Building,
  Building2,
  LogOut,
  User,
  Settings,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { useHierarchy } from '@/contexts/hierarchy-context';
import { usePreferences } from '@/contexts/preferences-context';
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
  collapsed?: boolean;
}

export function Sidebar({ isOpen, onClose, badges, collapsed }: SidebarProps) {
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
  const { theme, setTheme, toggleSidebar } = usePreferences();
  const [mounted, setMounted] = useState(false);

  const [showClientSwitcher, setShowClientSwitcher] = useState(false);
  const [showCompanySwitcher, setShowCompanySwitcher] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const { expandedSections, toggleSection, isInitialized } = useSidebarState();

  // Avoid hydration mismatch for theme
  useEffect(() => {
    setMounted(true);
  }, []);

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

  // DEBUG: Log hierarchy context values
  console.log('[Sidebar Debug]', {
    accessLevel,
    isOrgLevel,
    isClientLevel,
    availableCompaniesCount: availableCompanies.length,
    collapsed,
    showCondition: (isOrgLevel || isClientLevel) && availableCompanies.length > 0 && !collapsed,
  });

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
        'bg-white dark:bg-card/50 border-r border-gray-200 dark:border-border flex flex-col h-screen transition-all duration-200',
        collapsed ? 'w-16 overflow-visible' : 'w-64',
        // Mobile: slide in/out
        'fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 ease-in-out',
        'md:relative md:translate-x-0',
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo & Collapse Toggle */}
      <div className={cn('h-14 flex items-center border-b border-gray-200 dark:border-border', collapsed ? 'px-2 justify-center' : 'px-4 justify-between')}>
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-foreground" />
          </div>
          {!collapsed && (
            <span className="font-bold text-lg bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              avnz.io
            </span>
          )}
        </Link>
        {!collapsed && (
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-md text-gray-500 dark:text-muted-foreground hover:bg-gray-100 dark:hover:bg-muted transition-colors hidden md:flex"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <div className="p-2 hidden md:flex justify-center">
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-md text-gray-500 dark:text-muted-foreground hover:bg-gray-100 dark:hover:bg-muted transition-colors"
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Client Switcher - Organization Level Only (hidden when collapsed) */}
      {isOrgLevel && !collapsed && (
        <div className="p-3 border-b border-gray-200 dark:border-border" data-switcher>
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowClientSwitcher(!showClientSwitcher);
              }}
              className="w-full flex items-center gap-2 p-2 rounded-lg bg-gray-100 dark:bg-muted/50 hover:bg-gray-200 dark:hover:bg-muted transition-colors"
              aria-expanded={showClientSwitcher}
              aria-haspopup="listbox"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center text-sm font-bold text-foreground">
                {selectedClient?.name.charAt(0) || 'A'}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-gray-900 dark:text-foreground truncate">
                  {selectedClient?.name || 'All Clients'}
                </p>
                <p className="text-xs text-gray-500 dark:text-muted-foreground">
                  {selectedClient
                    ? `${selectedClient._count?.companies || 0} companies`
                    : 'Platform view'}
                </p>
              </div>
              <ChevronDown
                className={cn(
                  'w-4 h-4 text-gray-500 dark:text-muted-foreground transition-transform',
                  showClientSwitcher && 'rotate-180'
                )}
              />
            </button>

            {showClientSwitcher && (
              <div
                className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-muted rounded-lg border border-gray-200 dark:border-border overflow-hidden z-50 shadow-xl"
                role="listbox"
              >
                <button
                  onClick={() => {
                    setSelectedClientId(null);
                    setSelectedCompanyId(null);
                    setShowClientSwitcher(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 p-2 text-sm hover:bg-gray-100 dark:hover:bg-muted',
                    !selectedClientId && 'bg-gray-100 dark:bg-muted'
                  )}
                  role="option"
                  aria-selected={!selectedClientId}
                >
                  <Building className="w-4 h-4 text-gray-400 dark:text-muted-foreground" />
                  <span className="text-gray-700 dark:text-foreground">All Clients</span>
                  {!selectedClientId && <Check className="w-4 h-4 text-primary dark:text-primary ml-auto" />}
                </button>
                <div className="border-t border-gray-200 dark:border-border" />
                {availableClients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => {
                      setSelectedClientId(client.id);
                      setSelectedCompanyId(null);
                      setShowClientSwitcher(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 p-2 text-sm hover:bg-gray-100 dark:hover:bg-muted',
                      selectedClientId === client.id && 'bg-gray-100 dark:bg-muted'
                    )}
                    role="option"
                    aria-selected={selectedClientId === client.id}
                  >
                    <div className="w-6 h-6 bg-gradient-to-br from-violet-500 to-purple-600 rounded flex items-center justify-center text-xs font-bold text-foreground">
                      {client.name.charAt(0)}
                    </div>
                    <span className="text-gray-700 dark:text-foreground flex-1 text-left">{client.name}</span>
                    {selectedClientId === client.id && (
                      <Check className="w-4 h-4 text-primary dark:text-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Company Switcher (hidden when collapsed) */}
      {(isOrgLevel || isClientLevel) && companiesForDisplay.length > 0 && !collapsed && (
        <div className="p-3 border-b border-gray-200 dark:border-border" data-switcher>
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCompanySwitcher(!showCompanySwitcher);
              }}
              className="w-full flex items-center gap-2 p-2 rounded-lg bg-gray-100 dark:bg-muted/50 hover:bg-gray-200 dark:hover:bg-muted transition-colors"
              aria-expanded={showCompanySwitcher}
              aria-haspopup="listbox"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center text-sm font-bold text-foreground">
                {selectedCompany?.name.charAt(0) || 'A'}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-gray-900 dark:text-foreground truncate">
                  {selectedCompany?.name || 'All Companies'}
                </p>
                <p className="text-xs text-gray-500 dark:text-muted-foreground">
                  {selectedCompany
                    ? 'Company view'
                    : `${companiesForDisplay.length} companies`}
                </p>
              </div>
              <ChevronDown
                className={cn(
                  'w-4 h-4 text-gray-500 dark:text-muted-foreground transition-transform',
                  showCompanySwitcher && 'rotate-180'
                )}
              />
            </button>

            {showCompanySwitcher && (
              <div
                className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-muted rounded-lg border border-gray-200 dark:border-border overflow-hidden z-50 shadow-xl max-h-64 overflow-y-auto"
                role="listbox"
              >
                <button
                  onClick={() => {
                    setSelectedCompanyId(null);
                    setShowCompanySwitcher(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 p-2 text-sm hover:bg-gray-100 dark:hover:bg-muted',
                    !selectedCompanyId && 'bg-gray-100 dark:bg-muted'
                  )}
                  role="option"
                  aria-selected={!selectedCompanyId}
                >
                  <Building2 className="w-4 h-4 text-gray-400 dark:text-muted-foreground" />
                  <span className="text-gray-700 dark:text-foreground">All Companies</span>
                  {!selectedCompanyId && <Check className="w-4 h-4 text-primary dark:text-primary ml-auto" />}
                </button>
                <div className="border-t border-gray-200 dark:border-border" />
                {companiesForDisplay.map((company) => (
                  <button
                    key={company.id}
                    onClick={() => {
                      setSelectedCompanyId(company.id);
                      setShowCompanySwitcher(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 p-2 text-sm hover:bg-gray-100 dark:hover:bg-muted',
                      selectedCompanyId === company.id && 'bg-gray-100 dark:bg-muted'
                    )}
                    role="option"
                    aria-selected={selectedCompanyId === company.id}
                  >
                    <div className="w-6 h-6 bg-gradient-to-br from-cyan-500 to-blue-600 rounded flex items-center justify-center text-xs font-bold text-foreground">
                      {company.name.charAt(0)}
                    </div>
                    <span className="text-gray-700 dark:text-foreground flex-1 text-left truncate">{company.name}</span>
                    {selectedCompanyId === company.id && (
                      <Check className="w-4 h-4 text-primary dark:text-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation Sections */}
      <nav className={cn('flex-1 py-4 overflow-y-auto', collapsed ? 'px-2' : 'px-3')} aria-label="Sidebar navigation">
        {isInitialized &&
          navSections.map((section) => (
            <NavSection
              key={section.id}
              section={section}
              isExpanded={collapsed ? false : (expandedSections[section.id] ?? section.defaultExpanded)}
              onToggle={() => toggleSection(section.id)}
              badges={badges}
              collapsed={collapsed}
            />
          ))}
      </nav>

      {/* Theme Toggle */}
      <div className={cn('py-2 border-t border-gray-200 dark:border-border', collapsed ? 'px-2' : 'px-3')}>
        {collapsed ? (
          // Collapsed: show single icon that cycles through themes
          <div className="flex justify-center">
            {mounted && (
              <button
                onClick={() => {
                  const themes: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system'];
                  const currentIndex = themes.indexOf(theme);
                  const nextTheme = themes[(currentIndex + 1) % themes.length];
                  setTheme(nextTheme);
                }}
                className="p-2 rounded-md text-gray-500 dark:text-muted-foreground hover:bg-gray-100 dark:hover:bg-muted transition-colors"
                title={`Current: ${theme}. Click to change theme`}
                aria-label={`Current theme: ${theme}. Click to change`}
              >
                {theme === 'light' && <Sun className="w-4 h-4 text-amber-500" />}
                {theme === 'dark' && <Moon className="w-4 h-4 text-indigo-500" />}
                {theme === 'system' && <Monitor className="w-4 h-4 text-blue-500" />}
              </button>
            )}
          </div>
        ) : (
          // Expanded: show full theme toggle
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-muted-foreground">Theme</span>
            {mounted && (
              <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100 dark:bg-muted">
                <button
                  onClick={() => setTheme('light')}
                  className={cn(
                    'p-1.5 rounded-md transition-colors',
                    theme === 'light'
                      ? 'bg-white dark:bg-muted text-amber-500 shadow-sm'
                      : 'text-gray-500 dark:text-muted-foreground hover:text-gray-700 dark:hover:text-foreground'
                  )}
                  title="Light mode"
                  aria-label="Light mode"
                >
                  <Sun className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setTheme('system')}
                  className={cn(
                    'p-1.5 rounded-md transition-colors',
                    theme === 'system'
                      ? 'bg-white dark:bg-muted text-blue-500 shadow-sm'
                      : 'text-gray-500 dark:text-muted-foreground hover:text-gray-700 dark:hover:text-foreground'
                  )}
                  title="System preference"
                  aria-label="System preference"
                >
                  <Monitor className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={cn(
                    'p-1.5 rounded-md transition-colors',
                    theme === 'dark'
                      ? 'bg-white dark:bg-muted text-indigo-500 shadow-sm'
                      : 'text-gray-500 dark:text-muted-foreground hover:text-gray-700 dark:hover:text-foreground'
                  )}
                  title="Dark mode"
                  aria-label="Dark mode"
                >
                  <Moon className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Menu */}
      <div className={cn('border-t border-gray-200 dark:border-border', collapsed ? 'p-2 overflow-visible' : 'p-3')} data-user-menu>
        <div className={cn("relative", collapsed && "overflow-visible")}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowUserMenu(!showUserMenu);
            }}
            className={cn(
              'flex items-center rounded-lg hover:bg-gray-100 dark:hover:bg-muted transition-colors',
              collapsed ? 'w-full justify-center p-2' : 'w-full gap-3 p-2'
            )}
            aria-expanded={showUserMenu}
            aria-haspopup="menu"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-sm font-bold text-foreground flex-shrink-0">
              {user.firstName?.charAt(0) || user.email.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-foreground truncate">
                    {user.firstName ? `${user.firstName} ${user.lastName || ''}` : user.email}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-muted-foreground capitalize">
                    {user.role.toLowerCase().replace('_', ' ')}
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    'w-4 h-4 text-gray-500 dark:text-muted-foreground transition-transform',
                    showUserMenu && 'rotate-180'
                  )}
                />
              </>
            )}
          </button>

          {showUserMenu && (
            <div
              className={cn(
                "absolute bottom-full mb-1 bg-white dark:bg-muted rounded-lg border border-gray-200 dark:border-border overflow-hidden shadow-xl",
                collapsed ? "left-0 w-48 z-[100]" : "left-0 right-0 z-50"
              )}
              role="menu"
            >
              <Link
                href="/settings/profile"
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-foreground hover:bg-gray-100 dark:hover:bg-muted"
                onClick={() => setShowUserMenu(false)}
                role="menuitem"
              >
                <User className="w-4 h-4" />
                Profile
              </Link>
              <Link
                href="/settings/general"
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-foreground hover:bg-gray-100 dark:hover:bg-muted"
                onClick={() => setShowUserMenu(false)}
                role="menuitem"
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>
              <div className="border-t border-gray-200 dark:border-border" />
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  logout();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-muted"
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
