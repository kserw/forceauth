import { useEffect, useState, useRef } from 'react';
import { AlertTriangle, Loader2, RefreshCw, Clock, MapPin, Globe, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchAnomaliesData, type LoginAnomalyInfo } from '../services/api';
import { getSalesforceUserUrl } from '../utils/salesforceLinks';

const ITEMS_PER_PAGE = 10;

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString();
}

function getAnomalyIcon(type: string) {
  switch (type) {
    case 'unusual_hour':
      return <Clock className="w-3.5 h-3.5" />;
    case 'rapid_location_change':
      return <MapPin className="w-3.5 h-3.5" />;
    case 'new_ip':
      return <Globe className="w-3.5 h-3.5" />;
    default:
      return <AlertTriangle className="w-3.5 h-3.5" />;
  }
}

function getAnomalyColor(type: string) {
  switch (type) {
    case 'unusual_hour':
      return 'bg-[hsl(var(--warning-muted))] text-[hsl(var(--warning))]';
    case 'rapid_location_change':
      return 'bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))]';
    default:
      return 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]';
  }
}

export function LoginAnomaliesPanel() {
  const { isAuthenticated, instanceUrl, refreshKey } = useAuth();
  const [anomalies, setAnomalies] = useState<LoginAnomalyInfo[]>([]);
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
        setAnomalies(data.loginAnomalies);
        setCurrentPage(0);
      })
      .catch(err => {
        console.error('Failed to fetch anomalies:', err);
        setError(err.message);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [isAuthenticated, refreshKey]);

  const totalPages = Math.ceil(anomalies.length / ITEMS_PER_PAGE);
  const paginatedAnomalies = anomalies.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  if (!isAuthenticated) {
    return (
      <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">// login_anomalies[]</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">login to view anomalies</span>
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
          <AlertTriangle className="w-3.5 h-3.5 text-[hsl(var(--warning))]" />
          <span className="text-xs text-[hsl(var(--muted-foreground))]">// login_anomalies[]</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[hsl(var(--muted-foreground))] tabular-nums">
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin inline" /> : `${anomalies.length} detected`}
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
        {isLoading && anomalies.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--muted-foreground))]" />
          </div>
        ) : anomalies.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-xs text-[hsl(var(--success))]">no login anomalies detected</span>
          </div>
        ) : (
          <div className="space-y-1">
            {paginatedAnomalies.map((anomaly, index) => {
              const userUrl = getSalesforceUserUrl(instanceUrl, anomaly.userId);
              return (
                <div
                  key={`${anomaly.userId}-${anomaly.loginTime}-${index}`}
                  onClick={() => userUrl && window.open(userUrl, '_blank')}
                  className="group flex items-center gap-3 p-2 -mx-2 rounded hover:bg-[hsl(var(--muted)/0.5)] transition-colors cursor-pointer"
                >
                  <div className={`p-1.5 rounded ${getAnomalyColor(anomaly.anomalyType)}`}>
                    {getAnomalyIcon(anomaly.anomalyType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[hsl(var(--foreground))] truncate">{anomaly.userName}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                        {anomaly.anomalyType.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))] truncate block">
                      {anomaly.description}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))] font-mono block">
                      {anomaly.sourceIp}
                    </span>
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                      {formatTime(anomaly.loginTime)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-[hsl(var(--border))]">
          <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
            {currentPage * ITEMS_PER_PAGE + 1}-{Math.min((currentPage + 1) * ITEMS_PER_PAGE, anomalies.length)} of {anomalies.length}
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
