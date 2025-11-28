'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { MobileSidebar } from '@/components/layout/mobile-sidebar';
import { AuthProvider } from '@/contexts/auth-context';
import { HierarchyProvider } from '@/contexts/hierarchy-context';
import { MobileMenuProvider, useMobileMenu } from '@/contexts/mobile-menu-context';
import { AuthGuard } from '@/components/auth/auth-guard';

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { isOpen, closeMenu } = useMobileMenu();

  return (
    <div className="flex min-h-screen md:h-screen bg-zinc-950">
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Drawer */}
      <MobileSidebar
        isOpen={isOpen}
        onClose={closeMenu}
      />

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
