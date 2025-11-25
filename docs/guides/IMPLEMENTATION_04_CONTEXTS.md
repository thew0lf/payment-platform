# Implementation Part 4: Auth & Hierarchy Contexts

## File: apps/admin-dashboard/src/contexts/auth-context.tsx

```typescript
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
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
```

---

## File: apps/admin-dashboard/src/contexts/hierarchy-context.tsx

```typescript
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Client, Company, Department, ScopeType } from '@/types/hierarchy';
import { useAuth } from './auth-context';
import { api } from '@/lib/api';

interface HierarchyContextType {
  // User's access level
  accessLevel: ScopeType;
  
  // What the user can see
  canSeeOrganizations: boolean;
  canSeeClients: boolean;
  
  // Available entities for selection
  availableClients: Client[];
  availableCompanies: Company[];
  availableDepartments: Department[];
  
  // Currently selected (for filtering)
  selectedClientId: string | null;
  selectedCompanyId: string | null;
  selectedDepartmentId: string | null;
  
  // Resolved selected entities
  selectedClient: Client | null;
  selectedCompany: Company | null;
  selectedDepartment: Department | null;
  
  // Actions
  setSelectedClientId: (id: string | null) => void;
  setSelectedCompanyId: (id: string | null) => void;
  setSelectedDepartmentId: (id: string | null) => void;
  
  // Loading state
  isLoading: boolean;
  
  // Refresh hierarchy data
  refreshHierarchy: () => Promise<void>;
}

const HierarchyContext = createContext<HierarchyContextType | undefined>(undefined);

// Mock data for development
const mockClients: Client[] = [
  {
    id: 'client_1',
    organizationId: 'org_1',
    name: 'Velocity Agency',
    slug: 'velocity-agency',
    contactName: 'Sarah Chen',
    contactEmail: 'sarah@velocityagency.com',
    plan: 'PREMIUM',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { companies: 3, users: 12 },
  },
  {
    id: 'client_2',
    organizationId: 'org_1',
    name: 'Digital First',
    slug: 'digital-first',
    contactName: 'Mike Torres',
    contactEmail: 'mike@digitalfirst.io',
    plan: 'STANDARD',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { companies: 2, users: 8 },
  },
];

const mockCompanies: Company[] = [
  {
    id: 'company_1',
    clientId: 'client_1',
    name: 'CoffeeCo',
    slug: 'coffee-co',
    timezone: 'America/New_York',
    currency: 'USD',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { departments: 2, users: 5, transactions: 1234, customers: 487 },
  },
  {
    id: 'company_2',
    clientId: 'client_1',
    name: 'FitBox',
    slug: 'fitbox',
    timezone: 'America/Los_Angeles',
    currency: 'USD',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { departments: 3, users: 8, transactions: 2891, customers: 1203 },
  },
  {
    id: 'company_3',
    clientId: 'client_1',
    name: 'PetPals',
    slug: 'petpals',
    timezone: 'America/Chicago',
    currency: 'USD',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { departments: 1, users: 3, transactions: 567, customers: 234 },
  },
  {
    id: 'company_4',
    clientId: 'client_2',
    name: 'SaaSly',
    slug: 'saasly',
    timezone: 'UTC',
    currency: 'USD',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { departments: 2, users: 4, transactions: 3421, customers: 892 },
  },
  {
    id: 'company_5',
    clientId: 'client_2',
    name: 'CloudNine',
    slug: 'cloudnine',
    timezone: 'Europe/London',
    currency: 'GBP',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { departments: 2, users: 4, transactions: 1567, customers: 421 },
  },
];

export function HierarchyProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  
  const [availableClients, setAvailableClients] = useState<Client[]>([]);
  const [availableCompanies, setAvailableCompanies] = useState<Company[]>([]);
  const [availableDepartments, setAvailableDepartments] = useState<Department[]>([]);
  
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);

  // Determine access level from user
  const accessLevel: ScopeType = user?.scopeType || 'USER';
  const canSeeOrganizations = accessLevel === 'ORGANIZATION';
  const canSeeClients = accessLevel === 'ORGANIZATION';

  // Load hierarchy data when user changes
  useEffect(() => {
    if (!authLoading && user) {
      loadHierarchy();
    }
  }, [user, authLoading]);

  const loadHierarchy = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // In production, call API:
      // const response = await api.getAccessibleHierarchy();
      // setAvailableClients(response.data.clients);
      // setAvailableCompanies(response.data.companies);
      // setAvailableDepartments(response.data.departments);
      
      // Mock data for development based on access level
      if (user.scopeType === 'ORGANIZATION') {
        // Org level sees all clients and companies
        setAvailableClients(mockClients);
        setAvailableCompanies(mockCompanies);
      } else if (user.scopeType === 'CLIENT') {
        // Client level sees only their companies
        setAvailableClients([]);
        const clientCompanies = mockCompanies.filter(c => c.clientId === user.clientId);
        setAvailableCompanies(clientCompanies);
        // Auto-select their client (not shown in UI but used for API calls)
        setSelectedClientId(user.clientId || null);
      } else if (user.scopeType === 'COMPANY') {
        // Company level sees only their company
        setAvailableClients([]);
        const userCompany = mockCompanies.find(c => c.id === user.companyId);
        setAvailableCompanies(userCompany ? [userCompany] : []);
        setSelectedCompanyId(user.companyId || null);
      } else {
        // Department and below
        setAvailableClients([]);
        setAvailableCompanies([]);
      }
    } catch (err) {
      console.error('Failed to load hierarchy:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Resolve selected entities
  const selectedClient = availableClients.find(c => c.id === selectedClientId) || null;
  const selectedCompany = availableCompanies.find(c => c.id === selectedCompanyId) || null;
  const selectedDepartment = availableDepartments.find(d => d.id === selectedDepartmentId) || null;

  const refreshHierarchy = async () => {
    await loadHierarchy();
  };

  return (
    <HierarchyContext.Provider
      value={{
        accessLevel,
        canSeeOrganizations,
        canSeeClients,
        availableClients,
        availableCompanies,
        availableDepartments,
        selectedClientId,
        selectedCompanyId,
        selectedDepartmentId,
        selectedClient,
        selectedCompany,
        selectedDepartment,
        setSelectedClientId,
        setSelectedCompanyId,
        setSelectedDepartmentId,
        isLoading,
        refreshHierarchy,
      }}
    >
      {children}
    </HierarchyContext.Provider>
  );
}

export function useHierarchy() {
  const context = useContext(HierarchyContext);
  if (context === undefined) {
    throw new Error('useHierarchy must be used within a HierarchyProvider');
  }
  return context;
}
```

---

## File: apps/admin-dashboard/src/hooks/use-permissions.ts

```typescript
'use client';

import { useAuth } from '@/contexts/auth-context';
import { useHierarchy } from '@/contexts/hierarchy-context';
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canAccessClient,
  canAccessCompany,
  canAccessOrganization,
} from '@/lib/permissions';
import { Permission } from '@/types/hierarchy';

export function usePermissions() {
  const { user } = useAuth();
  const { accessLevel } = useHierarchy();

  const checkPermission = (permission: Permission): boolean => {
    if (!user) return false;
    return hasPermission(user, permission);
  };

  const checkAnyPermission = (permissions: Permission[]): boolean => {
    if (!user) return false;
    return hasAnyPermission(user, permissions);
  };

  const checkAllPermissions = (permissions: Permission[]): boolean => {
    if (!user) return false;
    return hasAllPermissions(user, permissions);
  };

  const checkClientAccess = (clientId: string): boolean => {
    if (!user) return false;
    return canAccessClient(user, clientId);
  };

  const checkCompanyAccess = (companyId: string, companyClientId?: string): boolean => {
    if (!user) return false;
    return canAccessCompany(user, companyId, companyClientId);
  };

  const isOrgLevel = accessLevel === 'ORGANIZATION';
  const isClientLevel = accessLevel === 'CLIENT';
  const isCompanyLevel = accessLevel === 'COMPANY';

  return {
    // Permission checks
    hasPermission: checkPermission,
    hasAnyPermission: checkAnyPermission,
    hasAllPermissions: checkAllPermissions,
    
    // Access checks
    canAccessClient: checkClientAccess,
    canAccessCompany: checkCompanyAccess,
    canAccessOrganization: () => user ? canAccessOrganization(user) : false,
    
    // Quick access level checks
    isOrgLevel,
    isClientLevel,
    isCompanyLevel,
    
    // Common permission shortcuts
    canManageUsers: checkPermission('manage:users'),
    canManageSettings: checkPermission('manage:settings'),
    canManageClients: checkPermission('manage:clients'),
    canViewAdmin: checkPermission('view:admin'),
    canWriteTransactions: checkPermission('write:transactions'),
    canWriteCustomers: checkPermission('write:customers'),
    canWriteRouting: checkPermission('write:routing'),
  };
}
```

---

## File: apps/admin-dashboard/src/hooks/use-filtered-data.ts

```typescript
'use client';

import { useMemo } from 'react';
import { useHierarchy } from '@/contexts/hierarchy-context';

interface FilterableItem {
  companyId?: string;
  clientId?: string;
}

/**
 * Hook to filter data based on current hierarchy selection
 * Automatically applies client/company filters based on user's selection
 */
export function useFilteredData<T extends FilterableItem>(
  data: T[],
  options?: {
    filterByClient?: boolean;
    filterByCompany?: boolean;
  }
) {
  const {
    selectedClientId,
    selectedCompanyId,
    availableCompanies,
  } = useHierarchy();

  const { filterByClient = true, filterByCompany = true } = options || {};

  const filteredData = useMemo(() => {
    let result = [...data];

    // Filter by company if selected
    if (filterByCompany && selectedCompanyId) {
      result = result.filter(item => item.companyId === selectedCompanyId);
    }
    // Filter by client if selected (filter companies belonging to client)
    else if (filterByClient && selectedClientId) {
      const clientCompanyIds = availableCompanies
        .filter(c => c.clientId === selectedClientId)
        .map(c => c.id);
      result = result.filter(item => 
        item.companyId && clientCompanyIds.includes(item.companyId)
      );
    }

    return result;
  }, [data, selectedClientId, selectedCompanyId, availableCompanies, filterByClient, filterByCompany]);

  return filteredData;
}

/**
 * Get query params for API calls based on hierarchy selection
 */
export function useHierarchyParams() {
  const { selectedClientId, selectedCompanyId, accessLevel } = useHierarchy();

  const params: Record<string, string> = {};

  if (selectedCompanyId) {
    params.companyId = selectedCompanyId;
  } else if (selectedClientId) {
    params.clientId = selectedClientId;
  }

  return params;
}
```

---

Continue to IMPLEMENTATION_05_DASHBOARD.md for dashboard components...
