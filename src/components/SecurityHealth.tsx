import { useEffect, useState } from 'react';
import { Shield, AlertTriangle, UserX, Globe, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchSecurityInsights, type SecurityInsights } from '../services/api';

interface SecurityMetricProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

function SecurityMetric({ label, value, icon, severity, description }: SecurityMetricProps) {
  const colors = {
    low: 'text-[hsl(var(--success))] bg-[hsl(var(--success-muted))]',
    medium: 'text-[hsl(var(--warning))] bg-[hsl(var(--warning-muted))]',
    high: 'text-[hsl(var(--destructive))] bg-[hsl(var(--destructive)/0.1)]',
  };

  const borderColors = {
    low: 'border-[hsl(var(--success)/0.3)]',
    medium: 'border-[hsl(var(--warning)/0.3)]',
    high: 'border-[hsl(var(--destructive)/0.3)]',
  };

  return (
    <div className={`p-3 rounded border ${borderColors[severity]} bg-[hsl(var(--card))]`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded ${colors[severity]}`}>
          {icon}
        </div>
        <span className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wide">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-[hsl(var(--foreground))] tabular-nums">{value}</span>
      </div>
      <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">{description}</p>
    </div>
  );
}

export function SecurityHealth() {
  const { isAuthenticated } = useAuth();
  const [insights, setInsights] = useState<SecurityInsights | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setInsights(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    fetchSecurityInsights()
      .then(setInsights)
      .catch((err) => {
        console.error('Failed to fetch security insights:', err);
        setError(err.message);
      })
      .finally(() => setIsLoading(false));
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">// security.health()</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">login to view security insights</span>
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

  if (isLoading || !insights) {
    return (
      <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">// security.health()</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--muted-foreground))]" />
        </div>
      </div>
    );
  }

  const failedLoginsSeverity = insights.failedLoginsLast24h > 50 ? 'high' : insights.failedLoginsLast24h > 10 ? 'medium' : 'low';
  const neverLoggedInSeverity = insights.usersNeverLoggedIn > 20 ? 'high' : insights.usersNeverLoggedIn > 5 ? 'medium' : 'low';
  const inactiveUsersSeverity = insights.usersWithoutRecentLogin > 50 ? 'high' : insights.usersWithoutRecentLogin > 20 ? 'medium' : 'low';

  return (
    <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-[hsl(var(--muted-foreground))]">// security.health()</span>
        <div className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
          <span className="text-xs text-[hsl(var(--muted-foreground))]">last 24h</span>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto">
        <SecurityMetric
          label="failed_logins"
          value={insights.failedLoginsLast24h}
          icon={<AlertTriangle className="w-3.5 h-3.5" />}
          severity={failedLoginsSeverity}
          description="Failed login attempts in last 24 hours"
        />

        <SecurityMetric
          label="never_logged_in"
          value={insights.usersNeverLoggedIn}
          icon={<UserX className="w-3.5 h-3.5" />}
          severity={neverLoggedInSeverity}
          description="Active users who have never logged in"
        />

        <SecurityMetric
          label="inactive_30d"
          value={insights.usersWithoutRecentLogin}
          icon={<UserX className="w-3.5 h-3.5" />}
          severity={inactiveUsersSeverity}
          description="Users without login in 30 days"
        />

        <SecurityMetric
          label="unique_ips"
          value={insights.uniqueIpsLast24h}
          icon={<Globe className="w-3.5 h-3.5" />}
          severity="low"
          description="Unique IP addresses in last 24 hours"
        />

        {insights.suspiciousIps.length > 0 && (
          <div className="p-3 rounded border border-[hsl(var(--destructive)/0.3)] bg-[hsl(var(--destructive)/0.05)]">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-[hsl(var(--destructive))]" />
              <span className="text-xs text-[hsl(var(--destructive))] uppercase tracking-wide">suspicious_ips</span>
            </div>
            <div className="space-y-1">
              {insights.suspiciousIps.slice(0, 3).map((ip) => (
                <div key={ip.ip} className="flex items-center justify-between text-[10px]">
                  <span className="text-[hsl(var(--foreground))] font-mono">{ip.ip}</span>
                  <span className="text-[hsl(var(--destructive))]">{ip.failCount} failed</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
