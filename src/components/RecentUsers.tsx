import { useEffect, useState } from 'react';
import { ArrowUpRight, Loader2, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTab } from '../context/TabContext';
import { fetchUsers, exportToCSV, type SalesforceUser } from '../services/api';
import { getSalesforceUserUrl } from '../utils/salesforceLinks';

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

function getAvatarColor(name: string): string {
  const colors = [
    'bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-orange-500',
    'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-red-500'
  ];
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  return colors[index];
}

export function RecentUsers() {
  const { isAuthenticated, instanceUrl } = useAuth();
  const { setActiveTab } = useTab();
  const [users, setUsers] = useState<SalesforceUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setUsers([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    fetchUsers({ limit: 6 })
      .then(setUsers)
      .catch((err) => {
        console.error('Failed to fetch users:', err);
        setError(err.message);
      })
      .finally(() => setIsLoading(false));
  }, [isAuthenticated]);

  // Show empty state when not authenticated
  if (!isAuthenticated) {
    return (
      <div className="h-full p-3 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">// recent_users[]</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">-</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full p-3 rounded-md border border-[hsl(var(--destructive)/0.5)] bg-[hsl(var(--destructive)/0.1)] flex flex-col items-center justify-center">
        <span className="text-xs text-[hsl(var(--destructive))]">{error}</span>
      </div>
    );
  }

  const handleExport = () => {
    exportToCSV(users, 'users', [
      { key: 'name', header: 'Name' },
      { key: 'username', header: 'Username' },
      { key: 'email', header: 'Email' },
      { key: 'profile', header: 'Profile' },
      { key: 'isActive', header: 'Active' },
      { key: 'lastLoginDate', header: 'Last Login' },
      { key: 'createdDate', header: 'Created' },
    ]);
  };

  return (
    <div className="h-full p-3 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[hsl(var(--muted-foreground))]">// recent_users[]</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[hsl(var(--muted-foreground))] tabular-nums">
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin inline" /> : `${users.length} entries`}
          </span>
          <button
            onClick={handleExport}
            disabled={isLoading || users.length === 0}
            className="p-1 rounded hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-50"
            title="Export to CSV"
          >
            <Download className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto -mx-3 px-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--muted-foreground))]" />
          </div>
        ) : (
          <div className="space-y-1">
            {users.map((user) => {
              const userUrl = getSalesforceUserUrl(instanceUrl, user.id);
              return (
                <div
                  key={user.id}
                  onClick={() => userUrl && window.open(userUrl, '_blank')}
                  className="group flex items-center gap-3 p-2 -mx-2 rounded hover:bg-[hsl(var(--muted)/0.5)] transition-colors cursor-pointer"
                >
                  <div className={`w-6 h-6 rounded ${getAvatarColor(user.name)} flex items-center justify-center text-white text-[10px] font-medium`}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-[hsl(var(--foreground))] truncate block">
                      {user.name}
                    </span>
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))] truncate block">
                      {user.username}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))] tabular-nums block">
                      {formatTimeAgo(user.lastLoginDate)}
                    </span>
                    <span className={`text-[10px] ${user.isActive ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--muted-foreground))]'}`}>
                      {user.isActive ? 'active' : 'inactive'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-[hsl(var(--border))] mt-auto">
        <button
          onClick={() => setActiveTab('permissions')}
          className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
        >
          view_all()
          <ArrowUpRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
