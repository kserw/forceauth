import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDemoMode } from '../context/DemoModeContext';
import { fetchAuditTrail, fetchLogins, fetchUsers, type LoginRecord, type SalesforceUser } from '../services/api';
import { mockActivities } from '../data/mockData';

interface ActivityItem {
  id: string;
  type: 'audit' | 'login' | 'failed_login';
  timestamp: string;
  primary: string;
  secondary: string;
  badge: string;
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 0 || diffMs < 60000) return 'just now';

  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function cleanupDisplay(display: string): string {
  return display
    .replace(/^Changed /, '')
    .replace(/^Created /, 'New ')
    .replace(/^Deleted /, 'Removed ')
    .replace(/ from .* to .*$/, ' updated')
    .slice(0, 50) + (display.length > 50 ? '...' : '');
}

// Users to filter out from activity feed (empty = show all)
const FILTERED_USERS: string[] = [];

function isHumanLogin(login: LoginRecord): boolean {
  // Only filter out pure API logins, allow OAuth app logins
  const pureApiTypes = ['Other Apex API'];
  return !pureApiTypes.includes(login.loginType);
}

function isFilteredUser(userName: string): boolean {
  const nameLower = userName.toLowerCase();
  return FILTERED_USERS.some(filtered => nameLower.includes(filtered));
}

function getLocationStr(login: LoginRecord): string {
  if (login.city && login.country) return `${login.city}, ${login.country}`;
  return login.country || login.city || login.sourceIp;
}

export function ActivityTicker() {
  const { isAuthenticated } = useAuth();
  const { isDemoMode } = useDemoMode();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use mock data in demo mode
  const showDemoIndicator = isDemoMode && !isAuthenticated;

  useEffect(() => {
    if (!isAuthenticated) {
      setActivities([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    Promise.all([
      fetchAuditTrail(20),
      fetchLogins({ limit: 50 }),
      fetchUsers({ limit: 100 }),
    ])
      .then(([auditEvents, logins, users]) => {
        const userMap = new Map<string, SalesforceUser>();
        (users || []).forEach(u => userMap.set(u.id, u));

        const items: ActivityItem[] = [];

        // Add audit events (filter out noise from integration users)
        (auditEvents || []).forEach(event => {
          if (isFilteredUser(event.createdBy)) return;

          items.push({
            id: `audit-${event.id}`,
            type: 'audit',
            timestamp: event.createdDate,
            primary: cleanupDisplay(event.display),
            secondary: event.createdBy,
            badge: event.section,
          });
        });

        // Add important logins (human logins + all failed logins)
        const seenUserLogins = new Set<string>();
        (logins || []).forEach(login => {
          const user = userMap.get(login.userId);
          const userName = user?.name || 'Unknown';

          // Skip filtered integration users
          if (isFilteredUser(userName)) return;

          // Always show failed logins (security relevant)
          if (login.status !== 'Success') {
            items.push({
              id: `login-${login.id}`,
              type: 'failed_login',
              timestamp: login.loginTime,
              primary: `Failed login attempt`,
              secondary: `${userName} from ${getLocationStr(login)}`,
              badge: 'Security',
            });
          }
          // Show human logins (not API), but dedupe per user
          else if (isHumanLogin(login) && !seenUserLogins.has(login.userId)) {
            seenUserLogins.add(login.userId);
            items.push({
              id: `login-${login.id}`,
              type: 'login',
              timestamp: login.loginTime,
              primary: `${userName} logged in`,
              secondary: getLocationStr(login),
              badge: 'Login',
            });
          }
        });

        // Sort by timestamp descending
        items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // Deduplicate: if same primary+secondary appears more than twice, skip extras
        const seen = new Map<string, number>();
        const dedupedItems = items.filter(item => {
          const key = `${item.primary}|${item.secondary}`;
          const count = seen.get(key) || 0;
          seen.set(key, count + 1);
          return count < 1; // Allow max 1 of the same activity
        });

        setActivities(dedupedItems.slice(0, 25));
      })
      .catch((err) => {
        console.error('Failed to fetch activity:', err);
        setError(err.message);
      })
      .finally(() => setIsLoading(false));
  }, [isAuthenticated]);

  // Show empty state when not authenticated and not in demo mode
  if (!isAuthenticated && !isDemoMode) {
    return (
      <div className="relative border-y border-[hsl(var(--border))] bg-[hsl(var(--card))] py-2.5 overflow-hidden">
        <div className="flex items-center justify-center text-xs text-[hsl(var(--muted-foreground))]">
          // login_activity
        </div>
      </div>
    );
  }

  // Show loading state (only when not in demo mode)
  if (isLoading && !showDemoIndicator) {
    return (
      <div className="relative border-y border-[hsl(var(--border))] bg-[hsl(var(--card))] py-2.5 overflow-hidden">
        <div className="flex items-center justify-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
          <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
          loading login activity...
        </div>
      </div>
    );
  }

  // Show error state (only when not in demo mode)
  if (error && !showDemoIndicator) {
    return (
      <div className="relative border-y border-[hsl(var(--border))] bg-[hsl(var(--card))] py-2.5 overflow-hidden">
        <div className="flex items-center justify-center text-xs text-[hsl(var(--destructive))]">
          failed to load activity: {error}
        </div>
      </div>
    );
  }

  // Use mock activities in demo mode
  const displayActivities = showDemoIndicator ? mockActivities : activities;

  // Show empty state if no activities (only when not in demo mode)
  if (displayActivities.length === 0) {
    return (
      <div className="relative border-y border-[hsl(var(--border))] bg-[hsl(var(--card))] py-2.5 overflow-hidden">
        <div className="flex items-center justify-center text-xs text-[hsl(var(--muted-foreground))]">
          no recent activity
        </div>
      </div>
    );
  }

  // Double for marquee animation
  const eventsList = [...displayActivities, ...displayActivities];

  return (
    <div className="relative border-y border-[hsl(var(--border))] bg-[hsl(var(--card))] py-2.5 overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[hsl(var(--card))] to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[hsl(var(--card))] to-transparent z-10" />

      <div className="flex animate-marquee">
        <div className="flex items-center gap-6 text-xs px-4">
          {eventsList.map((activity, index) => (
            <div key={`${activity.id}-${index}`} className="flex items-center gap-6">
              <span className="inline-flex items-center gap-2 whitespace-nowrap">
                {/* Type indicator */}
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    activity.type === 'failed_login'
                      ? 'bg-[hsl(var(--destructive))]'
                      : activity.type === 'login'
                      ? 'bg-[hsl(var(--success))]'
                      : 'bg-[hsl(var(--info))]'
                  }`}
                />
                {/* Badge */}
                <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                  activity.type === 'failed_login'
                    ? 'bg-[hsl(var(--destructive)/0.15)] text-[hsl(var(--destructive))]'
                    : activity.type === 'login'
                    ? 'bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]'
                    : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                }`}>
                  {activity.badge}
                </span>
                {/* Primary text */}
                <span className="text-[hsl(var(--foreground))]">
                  {activity.primary}
                </span>
                {/* Secondary text */}
                <span className="text-[hsl(var(--muted-foreground))]">
                  {activity.secondary}
                </span>
                {/* Time */}
                <span className="text-[hsl(var(--muted-foreground))] tabular-nums">
                  {formatTime(activity.timestamp)}
                </span>
              </span>
              <span className="text-[hsl(var(--border))]">•</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
