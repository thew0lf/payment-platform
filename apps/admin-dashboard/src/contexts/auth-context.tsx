'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react';
import { User, ScopeType } from '@/types/hierarchy';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://api.dev.avnz.io:3001';

interface AuthConfig {
  auth0Enabled: boolean;
  localEnabled: boolean;
  auth0Domain: string | null;
  auth0ClientId: string | null;
  auth0Audience: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  authConfig: AuthConfig | null;
  login: (email?: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Inner component that uses Auth0 hooks (must be inside Auth0Provider)
function Auth0AuthProvider({ children, authConfig }: { children: ReactNode; authConfig: AuthConfig }) {
  const router = useRouter();
  const {
    isAuthenticated: auth0IsAuthenticated,
    isLoading: auth0IsLoading,
    user: auth0User,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
    error: auth0Error,
  } = useAuth0();

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user profile from backend using Auth0 token
  const fetchUserProfile = useCallback(async () => {
    if (!auth0IsAuthenticated || auth0IsLoading) return;

    setIsLoading(true);
    try {
      const token = await getAccessTokenSilently();
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        // Store token for API calls
        localStorage.setItem('avnz_token', token);
        localStorage.setItem('avnz_user', JSON.stringify(data.user));
      } else {
        setError('Failed to fetch user profile');
        setUser(null);
      }
    } catch (err: any) {
      console.error('Error fetching user profile:', err);
      setError(err.message || 'Authentication error');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [auth0IsAuthenticated, auth0IsLoading, getAccessTokenSilently]);

  // Effect to fetch user profile when Auth0 authenticates
  useEffect(() => {
    if (auth0IsLoading) {
      setIsLoading(true);
      return;
    }

    if (auth0IsAuthenticated) {
      fetchUserProfile();
    } else {
      setIsLoading(false);
      setUser(null);
    }
  }, [auth0IsAuthenticated, auth0IsLoading, fetchUserProfile]);

  // Handle Auth0 errors
  useEffect(() => {
    if (auth0Error) {
      setError(auth0Error.message);
    }
  }, [auth0Error]);

  const login = async () => {
    // With Auth0, login is a redirect
    await loginWithRedirect({
      appState: { returnTo: window.location.pathname },
    });
  };

  const logout = async () => {
    localStorage.removeItem('avnz_token');
    localStorage.removeItem('avnz_user');
    setUser(null);

    await auth0Logout({
      logoutParams: {
        returnTo: window.location.origin + '/login',
      },
    });
  };

  const refreshUser = async () => {
    await fetchUserProfile();
  };

  const getAccessToken = async (): Promise<string | null> => {
    try {
      return await getAccessTokenSilently();
    } catch {
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: isLoading || auth0IsLoading,
        isAuthenticated: !!user,
        error,
        authConfig,
        login,
        logout,
        refreshUser,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Local auth provider (fallback when Auth0 is not configured)
function LocalAuthProvider({ children, authConfig }: { children: ReactNode; authConfig: AuthConfig }) {
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
      const token = localStorage.getItem('avnz_token');
      const storedUser = localStorage.getItem('avnz_user');

      if (token && storedUser) {
        // Verify token is still valid by calling /api/auth/me
        try {
          const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
            localStorage.setItem('avnz_user', JSON.stringify(data.user));
          } else {
            // Token invalid, clear storage
            localStorage.removeItem('avnz_token');
            localStorage.removeItem('avnz_user');
            setUser(null);
          }
        } catch {
          // API error, use stored user
          setUser(JSON.parse(storedUser));
        }
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email?: string, password?: string) => {
    if (!email || !password) {
      throw new Error('Email and password required for local login');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Invalid credentials');
      }

      const data = await response.json();

      // Store token and user
      localStorage.setItem('avnz_token', data.accessToken);
      localStorage.setItem('avnz_user', JSON.stringify(data.user));
      setUser(data.user);

      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('avnz_token');
      if (token) {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        }).catch(() => {}); // Ignore errors
      }

      localStorage.removeItem('avnz_token');
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

  const getAccessToken = async (): Promise<string | null> => {
    return localStorage.getItem('avnz_token');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        error,
        authConfig,
        login,
        logout,
        refreshUser,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Main AuthProvider that determines which provider to use
export function AuthProvider({ children }: { children: ReactNode }) {
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  // Fetch auth config on mount
  useEffect(() => {
    const fetchAuthConfig = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/config`);
        if (response.ok) {
          const config = await response.json();
          setAuthConfig(config);
        } else {
          // Default to local auth if config fetch fails
          setAuthConfig({
            auth0Enabled: false,
            localEnabled: true,
            auth0Domain: null,
            auth0ClientId: null,
            auth0Audience: null,
          });
        }
      } catch (err) {
        console.error('Failed to fetch auth config:', err);
        // Default to local auth on error
        setAuthConfig({
          auth0Enabled: false,
          localEnabled: true,
          auth0Domain: null,
          auth0ClientId: null,
          auth0Audience: null,
        });
      } finally {
        setConfigLoading(false);
      }
    };

    fetchAuthConfig();
  }, []);

  // Show loading state while fetching config
  if (configLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  // Use Auth0 if enabled and configured
  if (authConfig?.auth0Enabled && authConfig.auth0Domain && authConfig.auth0ClientId) {
    return (
      <Auth0Provider
        domain={authConfig.auth0Domain}
        clientId={authConfig.auth0ClientId}
        authorizationParams={{
          redirect_uri: typeof window !== 'undefined' ? window.location.origin : '',
          audience: authConfig.auth0Audience || undefined,
        }}
        cacheLocation="localstorage"
      >
        <Auth0AuthProvider authConfig={authConfig}>{children}</Auth0AuthProvider>
      </Auth0Provider>
    );
  }

  // Fall back to local auth
  return <LocalAuthProvider authConfig={authConfig!}>{children}</LocalAuthProvider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
