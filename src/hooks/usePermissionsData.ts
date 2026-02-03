import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchPermissionsData, type PermissionsData } from '../services/api';

// Module-level cache - shared across all component instances
let cachedData: PermissionsData | null = null;
let fetchPromise: Promise<PermissionsData> | null = null;
let lastFetchKey: string | null = null;

export function usePermissionsData() {
  const { isAuthenticated, refreshKey } = useAuth();
  const [data, setData] = useState<PermissionsData | null>(cachedData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchKey = `${isAuthenticated}-${refreshKey}`;

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    try {
      // Clear cache to force refetch
      cachedData = null;
      fetchPromise = null;
      lastFetchKey = null;

      const result = await fetchPermissionsData();
      cachedData = result;
      lastFetchKey = fetchKey;
      setData(result);
    } catch (err) {
      console.error('Failed to fetch permissions data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, fetchKey]);

  useEffect(() => {
    if (!isAuthenticated) {
      setData(null);
      setError(null);
      return;
    }

    // Return cached data if available and fresh
    if (cachedData && lastFetchKey === fetchKey) {
      setData(cachedData);
      return;
    }

    // Deduplicate concurrent requests
    if (fetchPromise && lastFetchKey === fetchKey) {
      fetchPromise.then(setData).catch(err => setError(err.message));
      return;
    }

    setIsLoading(true);
    setError(null);

    fetchPromise = fetchPermissionsData();
    lastFetchKey = fetchKey;

    fetchPromise
      .then(result => {
        cachedData = result;
        setData(result);
      })
      .catch(err => {
        console.error('Failed to fetch permissions data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch');
      })
      .finally(() => {
        setIsLoading(false);
        fetchPromise = null;
      });
  }, [isAuthenticated, fetchKey]);

  return {
    data,
    isLoading,
    error,
    refresh,
    // Convenience accessors
    permissionSets: data?.permissionSets || [],
    highRiskUsers: data?.highRiskUsers || [],
    profiles: data?.profiles || [],
    summary: data?.summary || null,
  };
}
