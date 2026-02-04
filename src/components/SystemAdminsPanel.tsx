import { useEffect, useState, useRef } from 'react';
import { Shield, Loader2, RefreshCw, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDemoMode } from '../context/DemoModeContext';
import { fetchSystemAdmins, exportToCSV, type SystemAdmin } from '../services/api';
import { mockSystemAdmins } from '../data/mockData';
import { getSalesforceUserUrl } from '../utils/salesforceLinks';

const ITEMS_PER_PAGE = 10;

function formatTimeAgo(dateString: string | null): string {
  if (!dateString) return 'never';
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

function getAvatarColor(name: string | undefined | null): string {
  const colors = [
    'bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-orange-500',
    'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-red-500'
  ];
  if (!name) return colors[0];
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  return colors[index];
}

export function SystemAdminsPanel() {
  const { isAuthenticated, instanceUrl, refreshKey } = useAuth();
  const { isDemoMode } = useDemoMode();
  const [users, setUsers] = useState<SystemAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const showDemoIndicator = isDemoMode && !isAuthenticated;

  const loadData = async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchSystemAdmins();
      setUsers(data);
      setCurrentPage(0);
    } catch (err) {
      console.error('Failed to fetch system admins:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setUsers([]);
      return;
    }
    loadData();
  }, [isAuthenticated, refreshKey]);

  const displayUsers = showDemoIndicator ? mockSystemAdmins : users;

  const handleExport = () => {
    exportToCSV(displayUsers, 'system_admins', [
      { key: 'name', header: 'Name' },
      { key: 'username', header: 'Username' },
      { key: 'email', header: 'Email' },
      { key: 'isActive', header: 'Active' },
      { key: 'lastLoginDate', header: 'Last Login' },
      { key: 'createdDate', header: 'Created' },
    ]);
  };

  if (!isAuthenticated && !isDemoMode) {
    return (
      <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">// system_admins[]</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">login to view system admins</span>
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

  const totalPages = Math.ceil(displayUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = displayUsers.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  return (
    <div className="h-full p-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
          {showDemoIndicator && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[hsl(var(--warning)/0.2)] text-[hsl(var(--warning))]">
              demo
            </span>
          )}
          <span className="text-xs text-[hsl(var(--muted-foreground))]">// system_admins[]</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[hsl(var(--muted-foreground))] tabular-nums">
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin inline" /> : `${displayUsers.length} users`}
          </span>
          <button
            onClick={handleExport}
            disabled={isLoading || displayUsers.length === 0}
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
        {isLoading && displayUsers.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--muted-foreground))]" />
          </div>
        ) : displayUsers.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-xs text-[hsl(var(--muted-foreground))]">no system admins found</span>
          </div>
        ) : (
          <div className="space-y-1">
            {paginatedUsers.map((user) => {
              const userUrl = showDemoIndicator ? null : getSalesforceUserUrl(instanceUrl, user.id);
              return (
                <div
                  key={user.id}
                  onClick={() => userUrl && window.open(userUrl, '_blank')}
                  className="group flex items-center gap-3 p-2 -mx-2 rounded hover:bg-[hsl(var(--muted)/0.5)] transition-colors cursor-pointer"
                >
                  <div className={`w-7 h-7 rounded ${getAvatarColor(user.name)} flex items-center justify-center text-white text-xs font-medium`}>
                    {user.name?.charAt(0)?.toUpperCase() || '?'}
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
                  <div className="text-right flex-shrink-0">
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))] tabular-nums block">
                      {formatTimeAgo(user.lastLoginDate)}
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
            {currentPage * ITEMS_PER_PAGE + 1}-{Math.min((currentPage + 1) * ITEMS_PER_PAGE, displayUsers.length)} of {displayUsers.length}
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
