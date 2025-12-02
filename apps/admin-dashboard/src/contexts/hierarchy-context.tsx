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
      // Call the real hierarchy API (token is read from localStorage automatically)
      const response = await api.getAccessibleHierarchy();
      setAvailableClients(response.data.clients || []);
      setAvailableCompanies(response.data.companies || []);
      setAvailableDepartments(response.data.departments || []);

      // Auto-select based on user scope
      if (user.scopeType === 'CLIENT' && user.clientId) {
        setSelectedClientId(user.clientId);
      } else if (user.scopeType === 'COMPANY' && user.companyId) {
        setSelectedCompanyId(user.companyId);
      }
    } catch (err) {
      console.error('Failed to load hierarchy:', err);
      // Reset to empty arrays on error
      setAvailableClients([]);
      setAvailableCompanies([]);
      setAvailableDepartments([]);
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
