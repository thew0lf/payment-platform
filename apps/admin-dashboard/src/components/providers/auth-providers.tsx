'use client';

import { AuthProvider } from '@/contexts/auth-context';

export function AuthProviders({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
