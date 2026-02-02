import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import {
  checkAuthStatus,
  initiatePopupLogin,
  logout as apiLogout,
  type AuthStatus,
  type UserInfo,
  type SalesforceEnvironment,
} from '../services/api';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoggingIn: boolean;
  user: UserInfo | null;
  environment: SalesforceEnvironment;
  instanceUrl: string | null;
  error: string | null;
  selectedOrgId: string | null;
  refreshKey: number;
  login: (overrideOrgId?: string) => Promise<void>;
  logout: () => Promise<void>;
  setEnvironment: (env: SalesforceEnvironment) => void;
  setSelectedOrgId: (orgId: string | null) => void;
  clearError: () => void;
  triggerRefresh: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isBrowser = typeof window !== 'undefined';

function getStoredEnvironment(): SalesforceEnvironment {
  if (!isBrowser) return 'sandbox';
  const stored = localStorage.getItem('sf_environment');
  return stored === 'production' || stored === 'sandbox' ? stored : 'sandbox';
}

function getStoredOrgId(): string | null {
  if (!isBrowser) return null;
  return localStorage.getItem('sf_selected_org_id');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [environment, setEnvironmentState] = useState<SalesforceEnvironment>('sandbox');
  const [instanceUrl, setInstanceUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrgId, setSelectedOrgIdState] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Initialize from localStorage on mount
  useEffect(() => {
    setEnvironmentState(getStoredEnvironment());
    setSelectedOrgIdState(getStoredOrgId());
  }, []);

  // Check for error in URL params (from OAuth callback fallback)
  useEffect(() => {
    if (!isBrowser) return;
    const params = new URLSearchParams(window.location.search);
    const urlError = params.get('error');
    if (urlError) {
      setError(urlError);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Function to fetch and set auth status
  const fetchAuthStatus = useCallback(async () => {
    try {
      const status: AuthStatus = await checkAuthStatus();
      setIsAuthenticated(status.authenticated);
      if (status.authenticated && status.user) {
        setUser(status.user);
        setInstanceUrl(status.instanceUrl || null);
        if (status.environment) {
          setEnvironmentState(status.environment);
          if (isBrowser) {
            localStorage.setItem('sf_environment', status.environment);
          }
        }
        // Set the selected org from the session
        if (status.orgCredentialsId) {
          setSelectedOrgIdState(status.orgCredentialsId);
          if (isBrowser) {
            localStorage.setItem('sf_selected_org_id', status.orgCredentialsId);
          }
        }
      }
      return status.authenticated;
    } catch (err) {
      console.error('Failed to check auth status:', err);
      setIsAuthenticated(false);
      return false;
    }
  }, []);

  // Check auth status on mount
  useEffect(() => {
    fetchAuthStatus().finally(() => setIsLoading(false));
  }, [fetchAuthStatus]);

  const login = useCallback(async (overrideOrgId?: string) => {
    if (isLoggingIn || !isBrowser) return;

    setIsLoggingIn(true);
    setError(null);

    // Use override orgId if provided (for auto-login after registration)
    const orgIdToUse = overrideOrgId ?? selectedOrgId ?? undefined;

    // Add focus listener as fallback to detect auth completion
    const handleFocus = async () => {
      // Small delay to let the server set the cookie
      await new Promise(r => setTimeout(r, 300));
      const isNowAuth = await fetchAuthStatus();
      if (isNowAuth) {
        window.removeEventListener('focus', handleFocus);
        window.location.reload();
      }
    };
    window.addEventListener('focus', handleFocus);

    try {
      const result = await initiatePopupLogin(environment, orgIdToUse);

      window.removeEventListener('focus', handleFocus);

      if (result.success) {
        window.location.reload();
      } else if (result.error && result.error !== 'Login window was closed') {
        // Check if we're actually authenticated despite the "closed" message
        const isNowAuth = await fetchAuthStatus();
        if (isNowAuth) {
          window.location.reload();
        } else {
          setError(result.error);
        }
      }
    } catch (err) {
      window.removeEventListener('focus', handleFocus);
      console.error('Login failed:', err);
      setError('Login failed. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  }, [environment, selectedOrgId, isLoggingIn, fetchAuthStatus]);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      setIsAuthenticated(false);
      setUser(null);
      setInstanceUrl(null);
    }
  }, []);

  const setEnvironment = useCallback((env: SalesforceEnvironment) => {
    if (!isAuthenticated) {
      setEnvironmentState(env);
      if (isBrowser) {
        localStorage.setItem('sf_environment', env);
      }
    }
  }, [isAuthenticated]);

  const setSelectedOrgId = useCallback((orgId: string | null) => {
    if (!isAuthenticated) {
      setSelectedOrgIdState(orgId);
      if (isBrowser) {
        if (orgId) {
          localStorage.setItem('sf_selected_org_id', orgId);
        } else {
          localStorage.removeItem('sf_selected_org_id');
        }
      }
    }
  }, [isAuthenticated]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        isLoggingIn,
        user,
        environment,
        instanceUrl,
        error,
        selectedOrgId,
        refreshKey,
        login,
        logout,
        setEnvironment,
        setSelectedOrgId,
        clearError,
        triggerRefresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
