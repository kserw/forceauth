import { useEffect, useState, useRef } from 'react';
import { ShieldAlert, Loader2, RefreshCw, Globe, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchAnomaliesData, type FailedLoginPatternInfo } from '../services/api';

const ITEMS_PER_PAGE = 5;

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString();
}

export function FailedLoginPatternsPanel() {
  const { isAuthenticated, refreshKey } = useAuth();
  const [patterns, setPatterns] = useState<FailedLoginPatternInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadData = () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    fetchAnomaliesData()
      .then(data => {
        setPatterns(data.failedLoginPatterns);
        setCurrentPage(0);
      })
      .catch(err => {
        console.error('Failed to fetch failed patterns:', err);
        setError(err.message);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [isAuthenticated, refreshKey]);

  const totalPages = Math.ceil(patterns.length / ITEMS_PER_PAGE);
  const paginatedPatterns = patterns.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  if (!isAuthenticated) {
    return (
      <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">// failed_login_patterns[]</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">login to view patterns</span>
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

  const getSeverityColor = (failCount: number) => {
    if (failCount >= 10) return 'border-[hsl(var(--destructive))] bg-[hsl(var(--destructive)/0.05)]';
    if (failCount >= 5) return 'border-[hsl(var(--warning))] bg-[hsl(var(--warning)/0.05)]';
    return 'border-[hsl(var(--border))]';
  };

  return (
    <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-[hsl(var(--destructive))]" />
          <span className="text-xs text-[hsl(var(--muted-foreground))]">// failed_login_patterns[]</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[hsl(var(--muted-foreground))] tabular-nums">
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin inline" /> : `${patterns.length} IPs`}
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
        {isLoading && patterns.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--muted-foreground))]" />
          </div>
        ) : patterns.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-xs text-[hsl(var(--success))]">no suspicious IP patterns detected</span>
          </div>
        ) : (
          <div className="space-y-2">
            {paginatedPatterns.map((pattern) => (
              <div
                key={pattern.sourceIp}
                className={`p-3 rounded border ${getSeverityColor(pattern.failCount)}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                    <span className="text-sm text-[hsl(var(--foreground))] font-mono">{pattern.sourceIp}</span>
                    {pattern.country && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                        {pattern.country}
                      </span>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    pattern.failCount >= 10
                      ? 'bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))]'
                      : 'bg-[hsl(var(--warning-muted))] text-[hsl(var(--warning))]'
                  }`}>
                    {pattern.failCount} failed
                  </span>
                </div>
                <div className="text-[10px] text-[hsl(var(--muted-foreground))]">
                  <span>Last attempt: {formatTime(pattern.lastAttempt)}</span>
                  <span className="mx-2">•</span>
                  <span>Targeted {pattern.targetUsers.length} user(s)</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-[hsl(var(--border))]">
          <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
            {currentPage * ITEMS_PER_PAGE + 1}-{Math.min((currentPage + 1) * ITEMS_PER_PAGE, patterns.length)} of {patterns.length}
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
