import { useEffect, useState, useRef } from 'react';
import { AppWindow, Loader2, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchIntegrationsData, type OAuthTokenInfo } from '../services/api';

const ITEMS_PER_PAGE = 10;

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

export function ConnectedAppsPanel() {
  const { isAuthenticated, refreshKey } = useAuth();
  const [tokens, setTokens] = useState<OAuthTokenInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadData = () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    fetchIntegrationsData()
      .then(data => {
        setTokens(data.oauthTokens);
        setCurrentPage(0);
      })
      .catch(err => {
        console.error('Failed to fetch OAuth tokens:', err);
        setError(err.message);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [isAuthenticated, refreshKey]);

  if (!isAuthenticated) {
    return (
      <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">// oauth_tokens[]</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">login to view connected apps</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full p-4 rounded-md border border-[hsl(var(--destructive)/0.5)] bg-[hsl(var(--destructive)/0.1)] flex flex-col items-center justify-center">
        <span className="text-xs text-[hsl(var(--destructive))]">{error}</span>
      </div>
    );
  }

  // Group tokens by app name
  const appGroups = tokens.reduce((acc, token) => {
    if (!acc[token.appName]) {
      acc[token.appName] = { count: 0, lastUsed: token.lastUsedDate };
    }
    acc[token.appName].count++;
    if (token.lastUsedDate && (!acc[token.appName].lastUsed || token.lastUsedDate > acc[token.appName].lastUsed!)) {
      acc[token.appName].lastUsed = token.lastUsedDate;
    }
    return acc;
  }, {} as Record<string, { count: number; lastUsed: string | null }>);

  const apps = Object.entries(appGroups).sort((a, b) => b[1].count - a[1].count);

  const totalPages = Math.ceil(apps.length / ITEMS_PER_PAGE);
  const paginatedApps = apps.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  return (
    <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-[hsl(var(--muted-foreground))]">// connected_apps[]</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[hsl(var(--muted-foreground))] tabular-nums">
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin inline" /> : `${apps.length} apps`}
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
        {isLoading && tokens.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--muted-foreground))]" />
          </div>
        ) : apps.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <span className="text-xs text-[hsl(var(--muted-foreground))]">no OAuth tokens found</span>
            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">(may not be queryable in this org)</span>
          </div>
        ) : (
          <div className="space-y-1">
            {paginatedApps.map(([appName, data]) => {
              return (
                <div
                  key={appName}
                  className="group flex items-center gap-3 p-2 -mx-2 rounded hover:bg-[hsl(var(--muted)/0.5)] transition-colors"
                >
                  <div className="p-1.5 rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                    <AppWindow className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-[hsl(var(--foreground))] truncate block">{appName}</span>
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                      Last used: {formatDate(data.lastUsed)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-[hsl(var(--foreground))] tabular-nums">{data.count}</span>
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))] block">users</span>
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
            {currentPage * ITEMS_PER_PAGE + 1}-{Math.min((currentPage + 1) * ITEMS_PER_PAGE, apps.length)} of {apps.length}
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
