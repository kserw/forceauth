import { useState, useEffect } from 'react';
import { Plus, Trash2, Building2, Loader2, ChevronDown, ExternalLink, LogIn, LogOut } from 'lucide-react';
import {
  type SalesforceEnvironment,
  storeOrgCredentials,
  getStoredOrgCredentials,
  clearStoredOrgCredentials,
  type StoredOrgCredentials,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useDemoMode } from '../context/DemoModeContext';

interface OrgManagerProps {
  selectedOrgId: string | null;
  onSelectOrg: (orgId: string | null) => void;
  onOrgRegistered?: (orgId: string) => void;
  disabled?: boolean;
  forceOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function OrgManager({ selectedOrgId, onSelectOrg, onOrgRegistered, disabled, forceOpen, onOpenChange }: OrgManagerProps) {
  const { logout, login, isAuthenticated } = useAuth();
  const { setDemoMode } = useDemoMode();
  const [storedCredentials, setStoredCredentials] = useState<StoredOrgCredentials | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpenInternal, setIsOpenInternal] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use controlled or uncontrolled open state
  const isOpen = forceOpen ?? isOpenInternal;
  const setIsOpen = (open: boolean) => {
    setIsOpenInternal(open);
    onOpenChange?.(open);
  };

  // Registration form (PKCE - no secret needed!)
  const [orgName, setOrgName] = useState('');
  const [environment, setEnvironment] = useState<SalesforceEnvironment>('sandbox');
  const [clientId, setClientId] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    loadStoredCredentials();
  }, []);

  // Handle forceOpen - auto-show register form if no credentials
  useEffect(() => {
    if (forceOpen && !isLoading && !storedCredentials) {
      setShowRegister(true);
    }
  }, [forceOpen, isLoading, storedCredentials]);

  function loadStoredCredentials() {
    try {
      const credentials = getStoredOrgCredentials();
      setStoredCredentials(credentials);
    } catch (err) {
      console.error('Failed to load stored credentials:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsRegistering(true);

    try {
      // Store credentials in localStorage (PKCE - no secret needed!)
      const credentials: StoredOrgCredentials = {
        clientId,
        redirectUri: `${window.location.origin}/api/auth/callback`,
        environment,
        orgName,
      };

      storeOrgCredentials(credentials);
      setStoredCredentials(credentials);

      // Generate a local ID for this org
      const localOrgId = `local-${Date.now()}`;
      onSelectOrg(localOrgId);
      localStorage.setItem('sf_selected_org_id', localOrgId);

      setShowRegister(false);
      setIsOpen(false);
      setOrgName('');
      setClientId('');

      // Disable demo mode when credentials are stored
      setDemoMode(false);

      // Trigger login after registration
      if (onOrgRegistered) {
        onOrgRegistered(localOrgId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save credentials');
    } finally {
      setIsRegistering(false);
    }
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Remove saved credentials? You will be logged out.')) return;

    try {
      clearStoredOrgCredentials();
      localStorage.removeItem('sf_selected_org_id');
      setStoredCredentials(null);
      await logout();
      onSelectOrg(null);
      setIsOpen(false);
      // Enable demo mode when credentials are removed
      setDemoMode(true);
      setShowRegister(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove credentials');
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] text-xs">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Dropdown trigger */}
      <button
        onClick={() => {
          if (disabled) return;
          const opening = !isOpen;
          setIsOpen(opening);
          // Auto-show register form if no credentials exist
          if (opening && !storedCredentials) {
            setShowRegister(true);
          }
        }}
        disabled={disabled}
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded bg-[hsl(var(--muted))] text-xs transition-colors ${
          disabled
            ? 'opacity-60 cursor-not-allowed'
            : 'hover:bg-[hsl(var(--accent))]'
        }`}
      >
        <Building2 className="w-3 h-3 text-[hsl(var(--info))]" />
        <span className="text-[hsl(var(--foreground))] max-w-[150px] truncate">
          {storedCredentials?.orgName || 'Configure Org'}
        </span>
        {storedCredentials && (
          <span className={`px-1 py-0.5 rounded text-[10px] ${
            storedCredentials.environment === 'sandbox'
              ? 'bg-[hsl(var(--warning)/0.2)] text-[hsl(var(--warning))]'
              : 'bg-[hsl(var(--success)/0.2)] text-[hsl(var(--success))]'
          }`}>
            {storedCredentials.environment}
          </span>
        )}
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 z-50 min-w-[280px] rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-lg">
            {/* Error display */}
            {error && !showRegister && (
              <div className="px-3 py-2 text-xs text-[hsl(var(--destructive))] bg-[hsl(var(--destructive)/0.1)] border-b border-[hsl(var(--destructive)/0.2)]">
                {error}
              </div>
            )}

            {/* Current credentials display */}
            {storedCredentials && !showRegister && (
              <div className="max-h-[200px] overflow-y-auto">
                <div className="flex items-center justify-between px-3 py-2 bg-[hsl(var(--muted))]">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                    <div>
                      <div className="text-xs font-medium text-[hsl(var(--foreground))]">
                        {storedCredentials.orgName || 'Salesforce Org'}
                      </div>
                      <div className="text-[10px] text-[hsl(var(--muted-foreground))]">
                        {storedCredentials.environment}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleDelete}
                    title="Remove credentials"
                    className="p-1 rounded hover:bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* No credentials message */}
            {!storedCredentials && !showRegister && (
              <div className="px-3 py-4 text-center text-xs text-[hsl(var(--muted-foreground))]">
                No credentials configured
              </div>
            )}

            {/* Login/Logout buttons */}
            {storedCredentials && !showRegister && (
              <div className="border-t border-[hsl(var(--border))]">
                {isAuthenticated ? (
                  <button
                    onClick={async () => {
                      await logout();
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Logout
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      login();
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[hsl(var(--success))] hover:bg-[hsl(var(--success)/0.1)]"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Login with Salesforce
                  </button>
                )}
              </div>
            )}

            {/* Add/Edit credentials form */}
            <div className="border-t border-[hsl(var(--border))]">
              {showRegister ? (
                <form onSubmit={handleRegister} className="p-3 space-y-3">
                  <div className="text-xs font-medium text-[hsl(var(--foreground))] mb-2">
                    Configure Connected App
                  </div>

                  {error && (
                    <div className="text-xs text-[hsl(var(--destructive))] bg-[hsl(var(--destructive)/0.1)] px-2 py-1 rounded">
                      {error}
                    </div>
                  )}

                  <input
                    type="text"
                    placeholder="Org Name (e.g., Acme Sandbox)"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    required
                    className="w-full px-2 py-1.5 text-xs rounded border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))]"
                  />

                  <select
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value as SalesforceEnvironment)}
                    className="w-full px-2 py-1.5 text-xs rounded border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))]"
                  >
                    <option value="sandbox">Sandbox</option>
                    <option value="production">Production</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Consumer Key (Client ID)"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    required
                    className="w-full px-2 py-1.5 text-xs rounded border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] font-mono"
                  />

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowRegister(false);
                        // Close dropdown if no credentials exist (nothing to show)
                        if (!storedCredentials) {
                          setIsOpen(false);
                        }
                      }}
                      className="flex-1 px-2 py-1.5 text-xs rounded border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isRegistering}
                      className="flex-1 px-2 py-1.5 text-xs rounded bg-[hsl(var(--info))] text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {isRegistering ? 'Saving...' : 'Save & Login'}
                    </button>
                  </div>

                  <a
                    href="/setup"
                    className="flex items-center gap-1 text-[10px] text-[hsl(var(--info))] hover:underline"
                  >
                    <ExternalLink className="w-2.5 h-2.5" />
                    How to set up a Connected App
                  </a>
                </form>
              ) : (
                <button
                  onClick={() => setShowRegister(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[hsl(var(--info))] hover:bg-[hsl(var(--muted))]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {storedCredentials ? 'Change Credentials' : 'Configure Connected App'}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
