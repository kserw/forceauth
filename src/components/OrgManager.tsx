import { useState, useEffect } from 'react';
import { Plus, Trash2, Building2, Loader2, ChevronDown, ExternalLink, Share2, Users, LogIn, LogOut } from 'lucide-react';
import {
  listOrgs,
  getOrgById,
  registerOrg,
  deleteOrg,
  toggleOrgSharing,
  type RegisteredOrg,
  type SalesforceEnvironment,
} from '../services/api';
import { useAuth } from '../context/AuthContext';

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
  const [orgs, setOrgs] = useState<RegisteredOrg[]>([]);
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

  // Registration form
  const [orgName, setOrgName] = useState('');
  const [environment, setEnvironment] = useState<SalesforceEnvironment>('sandbox');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    fetchOrgs();
  }, [selectedOrgId]);

  // Handle forceOpen - auto-show register form if no orgs
  useEffect(() => {
    if (forceOpen && !isLoading && orgs.length === 0) {
      setShowRegister(true);
    }
  }, [forceOpen, isLoading, orgs.length]);

  async function fetchOrgs() {
    try {
      let data = await listOrgs();

      // If no orgs returned but we have a stored org ID, try to fetch it directly
      // This allows logged-out users to log back in with their previous org
      const storedOrgId = localStorage.getItem('sf_selected_org_id');
      if (data.length === 0 && storedOrgId) {
        const storedOrg = await getOrgById(storedOrgId);
        if (storedOrg) {
          data = [storedOrg];
        }
      }

      // Deduplicate orgs by clientId, preferring the selected org
      const byClientId = new Map<string, RegisteredOrg>();
      for (const org of data) {
        const existing = byClientId.get(org.clientId);
        if (!existing) {
          byClientId.set(org.clientId, org);
        } else if (org.id === selectedOrgId || org.id === storedOrgId) {
          // Prefer the selected org over others with same clientId
          byClientId.set(org.clientId, org);
        }
      }
      setOrgs(Array.from(byClientId.values()));
    } catch (err) {
      console.error('Failed to fetch orgs:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsRegistering(true);

    try {
      const newOrg = await registerOrg(orgName, environment, clientId, clientSecret);
      setOrgs((prev) => [...prev, newOrg]);
      onSelectOrg(newOrg.id);
      setShowRegister(false);
      setIsOpen(false);
      setOrgName('');
      setClientId('');
      setClientSecret('');
      // Trigger login after registration with the new org ID
      if (onOrgRegistered) {
        onOrgRegistered(newOrg.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register org');
    } finally {
      setIsRegistering(false);
    }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Remove this org? You will be logged out.')) return;

    try {
      await deleteOrg(id);
      setOrgs((prev) => prev.filter((o) => o.id !== id));
      // Always logout when removing an org to clear session state
      await logout();
      onSelectOrg(null);
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete org');
    }
  }

  async function handleToggleSharing(id: string, shared: boolean, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await toggleOrgSharing(id, shared);
      setOrgs((prev) =>
        prev.map((o) => (o.id === id ? { ...o, shared } : o))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update sharing');
    }
  }

  const selectedOrg = orgs.find((o) => o.id === selectedOrgId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] text-xs">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Loading orgs...</span>
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
          // Auto-show register form if no orgs exist
          if (opening && orgs.length === 0) {
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
          {selectedOrg ? selectedOrg.orgName : 'Select Org'}
        </span>
        {selectedOrg && (
          <span className={`px-1 py-0.5 rounded text-[10px] ${
            selectedOrg.environment === 'sandbox'
              ? 'bg-[hsl(var(--warning)/0.2)] text-[hsl(var(--warning))]'
              : 'bg-[hsl(var(--success)/0.2)] text-[hsl(var(--success))]'
          }`}>
            {selectedOrg.environment}
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
            {/* Org list */}
            <div className="max-h-[200px] overflow-y-auto">
              {orgs.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-[hsl(var(--muted-foreground))]">
                  No orgs registered yet
                </div>
              ) : (
                orgs.map((org) => (
                  <div
                    key={org.id}
                    onClick={() => {
                      onSelectOrg(org.id);
                      setIsOpen(false);
                    }}
                    className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-[hsl(var(--muted))] ${
                      selectedOrgId === org.id ? 'bg-[hsl(var(--muted))]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-[hsl(var(--foreground))]">
                          {org.orgName}
                          {!org.isOwner && (
                            <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] bg-[hsl(var(--info)/0.15)] text-[hsl(var(--info))]">
                              <Users className="w-2.5 h-2.5" />
                              shared
                            </span>
                          )}
                          {org.isOwner && org.shared && (
                            <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]">
                              <Share2 className="w-2.5 h-2.5" />
                              sharing
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[hsl(var(--muted-foreground))]">
                          {org.environment} • {org.orgId || 'Not connected'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {org.isOwner && (
                        <>
                          <button
                            onClick={(e) => handleToggleSharing(org.id, !org.shared, e)}
                            title={org.shared ? 'Stop sharing with team' : 'Share with team'}
                            className={`p-1 rounded transition-colors ${
                              org.shared
                                ? 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] hover:bg-[hsl(var(--success)/0.2)]'
                                : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]'
                            }`}
                          >
                            <Share2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(org.id, e)}
                            className="p-1 rounded hover:bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Login/Logout buttons */}
            {orgs.length > 0 && (
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
                      const orgId = selectedOrgId || orgs[0]?.id;
                      if (orgId) {
                        login(orgId);
                        setIsOpen(false);
                      }
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[hsl(var(--success))] hover:bg-[hsl(var(--success)/0.1)]"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Login with Salesforce
                  </button>
                )}
              </div>
            )}

            {/* Add org button / form */}
            <div className="border-t border-[hsl(var(--border))]">
              {showRegister ? (
                <form onSubmit={handleRegister} className="p-3 space-y-3">
                  <div className="text-xs font-medium text-[hsl(var(--foreground))] mb-2">
                    Register External Client App
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

                  <input
                    type="password"
                    placeholder="Consumer Secret"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    required
                    className="w-full px-2 py-1.5 text-xs rounded border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] font-mono"
                  />

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowRegister(false);
                        // Close dropdown if no orgs exist (nothing to show)
                        if (orgs.length === 0) {
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
                      {isRegistering ? 'Registering...' : 'Register'}
                    </button>
                  </div>

                  <a
                    href="https://help.salesforce.com/s/articleView?id=sf.connected_app_create_basics.htm"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-[hsl(var(--info))] hover:underline"
                  >
                    <ExternalLink className="w-2.5 h-2.5" />
                    How to find Consumer Key/Secret
                  </a>
                </form>
              ) : (
                <button
                  onClick={() => setShowRegister(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[hsl(var(--info))] hover:bg-[hsl(var(--muted))]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Register New Org
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
