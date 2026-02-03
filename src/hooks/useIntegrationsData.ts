import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchIntegrationsData, type IntegrationsData } from '../services/api';

// Module-level cache - shared across all component instances
let cachedData: IntegrationsData | null = null;
let fetchPromise: Promise<IntegrationsData> | null = null;
let lastFetchKey: string | null = null;

export function useIntegrationsData() {
  const { isAuthenticated, refreshKey } = useAuth();
  const [data, setData] = useState<IntegrationsData | null>(cachedData);
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

      const result = await fetchIntegrationsData();
      cachedData = result;
      lastFetchKey = fetchKey;
      setData(result);
    } catch (err) {
      console.error('Failed to fetch integrations data:', err);
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

    fetchPromise = fetchIntegrationsData();
    lastFetchKey = fetchKey;

    fetchPromise
      .then(result => {
        cachedData = result;
        setData(result);
      })
      .catch(err => {
        console.error('Failed to fetch integrations data:', err);
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
    integrationUsers: data?.integrationUsers || [],
    oauthTokens: data?.oauthTokens || [],
    installedPackages: data?.installedPackages || [],
    namedCredentials: data?.namedCredentials || [],
  };
}
