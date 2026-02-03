import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchAnomaliesData, type AnomaliesData } from '../services/api';

// Module-level cache - shared across all component instances
let cachedData: AnomaliesData | null = null;
let fetchPromise: Promise<AnomaliesData> | null = null;
let lastFetchKey: string | null = null;

export function useAnomaliesData() {
  const { isAuthenticated, refreshKey } = useAuth();
  const [data, setData] = useState<AnomaliesData | null>(cachedData);
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

      const result = await fetchAnomaliesData();
      cachedData = result;
      lastFetchKey = fetchKey;
      setData(result);
    } catch (err) {
      console.error('Failed to fetch anomalies data:', err);
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

    fetchPromise = fetchAnomaliesData();
    lastFetchKey = fetchKey;

    fetchPromise
      .then(result => {
        cachedData = result;
        setData(result);
      })
      .catch(err => {
        console.error('Failed to fetch anomalies data:', err);
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
    concurrentSessions: data?.concurrentSessions || [],
    loginAnomalies: data?.loginAnomalies || [],
    failedLoginPatterns: data?.failedLoginPatterns || [],
    summary: data?.summary || null,
  };
}
