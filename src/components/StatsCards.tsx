import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Users, UserPlus, Activity, Globe, Loader2, BarChart3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDemoMode } from '../context/DemoModeContext';
import { fetchDashboardStats, type DashboardStats } from '../services/api';
import { mockDashboardStats } from '../data/mockData';

type GrowthPeriod = '7d' | '30d' | '90d';

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  isLoading?: boolean;
}

function StatCard({ label, value, change, icon, isLoading }: StatCardProps) {
  const isPositive = change !== undefined && change > 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div className="group p-3 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--border-hover))] transition-all">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wide">{label}</span>
        <div className="p-1 rounded bg-[hsl(var(--muted))]">
          {icon}
        </div>
      </div>

      <div className="flex items-end justify-between">
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--muted-foreground))]" />
        ) : (
          <span className="text-xl font-semibold text-[hsl(var(--foreground))] tabular-nums">
            {value}
          </span>
        )}
        {change !== undefined && !isLoading && (
          <div className={`flex items-center gap-1 text-xs ${
            isPositive ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--destructive))]'
          }`}>
            <TrendIcon className="w-3 h-3" />
            <span className="tabular-nums">{isPositive ? '+' : ''}{change}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function StatsCards() {
  const { isAuthenticated } = useAuth();
  const { isDemoMode } = useDemoMode();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [growthPeriod, setGrowthPeriod] = useState<GrowthPeriod>('7d');

  useEffect(() => {
    if (!isAuthenticated) {
      setStats(null);
      setError(null);
      return;
    }

    let mounted = true;
    setIsLoading(true);
    setError(null);

    fetchDashboardStats()
      .then((data) => {
        if (mounted) {
          setStats(data);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch stats:', err);
        if (mounted) {
          setError(err.message || 'Failed to fetch stats');
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [isAuthenticated]);

  // Use mock data in demo mode
  const displayStats = isDemoMode && !isAuthenticated ? mockDashboardStats : stats;
  const showDemoIndicator = isDemoMode && !isAuthenticated;

  // Show empty state when not authenticated and not in demo mode
  if (!isAuthenticated && !isDemoMode) {
    return (
      <div className="h-full flex flex-col gap-2">
        <div className="flex items-center gap-2 px-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--muted-foreground))]" />
          <span className="text-xs text-[hsl(var(--muted-foreground))]">// metrics</span>
        </div>

        <StatCard
          label="active_users"
          value="-"
          icon={<Users className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />}
        />

        <StatCard
          label="total_users"
          value="-"
          icon={<UserPlus className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />}
        />

        <StatCard
          label="logins_today"
          value="-"
          icon={<Activity className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />}
        />

        <StatCard
          label="unique_ips"
          value="-"
          icon={<Globe className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col gap-2">
        <div className="flex items-center gap-2 px-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--destructive))]" />
          <span className="text-xs text-[hsl(var(--muted-foreground))]">// error</span>
        </div>
        <div className="flex-1 p-4 rounded-md border border-[hsl(var(--destructive)/0.5)] bg-[hsl(var(--destructive)/0.1)] flex items-center justify-center">
          <span className="text-xs text-[hsl(var(--destructive))]">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-2">
      <div className="flex items-center gap-2 px-1">
        <div className={`w-1.5 h-1.5 rounded-full ${showDemoIndicator ? 'bg-[hsl(var(--warning))]' : 'bg-[hsl(var(--success))] animate-pulse-subtle'}`} />
        <span className="text-xs text-[hsl(var(--muted-foreground))]">
          {showDemoIndicator ? '// demo metrics' : '// live metrics'}
        </span>
      </div>

      <StatCard
        label="active_users"
        value={displayStats?.activeUsers ?? '-'}
        icon={<Users className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />}
        isLoading={isLoading && !showDemoIndicator}
      />

      <StatCard
        label="total_users"
        value={displayStats?.totalUsers ?? '-'}
        icon={<UserPlus className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />}
        isLoading={isLoading && !showDemoIndicator}
      />

      <StatCard
        label="logins_today"
        value={displayStats?.loginsToday ?? '-'}
        icon={<Activity className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />}
        isLoading={isLoading && !showDemoIndicator}
      />

      <StatCard
        label="unique_ips"
        value={displayStats?.uniqueIpsToday ?? '-'}
        icon={<Globe className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />}
        isLoading={isLoading && !showDemoIndicator}
      />

      {/* Growth stat with period selector */}
      <div className="group p-3 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--border-hover))] transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wide">login_growth</span>
          <div className="p-1 rounded bg-[hsl(var(--muted))]">
            <BarChart3 className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
          </div>
        </div>

        <div className="flex items-end justify-between">
          {isLoading && !showDemoIndicator ? (
            <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--muted-foreground))]" />
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xl font-semibold text-[hsl(var(--foreground))] tabular-nums">
                  {displayStats?.growth?.[growthPeriod]?.current ?? '-'}
                </span>
                {displayStats?.growth?.[growthPeriod] && (
                  <div className={`flex items-center gap-0.5 text-xs ${
                    displayStats.growth[growthPeriod].growth >= 0 ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--destructive))]'
                  }`}>
                    {displayStats.growth[growthPeriod].growth >= 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    <span className="tabular-nums">
                      {displayStats.growth[growthPeriod].growth >= 0 ? '+' : ''}{displayStats.growth[growthPeriod].growth}%
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex gap-1 mt-2">
          {(['7d', '30d', '90d'] as GrowthPeriod[]).map((period) => (
            <button
              key={period}
              onClick={() => setGrowthPeriod(period)}
              className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                growthPeriod === period
                  ? 'bg-[hsl(var(--foreground))] text-[hsl(var(--background))]'
                  : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      <button className="mt-auto pt-2 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors text-left">
        add more +
      </button>
    </div>
  );
}
