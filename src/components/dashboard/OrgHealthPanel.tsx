import { useEffect, useState } from 'react';
import { Loader2, Zap, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDemoMode } from '../../context/DemoModeContext';
import { fetchOrgLimits, fetchLicenses, type OrgLimit, type UserLicense } from '../../services/api';
import { mockOrgLimits, mockLicenses } from '../../data/mockData';

interface ProgressBarProps {
  used: number;
  total: number;
  showLabel?: boolean;
}

function getUsageColor(percentage: number) {
  if (percentage >= 90) return { bar: 'bg-[hsl(var(--destructive))]', text: 'text-[hsl(var(--destructive))]' };
  if (percentage >= 70) return { bar: 'bg-[hsl(var(--warning))]', text: 'text-[hsl(var(--warning))]' };
  return { bar: 'bg-[hsl(var(--success))]', text: 'text-[hsl(var(--success))]' };
}

function ProgressBar({ used, total, showLabel = true }: ProgressBarProps) {
  const percentage = total > 0 ? (used / total) * 100 : 0;
  const colors = getUsageColor(percentage);

  return (
    <div>
      <div className="h-1.5 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
        <div
          className={`h-full ${colors.bar} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-end mt-0.5">
          <span className={`text-[10px] tabular-nums ${colors.text}`}>
            {percentage.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toLocaleString();
}

export function OrgHealthPanel() {
  const { isAuthenticated, refreshKey } = useAuth();
  const { isDemoMode } = useDemoMode();
  const [limits, setLimits] = useState<Record<string, OrgLimit> | null>(null);
  const [licenses, setLicenses] = useState<UserLicense[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showDemoIndicator = isDemoMode && !isAuthenticated;

  const loadData = async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    try {
      const [limitsData, licensesData] = await Promise.all([
        fetchOrgLimits(),
        fetchLicenses(),
      ]);
      setLimits(limitsData);
      setLicenses(licensesData);
    } catch (err) {
      console.error('Failed to fetch org health data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setLimits(null);
      setLicenses(null);
      return;
    }
    loadData();
  }, [isAuthenticated, refreshKey]);

  const displayLimits = showDemoIndicator ? mockOrgLimits : limits;
  const displayLicenses = showDemoIndicator ? mockLicenses : licenses;

  // Get API usage from limits
  const apiLimit = displayLimits?.DailyApiRequests;
  const apiUsed = apiLimit ? apiLimit.Max - apiLimit.Remaining : 0;
  const apiMax = apiLimit?.Max ?? 0;

  // Filter licenses with usage and sort by usage percentage
  const sortedLicenses = displayLicenses
    ?.filter(l => l.TotalLicenses > 0)
    .sort((a, b) => (b.UsedLicenses / b.TotalLicenses) - (a.UsedLicenses / a.TotalLicenses))
    .slice(0, 5) ?? [];

  if (!isAuthenticated && !isDemoMode) {
    return (
      <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">// org.health()</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">login to view org health</span>
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

  if ((isLoading || !displayLimits) && !showDemoIndicator) {
    return (
      <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">// org.health()</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--muted-foreground))]" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-[hsl(var(--muted-foreground))]">
          {showDemoIndicator && (
            <span className="mr-1 px-1.5 py-0.5 rounded text-[10px] bg-[hsl(var(--warning)/0.2)] text-[hsl(var(--warning))]">
              demo
            </span>
          )}
          // org.health()
        </span>
        <button
          onClick={loadData}
          disabled={isLoading}
          className="p-1 rounded hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 text-[hsl(var(--muted-foreground))] ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        {/* API Usage Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-[hsl(var(--primary))]" />
            <span className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
              API Calls Today
            </span>
          </div>
          <div className="p-2 rounded bg-[hsl(var(--muted)/0.3)]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                {formatNumber(apiUsed)} / {formatNumber(apiMax)}
              </span>
              <span className={`text-xs tabular-nums ${getUsageColor((apiUsed / apiMax) * 100).text}`}>
                {apiMax > 0 ? ((apiUsed / apiMax) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <ProgressBar used={apiUsed} total={apiMax} showLabel={false} />
          </div>
        </div>

        {/* License Usage Section */}
        {sortedLicenses.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
                License Usage
              </span>
            </div>
            <div className="space-y-2">
              {sortedLicenses.map((license) => {
                const percentage = (license.UsedLicenses / license.TotalLicenses) * 100;
                const colors = getUsageColor(percentage);
                return (
                  <div key={license.Id} className="p-2 rounded hover:bg-[hsl(var(--muted)/0.3)] transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[hsl(var(--foreground))] truncate pr-2">
                        {license.Name}
                      </span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] text-[hsl(var(--muted-foreground))] tabular-nums">
                          {license.UsedLicenses}/{license.TotalLicenses}
                        </span>
                        <span className={`text-[10px] tabular-nums ${colors.text}`}>
                          {percentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors.bar} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
