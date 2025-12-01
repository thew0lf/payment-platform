'use client';

import { useState, useCallback, useMemo } from 'react';
import { CursorPaginationMeta, CursorPaginatedResponse } from '@/types/api';

export interface UseCursorPaginationOptions<T, P extends Record<string, unknown>> {
  // The API function that accepts params with cursor and returns CursorPaginatedResponse
  fetchFn: (params: P) => Promise<CursorPaginatedResponse<T>>;
  // Default page size
  pageSize?: number;
  // Initial params (excluding cursor and limit)
  initialParams?: Omit<P, 'cursor' | 'limit'>;
}

export interface UseCursorPaginationResult<T, P extends Record<string, unknown>> {
  // Current items
  items: T[];
  // Pagination metadata
  pagination: CursorPaginationMeta | null;
  // Loading state
  isLoading: boolean;
  // Error state
  error: Error | null;
  // Fetch initial data (or refresh)
  fetchData: (params?: Omit<P, 'cursor' | 'limit'>) => Promise<void>;
  // Load next page
  loadNextPage: () => Promise<void>;
  // Load previous page
  loadPrevPage: () => Promise<void>;
  // Check if we can load more
  hasNextPage: boolean;
  hasPrevPage: boolean;
  // Reset to initial state
  reset: () => void;
  // Current params
  currentParams: Omit<P, 'cursor' | 'limit'>;
  // Update params and refetch
  updateParams: (params: Partial<Omit<P, 'cursor' | 'limit'>>) => Promise<void>;
}

export function useCursorPagination<T, P extends Record<string, unknown>>(
  options: UseCursorPaginationOptions<T, P>
): UseCursorPaginationResult<T, P> {
  const { fetchFn, pageSize = 50, initialParams = {} as Omit<P, 'cursor' | 'limit'> } = options;

  const [items, setItems] = useState<T[]>([]);
  const [pagination, setPagination] = useState<CursorPaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentParams, setCurrentParams] = useState<Omit<P, 'cursor' | 'limit'>>(initialParams);

  const fetchData = useCallback(async (params?: Omit<P, 'cursor' | 'limit'>) => {
    setIsLoading(true);
    setError(null);

    try {
      const paramsToUse = params !== undefined ? params : currentParams;
      const response = await fetchFn({
        ...paramsToUse,
        limit: pageSize,
      } as unknown as P);

      setItems(response.items);
      setPagination(response.pagination);
      if (params !== undefined) {
        setCurrentParams(params);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch data'));
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn, pageSize, currentParams]);

  const loadNextPage = useCallback(async () => {
    if (!pagination?.nextCursor || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchFn({
        ...currentParams,
        cursor: pagination.nextCursor,
        limit: pageSize,
      } as unknown as P);

      setItems(response.items);
      setPagination(response.pagination);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load next page'));
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn, pagination, isLoading, currentParams, pageSize]);

  const loadPrevPage = useCallback(async () => {
    if (!pagination?.prevCursor || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchFn({
        ...currentParams,
        cursor: pagination.prevCursor,
        limit: pageSize,
        direction: 'backward',
      } as unknown as P);

      setItems(response.items);
      setPagination(response.pagination);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load previous page'));
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn, pagination, isLoading, currentParams, pageSize]);

  const updateParams = useCallback(async (params: Partial<Omit<P, 'cursor' | 'limit'>>) => {
    const newParams = { ...currentParams, ...params };
    await fetchData(newParams);
  }, [currentParams, fetchData]);

  const reset = useCallback(() => {
    setItems([]);
    setPagination(null);
    setError(null);
    setCurrentParams(initialParams);
  }, [initialParams]);

  const hasNextPage = useMemo(() => pagination?.hasMore ?? false, [pagination]);
  const hasPrevPage = useMemo(() => pagination?.prevCursor !== null, [pagination]);

  return {
    items,
    pagination,
    isLoading,
    error,
    fetchData,
    loadNextPage,
    loadPrevPage,
    hasNextPage,
    hasPrevPage,
    reset,
    currentParams,
    updateParams,
  };
}

// Infinite scroll variant - accumulates items as pages are loaded
export interface UseInfiniteCursorPaginationResult<T, P extends Record<string, unknown>>
  extends Omit<UseCursorPaginationResult<T, P>, 'loadPrevPage' | 'hasPrevPage'> {
  // All accumulated items
  allItems: T[];
  // Total items loaded across all pages
  totalLoaded: number;
}

export function useInfiniteCursorPagination<T, P extends Record<string, unknown>>(
  options: UseCursorPaginationOptions<T, P>
): UseInfiniteCursorPaginationResult<T, P> {
  const { fetchFn, pageSize = 50, initialParams = {} as Omit<P, 'cursor' | 'limit'> } = options;

  const [allItems, setAllItems] = useState<T[]>([]);
  const [pagination, setPagination] = useState<CursorPaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentParams, setCurrentParams] = useState<Omit<P, 'cursor' | 'limit'>>(initialParams);

  const fetchData = useCallback(async (params?: Omit<P, 'cursor' | 'limit'>) => {
    setIsLoading(true);
    setError(null);

    try {
      const paramsToUse = params !== undefined ? params : currentParams;
      const response = await fetchFn({
        ...paramsToUse,
        limit: pageSize,
      } as unknown as P);

      setAllItems(response.items);
      setPagination(response.pagination);
      if (params !== undefined) {
        setCurrentParams(params);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch data'));
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn, pageSize, currentParams]);

  const loadNextPage = useCallback(async () => {
    if (!pagination?.nextCursor || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchFn({
        ...currentParams,
        cursor: pagination.nextCursor,
        limit: pageSize,
      } as unknown as P);

      // Append new items to existing items
      setAllItems(prev => [...prev, ...response.items]);
      setPagination(response.pagination);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load next page'));
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn, pagination, isLoading, currentParams, pageSize]);

  const updateParams = useCallback(async (params: Partial<Omit<P, 'cursor' | 'limit'>>) => {
    const newParams = { ...currentParams, ...params };
    // Reset accumulated items when params change
    setAllItems([]);
    await fetchData(newParams);
  }, [currentParams, fetchData]);

  const reset = useCallback(() => {
    setAllItems([]);
    setPagination(null);
    setError(null);
    setCurrentParams(initialParams);
  }, [initialParams]);

  const hasNextPage = useMemo(() => pagination?.hasMore ?? false, [pagination]);

  return {
    items: allItems,
    allItems,
    totalLoaded: allItems.length,
    pagination,
    isLoading,
    error,
    fetchData,
    loadNextPage,
    hasNextPage,
    reset,
    currentParams,
    updateParams,
  };
}
