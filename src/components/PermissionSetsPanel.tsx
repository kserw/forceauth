import { useEffect, useState, useRef } from 'react';
import { Shield, Loader2, RefreshCw, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDemoMode } from '../context/DemoModeContext';
import { fetchPermissionsData, type PermissionSetInfo } from '../services/api';
import { getSalesforcePermissionSetUrl } from '../utils/salesforceLinks';
import { mockPermissionSets } from '../data/mockData';

const ITEMS_PER_PAGE = 10;

export function PermissionSetsPanel() {
  const { isAuthenticated, instanceUrl, refreshKey } = useAuth();
  const { isDemoMode } = useDemoMode();
  const [permissionSets, setPermissionSets] = useState<PermissionSetInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const showDemoIndicator = isDemoMode && !isAuthenticated;

  const loadData = () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    fetchPermissionsData()
      .then(data => {
        setPermissionSets(data.permissionSets);
        setCurrentPage(0);
      })
      .catch(err => {
        console.error('Failed to fetch permission sets:', err);
        setError(err.message);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [isAuthenticated, refreshKey]);

  const displayPermissionSets = showDemoIndicator ? mockPermissionSets as PermissionSetInfo[] : permissionSets;

  if (!isAuthenticated && !isDemoMode) {
    return (
      <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">// permission_sets[]</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">login to view permission sets</span>
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

  const isHighRisk = (ps: PermissionSetInfo) => ps.modifyAllData || ps.viewAllData || ps.authorApex;

  const totalPages = Math.ceil(displayPermissionSets.length / ITEMS_PER_PAGE);
  const paginatedSets = displayPermissionSets.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  return (
    <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-[hsl(var(--muted-foreground))]">
          {showDemoIndicator && <span className="mr-1 px-1.5 py-0.5 rounded text-[10px] bg-[hsl(var(--warning)/0.2)] text-[hsl(var(--warning))]">demo</span>}
          // permission_sets[]
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[hsl(var(--muted-foreground))] tabular-nums">
            {isLoading && !showDemoIndicator ? <Loader2 className="w-3 h-3 animate-spin inline" /> : `${displayPermissionSets.length} sets`}
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
        {isLoading && displayPermissionSets.length === 0 && !showDemoIndicator ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--muted-foreground))]" />
          </div>
        ) : displayPermissionSets.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-xs text-[hsl(var(--muted-foreground))]">no permission sets found</span>
          </div>
        ) : (
          <div className="space-y-1">
            {paginatedSets.map((ps) => {
              const psUrl = showDemoIndicator ? null : getSalesforcePermissionSetUrl(instanceUrl, ps.id);
              return (
                <div
                  key={ps.id}
                  onClick={() => psUrl && window.open(psUrl, '_blank')}
                  className={`group flex items-center gap-3 p-2 -mx-2 rounded hover:bg-[hsl(var(--muted)/0.5)] transition-colors cursor-pointer ${
                    isHighRisk(ps) ? 'border-l-2 border-[hsl(var(--warning))]' : ''
                  }`}
                >
                  <div className={`p-1.5 rounded ${
                    isHighRisk(ps)
                      ? 'bg-[hsl(var(--warning-muted))] text-[hsl(var(--warning))]'
                      : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                  }`}>
                    {isHighRisk(ps) ? <AlertTriangle className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[hsl(var(--foreground))] truncate">{ps.label}</span>
                      {ps.apiEnabled && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                          API
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))] font-mono truncate block">
                      {ps.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-[hsl(var(--foreground))] tabular-nums">{ps.assigneeCount}</span>
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))] block">assigned</span>
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
            {currentPage * ITEMS_PER_PAGE + 1}-{Math.min((currentPage + 1) * ITEMS_PER_PAGE, displayPermissionSets.length)} of {displayPermissionSets.length}
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
