import { useEffect, useState, useRef } from 'react';
import { KeyRound, Loader2, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDemoMode } from '../context/DemoModeContext';
import { fetchAuthProviders, type AuthProvider } from '../services/api';
import { mockAuthProviders } from '../data/mockData';

const ITEMS_PER_PAGE = 5;

function getProviderIcon(type: string | undefined | null): string {
  if (!type) return '?';
  const typeMap: Record<string, string> = {
    'Google': 'G',
    'Facebook': 'f',
    'Twitter': 'X',
    'LinkedIn': 'in',
    'Microsoft': 'M',
    'Salesforce': 'SF',
    'OpenIdConnect': 'ID',
    'Janrain': 'J',
  };

  for (const [key, icon] of Object.entries(typeMap)) {
    if (type.toLowerCase().includes(key.toLowerCase())) {
      return icon;
    }
  }
  return type.charAt(0)?.toUpperCase() || '?';
}

function getProviderColor(type: string | undefined | null): string {
  if (!type) return 'bg-violet-500';
  if (type.toLowerCase().includes('google')) return 'bg-red-500';
  if (type.toLowerCase().includes('facebook')) return 'bg-blue-600';
  if (type.toLowerCase().includes('microsoft')) return 'bg-blue-500';
  if (type.toLowerCase().includes('salesforce')) return 'bg-blue-400';
  if (type.toLowerCase().includes('linkedin')) return 'bg-blue-700';
  return 'bg-violet-500';
}

export function AuthProvidersPanel() {
  const { isAuthenticated, refreshKey } = useAuth();
  const { isDemoMode } = useDemoMode();
  const [providers, setProviders] = useState<AuthProvider[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const showDemoIndicator = isDemoMode && !isAuthenticated;
  const displayProviders = showDemoIndicator ? (mockAuthProviders as AuthProvider[]) : providers;

  const loadData = () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    fetchAuthProviders()
      .then(data => {
        setProviders(data || []);
        setCurrentPage(0);
      })
      .catch(err => {
        console.error('Failed to fetch auth providers:', err);
        setError(err.message);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [isAuthenticated, refreshKey]);

  if (!isAuthenticated && !isDemoMode) {
    return (
      <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">// auth_providers[]</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">login to view auth providers</span>
        </div>
      </div>
    );
  }

  if (error && !showDemoIndicator) {
    return (
      <div className="h-full p-4 rounded-md border border-[hsl(var(--destructive)/0.5)] bg-[hsl(var(--destructive)/0.1)] flex flex-col items-center justify-center">
        <span className="text-xs text-[hsl(var(--destructive))]">{error}</span>
      </div>
    );
  }

  const totalPages = Math.ceil(displayProviders.length / ITEMS_PER_PAGE);
  const paginatedProviders = displayProviders.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  return (
    <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <KeyRound className="w-3.5 h-3.5 text-[hsl(var(--info))]" />
          {showDemoIndicator && <span className="mr-1 px-1.5 py-0.5 rounded text-[10px] bg-[hsl(var(--warning)/0.2)] text-[hsl(var(--warning))]">demo</span>}
          <span className="text-xs text-[hsl(var(--muted-foreground))]">// auth_providers[]</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[hsl(var(--muted-foreground))] tabular-nums">
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin inline" /> : `${displayProviders.length} configured`}
          </span>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-1 rounded hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 text-[hsl(var(--muted-foreground))] ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-auto -mx-4 px-4">
        {isLoading && displayProviders.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--muted-foreground))]" />
          </div>
        ) : displayProviders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-1">
            <span className="text-xs text-[hsl(var(--muted-foreground))]">no SSO providers configured</span>
            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">users authenticate directly with Salesforce</span>
          </div>
        ) : (
          <div className="space-y-1">
            {paginatedProviders.map((provider) => (
              <div
                key={provider.Id}
                className="group flex items-center gap-3 p-2 -mx-2 rounded hover:bg-[hsl(var(--muted)/0.5)] transition-colors"
              >
                <div className={`w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold ${getProviderColor(provider.ProviderType)}`}>
                  {getProviderIcon(provider.ProviderType)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[hsl(var(--foreground))] truncate">{provider.FriendlyName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-[hsl(var(--muted-foreground))]">
                    <span>{provider.ProviderType}</span>
                    <span>•</span>
                    <span className="truncate">{provider.DeveloperName}</span>
                  </div>
                </div>
                {provider.RegistrationHandlerId && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                    auto-reg
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-[hsl(var(--border))]">
          <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
            {currentPage * ITEMS_PER_PAGE + 1}-{Math.min((currentPage + 1) * ITEMS_PER_PAGE, displayProviders.length)} of {displayProviders.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setCurrentPage(p => Math.max(0, p - 1)); scrollRef.current?.scrollTo(0, 0); }}
              disabled={currentPage === 0}
              className="p-1 rounded hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
            </button>
            <span className="text-[10px] text-[hsl(var(--muted-foreground))] tabular-nums px-2">
              {currentPage + 1} / {totalPages}
            </span>
            <button
              onClick={() => { setCurrentPage(p => Math.min(totalPages - 1, p + 1)); scrollRef.current?.scrollTo(0, 0); }}
              disabled={currentPage === totalPages - 1}
              className="p-1 rounded hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
