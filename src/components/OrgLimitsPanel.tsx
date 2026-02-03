import { useEffect, useState, useRef } from 'react';
import { Loader2, AlertTriangle, CheckCircle, Gauge, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDemoMode } from '../context/DemoModeContext';
import { fetchOrgLimits, type OrgLimit } from '../services/api';
import { mockOrgLimits } from '../data/mockData';

const ITEMS_PER_PAGE = 10;

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
  const { isAuthenticated, refreshKey } = useAuth();
  const { isDemoMode } = useDemoMode();
  const [limits, setLimits] = useState<Record<string, OrgLimit> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const showDemoIndicator = isDemoMode && !isAuthenticated;

  const loadData = () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    fetchOrgLimits()
      .then(data => {
        setLimits(data);
        setCurrentPage(0);
      })
      .catch((err) => {
        console.error('Failed to fetch limits:', err);
        setError(err.message);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setLimits(null);
      return;
    }
    loadData();
  }, [isAuthenticated, refreshKey]);

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

  const totalPages = Math.ceil(healthyLimits.length / ITEMS_PER_PAGE);
  const paginatedHealthyLimits = healthyLimits.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

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
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-1 rounded hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 text-[hsl(var(--muted-foreground))] ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto -mx-2 space-y-1">
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
              <span className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wide">all limits ({healthyLimits.length})</span>
            </div>
            {paginatedHealthyLimits.map(([name, limit]) => (
              <LimitBar key={name} name={name} limit={limit} />
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-[hsl(var(--border))]">
          <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
            {currentPage * ITEMS_PER_PAGE + 1}-{Math.min((currentPage + 1) * ITEMS_PER_PAGE, healthyLimits.length)} of {healthyLimits.length}
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
