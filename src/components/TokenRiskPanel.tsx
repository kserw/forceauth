import { useEffect, useState, useRef } from 'react';
import { Key, Loader2, RefreshCw, ChevronLeft, ChevronRight, Download, ChevronDown, ChevronUp, UserX } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchTokenRiskData, exportToCSV, type AppTokenRisk } from '../services/api';

const ITEMS_PER_PAGE = 8;

function getRiskLevelColor(level: string) {
  switch (level) {
    case 'critical':
      return 'bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))]';
    case 'high':
      return 'bg-[hsl(var(--warning-muted))] text-[hsl(var(--warning))]';
    case 'medium':
      return 'bg-[hsl(var(--info)/0.1)] text-[hsl(var(--info))]';
    default:
      return 'bg-[hsl(var(--success-muted))] text-[hsl(var(--success))]';
  }
}

function getRiskScoreColor(score: number) {
  if (score >= 40) return 'text-[hsl(var(--destructive))]';
  if (score >= 25) return 'text-[hsl(var(--warning))]';
  if (score >= 10) return 'text-[hsl(var(--info))]';
  return 'text-[hsl(var(--success))]';
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'never';
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 30) return `${diffDays}d ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

export function TokenRiskPanel() {
  const { isAuthenticated, refreshKey } = useAuth();
  const [apps, setApps] = useState<AppTokenRisk[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadData = () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    fetchTokenRiskData()
      .then(data => {
        setApps(data);
        setCurrentPage(0);
      })
      .catch(err => {
        console.error('Failed to fetch token risk data:', err);
        setError(err.message);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [isAuthenticated, refreshKey]);

  const handleExport = () => {
    const exportData = apps.flatMap(app =>
      app.tokens.map(token => ({
        appName: app.appName,
        userName: token.userName,
        username: token.username,
        userActive: token.userActive,
        lastUsed: token.lastUsedDate || 'never',
        createdDate: token.createdDate || 'unknown',
        useCount: token.useCount || 0,
        appRiskScore: app.riskScore,
        appRiskLevel: app.riskLevel,
      }))
    );
    exportToCSV(exportData, 'oauth_token_risk', [
      { key: 'appName', header: 'App Name' },
      { key: 'userName', header: 'User Name' },
      { key: 'username', header: 'Username' },
      { key: 'userActive', header: 'User Active' },
      { key: 'lastUsed', header: 'Last Used' },
      { key: 'createdDate', header: 'Created' },
      { key: 'useCount', header: 'Use Count' },
      { key: 'appRiskScore', header: 'App Risk Score' },
      { key: 'appRiskLevel', header: 'App Risk Level' },
    ]);
  };

  if (!isAuthenticated) {
    return (
      <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">// oauth_token_risk[]</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">login to view token risk</span>
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

  const totalPages = Math.ceil(apps.length / ITEMS_PER_PAGE);
  const paginatedApps = apps.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  // Calculate summary stats
  const criticalCount = apps.filter(a => a.riskLevel === 'critical').length;
  const highCount = apps.filter(a => a.riskLevel === 'high').length;
  const totalInactiveTokens = apps.reduce((sum, a) => sum + a.inactiveUserTokens, 0);

  return (
    <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Key className="w-3.5 h-3.5 text-[hsl(var(--warning))]" />
          <span className="text-xs text-[hsl(var(--muted-foreground))]">// oauth_token_risk[]</span>
        </div>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))]">
              {criticalCount} critical
            </span>
          )}
          {highCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[hsl(var(--warning-muted))] text-[hsl(var(--warning))]">
              {highCount} high
            </span>
          )}
          {totalInactiveTokens > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))] flex items-center gap-1">
              <UserX className="w-2.5 h-2.5" />
              {totalInactiveTokens}
            </span>
          )}
          <span className="text-xs text-[hsl(var(--muted-foreground))] tabular-nums">
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin inline" /> : `${apps.length} apps`}
          </span>
          <button
            onClick={handleExport}
            disabled={isLoading || apps.length === 0}
            className="p-1 rounded hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-50"
            title="Export to CSV"
          >
            <Download className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />
          </button>
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
        {isLoading && apps.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--muted-foreground))]" />
          </div>
        ) : apps.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-xs text-[hsl(var(--muted-foreground))]">no oauth tokens found</span>
          </div>
        ) : (
          <div className="space-y-1">
            {paginatedApps.map((app) => {
              const isExpanded = expandedApp === app.appName;

              return (
                <div key={app.appName}>
                  <div
                    onClick={() => setExpandedApp(isExpanded ? null : app.appName)}
                    className="group flex items-center gap-3 p-2 -mx-2 rounded hover:bg-[hsl(var(--muted)/0.5)] transition-colors cursor-pointer"
                  >
                    <div className={`p-1.5 rounded ${getRiskLevelColor(app.riskLevel)}`}>
                      <Key className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[hsl(var(--foreground))] truncate">{app.appName}</span>
                        {app.inactiveUserTokens > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))] flex items-center gap-0.5">
                            <UserX className="w-2.5 h-2.5" />
                            {app.inactiveUserTokens}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-[hsl(var(--muted-foreground))]">
                        <span>{app.tokenCount} token{app.tokenCount !== 1 ? 's' : ''}</span>
                        <span>•</span>
                        <span>{app.uniqueUsers} user{app.uniqueUsers !== 1 ? 's' : ''}</span>
                        <span>•</span>
                        <span>last used {formatDate(app.lastUsed)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className={`text-sm font-medium tabular-nums ${getRiskScoreColor(app.riskScore)}`}>
                          {app.riskScore}
                        </span>
                        <span className="text-[10px] text-[hsl(var(--muted-foreground))]">/100</span>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${getRiskLevelColor(app.riskLevel)}`}>
                        {app.riskLevel}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                      )}
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="ml-8 mb-2 p-3 rounded bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))]">
                      {/* Risk factors */}
                      {app.riskFactors.length > 0 && (
                        <div className="mb-3">
                          <span className="text-[10px] text-[hsl(var(--muted-foreground))] block mb-1.5">risk factors</span>
                          <div className="space-y-1">
                            {app.riskFactors.map((factor, i) => (
                              <div key={i} className="flex items-start gap-2">
                                <span className={`text-[10px] px-1 py-0.5 rounded tabular-nums ${
                                  factor.severity === 'critical' ? 'bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))]' :
                                  factor.severity === 'high' ? 'bg-[hsl(var(--warning-muted))] text-[hsl(var(--warning))]' :
                                  factor.severity === 'medium' ? 'bg-[hsl(var(--info)/0.1)] text-[hsl(var(--info))]' :
                                  'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                                }`}>
                                  +{factor.points}
                                </span>
                                <div className="flex-1">
                                  <span className="text-xs text-[hsl(var(--foreground))]">{factor.factor}</span>
                                  <span className="text-[10px] text-[hsl(var(--muted-foreground))] block">{factor.description}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Token list */}
                      <div>
                        <span className="text-[10px] text-[hsl(var(--muted-foreground))] block mb-1.5">tokens ({app.tokens.length})</span>
                        <div className="space-y-1 max-h-[150px] overflow-auto">
                          {app.tokens.slice(0, 10).map((token) => (
                            <div key={token.tokenId} className="flex items-center gap-2 text-[10px]">
                              <span className={`w-1.5 h-1.5 rounded-full ${token.userActive ? 'bg-[hsl(var(--success))]' : 'bg-[hsl(var(--destructive))]'}`} />
                              <span className={`flex-1 truncate ${!token.userActive ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--foreground))]'}`}>
                                {token.userName}
                                {!token.userActive && ' (inactive)'}
                              </span>
                              <span className="text-[hsl(var(--muted-foreground))] tabular-nums">
                                {formatDate(token.lastUsedDate)}
                              </span>
                            </div>
                          ))}
                          {app.tokens.length > 10 && (
                            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                              +{app.tokens.length - 10} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-[hsl(var(--border))]">
          <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
            {currentPage * ITEMS_PER_PAGE + 1}-{Math.min((currentPage + 1) * ITEMS_PER_PAGE, apps.length)} of {apps.length}
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
