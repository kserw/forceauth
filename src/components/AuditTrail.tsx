import { useEffect, useState, useRef } from 'react';
import { ArrowUpRight, Loader2, Settings, User, Shield, Database, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDemoMode } from '../context/DemoModeContext';
import { useTab } from '../context/TabContext';
import { fetchAuditTrail, exportToCSV, type AuditEvent } from '../services/api';
import { getSalesforceSetupAuditTrailUrl } from '../utils/salesforceLinks';
import { mockAuditTrail } from '../data/mockData';

const ITEMS_PER_PAGE = 10;

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getSectionIcon(section: string) {
  const sectionLower = section.toLowerCase();
  if (sectionLower.includes('user') || sectionLower.includes('profile')) {
    return <User className="w-3 h-3" />;
  }
  if (sectionLower.includes('security') || sectionLower.includes('permission') || sectionLower.includes('session')) {
    return <Shield className="w-3 h-3" />;
  }
  if (sectionLower.includes('data') || sectionLower.includes('object') || sectionLower.includes('field')) {
    return <Database className="w-3 h-3" />;
  }
  return <Settings className="w-3 h-3" />;
}

function getSectionColor(section: string): string {
  const sectionLower = section.toLowerCase();
  if (sectionLower.includes('security') || sectionLower.includes('permission')) {
    return 'text-[hsl(var(--destructive))] bg-[hsl(var(--destructive)/0.1)]';
  }
  if (sectionLower.includes('user') || sectionLower.includes('profile')) {
    return 'text-[hsl(var(--info))] bg-[hsl(var(--info)/0.1)]';
  }
  return 'text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))]';
}

export function AuditTrail() {
  const { isAuthenticated, instanceUrl, refreshKey } = useAuth();
  const { isDemoMode } = useDemoMode();
  const { setActiveTab } = useTab();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const showDemoIndicator = isDemoMode && !isAuthenticated;

  useEffect(() => {
    if (!isAuthenticated) {
      setEvents([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    fetchAuditTrail(30)
      .then(data => {
        setEvents(data);
        setCurrentPage(0);
      })
      .catch((err) => {
        console.error('Failed to fetch audit trail:', err);
        setError(err.message);
      })
      .finally(() => setIsLoading(false));
  }, [isAuthenticated, refreshKey]);

  const displayEvents = showDemoIndicator ? mockAuditTrail as AuditEvent[] : events;

  if (!isAuthenticated && !isDemoMode) {
    return (
      <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">// audit.trail[]</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">login to view audit trail</span>
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

  const totalPages = Math.ceil(displayEvents.length / ITEMS_PER_PAGE);
  const paginatedEvents = displayEvents.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  const handleExport = () => {
    exportToCSV(displayEvents, 'audit_trail', [
      { key: 'createdDate', header: 'Date' },
      { key: 'action', header: 'Action' },
      { key: 'section', header: 'Section' },
      { key: 'display', header: 'Details' },
      { key: 'createdBy', header: 'User' },
    ]);
  };

  return (
    <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-[hsl(var(--muted-foreground))]">
          {showDemoIndicator && <span className="mr-1 px-1.5 py-0.5 rounded text-[10px] bg-[hsl(var(--warning)/0.2)] text-[hsl(var(--warning))]">demo</span>}
          // setup_audit.trail[]
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[hsl(var(--muted-foreground))] tabular-nums">
            {isLoading && !showDemoIndicator ? <Loader2 className="w-3 h-3 animate-spin inline" /> : `${displayEvents.length} events`}
          </span>
          <button
            onClick={handleExport}
            disabled={isLoading || displayEvents.length === 0}
            className="p-1 rounded hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-50"
            title="Export to CSV"
          >
            <Download className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-auto -mx-4 px-4">
        {isLoading && !showDemoIndicator ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--muted-foreground))]" />
          </div>
        ) : displayEvents.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-xs text-[hsl(var(--muted-foreground))]">no audit events</span>
          </div>
        ) : (
          <div className="space-y-2">
            {paginatedEvents.map((event) => {
              const auditUrl = showDemoIndicator ? null : getSalesforceSetupAuditTrailUrl(instanceUrl, event.id);
              return (
                <div
                  key={event.id}
                  onClick={() => auditUrl && window.open(auditUrl, '_blank')}
                  className="group p-2 -mx-2 rounded hover:bg-[hsl(var(--muted)/0.5)] transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-2">
                    <div className={`p-1 rounded ${getSectionColor(event.section)}`}>
                      {getSectionIcon(event.section)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs text-[hsl(var(--foreground))] font-medium">{event.action}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                          {event.section}
                        </span>
                      </div>
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))] truncate">
                        {event.display}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">
                        <span>{event.createdBy}</span>
                        <span>•</span>
                        <span className="tabular-nums">{formatTimeAgo(event.createdDate)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-[hsl(var(--border))] mt-auto flex items-center justify-between">
        <button
          onClick={() => setActiveTab('system')}
          className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
        >
          view_all()
          <ArrowUpRight className="w-3 h-3" />
        </button>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setCurrentPage(p => Math.max(0, p - 1)); scrollRef.current?.scrollTo(0, 0); }}
              disabled={currentPage === 0}
              className="p-1 rounded hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
            </button>
            <span className="text-[10px] text-[hsl(var(--muted-foreground))] tabular-nums px-1">
              {currentPage + 1}/{totalPages}
            </span>
            <button
              onClick={() => { setCurrentPage(p => Math.min(totalPages - 1, p + 1)); scrollRef.current?.scrollTo(0, 0); }}
              disabled={currentPage === totalPages - 1}
              className="p-1 rounded hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
