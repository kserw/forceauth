import { useEffect, useState } from 'react';
import { Share2, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchDataAccessData, type SharingRuleInfo, type DataAccessSummary } from '../services/api';

export function SharingRulesPanel() {
  const { isAuthenticated } = useAuth();
  const [rules, setRules] = useState<SharingRuleInfo[]>([]);
  const [summary, setSummary] = useState<DataAccessSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    fetchDataAccessData()
      .then(data => {
        setRules(data.sharingRules);
        setSummary(data.summary);
      })
      .catch(err => {
        console.error('Failed to fetch sharing rules:', err);
        setError(err.message);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">// data_access_summary</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">login to view data access</span>
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

  return (
    <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Share2 className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
          <span className="text-xs text-[hsl(var(--muted-foreground))]">// data_access_summary</span>
        </div>
        <button
          onClick={loadData}
          disabled={isLoading}
          className="p-1 rounded hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 text-[hsl(var(--muted-foreground))] ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        {isLoading && !summary ? (
          <div className="flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--muted-foreground))]" />
          </div>
        ) : summary ? (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 rounded border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                <span className="text-2xl font-semibold text-[hsl(var(--foreground))] tabular-nums block">
                  {summary.totalGuestUsers}
                </span>
                <span className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
                  Guest Users
                </span>
              </div>
              <div className="p-3 rounded border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                <span className={`text-2xl font-semibold tabular-nums block ${
                  summary.activeGuestUsers > 0 ? 'text-[hsl(var(--warning))]' : 'text-[hsl(var(--foreground))]'
                }`}>
                  {summary.activeGuestUsers}
                </span>
                <span className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
                  Active
                </span>
              </div>
              <div className="p-3 rounded border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                <span className="text-2xl font-semibold text-[hsl(var(--foreground))] tabular-nums block">
                  {summary.recentDataChanges}
                </span>
                <span className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
                  Data Changes
                </span>
              </div>
            </div>

            {rules.length > 0 ? (
              <div className="space-y-2">
                <span className="text-xs text-[hsl(var(--muted-foreground))]">Sharing Rules by Object</span>
                {rules.map(rule => (
                  <div key={rule.objectName} className="flex items-center justify-between p-2 rounded bg-[hsl(var(--muted)/0.3)]">
                    <span className="text-sm text-[hsl(var(--foreground))]">{rule.objectName}</span>
                    <span className="text-xs text-[hsl(var(--muted-foreground))] tabular-nums">{rule.ruleCount} rules</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center">
                <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                  Sharing rules require Metadata API access
                </span>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
