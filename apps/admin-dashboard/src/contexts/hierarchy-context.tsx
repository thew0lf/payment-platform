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
