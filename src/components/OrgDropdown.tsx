import { useState, useEffect, useRef } from 'react';
import { Building2, ChevronDown, LogIn, LogOut, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDemoMode } from '../context/DemoModeContext';
import { getStoredOrgCredentials, clearStoredOrgCredentials, type StoredOrgCredentials } from '../services/api';

interface OrgDropdownProps {
  onAddEnvironment: () => void;
}

export function OrgDropdown({ onAddEnvironment }: OrgDropdownProps) {
  const { isAuthenticated, user, login, logout, setSelectedOrgId } = useAuth();
  const { setDemoMode } = useDemoMode();
  const [isOpen, setIsOpen] = useState(false);
  const [storedCredentials, setStoredCredentials] = useState<StoredOrgCredentials | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load stored credentials on mount
  useEffect(() => {
    setStoredCredentials(getStoredOrgCredentials());
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Refresh credentials when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setStoredCredentials(getStoredOrgCredentials());
    }
  }, [isOpen]);

  const handleDelete = async () => {
    if (!confirm('Remove saved credentials? You will be logged out.')) return;

    clearStoredOrgCredentials();
    localStorage.removeItem('sf_selected_org_id');
    setStoredCredentials(null);
    await logout();
    setSelectedOrgId(null);
    setDemoMode(true);
    setIsOpen(false);
  };

  const handleLogin = () => {
    login();
    setIsOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    setIsOpen(false);
  };

  const orgName = isAuthenticated ? user?.orgName : storedCredentials?.orgName;
  const environment = storedCredentials?.environment;

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-[hsl(var(--muted))] text-xs hover:bg-[hsl(var(--accent))] transition-colors"
      >
        <Building2 className="w-3.5 h-3.5 text-[hsl(var(--info))]" />
        <span className="text-[hsl(var(--foreground))] max-w-[120px] truncate">
          {orgName || 'Connect Org'}
        </span>
        {environment && (
          <span className={`px-1 py-0.5 rounded text-[10px] ${
            environment === 'sandbox'
              ? 'bg-[hsl(var(--warning)/0.2)] text-[hsl(var(--warning))]'
              : 'bg-[hsl(var(--success)/0.2)] text-[hsl(var(--success))]'
          }`}>
            {environment}
          </span>
        )}
        <ChevronDown className={`w-3 h-3 text-[hsl(var(--muted-foreground))] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 z-50 min-w-[220px] rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-lg overflow-hidden">
          {/* Current org info */}
          {storedCredentials && (
            <div className="px-3 py-2.5 bg-[hsl(var(--muted)/0.5)] border-b border-[hsl(var(--border))]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-[hsl(var(--foreground))]">
                    {storedCredentials.orgName || 'Salesforce Org'}
                  </div>
                  <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
                    {storedCredentials.environment} environment
                  </div>
                </div>
                {isAuthenticated && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-[hsl(var(--success)/0.2)] text-[hsl(var(--success))]">
                    connected
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="py-1">
            {storedCredentials ? (
              <>
                {isAuthenticated ? (
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
                  >
                    <LogOut className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                    Logout
                  </button>
                ) : (
                  <button
                    onClick={handleLogin}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[hsl(var(--success))] hover:bg-[hsl(var(--success)/0.1)]"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Login with Salesforce
                  </button>
                )}
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove Credentials
                </button>
              </>
            ) : null}

            <div className="border-t border-[hsl(var(--border))] mt-1 pt-1">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onAddEnvironment();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[hsl(var(--info))] hover:bg-[hsl(var(--info)/0.1)]"
              >
                <Plus className="w-3.5 h-3.5" />
                {storedCredentials ? 'Add Environment' : 'Connect Org'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
