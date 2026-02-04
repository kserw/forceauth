import { useEffect, useState } from 'react';
import { ArrowUpRight, Loader2, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTab } from '../context/TabContext';
import { useDemoMode } from '../context/DemoModeContext';
import { fetchLoginsBySource, type SourceStat } from '../services/api';
import { mockSourceStats } from '../data/mockData';

export function TopCities() {
  const { isAuthenticated } = useAuth();
  const { setActiveTab } = useTab();
  const { isDemoMode } = useDemoMode();
  const [sources, setSources] = useState<SourceStat[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use mock data in demo mode
  const showDemoIndicator = isDemoMode && !isAuthenticated;

  useEffect(() => {
    if (!isAuthenticated) {
      setSources([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    fetchLoginsBySource(30)
      .then(setSources)
      .catch((err) => {
        console.error('Failed to fetch login stats by source:', err);
        setError(err.message);
      })
      .finally(() => setIsLoading(false));
  }, [isAuthenticated]);

  // Use mock data in demo mode
  const displaySources = showDemoIndicator ? mockSourceStats : sources;

  // Show empty state when not authenticated and not in demo mode
  if (!isAuthenticated && !isDemoMode) {
    return (
      <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">// login_sources.sort()</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">-</span>
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

  const maxCount = displaySources.length > 0 ? Math.max(...displaySources.map(s => s.count)) : 1;

  return (
    <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-[hsl(var(--muted-foreground))]">
          {showDemoIndicator && (
            <span className="mr-1 px-1.5 py-0.5 rounded text-[10px] bg-[hsl(var(--warning)/0.2)] text-[hsl(var(--warning))]">demo</span>
          )}
          // login_sources.sort()
        </span>
        <span className="text-xs text-[hsl(var(--muted-foreground))]">last 30 days</span>
      </div>

      <div className="flex-1 space-y-2">
        {isLoading && !showDemoIndicator ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--muted-foreground))]" />
          </div>
        ) : displaySources.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-xs text-[hsl(var(--muted-foreground))]">no login data available</span>
          </div>
        ) : (
          displaySources.slice(0, 5).map((source) => (
            <div
              key={source.source}
              className="group flex items-center gap-3 p-2 -mx-2 rounded hover:bg-[hsl(var(--muted)/0.5)] transition-colors cursor-pointer"
            >
              <Globe className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-[hsl(var(--foreground))] truncate">
                    {source.source}
                  </span>
                  <span className="text-xs text-[hsl(var(--foreground))] tabular-nums ml-2">
                    {source.count}
                  </span>
                </div>
                <div className="h-1 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[hsl(var(--foreground)/0.4)] rounded-full transition-all"
                    style={{ width: `${(source.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="pt-3 border-t border-[hsl(var(--border))] mt-auto">
        <button
          onClick={() => setActiveTab('users')}
          className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
        >
          view_all()
          <ArrowUpRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
