import { useEffect, useState, useRef } from 'react';
import { AlertTriangle, Loader2, RefreshCw, ChevronLeft, ChevronRight, Download, Shield, ShieldAlert, ShieldX, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchUserRiskScores, exportToCSV, type UserRiskScore } from '../services/api';
import { getSalesforceUserUrl } from '../utils/salesforceLinks';

const ITEMS_PER_PAGE = 10;

function getRiskLevelIcon(level: string) {
  switch (level) {
    case 'critical':
      return <ShieldX className="w-3.5 h-3.5" />;
    case 'high':
      return <ShieldAlert className="w-3.5 h-3.5" />;
    case 'medium':
      return <Shield className="w-3.5 h-3.5" />;
    default:
      return <ShieldCheck className="w-3.5 h-3.5" />;
  }
}

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
  if (score >= 70) return 'text-[hsl(var(--destructive))]';
  if (score >= 50) return 'text-[hsl(var(--warning))]';
  if (score >= 30) return 'text-[hsl(var(--info))]';
  return 'text-[hsl(var(--success))]';
}

export function UserRiskScoresPanel() {
  const { isAuthenticated, instanceUrl, refreshKey } = useAuth();
  const [users, setUsers] = useState<UserRiskScore[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadData = () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    fetchUserRiskScores()
      .then(data => {
        setUsers(data);
        setCurrentPage(0);
      })
      .catch(err => {
        console.error('Failed to fetch user risk scores:', err);
        setError(err.message);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [isAuthenticated, refreshKey]);

  const handleExport = () => {
    exportToCSV(users, 'user_risk_scores', [
      { key: 'username', header: 'Username' },
      { key: 'name', header: 'Name' },
      { key: 'email', header: 'Email' },
      { key: 'profile', header: 'Profile' },
      { key: 'isActive', header: 'Active' },
      { key: 'riskScore', header: 'Risk Score' },
      { key: 'riskLevel', header: 'Risk Level' },
      { key: 'riskFactors', header: 'Risk Factors' },
      { key: 'lastLoginDate', header: 'Last Login' },
    ]);
  };

  if (!isAuthenticated) {
    return (
      <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">// user_risk_scores[]</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">login to view user risk scores</span>
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

  const totalPages = Math.ceil(users.length / ITEMS_PER_PAGE);
  const paginatedUsers = users.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  // Calculate summary stats
  const criticalCount = users.filter(u => u.riskLevel === 'critical').length;
  const highCount = users.filter(u => u.riskLevel === 'high').length;

  return (
    <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-[hsl(var(--warning))]" />
          <span className="text-xs text-[hsl(var(--muted-foreground))]">// user_risk_scores[]</span>
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
          <span className="text-xs text-[hsl(var(--muted-foreground))] tabular-nums">
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin inline" /> : `${users.length} users`}
          </span>
          <button
            onClick={handleExport}
            disabled={isLoading || users.length === 0}
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
        {isLoading && users.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--muted-foreground))]" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-xs text-[hsl(var(--muted-foreground))]">no users found</span>
          </div>
        ) : (
          <div className="space-y-1">
            {paginatedUsers.map((user) => {
              const userUrl = getSalesforceUserUrl(instanceUrl, user.userId);
              const isExpanded = expandedUser === user.userId;

              return (
                <div key={user.userId}>
                  <div
                    onClick={() => setExpandedUser(isExpanded ? null : user.userId)}
                    className="group flex items-center gap-3 p-2 -mx-2 rounded hover:bg-[hsl(var(--muted)/0.5)] transition-colors cursor-pointer"
                  >
                    <div className={`p-1.5 rounded ${getRiskLevelColor(user.riskLevel)}`}>
                      {getRiskLevelIcon(user.riskLevel)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[hsl(var(--foreground))] truncate">{user.name}</span>
                        {!user.isActive && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                            inactive
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))] truncate block">
                        {user.username}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className={`text-sm font-medium tabular-nums ${getRiskScoreColor(user.riskScore)}`}>
                          {user.riskScore}
                        </span>
                        <span className="text-[10px] text-[hsl(var(--muted-foreground))]">/100</span>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${getRiskLevelColor(user.riskLevel)}`}>
                        {user.riskLevel}
                      </span>
                    </div>
                  </div>

                  {/* Expanded risk factors */}
                  {isExpanded && (
                    <div className="ml-10 mb-2 p-3 rounded bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-[hsl(var(--muted-foreground))]">risk factors</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            userUrl && window.open(userUrl, '_blank');
                          }}
                          className="text-[10px] text-[hsl(var(--info))] hover:underline"
                        >
                          view in salesforce
                        </button>
                      </div>
                      {user.riskFactors.length === 0 ? (
                        <span className="text-[10px] text-[hsl(var(--success))]">no risk factors detected</span>
                      ) : (
                        <div className="space-y-1.5">
                          {user.riskFactors.map((factor, i) => (
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
                      )}
                      {user.profile && (
                        <div className="mt-2 pt-2 border-t border-[hsl(var(--border))]">
                          <span className="text-[10px] text-[hsl(var(--muted-foreground))]">profile: </span>
                          <span className="text-[10px] text-[hsl(var(--foreground))]">{user.profile}</span>
                        </div>
                      )}
                      {user.lastLoginDate && (
                        <div className="mt-1">
                          <span className="text-[10px] text-[hsl(var(--muted-foreground))]">last login: </span>
                          <span className="text-[10px] text-[hsl(var(--foreground))]">
                            {new Date(user.lastLoginDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
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
            {currentPage * ITEMS_PER_PAGE + 1}-{Math.min((currentPage + 1) * ITEMS_PER_PAGE, users.length)} of {users.length}
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
