import { useState, useEffect } from 'react';
import { X, Building2, ExternalLink, Loader2 } from 'lucide-react';
import Link from 'next/link';
import {
  type SalesforceEnvironment,
  storeOrgCredentials,
  getStoredOrgCredentials,
  type StoredOrgCredentials,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useDemoMode } from '../context/DemoModeContext';

interface ConnectOrgModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConnectOrgModal({ isOpen, onClose }: ConnectOrgModalProps) {
  const { login, setSelectedOrgId } = useAuth();
  const { setDemoMode } = useDemoMode();

  const [orgName, setOrgName] = useState('');
  const [environment, setEnvironment] = useState<SalesforceEnvironment>('sandbox');
  const [clientId, setClientId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing credentials if any
  useEffect(() => {
    if (isOpen) {
      const stored = getStoredOrgCredentials();
      if (stored) {
        setOrgName(stored.orgName || '');
        setEnvironment(stored.environment);
        setClientId(stored.clientId);
      }
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const credentials: StoredOrgCredentials = {
        clientId: clientId.trim(),
        redirectUri: `${window.location.origin}/api/auth/callback`,
        environment,
        orgName: orgName.trim(),
      };

      storeOrgCredentials(credentials);

      const localOrgId = `local-${Date.now()}`;
      setSelectedOrgId(localOrgId);
      localStorage.setItem('sf_selected_org_id', localOrgId);

      setDemoMode(false);
      onClose();

      // Trigger login
      login();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save credentials');
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[hsl(var(--info)/0.1)]">
              <Building2 className="w-5 h-5 text-[hsl(var(--info))]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">Connect Salesforce Org</h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Enter your External Client App credentials</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"
          >
            <X className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="px-3 py-2 text-sm text-[hsl(var(--destructive))] bg-[hsl(var(--destructive)/0.1)] rounded-lg border border-[hsl(var(--destructive)/0.2)]">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-[hsl(var(--foreground))]">
              Org Name
            </label>
            <input
              type="text"
              placeholder="e.g., Acme Production"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--info))] focus:border-transparent"
            />
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              A friendly name to identify this org
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[hsl(var(--foreground))]">
              Environment
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEnvironment('sandbox')}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  environment === 'sandbox'
                    ? 'border-[hsl(var(--warning))] bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))]'
                    : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'
                }`}
              >
                Sandbox
              </button>
              <button
                type="button"
                onClick={() => setEnvironment('production')}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  environment === 'production'
                    ? 'border-[hsl(var(--success))] bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]'
                    : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'
                }`}
              >
                Production
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[hsl(var(--foreground))]">
              Client ID
            </label>
            <input
              type="text"
              placeholder="3MVG9..."
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] font-mono placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--info))] focus:border-transparent"
            />
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              From your External Client App settings in Salesforce
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !orgName.trim() || !clientId.trim()}
              className="w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-[hsl(var(--info))] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect & Login'
              )}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
          <Link
            href="/setup"
            onClick={onClose}
            className="flex items-center gap-2 text-sm text-[hsl(var(--info))] hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Need help setting up an External Client App?
          </Link>
        </div>
      </div>
    </div>
  );
}
