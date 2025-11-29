'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileSidebar } from '@/components/layout/mobile-sidebar';
import { MobileTabBar } from '@/components/layout/mobile-tab-bar';
import { CommandPalette } from '@/components/layout/command-palette';
import { AuthProvider } from '@/contexts/auth-context';
import { HierarchyProvider } from '@/contexts/hierarchy-context';
import { MobileMenuProvider, useMobileMenu } from '@/contexts/mobile-menu-context';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { NavBadges } from '@/lib/navigation';

// TODO: Fetch these from the API
const mockBadges: NavBadges = {
  orders: 0,
  fulfillment: 0,
  lowStock: 0,
};

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { isOpen, closeMenu } = useMobileMenu();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Initialize keyboard shortcuts
  useKeyboardShortcuts({
    onCommandPalette: () => setCommandPaletteOpen(true),
  });

  return (
    <div className="flex min-h-screen md:h-screen bg-zinc-950">
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar badges={mockBadges} />
      </div>

      {/* Mobile Sidebar Drawer */}
      <MobileSidebar isOpen={isOpen} onClose={closeMenu} />

      <main className="flex-1 overflow-auto pb-20 md:pb-0">{children}</main>

      {/* Mobile Tab Bar - visible only on mobile */}
      <MobileTabBar badges={mockBadges} />

      {/* Command Palette */}
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGuard>
        <HierarchyProvider>
          <MobileMenuProvider>
            <DashboardContent>{children}</DashboardContent>
          </MobileMenuProvider>
        </HierarchyProvider>
      </AuthGuard>
    </AuthProvider>
  );
}
