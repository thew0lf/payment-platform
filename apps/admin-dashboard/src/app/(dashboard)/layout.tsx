'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileSidebar } from '@/components/layout/mobile-sidebar';
import { MobileTabBar } from '@/components/layout/mobile-tab-bar';
import { CommandPalette } from '@/components/layout/command-palette';
import { OnboardingWizard } from '@/components/onboarding';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { HierarchyProvider, useHierarchy } from '@/contexts/hierarchy-context';
import { MobileMenuProvider, useMobileMenu } from '@/contexts/mobile-menu-context';
import { PreferencesProvider, usePreferences } from '@/contexts/preferences-context';
import { AuthGuard } from '@/components/auth/auth-guard';
import { SessionTimeoutProvider } from '@/hooks/use-session-timeout';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { NavBadges } from '@/lib/navigation';
import { dashboardApi } from '@/lib/api/dashboard';
import { cn } from '@/lib/utils';
import {
  useShouldShowOnboarding,
  useOnboardingWizardStore,
} from '@/stores/onboarding-wizard.store';

// Default badges (shown while loading or on error)
const DEFAULT_BADGES: NavBadges = {
  orders: 0,
  fulfillment: 0,
  lowStock: 0,
};

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { isOpen, closeMenu } = useMobileMenu();
  const { sidebarCollapsed } = usePreferences();
  const { selectedCompanyId, selectedClientId } = useHierarchy();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [badges, setBadges] = useState<NavBadges>(DEFAULT_BADGES);

  // Onboarding wizard state
  const shouldShowOnboarding = useShouldShowOnboarding();
  const { openWizard, isWizardOpen } = useOnboardingWizardStore();

  // Trigger onboarding wizard for new users
  useEffect(() => {
    if (shouldShowOnboarding && !isWizardOpen) {
      // Small delay to let the dashboard load first
      const timer = setTimeout(() => {
        openWizard();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [shouldShowOnboarding, isWizardOpen, openWizard]);

  // Fetch navigation badges from API
  const fetchBadges = useCallback(async () => {
    try {
      const data = await dashboardApi.getBadges({
        companyId: selectedCompanyId || undefined,
        clientId: selectedClientId || undefined,
      });
      setBadges({
        orders: data.orders,
        fulfillment: data.fulfillment,
        lowStock: data.lowStock,
      });
    } catch (error) {
      // Silently fail and use default badges - badges are non-critical
      console.debug('Failed to fetch navigation badges:', error);
    }
  }, [selectedCompanyId, selectedClientId]);

  // Fetch badges on mount and when company/client changes
  useEffect(() => {
    fetchBadges();
    // Refresh badges periodically (every 60 seconds)
    const interval = setInterval(fetchBadges, 60000);
    return () => clearInterval(interval);
  }, [fetchBadges]);

  // Initialize keyboard shortcuts
  useKeyboardShortcuts({
    onCommandPalette: () => setCommandPaletteOpen(true),
  });

  return (
    <div className="flex min-h-screen md:h-screen bg-background">
      {/* Desktop Sidebar - hidden on mobile */}
      <div className={cn('hidden md:block transition-all duration-200', sidebarCollapsed ? 'w-16' : 'w-64')}>
        <Sidebar badges={badges} collapsed={sidebarCollapsed} />
      </div>

      {/* Mobile Sidebar Drawer */}
      <MobileSidebar isOpen={isOpen} onClose={closeMenu} />

      <main className="flex-1 overflow-auto pb-20 md:pb-0">{children}</main>

      {/* Mobile Tab Bar - visible only on mobile */}
      <MobileTabBar badges={badges} />

      {/* Command Palette */}
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />

      {/* Onboarding Wizard */}
      <OnboardingWizard />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGuard>
        <SessionTimeoutProvider>
          <HierarchyProvider>
            <PreferencesProvider>
              <MobileMenuProvider>
                <DashboardContent>{children}</DashboardContent>
              </MobileMenuProvider>
            </PreferencesProvider>
          </HierarchyProvider>
        </SessionTimeoutProvider>
      </AuthGuard>
    </AuthProvider>
  );
}
