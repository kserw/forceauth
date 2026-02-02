import { useEffect, useState, useRef } from 'react';
import { KeyRound, Loader2, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDemoMode } from '../context/DemoModeContext';
import { fetchIntegrationsData, type NamedCredentialInfo } from '../services/api';
import { getSalesforceNamedCredentialUrl } from '../utils/salesforceLinks';
import { mockNamedCredentials } from '../data/mockData';

const ITEMS_PER_PAGE = 10;

export function NamedCredentialsPanel() {
  const { isAuthenticated, instanceUrl, refreshKey } = useAuth();
  const { isDemoMode } = useDemoMode();
  const [credentials, setCredentials] = useState<NamedCredentialInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const showDemoIndicator = isDemoMode && !isAuthenticated;
  const displayCredentials = showDemoIndicator ? (mockNamedCredentials as NamedCredentialInfo[]) : credentials;

  const loadData = () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    fetchIntegrationsData()
      .then(data => {
        setCredentials(data.namedCredentials);
        setCurrentPage(0);
      })
      .catch(err => {
        console.error('Failed to fetch credentials:', err);
        setError(err.message);
      })
      .finally(() => setIsLoading(false));
  };

  const totalPages = Math.ceil(displayCredentials.length / ITEMS_PER_PAGE);
  const paginatedCredentials = displayCredentials.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  useEffect(() => {
    loadData();
  }, [isAuthenticated, refreshKey]);

  if (!isAuthenticated && !isDemoMode) {
    return (
      <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">// named_credentials[]</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">login to view credentials</span>
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

  return (
    <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {showDemoIndicator && <span className="mr-1 px-1.5 py-0.5 rounded text-[10px] bg-[hsl(var(--warning)/0.2)] text-[hsl(var(--warning))]">demo</span>}
          <span className="text-xs text-[hsl(var(--muted-foreground))]">// named_credentials[]</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[hsl(var(--muted-foreground))] tabular-nums">
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin inline" /> : `${displayCredentials.length} credentials`}
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
        {isLoading && displayCredentials.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--muted-foreground))]" />
          </div>
        ) : displayCredentials.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <span className="text-xs text-[hsl(var(--muted-foreground))]">no named credentials found</span>
            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">(requires Tooling API access)</span>
          </div>
        ) : (
          <div className="space-y-1">
            {paginatedCredentials.map((cred) => {
              const credUrl = getSalesforceNamedCredentialUrl(instanceUrl, cred.id);
              return (
                <div
                  key={cred.id}
                  onClick={() => credUrl && window.open(credUrl, '_blank')}
                  className="group flex items-center gap-3 p-2 -mx-2 rounded hover:bg-[hsl(var(--muted)/0.5)] transition-colors cursor-pointer"
                >
                  <div className="p-1.5 rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                    <KeyRound className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[hsl(var(--foreground))] truncate">{cred.label}</span>
                      {cred.principalType && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                          {cred.principalType}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))] font-mono truncate block">
                      {cred.developerName}
                    </span>
                  </div>
                  <div className="text-right max-w-[150px]">
                    {cred.endpoint && (
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))] truncate block font-mono">
                        {cred.endpoint}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-[hsl(var(--border))]">
          <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
            {currentPage * ITEMS_PER_PAGE + 1}-{Math.min((currentPage + 1) * ITEMS_PER_PAGE, displayCredentials.length)} of {displayCredentials.length}
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
