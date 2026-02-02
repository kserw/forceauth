import { useEffect, useState } from 'react';
import { Activity, Loader2, RefreshCw, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDemoMode } from '../context/DemoModeContext';
import { fetchApiUsageData, exportToCSV, type ApiUsageData } from '../services/api';
import { mockApiUsage } from '../data/mockData';

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function getUsageColor(percent: number): string {
  if (percent >= 90) return 'text-[hsl(var(--destructive))]';
  if (percent >= 70) return 'text-[hsl(var(--warning))]';
  return 'text-[hsl(var(--success))]';
}

function getUsageBgColor(percent: number): string {
  if (percent >= 90) return 'bg-[hsl(var(--destructive))]';
  if (percent >= 70) return 'bg-[hsl(var(--warning))]';
  return 'bg-[hsl(var(--success))]';
}

export function ApiUsagePanel() {
  const { isAuthenticated, refreshKey } = useAuth();
  const { isDemoMode } = useDemoMode();
  const [data, setData] = useState<ApiUsageData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showDemoIndicator = isDemoMode && !isAuthenticated;
  const displayData = showDemoIndicator ? (mockApiUsage as ApiUsageData) : data;

  const loadData = () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    fetchApiUsageData()
      .then(result => {
        setData(result);
      })
      .catch(err => {
        console.error('Failed to fetch API usage data:', err);
        setError(err.message);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [isAuthenticated, refreshKey]);

  const handleExport = () => {
    if (!data) return;
    exportToCSV(data.byApp, 'api_usage_by_app', [
      { key: 'appName', header: 'Application' },
      { key: 'callCount', header: 'API Calls (7d)' },
      { key: 'percentOfTotal', header: '% of Total' },
      { key: 'lastUsed', header: 'Last Used' },
    ]);
  };

  if (!isAuthenticated && !isDemoMode) {
    return (
      <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">// api_usage{}</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">login to view API usage</span>
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

  const usedCalls = displayData ? displayData.totalCalls - displayData.remainingCalls : 0;

  return (
    <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-[hsl(var(--info))]" />
          {showDemoIndicator && <span className="mr-1 px-1.5 py-0.5 rounded text-[10px] bg-[hsl(var(--warning)/0.2)] text-[hsl(var(--warning))]">demo</span>}
          <span className="text-xs text-[hsl(var(--muted-foreground))]">// api_usage{}</span>
        </div>
        <div className="flex items-center gap-2">
          {displayData && (
            <span className={`text-xs tabular-nums ${getUsageColor(displayData.usedPercent)}`}>
              {displayData.usedPercent}% used
            </span>
          )}
          <button
            onClick={handleExport}
            disabled={isLoading || !displayData || displayData.byApp.length === 0}
            className="p-1 rounded hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-50"
            title="Export to CSV"
          >
            <Download className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />
          </button>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-1 rounded hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 text-[hsl(var(--muted-foreground))] ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {isLoading && !displayData ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--muted-foreground))]" />
        </div>
      ) : displayData ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Usage bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[hsl(var(--muted-foreground))]">daily API requests</span>
              <span className="text-xs text-[hsl(var(--muted-foreground))] tabular-nums">
                {formatNumber(usedCalls)} / {formatNumber(displayData.totalCalls)}
              </span>
            </div>
            <div className="h-2 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
              <div
                className={`h-full ${getUsageBgColor(displayData.usedPercent)} transition-all`}
                style={{ width: `${Math.min(displayData.usedPercent, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                {formatNumber(displayData.remainingCalls)} remaining
              </span>
              {displayData.usedPercent >= 80 && (
                <span className="text-[10px] text-[hsl(var(--warning))]">
                  approaching limit
                </span>
              )}
            </div>
          </div>

          {/* By app breakdown */}
          <div className="flex-1 overflow-auto -mx-4 px-4">
            <span className="text-[10px] text-[hsl(var(--muted-foreground))] block mb-2">usage by app (last 7 days)</span>
            {displayData.byApp.length === 0 ? (
              <div className="text-center py-4">
                <span className="text-xs text-[hsl(var(--muted-foreground))]">no API usage data available</span>
              </div>
            ) : (
              <div className="space-y-2">
                {displayData.byApp.map((app) => (
                  <div key={app.appName} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs text-[hsl(var(--foreground))] truncate">{app.appName}</span>
                        <span className="text-[10px] text-[hsl(var(--muted-foreground))] tabular-nums ml-2">
                          {formatNumber(app.callCount)}
                        </span>
                      </div>
                      <div className="h-1 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[hsl(var(--info))] transition-all"
                          style={{ width: `${app.percentOfTotal}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))] tabular-nums w-8 text-right">
                      {app.percentOfTotal}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
