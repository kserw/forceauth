import { useState, useEffect } from 'react';
import { X, Terminal, Loader2 } from 'lucide-react';
import Link from 'next/link';
import {
  type SalesforceEnvironment,
  storeOrgCredentials,
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

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setOrgName('');
      setEnvironment('sandbox');
      setClientId('');
      setError(null);
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
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[hsl(var(--info))]" />
            <span className="text-sm text-[hsl(var(--muted-foreground))]">// connect_org()</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[hsl(var(--muted))] transition-colors"
          >
            <X className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="px-3 py-2 text-xs text-[hsl(var(--destructive))] bg-[hsl(var(--destructive)/0.1)] rounded border border-[hsl(var(--destructive)/0.2)] font-mono">
              error: {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs text-[hsl(var(--muted-foreground))]">
              org_name
            </label>
            <input
              type="text"
              placeholder="acme_production"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm rounded border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:border-[hsl(var(--info))]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[hsl(var(--muted-foreground))]">
              environment
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEnvironment('sandbox')}
                className={`px-3 py-2 text-xs rounded border transition-colors ${
                  environment === 'sandbox'
                    ? 'border-[hsl(var(--warning))] bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))]'
                    : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/0.5)]'
                }`}
              >
                sandbox
              </button>
              <button
                type="button"
                onClick={() => setEnvironment('production')}
                className={`px-3 py-2 text-xs rounded border transition-colors ${
                  environment === 'production'
                    ? 'border-[hsl(var(--success))] bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]'
                    : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/0.5)]'
                }`}
              >
                production
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[hsl(var(--muted-foreground))]">
              client_id
            </label>
            <input
              type="text"
              placeholder="3MVG9..."
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm rounded border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] text-[hsl(var(--foreground))] font-mono placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:border-[hsl(var(--info))]"
            />
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 py-2 text-xs rounded border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/0.5)] transition-colors"
            >
              cancel()
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !orgName.trim() || !clientId.trim()}
              className="flex-1 px-3 py-2 text-xs rounded bg-[hsl(var(--info))] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  connecting...
                </>
              ) : (
                'connect()'
              )}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)]">
          <Link
            href="/setup"
            onClick={onClose}
            className="text-xs text-[hsl(var(--info))] hover:underline"
          >
            // setup_guide() →
          </Link>
        </div>
      </div>
    </div>
  );
}
