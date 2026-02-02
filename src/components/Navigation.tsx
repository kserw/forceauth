import { useState } from 'react';
import { LayoutDashboard, Activity, Users, Plug, Key, Settings, AlertTriangle, X, RefreshCw, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTab, type TabType } from '../context/TabContext';

const tabs: { id: TabType; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'overview', icon: LayoutDashboard },
  { id: 'users', label: 'users', icon: Users },
  { id: 'activity', label: 'activity', icon: Activity },
  { id: 'integrations', label: 'integrations', icon: Plug },
  { id: 'permissions', label: 'permissions', icon: Key },
  { id: 'system', label: 'system', icon: Settings },
];

function getInitials(name: string | undefined | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map(n => n[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';
}

export function Navigation() {
  const { activeTab, setActiveTab } = useTab();
  const { isAuthenticated, user, error, clearError, login, logout, isLoggingIn, selectedOrgId, triggerRefresh } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const hasIssue = !!error || (!isAuthenticated && !isLoggingIn);

  function handleRefresh() {
    setIsRefreshing(true);
    triggerRefresh();
    // Brief visual feedback
    setTimeout(() => setIsRefreshing(false), 500);
  }

  function handleStatusClick() {
    if (error) {
      setShowErrorPopup(true);
    } else if (!isAuthenticated && selectedOrgId) {
      login(selectedOrgId);
    }
  }

  function handleDismissError() {
    clearError();
    setShowErrorPopup(false);
  }

  function handleRetryLogin() {
    clearError();
    setShowErrorPopup(false);
    if (selectedOrgId) {
      login(selectedOrgId);
    }
  }

  return (
    <nav className="sticky bottom-0 flex items-center justify-between px-5 py-3 border-t border-[hsl(var(--border))] bg-[hsl(var(--background)/0.95)] backdrop-blur-md">
      <div className="flex items-center gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-colors ${
                isActive
                  ? 'bg-[hsl(var(--foreground))] text-[hsl(var(--background))]'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex items-center gap-1.5">
          {isAuthenticated && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-1 rounded hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw className={`w-3 h-3 text-[hsl(var(--muted-foreground))] ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
          <button
            onClick={handleStatusClick}
            disabled={isLoggingIn}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
              isLoggingIn
                ? 'bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))] cursor-wait'
                : hasIssue
                ? 'bg-[hsl(var(--destructive)/0.15)] text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.25)] cursor-pointer'
                : 'bg-[hsl(var(--success-muted))] text-[hsl(var(--success))]'
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full bg-current ${isLoggingIn ? 'animate-pulse' : hasIssue ? '' : 'animate-pulse-subtle'}`} />
            <span>
              {isLoggingIn
                ? 'connecting...'
                : error
                ? 'error'
                : !isAuthenticated
                ? 'disconnected'
                : 'operational'}
            </span>
          </button>

          {/* Error popup */}
          {showErrorPopup && error && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowErrorPopup(false)}
              />
              <div className="absolute bottom-full right-0 mb-2 z-50 w-72 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-lg">
                <div className="flex items-start justify-between p-3 border-b border-[hsl(var(--border))]">
                  <div className="flex items-center gap-2 text-[hsl(var(--destructive))]">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-medium">Connection Error</span>
                  </div>
                  <button
                    onClick={handleDismissError}
                    className="p-0.5 rounded hover:bg-[hsl(var(--muted))] transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                  </button>
                </div>
                <div className="p-3">
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mb-3">{error}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDismissError}
                      className="flex-1 px-3 py-1.5 text-xs rounded border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors"
                    >
                      Dismiss
                    </button>
                    {selectedOrgId && (
                      <button
                        onClick={handleRetryLogin}
                        className="flex-1 px-3 py-1.5 text-xs rounded bg-[hsl(var(--info))] text-white hover:opacity-90 transition-opacity"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {isAuthenticated && user ? (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-[hsl(var(--muted))] hover:bg-[hsl(var(--muted)/0.8)] transition-colors"
            >
              <div className="w-5 h-5 rounded bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <span className="text-white text-[10px] font-medium">{getInitials(user.displayName)}</span>
              </div>
              <span className="text-xs text-[hsl(var(--foreground))] hidden sm:inline">{user.displayName}</span>
            </button>

            {/* User menu popup */}
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute bottom-full right-0 mb-2 z-50 w-40 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-lg overflow-hidden">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <span className="text-xs text-[hsl(var(--muted-foreground))]">not connected</span>
        )}
      </div>
    </nav>
  );
}
