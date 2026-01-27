import { useEffect, useState, useRef } from 'react';
import { Monitor, Smartphone, Globe, Loader2, RefreshCw, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchActiveSessions, exportToCSV, type ActiveSession } from '../services/api';
import { getSalesforceUserUrl } from '../utils/salesforceLinks';

const ITEMS_PER_PAGE = 10;

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

function getSessionIcon(sessionType: string) {
  if (sessionType.includes('UI') || sessionType.includes('Content')) {
    return <Monitor className="w-3.5 h-3.5" />;
  }
  if (sessionType.includes('API') || sessionType.includes('OAuth')) {
    return <Globe className="w-3.5 h-3.5" />;
  }
  return <Smartphone className="w-3.5 h-3.5" />;
}

function getSessionTypeLabel(sessionType: string): string {
  const types: Record<string, string> = {
    'UI': 'Browser',
    'API': 'API',
    'Visualforce': 'Visualforce',
    'Content': 'Content',
    'OAuth': 'OAuth',
    'SubstituteUser': 'Login As',
  };
  for (const [key, label] of Object.entries(types)) {
    if (sessionType.includes(key)) return label;
  }
  return sessionType;
}

export function ActiveSessions() {
  const { isAuthenticated, instanceUrl, refreshKey } = useAuth();
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadSessions = () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    fetchActiveSessions(50)
      .then(data => {
        setSessions(data);
        setCurrentPage(0);
      })
      .catch((err) => {
        console.error('Failed to fetch sessions:', err);
        setError(err.message);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadSessions();
  }, [isAuthenticated, refreshKey]);

  if (!isAuthenticated) {
    return (
      <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">// active_sessions[]</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">login to view sessions</span>
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

  const totalPages = Math.ceil(sessions.length / ITEMS_PER_PAGE);
  const paginatedSessions = sessions.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  const handleExport = () => {
    exportToCSV(sessions, 'active_sessions', [
      { key: 'userName', header: 'User' },
      { key: 'userUsername', header: 'Username' },
      { key: 'sessionType', header: 'Session Type' },
      { key: 'sourceIp', header: 'IP Address' },
      { key: 'loginType', header: 'Login Type' },
      { key: 'securityLevel', header: 'Security Level' },
      { key: 'createdDate', header: 'Created' },
      { key: 'lastModifiedDate', header: 'Last Activity' },
    ]);
  };

  return (
    <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-[hsl(var(--muted-foreground))]">// active_sessions[]</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[hsl(var(--muted-foreground))] tabular-nums">
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin inline" /> : `${sessions.length} active`}
          </span>
          <button
            onClick={handleExport}
            disabled={isLoading || sessions.length === 0}
            className="p-1 rounded hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-50"
            title="Export to CSV"
          >
            <Download className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />
          </button>
          <button
            onClick={loadSessions}
            disabled={isLoading}
            className="p-1 rounded hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 text-[hsl(var(--muted-foreground))] ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-auto -mx-4 px-4">
        {isLoading && sessions.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--muted-foreground))]" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-xs text-[hsl(var(--muted-foreground))]">no active sessions</span>
          </div>
        ) : (
          <div className="space-y-1">
            {paginatedSessions.map((session) => {
              const userUrl = getSalesforceUserUrl(instanceUrl, session.userId);
              return (
                <div
                  key={session.id}
                  onClick={() => userUrl && window.open(userUrl, '_blank')}
                  className="group flex items-center gap-3 p-2 -mx-2 rounded hover:bg-[hsl(var(--muted)/0.5)] transition-colors cursor-pointer"
                >
                  <div className="p-1.5 rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                    {getSessionIcon(session.sessionType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[hsl(var(--foreground))] truncate">
                        {session.userName || 'Unknown User'}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                        {getSessionTypeLabel(session.sessionType)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-[hsl(var(--muted-foreground))]">
                      <span className="tabular-nums">{session.sourceIp}</span>
                      <span>•</span>
                      <span>{session.loginType}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))] tabular-nums block">
                      {formatTimeAgo(session.lastModifiedDate)}
                    </span>
                    <span className="text-[10px] text-[hsl(var(--success))]">
                      {session.securityLevel}
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
            {currentPage * ITEMS_PER_PAGE + 1}-{Math.min((currentPage + 1) * ITEMS_PER_PAGE, sessions.length)} of {sessions.length}
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
