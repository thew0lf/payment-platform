import { Sidebar } from '@/components/layout/sidebar';
import { AuthProvider } from '@/contexts/auth-context';
import { HierarchyProvider } from '@/contexts/hierarchy-context';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <HierarchyProvider>
        <div className="flex h-screen bg-zinc-950">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </HierarchyProvider>
    </AuthProvider>
  );
}
