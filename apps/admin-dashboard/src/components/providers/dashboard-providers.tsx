'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { AuthProvider } from '@/contexts/auth-context';
import { HierarchyProvider } from '@/contexts/hierarchy-context';
import { SidebarProvider, useSidebar } from '@/contexts/sidebar-context';

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isOpen, close } = useSidebar();

  return (
    <div className="flex h-screen bg-zinc-950">
      <Sidebar isOpen={isOpen} onClose={close} />
      <main className="flex-1 overflow-auto lg:ml-0">
        <div className="min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}

export function DashboardProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <HierarchyProvider>
        <SidebarProvider>
          <DashboardLayout>{children}</DashboardLayout>
        </SidebarProvider>
      </HierarchyProvider>
    </AuthProvider>
  );
}
