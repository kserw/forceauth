import { useState, useEffect } from 'react';
import { XAxis, YAxis, ResponsiveContainer, Tooltip, Area, AreaChart, Bar, BarChart } from 'recharts';
import { ExternalLink, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDemoMode } from '../context/DemoModeContext';
import { fetchUserGrowth, fetchLoginsByDay, type UserGrowthStat, type LoginDayStat } from '../services/api';
import { mockUserGrowth, mockLoginsByDay } from '../data/mockData';

type TabType = 'users' | 'logins' | 'failed';

export function UsersChart() {
  const { isAuthenticated } = useAuth();
  const { isDemoMode } = useDemoMode();
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [userGrowth, setUserGrowth] = useState<UserGrowthStat[]>([]);
  const [loginsByDay, setLoginsByDay] = useState<LoginDayStat[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setUserGrowth([]);
      setLoginsByDay([]);
      return;
    }

    setIsLoading(true);
    Promise.all([
      fetchUserGrowth(6),
      fetchLoginsByDay(14)
    ])
      .then(([growth, logins]) => {
        setUserGrowth(growth);
        setLoginsByDay(logins);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [isAuthenticated]);

  const tabs: { id: TabType; label: string }[] = [
    { id: 'users', label: 'growth' },
    { id: 'logins', label: 'logins' },
    { id: 'failed', label: 'failed' },
  ];

  // Use mock data in demo mode
  const showDemoIndicator = isDemoMode && !isAuthenticated;
  const displayUserGrowth = showDemoIndicator ? mockUserGrowth : userGrowth;
  const displayLoginsByDay = showDemoIndicator ? mockLoginsByDay : loginsByDay;

  // Calculate stats for authenticated view
  const latestGrowth = displayUserGrowth[displayUserGrowth.length - 1];
  const previousGrowth = displayUserGrowth[displayUserGrowth.length - 2];
  const growthChange = latestGrowth && previousGrowth
    ? ((latestGrowth.cumulative - previousGrowth.cumulative) / previousGrowth.cumulative * 100).toFixed(1)
    : '0';

  const totalLogins = displayLoginsByDay.reduce((sum, d) => sum + d.count, 0);
  const totalFailed = displayLoginsByDay.reduce((sum, d) => sum + d.failCount, 0);

  // Empty state for non-authenticated view (only when not in demo mode)
  if (!isAuthenticated && !isDemoMode) {
    return (
      <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[hsl(var(--muted-foreground))]">stats.</span>
            <span className="px-1.5 py-0.5 rounded bg-[hsl(var(--foreground))] text-[hsl(var(--background))]">
              users
            </span>
            <span className="text-[hsl(var(--muted-foreground))]">()</span>
          </div>
        </div>

        <div className="flex items-baseline gap-3 mb-1">
          <span className="text-3xl font-semibold text-[hsl(var(--foreground))] tabular-nums">-</span>
        </div>

        <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">// total users</p>

        <div className="flex-1 min-h-0 flex items-center justify-center">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">-</span>
        </div>
      </div>
    );
  }

  if (isLoading && !showDemoIndicator) {
    return (
      <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--muted-foreground))]" />
      </div>
    );
  }

  return (
    <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1 text-xs">
          {showDemoIndicator && (
            <span className="mr-1 px-1.5 py-0.5 rounded text-[10px] bg-[hsl(var(--warning)/0.2)] text-[hsl(var(--warning))]">demo</span>
          )}
          <span className="text-[hsl(var(--muted-foreground))]">stats.</span>
          {tabs.map((tab, i) => (
            <span key={tab.id} className="flex items-center">
              <button
                onClick={() => setActiveTab(tab.id)}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[hsl(var(--foreground))] text-[hsl(var(--background))]'
                    : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                }`}
              >
                {tab.label}
              </button>
              {i < tabs.length - 1 && <span className="text-[hsl(var(--muted-foreground))] mx-0.5">|</span>}
            </span>
          ))}
          <span className="text-[hsl(var(--muted-foreground))]">()</span>
        </div>

        <button className="p-1.5 rounded hover:bg-[hsl(var(--muted))] transition-colors">
          <ExternalLink className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
        </button>
      </div>

      {activeTab === 'users' && (
        <>
          <div className="flex items-baseline gap-3 mb-1">
            <span className="text-3xl font-semibold text-[hsl(var(--foreground))] tabular-nums">
              {latestGrowth?.cumulative.toLocaleString() || '-'}
            </span>
            {Number(growthChange) !== 0 && (
              <div className={`flex items-center gap-1 text-xs ${Number(growthChange) > 0 ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--destructive))]'}`}>
                {Number(growthChange) > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span className="tabular-nums">{Number(growthChange) > 0 ? '+' : ''}{growthChange}%</span>
              </div>
            )}
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">// total users</p>

          <div className="flex-1 min-h-0 relative">
            <div className="absolute inset-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={displayUserGrowth} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity={0.1} />
                      <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} dy={8} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '4px', padding: '6px 10px', fontSize: '12px' }}
                    labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: 2 }}
                    formatter={(value, name) => [Number(value).toLocaleString(), name === 'cumulative' ? 'total' : 'new']}
                  />
                  <Area type="monotone" dataKey="cumulative" stroke="hsl(var(--foreground))" strokeWidth={1.5} fill="url(#colorGrowth)" dot={false} activeDot={{ r: 3, fill: 'hsl(var(--foreground))', strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {activeTab === 'logins' && (
        <>
          <div className="flex items-baseline gap-3 mb-1">
            <span className="text-3xl font-semibold text-[hsl(var(--foreground))] tabular-nums">
              {totalLogins.toLocaleString()}
            </span>
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">// logins last 14 days</p>

          <div className="flex-1 min-h-0 relative">
            <div className="absolute inset-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={displayLoginsByDay} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} dy={8} tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '4px', padding: '6px 10px', fontSize: '12px' }}
                    labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: 2 }}
                    labelFormatter={(v) => new Date(v).toLocaleDateString()}
                    formatter={(value) => [Number(value).toLocaleString(), 'logins']}
                  />
                  <Bar dataKey="successCount" fill="hsl(var(--success))" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {activeTab === 'failed' && (
        <>
          <div className="flex items-baseline gap-3 mb-1">
            <span className="text-3xl font-semibold text-[hsl(var(--destructive))] tabular-nums">
              {totalFailed.toLocaleString()}
            </span>
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">// failed logins last 14 days</p>

          <div className="flex-1 min-h-0 relative">
            <div className="absolute inset-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={displayLoginsByDay} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} dy={8} tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '4px', padding: '6px 10px', fontSize: '12px' }}
                    labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: 2 }}
                    labelFormatter={(v) => new Date(v).toLocaleDateString()}
                    formatter={(value) => [Number(value).toLocaleString(), 'failed']}
                  />
                  <Bar dataKey="failCount" fill="hsl(var(--destructive))" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
