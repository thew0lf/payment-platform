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
