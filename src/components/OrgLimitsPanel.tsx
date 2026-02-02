import { useEffect, useState } from 'react';
import { Loader2, AlertTriangle, CheckCircle, Gauge } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDemoMode } from '../context/DemoModeContext';
import { fetchOrgLimits, type OrgLimit } from '../services/api';
import { mockOrgLimits } from '../data/mockData';

interface LimitBarProps {
  name: string;
  limit: OrgLimit;
}

function formatLimitName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function LimitBar({ name, limit }: LimitBarProps) {
  const used = limit.Max - limit.Remaining;
  const percentage = limit.Max > 0 ? (used / limit.Max) * 100 : 0;

  const getColor = () => {
    if (percentage >= 90) return { bar: 'bg-[hsl(var(--destructive))]', text: 'text-[hsl(var(--destructive))]' };
    if (percentage >= 70) return { bar: 'bg-[hsl(var(--warning))]', text: 'text-[hsl(var(--warning))]' };
    return { bar: 'bg-[hsl(var(--success))]', text: 'text-[hsl(var(--success))]' };
  };

  const colors = getColor();

  return (
    <div className="p-2 rounded hover:bg-[hsl(var(--muted)/0.3)] transition-colors">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-[hsl(var(--foreground))]">{formatLimitName(name)}</span>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] tabular-nums ${colors.text}`}>
            {percentage.toFixed(0)}%
          </span>
          <span className="text-[10px] text-[hsl(var(--muted-foreground))] tabular-nums">
            {used.toLocaleString()} / {limit.Max.toLocaleString()}
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
}

export function OrgLimitsPanel() {
  const { isAuthenticated } = useAuth();
  const { isDemoMode } = useDemoMode();
  const [limits, setLimits] = useState<Record<string, OrgLimit> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showDemoIndicator = isDemoMode && !isAuthenticated;

  useEffect(() => {
    if (!isAuthenticated) {
      setLimits(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    fetchOrgLimits()
      .then(setLimits)
      .catch((err) => {
        console.error('Failed to fetch limits:', err);
        setError(err.message);
      })
      .finally(() => setIsLoading(false));
  }, [isAuthenticated]);

  const displayLimits = showDemoIndicator ? mockOrgLimits : limits;

  if (!isAuthenticated && !isDemoMode) {
    return (
      <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">// org.limits()</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">login to view org limits</span>
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

  if ((isLoading || !limits) && !showDemoIndicator) {
    return (
      <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">// org.limits()</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--muted-foreground))]" />
        </div>
      </div>
    );
  }

  const limitEntries = Object.entries(displayLimits!);
  const criticalLimits = limitEntries.filter(([, l]) => {
    const pct = ((l.Max - l.Remaining) / l.Max) * 100;
    return pct >= 70;
  });
  const healthyLimits = limitEntries.filter(([, l]) => {
    const pct = ((l.Max - l.Remaining) / l.Max) * 100;
    return pct < 70;
  });

  return (
    <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-[hsl(var(--muted-foreground))]">
          {showDemoIndicator && <span className="mr-1 px-1.5 py-0.5 rounded text-[10px] bg-[hsl(var(--warning)/0.2)] text-[hsl(var(--warning))]">demo</span>}
          // org.limits()
        </span>
        <div className="flex items-center gap-2">
          {criticalLimits.length > 0 ? (
            <div className="flex items-center gap-1 text-[hsl(var(--warning))]">
              <AlertTriangle className="w-3 h-3" />
              <span className="text-[10px]">{criticalLimits.length} warning</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[hsl(var(--success))]">
              <CheckCircle className="w-3 h-3" />
              <span className="text-[10px]">healthy</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto -mx-2 space-y-1">
        {criticalLimits.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-1.5 px-2 mb-2">
              <AlertTriangle className="w-3 h-3 text-[hsl(var(--warning))]" />
              <span className="text-[10px] text-[hsl(var(--warning))] uppercase tracking-wide">attention needed</span>
            </div>
            {criticalLimits.map(([name, limit]) => (
              <LimitBar key={name} name={name} limit={limit} />
            ))}
          </div>
        )}

        {healthyLimits.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 px-2 mb-2">
              <Gauge className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />
              <span className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wide">all limits</span>
            </div>
            {healthyLimits.map(([name, limit]) => (
              <LimitBar key={name} name={name} limit={limit} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
