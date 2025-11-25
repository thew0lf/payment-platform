'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { User, ScopeType } from '@/types/hierarchy';
import { api } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock user for development - replace with actual auth
const mockUsers: Record<string, User> = {
  'admin@avnz.io': {
    id: 'user_org_1',
    email: 'admin@avnz.io',
    firstName: 'Platform',
    lastName: 'Admin',
    scopeType: 'ORGANIZATION',
    scopeId: 'org_1',
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
    organizationId: 'org_1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  'owner@velocityagency.com': {
    id: 'user_client_1',
    email: 'owner@velocityagency.com',
    firstName: 'Sarah',
    lastName: 'Chen',
    scopeType: 'CLIENT',
    scopeId: 'client_1',
    role: 'ADMIN',
    status: 'ACTIVE',
    clientId: 'client_1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  'manager@coffeeco.com': {
    id: 'user_company_1',
    email: 'manager@coffeeco.com',
    firstName: 'Mike',
    lastName: 'Torres',
    scopeType: 'COMPANY',
    scopeId: 'company_1',
    role: 'MANAGER',
    status: 'ACTIVE',
    companyId: 'company_1',
    clientId: 'client_1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setIsLoading(true);
    try {
      // Check localStorage for mock auth (development)
      const storedUser = localStorage.getItem('avnz_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }

      // In production, call API:
      // const response = await api.getCurrentUser();
      // setUser(response.data.user);
    } catch (err) {
      console.error('Auth check failed:', err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Mock login for development
      const mockUser = mockUsers[email.toLowerCase()];
      if (mockUser && password === 'demo123') {
        setUser(mockUser);
        localStorage.setItem('avnz_user', JSON.stringify(mockUser));
        router.push('/');
        return;
      }

      // In production, call API:
      // const response = await api.login(email, password);
      // setUser(response.data.user);
      // api.setToken(response.data.token);
      // router.push('/');

      throw new Error('Invalid credentials');
    } catch (err: any) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // In production, call API:
      // await api.logout();
      // api.clearToken();

      localStorage.removeItem('avnz_user');
      setUser(null);
      router.push('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const refreshUser = async () => {
    await checkAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        error,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
