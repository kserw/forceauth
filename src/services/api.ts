export type SalesforceEnvironment = 'production' | 'sandbox';

export interface UserInfo {
  id: string;
  username: string;
  displayName: string;
  email: string;
  organizationId: string;
  orgName?: string;
}

export interface AuthStatus {
  authenticated: boolean;
  user?: UserInfo;
  environment?: SalesforceEnvironment;
  instanceUrl?: string;
  orgCredentialsId?: string | null;
}

export interface RegisteredOrg {
  id: string;
  orgId: string;
  orgName: string;
  environment: SalesforceEnvironment;
  clientId: string;
  redirectUri: string;
  createdAt: string;
  shared: boolean;
  isOwner: boolean;
}

const API_BASE = '/api';

// Org management
export async function listOrgs(): Promise<RegisteredOrg[]> {
  const response = await fetch(`${API_BASE}/orgs`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch orgs');
  }

  return response.json();
}

export async function getOrgById(id: string): Promise<RegisteredOrg | null> {
  const response = await fetch(`${API_BASE}/orgs/${id}`, {
    credentials: 'include',
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error('Failed to fetch org');
  }

  return response.json();
}

export async function registerOrg(
  orgName: string,
  environment: SalesforceEnvironment,
  clientId: string
): Promise<RegisteredOrg> {
  // Note: This endpoint is stubbed in stateless mode (returns 501)
  // Credentials are stored client-side in localStorage instead
  const response = await fetch(`${API_BASE}/orgs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      orgName,
      environment,
      clientId,
      // PKCE: No client secret needed
      redirectUri: `${window.location.origin}/api/auth/callback`,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to register org');
  }

  return response.json();
}

export async function deleteOrg(id: string): Promise<void> {
  // Include stored org ID to prove local association (for unauthenticated deletion)
  const storedOrgId = localStorage.getItem('sf_selected_org_id');

  const response = await fetch(`${API_BASE}/orgs/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ storedOrgId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to delete org');
  }

  // Clear localStorage if we just deleted the stored org
  if (storedOrgId === id) {
    localStorage.removeItem('sf_selected_org_id');
  }
}

export async function toggleOrgSharing(id: string, shared: boolean): Promise<void> {
  const response = await fetch(`${API_BASE}/orgs/${id}/share`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ shared }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update sharing settings');
  }
}

export async function checkAuthStatus(): Promise<AuthStatus> {
  const response = await fetch(`${API_BASE}/auth/status`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to check auth status');
  }

  return response.json();
}

export function initiateLogin(environment: SalesforceEnvironment, returnUrl: string = '/'): void {
  const params = new URLSearchParams({
    env: environment,
    returnUrl,
  });
  window.location.href = `${API_BASE}/auth/login?${params.toString()}`;
}

export interface PopupLoginResult {
  success: boolean;
  error?: string;
}

// Store org credentials in localStorage (PKCE - no secret needed!)
export interface StoredOrgCredentials {
  clientId: string;
  redirectUri: string;
  environment: SalesforceEnvironment;
  orgName?: string;
}

export function storeOrgCredentials(credentials: StoredOrgCredentials): void {
  localStorage.setItem('sf_org_credentials', JSON.stringify(credentials));
}

export function getStoredOrgCredentials(): StoredOrgCredentials | null {
  const stored = localStorage.getItem('sf_org_credentials');
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function clearStoredOrgCredentials(): void {
  localStorage.removeItem('sf_org_credentials');
}

export async function initiatePopupLogin(
  environment: SalesforceEnvironment,
  _orgId?: string // Kept for backward compatibility but not used in stateless mode
): Promise<PopupLoginResult> {
  // Get stored credentials
  const credentials = getStoredOrgCredentials();
  if (!credentials) {
    return { success: false, error: 'No org credentials stored. Please configure your Salesforce connected app.' };
  }

  // Get auth URL from server (PKCE - no client secret needed!)
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: credentials.clientId,
      redirectUri: credentials.redirectUri,
      environment: environment || credentials.environment,
      returnUrl: '/dashboard',
      popup: true,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    return { success: false, error: error.error || 'Failed to initiate login' };
  }

  const { authUrl } = await response.json();

  return new Promise((resolve) => {
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      authUrl,
      'salesforce_oauth',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
    );

    if (!popup) {
      resolve({ success: false, error: 'Popup was blocked. Please allow popups for this site.' });
      return;
    }

    let resolved = false;
    let checkClosed: ReturnType<typeof setInterval>;

    const cleanup = () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(checkClosed);
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      const data = event.data;
      if (data?.type === 'forceauth_oauth_success') {
        resolved = true;
        cleanup();
        resolve({ success: true });
      } else if (data?.type === 'forceauth_oauth_error') {
        resolved = true;
        cleanup();
        resolve({ success: false, error: data.error });
      }
    };

    window.addEventListener('message', handleMessage);

    // Check if popup was closed
    checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        // Wait for message to arrive after popup closes
        setTimeout(() => {
          if (!resolved) {
            window.removeEventListener('message', handleMessage);
            resolve({ success: false, error: 'Login window was closed' });
          }
        }, 500);
      }
    }, 300);
  });
}

export async function logout(): Promise<void> {
  const response = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Logout failed');
  }
}

export async function refreshToken(): Promise<void> {
  // PKCE refresh doesn't need credentials from localStorage
  // The clientId is stored in the encrypted session cookie
  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Token refresh failed');
  }
}

// =============================================================================
// Salesforce Data API
// =============================================================================

export interface GrowthStat {
  current: number;
  previous: number;
  growth: number;
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  loginsToday: number;
  loginsThisWeek: number;
  uniqueIpsToday: number;
  growth: {
    '7d': GrowthStat;
    '30d': GrowthStat;
    '90d': GrowthStat;
  };
}

export interface SalesforceUser {
  id: string;
  username: string;
  name: string;
  email: string;
  isActive: boolean;
  userType: string;
  profile: string | null;
  lastLoginDate: string | null;
  createdDate: string;
  department: string | null;
  title: string | null;
  photoUrl: string | null;
}

export interface LoginRecord {
  id: string;
  userId: string;
  loginTime: string;
  sourceIp: string;
  loginType: string;
  status: string;
  application: string | null;
  browser: string | null;
  platform: string | null;
  country: string | null;
  city: string | null;
}

export interface AuditEvent {
  id: string;
  action: string;
  section: string;
  createdDate: string;
  createdBy: string;
  display: string;
}

export interface CountryStat {
  country: string;
  count: number;
}

export interface CityStat {
  city: string;
  country: string | null;
  count: number;
}

export interface SourceStat {
  source: string;
  count: number;
}

export interface OrgLimit {
  Max: number;
  Remaining: number;
}

export interface ActiveSession {
  id: string;
  userId: string;
  userName: string | null;
  userUsername: string | null;
  createdDate: string;
  lastModifiedDate: string;
  sessionType: string;
  sourceIp: string;
  userType: string;
  loginType: string;
  securityLevel: string;
  validSeconds: number;
}

export interface OrganizationInfo {
  id: string;
  name: string;
  division: string | null;
  type: string;
  instance: string;
  isSandbox: boolean;
  trialExpiration: string | null;
  language: string;
  timezone: string;
  locale: string;
  createdDate: string;
}

export interface ProfileInfo {
  id: string;
  name: string;
  userType: string;
  license: string | null;
  userCount: number;
}

export interface ScheduledJob {
  id: string;
  name: string | null;
  jobType: string | null;
  nextFireTime: string | null;
  previousFireTime: string | null;
  state: string;
  startTime: string;
  endTime: string | null;
  timesTriggered: number;
}

export interface AsyncJob {
  id: string;
  className: string | null;
  status: string;
  jobType: string;
  createdDate: string;
  completedDate: string | null;
  numberOfErrors: number;
  totalJobItems: number;
  jobItemsProcessed: number;
  createdBy: string | null;
}

export interface LoginTypeStat {
  loginType: string;
  count: number;
}

export interface LoginHourStat {
  hour: string;
  count: number;
}

export interface LoginDayStat {
  date: string;
  count: number;
  successCount: number;
  failCount: number;
}

export interface UserGrowthStat {
  month: string;
  count: number;
  cumulative: number;
}

export interface SecurityInsights {
  usersWithoutRecentLogin: number;
  usersNeverLoggedIn: number;
  failedLoginsLast24h: number;
  uniqueIpsLast24h: number;
  suspiciousIps: Array<{ ip: string; failCount: number; country: string | null }>;
  mfaAdoption: { enabled: number; total: number };
}

export interface ComprehensiveDashboard {
  stats: DashboardStats;
  security: SecurityInsights;
  loginsByDay: LoginDayStat[];
  loginsByCountry: CountryStat[];
  loginsByType: LoginTypeStat[];
  userGrowth: UserGrowthStat[];
  recentLogins: LoginRecord[];
  activeSessions: ActiveSession[];
  auditTrail: AuditEvent[];
  limits: Record<string, OrgLimit>;
}

// Fetch dashboard statistics
export async function fetchDashboardStats(): Promise<DashboardStats> {
  const response = await fetch(`${API_BASE}/salesforce/stats`, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Not authenticated');
    throw new Error('Failed to fetch dashboard stats');
  }

  return response.json();
}

// Fetch users
export async function fetchUsers(options?: { all?: boolean; limit?: number }): Promise<SalesforceUser[]> {
  const params = new URLSearchParams();
  if (options?.all) params.set('all', 'true');
  if (options?.limit) params.set('limit', options.limit.toString());

  const response = await fetch(`${API_BASE}/salesforce/users?${params}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Not authenticated');
    throw new Error('Failed to fetch users');
  }

  const data = await response.json();
  return data.users;
}

// Fetch login history
export async function fetchLogins(options?: { userId?: string; limit?: number }): Promise<LoginRecord[]> {
  const params = new URLSearchParams();
  if (options?.userId) params.set('userId', options.userId);
  if (options?.limit) params.set('limit', options.limit.toString());

  const response = await fetch(`${API_BASE}/salesforce/logins?${params}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Not authenticated');
    throw new Error('Failed to fetch login history');
  }

  const data = await response.json();
  return data.logins;
}

// Fetch login stats by country
export async function fetchLoginsByCountry(days = 30): Promise<CountryStat[]> {
  const response = await fetch(`${API_BASE}/salesforce/logins/by-country?days=${days}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Not authenticated');
    throw new Error('Failed to fetch login stats');
  }

  const data = await response.json();
  return data.stats;
}

// Fetch login stats by city
export async function fetchLoginsByCity(days = 30): Promise<CityStat[]> {
  const response = await fetch(`${API_BASE}/salesforce/logins/by-city?days=${days}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Not authenticated');
    throw new Error('Failed to fetch login stats');
  }

  const data = await response.json();
  return data.stats;
}

// Fetch login stats by source/application
export async function fetchLoginsBySource(days = 30): Promise<SourceStat[]> {
  const response = await fetch(`${API_BASE}/salesforce/logins/by-source?days=${days}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Not authenticated');
    throw new Error('Failed to fetch login stats');
  }

  const data = await response.json();
  return data.stats;
}

// Fetch audit trail
export async function fetchAuditTrail(limit = 50): Promise<AuditEvent[]> {
  const response = await fetch(`${API_BASE}/salesforce/audit?limit=${limit}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Not authenticated');
    throw new Error('Failed to fetch audit trail');
  }

  const data = await response.json();
  return data.events;
}

// Fetch org limits
export async function fetchOrgLimits(all = false): Promise<Record<string, OrgLimit>> {
  const params = new URLSearchParams();
  if (all) params.set('all', 'true');

  const response = await fetch(`${API_BASE}/salesforce/limits?${params}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Not authenticated');
    throw new Error('Failed to fetch org limits');
  }

  const data = await response.json();
  return data.limits;
}

// User license type
export interface UserLicense {
  Id: string;
  Name: string;
  TotalLicenses: number;
  UsedLicenses: number;
  Status: string;
}

// Fetch user licenses
export async function fetchLicenses(): Promise<UserLicense[]> {
  const response = await fetch(`${API_BASE}/salesforce/licenses`, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Not authenticated');
    throw new Error('Failed to fetch licenses');
  }

  const data = await response.json();
  return data.licenses;
}

// Fetch active sessions
export async function fetchActiveSessions(limit = 100): Promise<ActiveSession[]> {
  const response = await fetch(`${API_BASE}/salesforce/sessions?limit=${limit}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Not authenticated');
    throw new Error('Failed to fetch active sessions');
  }

  const data = await response.json();
  return data.sessions;
}

// Fetch organization info
export async function fetchOrganization(): Promise<OrganizationInfo> {
  const response = await fetch(`${API_BASE}/salesforce/organization`, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Not authenticated');
    throw new Error('Failed to fetch organization info');
  }

  return response.json();
}

// Fetch profiles
export async function fetchProfiles(): Promise<ProfileInfo[]> {
  const response = await fetch(`${API_BASE}/salesforce/profiles`, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Not authenticated');
    throw new Error('Failed to fetch profiles');
  }

  const data = await response.json();
  return data.profiles;
}

// Fetch scheduled jobs
export async function fetchScheduledJobs(): Promise<ScheduledJob[]> {
  const response = await fetch(`${API_BASE}/salesforce/jobs/scheduled`, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Not authenticated');
    throw new Error('Failed to fetch scheduled jobs');
  }

  const data = await response.json();
  return data.jobs;
}

// Fetch async apex jobs
export async function fetchAsyncJobs(limit = 50): Promise<AsyncJob[]> {
  const response = await fetch(`${API_BASE}/salesforce/jobs/async?limit=${limit}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Not authenticated');
    throw new Error('Failed to fetch async jobs');
  }

  const data = await response.json();
  return data.jobs;
}

// Fetch failed logins
export async function fetchFailedLogins(days = 7, limit = 100): Promise<LoginRecord[]> {
  const response = await fetch(`${API_BASE}/salesforce/logins/failed?days=${days}&limit=${limit}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Not authenticated');
    throw new Error('Failed to fetch failed logins');
  }

  const data = await response.json();
  return data.logins;
}

// Fetch login stats by type
export async function fetchLoginsByType(days = 30): Promise<LoginTypeStat[]> {
  const response = await fetch(`${API_BASE}/salesforce/logins/by-type?days=${days}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Not authenticated');
    throw new Error('Failed to fetch login stats by type');
  }

  const data = await response.json();
  return data.stats;
}

// Fetch login stats by hour
export async function fetchLoginsByHour(days = 7): Promise<LoginHourStat[]> {
  const response = await fetch(`${API_BASE}/salesforce/logins/by-hour?days=${days}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Not authenticated');
    throw new Error('Failed to fetch login stats by hour');
  }

  const data = await response.json();
  return data.stats;
}

// Fetch login stats by day
export async function fetchLoginsByDay(days = 30): Promise<LoginDayStat[]> {
  const response = await fetch(`${API_BASE}/salesforce/logins/by-day?days=${days}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Not authenticated');
    throw new Error('Failed to fetch login stats by day');
  }

  const data = await response.json();
  return data.stats;
}

// Fetch user growth
export async function fetchUserGrowth(months = 6): Promise<UserGrowthStat[]> {
  const response = await fetch(`${API_BASE}/salesforce/users/growth?months=${months}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Not authenticated');
    throw new Error('Failed to fetch user growth');
  }

  const data = await response.json();
  return data.growth;
}

// Fetch security insights
export async function fetchSecurityInsights(): Promise<SecurityInsights> {
  const response = await fetch(`${API_BASE}/salesforce/security`, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Not authenticated');
    throw new Error('Failed to fetch security insights');
  }

  return response.json();
}

// Fetch comprehensive dashboard data
export async function fetchComprehensiveDashboard(): Promise<ComprehensiveDashboard> {
  const response = await fetch(`${API_BASE}/salesforce/dashboard`, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Not authenticated');
    throw new Error('Failed to fetch dashboard data');
  }

  return response.json();
}

// =============================================================================
// NEW SECURITY DASHBOARD TYPES AND FUNCTIONS
// =============================================================================

// Integrations Page Types
export interface IntegrationUser {
  id: string;
  username: string;
  name: string;
  userType: string;
  profile: string | null;
  lastLoginDate: string | null;
  isActive: boolean;
  createdDate: string;
}

export interface OAuthTokenInfo {
  id: string;
  appName: string;
  userId: string;
  lastUsedDate: string | null;
  useCount: number | null;
}

export interface InstalledPackageInfo {
  id: string;
  name: string;
  namespace: string | null;
  description: string | null;
  version: string | null;
}

export interface NamedCredentialInfo {
  id: string;
  developerName: string;
  label: string;
  endpoint: string | null;
  principalType: string | null;
}

export interface IntegrationsData {
  integrationUsers: IntegrationUser[];
  oauthTokens: OAuthTokenInfo[];
  installedPackages: InstalledPackageInfo[];
  namedCredentials: NamedCredentialInfo[];
}

// Permissions Page Types
export interface PermissionSetInfo {
  id: string;
  name: string;
  label: string;
  description: string | null;
  isOwnedByProfile: boolean;
  modifyAllData: boolean;
  viewAllData: boolean;
  authorApex: boolean;
  manageUsers: boolean;
  apiEnabled: boolean;
  assigneeCount: number;
}

export interface HighRiskUserInfo {
  userId: string;
  userName: string;
  username: string;
  isActive: boolean;
  profile: string | null;
  permissionSetName: string;
  permissionSetLabel: string;
  hasModifyAll: boolean;
  hasViewAll: boolean;
  hasAuthorApex: boolean;
}

export interface ProfilePermissionsInfo {
  id: string;
  name: string;
  userType: string;
  apiEnabled: boolean;
  modifyAllData: boolean;
  viewAllData: boolean;
  userCount: number;
}

export interface PermissionsSummary {
  totalPermissionSets: number;
  highRiskPermissionSets: number;
  usersWithModifyAll: number;
  usersWithViewAll: number;
}

export interface PermissionsData {
  permissionSets: PermissionSetInfo[];
  highRiskUsers: HighRiskUserInfo[];
  profiles: ProfilePermissionsInfo[];
  summary: PermissionsSummary;
}

// Anomalies Page Types
export interface SessionInfo {
  id: string;
  sourceIp: string;
  sessionType: string;
  createdDate: string;
}

export interface ConcurrentSessionInfo {
  userId: string;
  userName: string;
  sessionCount: number;
  sessions: SessionInfo[];
}

export interface LoginAnomalyInfo {
  userId: string;
  userName: string;
  anomalyType: 'unusual_hour' | 'rapid_location_change' | 'new_device' | 'new_ip';
  description: string;
  loginTime: string;
  sourceIp: string;
  country: string | null;
}

export interface FailedLoginPatternInfo {
  sourceIp: string;
  country: string | null;
  failCount: number;
  lastAttempt: string;
  targetUsers: string[];
}

export interface AnomaliesSummary {
  usersWithConcurrentSessions: number;
  totalAnomalies: number;
  suspiciousIps: number;
}

export interface AnomaliesData {
  concurrentSessions: ConcurrentSessionInfo[];
  loginAnomalies: LoginAnomalyInfo[];
  failedLoginPatterns: FailedLoginPatternInfo[];
  summary: AnomaliesSummary;
}

// Config Health Page Types
export interface SecurityRisk {
  riskType: string;
  setting: string;
  orgValue: string;
  standardValue: string;
}

export interface SecurityHealthCheckInfo {
  score: number;
  totalRisks: number;
  highRisks: number;
  mediumRisks: number;
  lowRisks: number;
  risks: SecurityRisk[];
}

export interface MfaCoverageInfo {
  totalUsers: number;
  mfaEnabled: number;
  mfaNotEnabled: number;
  percentage: number;
}

export interface CertificateInfo {
  id: string;
  developerName: string;
  label: string;
  expirationDate: string;
  isExpired: boolean;
}

export interface ConfigHealthData {
  securityHealthCheck: SecurityHealthCheckInfo | null;
  mfaCoverage: MfaCoverageInfo;
  expiringCerts: CertificateInfo[];
  overallScore: number;
}

// Data Access Page Types
export interface DataAuditEventInfo {
  id: string;
  action: string;
  section: string;
  createdDate: string;
  createdBy: string;
  display: string;
  delegateUser: string | null;
}

export interface GuestUserInfo {
  id: string;
  username: string;
  name: string;
  userType: string;
  profile: string | null;
  isActive: boolean;
  lastLoginDate: string | null;
}

export interface SharingRuleInfo {
  objectName: string;
  ruleCount: number;
}

export interface DataAccessSummary {
  totalGuestUsers: number;
  activeGuestUsers: number;
  recentDataChanges: number;
}

export interface DataAccessData {
  auditEvents: DataAuditEventInfo[];
  guestUsers: GuestUserInfo[];
  sharingRules: SharingRuleInfo[];
  summary: DataAccessSummary;
}

// Fetch functions for new security pages

export async function fetchIntegrationsData(): Promise<IntegrationsData> {
  const response = await fetch(`${API_BASE}/salesforce/integrations`, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Not authenticated');
    throw new Error('Failed to fetch integrations data');
  }

  return response.json();
}

export async function fetchPermissionsData(): Promise<PermissionsData> {
  const response = await fetch(`${API_BASE}/salesforce/permissions`, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Not authenticated');
    throw new Error('Failed to fetch permissions data');
  }

  return response.json();
}

export async function fetchAnomaliesData(days = 7): Promise<AnomaliesData> {
  const response = await fetch(`${API_BASE}/salesforce/anomalies?days=${days}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Not authenticated');
    throw new Error('Failed to fetch anomalies data');
  }

  return response.json();
}

export async function fetchConfigHealthData(): Promise<ConfigHealthData> {
  const response = await fetch(`${API_BASE}/salesforce/config-health`, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Not authenticated');
    throw new Error('Failed to fetch config health data');
  }

  return response.json();
}

export async function fetchDataAccessData(): Promise<DataAccessData> {
  const response = await fetch(`${API_BASE}/salesforce/data-access`, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Not authenticated');
    throw new Error('Failed to fetch data access data');
  }

  return response.json();
}

// =============================================================================
// TRACKED INTEGRATIONS API
// =============================================================================

export type TrackedIntegrationStatus = 'done' | 'in_progress' | 'pending' | 'blocked';

export interface TrackedIntegration {
  id: string;
  appName: string;
  contact: string;
  contactId: string | null;
  sfUsername: string;
  sfUserId: string | null;
  profile: string;
  inRetool: boolean;
  hasIpRanges: boolean;
  notes: string;
  ipRanges: string[];
  status: TrackedIntegrationStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  isOwner?: boolean;
  permission?: 'owner' | 'edit' | 'view';
}

export interface IntegrationShare {
  id: string;
  integrationId: string;
  sharedWithUserId: string;
  sharedWithUserName?: string;
  sharedWithUserEmail?: string;
  permission: 'view' | 'edit';
  createdAt: string;
}

export interface ForceAuthUser {
  id: string;
  name: string | null;
  email: string | null;
}

export interface CreateTrackedIntegrationData {
  appName: string;
  contact?: string;
  contactId?: string | null;
  sfUsername?: string;
  sfUserId?: string | null;
  profile?: string;
  inRetool?: boolean;
  hasIpRanges?: boolean;
  notes?: string;
  ipRanges?: string[];
  status?: TrackedIntegrationStatus;
  // Note: createdBy, isOwner, permission are set by the server, not provided in creation
}

export interface UpdateTrackedIntegrationData {
  appName?: string;
  contact?: string;
  contactId?: string | null;
  sfUsername?: string;
  sfUserId?: string | null;
  profile?: string;
  inRetool?: boolean;
  hasIpRanges?: boolean;
  notes?: string;
  ipRanges?: string[];
  status?: TrackedIntegrationStatus;
}

export async function fetchTrackedIntegrations(): Promise<TrackedIntegration[]> {
  const response = await fetch(`${API_BASE}/tracked-integrations`, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Not authenticated');
    throw new Error('Failed to fetch tracked integrations');
  }

  const data = await response.json();
  return data.integrations;
}

export async function createTrackedIntegration(
  data: CreateTrackedIntegrationData
): Promise<TrackedIntegration> {
  const response = await fetch(`${API_BASE}/tracked-integrations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create tracked integration');
  }

  return response.json();
}

export async function updateTrackedIntegration(
  id: string,
  data: UpdateTrackedIntegrationData
): Promise<TrackedIntegration> {
  const response = await fetch(`${API_BASE}/tracked-integrations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update tracked integration');
  }

  return response.json();
}

export async function deleteTrackedIntegration(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/tracked-integrations/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete tracked integration');
  }
}

export async function importTrackedIntegrations(
  csvContent: string
): Promise<{ imported: number; integrations: TrackedIntegration[] }> {
  const response = await fetch(`${API_BASE}/tracked-integrations/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ csvContent }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to import integrations');
  }

  return response.json();
}

// =============================================================================
// USER DISCOVERY API
// =============================================================================

export async function fetchForceAuthUsers(): Promise<ForceAuthUser[]> {
  const response = await fetch(`${API_BASE}/users`, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Not authenticated');
    throw new Error('Failed to fetch users');
  }

  const data = await response.json();
  return data.users;
}

// =============================================================================
// INTEGRATION SHARING API
// =============================================================================

export async function shareIntegration(
  integrationId: string,
  sharedWithUserId: string,
  permission: 'view' | 'edit' = 'view'
): Promise<IntegrationShare> {
  const response = await fetch(`${API_BASE}/tracked-integrations/${integrationId}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ sharedWithUserId, permission }),
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Not authenticated');
    if (response.status === 403) throw new Error('Only the owner can share this integration');
    const error = await response.json();
    throw new Error(error.error || 'Failed to share integration');
  }

  return response.json();
}

export async function removeIntegrationShare(
  integrationId: string,
  sharedWithUserId: string
): Promise<void> {
  const response = await fetch(`${API_BASE}/tracked-integrations/${integrationId}/share/${sharedWithUserId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Not authenticated');
    if (response.status === 403) throw new Error('Only the owner can remove shares');
    const error = await response.json();
    throw new Error(error.error || 'Failed to remove share');
  }
}

export async function fetchIntegrationShares(integrationId: string): Promise<IntegrationShare[]> {
  const response = await fetch(`${API_BASE}/tracked-integrations/${integrationId}/shares`, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Not authenticated');
    if (response.status === 403) throw new Error('Only the owner can view shares');
    throw new Error('Failed to fetch shares');
  }

  const data = await response.json();
  return data.shares;
}

// =============================================================================
// USER RISK SCORING API
// =============================================================================

export interface RiskFactor {
  factor: string;
  description: string;
  points: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface UserRiskScore {
  userId: string;
  username: string;
  name: string;
  email: string;
  profile: string | null;
  isActive: boolean;
  riskScore: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  riskFactors: RiskFactor[];
  lastLoginDate: string | null;
}

export async function fetchUserRiskScores(): Promise<UserRiskScore[]> {
  const response = await fetch(`${API_BASE}/salesforce/user-risk-scores`, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Not authenticated');
    throw new Error('Failed to fetch user risk scores');
  }

  const data = await response.json();
  return data.users;
}

// =============================================================================
// TOKEN RISK API
// =============================================================================

export interface TokenRiskFactor {
  factor: string;
  description: string;
  points: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface TokenInfo {
  tokenId: string;
  userId: string;
  userName: string;
  username: string;
  userActive: boolean;
  lastUsedDate: string | null;
  createdDate: string | null;
  useCount: number | null;
}

export interface AppTokenRisk {
  appName: string;
  tokenCount: number;
  uniqueUsers: number;
  oldestToken: string | null;
  lastUsed: string | null;
  inactiveUserTokens: number;
  staleTokens: number;
  riskScore: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  riskFactors: TokenRiskFactor[];
  tokens: TokenInfo[];
}

export async function fetchTokenRiskData(): Promise<AppTokenRisk[]> {
  const response = await fetch(`${API_BASE}/salesforce/token-risk`, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Not authenticated');
    throw new Error('Failed to fetch token risk data');
  }

  const data = await response.json();
  return data.apps;
}

// =============================================================================
// REMOTE SITE SETTINGS API
// =============================================================================

export interface RemoteSiteSetting {
  Id: string;
  SiteName: string;
  EndpointUrl: string;
  Description: string | null;
  IsActive: boolean;
  DisableProtocolSecurity: boolean;
}

export async function fetchRemoteSiteSettings(): Promise<RemoteSiteSetting[]> {
  const response = await fetch(`${API_BASE}/salesforce/remote-sites`, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Not authenticated');
    throw new Error('Failed to fetch remote site settings');
  }

  const data = await response.json();
  return data.sites;
}

// =============================================================================
// AUTH PROVIDERS API
// =============================================================================

export interface AuthProvider {
  Id: string;
  DeveloperName: string;
  FriendlyName: string;
  ProviderType: string;
  ExecutionUserId: string | null;
  RegistrationHandlerId: string | null;
}

export async function fetchAuthProviders(): Promise<AuthProvider[]> {
  const response = await fetch(`${API_BASE}/salesforce/auth-providers`, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Not authenticated');
    throw new Error('Failed to fetch auth providers');
  }

  const data = await response.json();
  return data.providers;
}

// =============================================================================
// API USAGE API
// =============================================================================

export interface ApiUsageByApp {
  appName: string;
  callCount: number;
  lastUsed: string | null;
  uniqueUsers: number;
  percentOfTotal: number;
}

export interface ApiUsageData {
  totalCalls: number;
  remainingCalls: number;
  usedPercent: number;
  byApp: ApiUsageByApp[];
}

export async function fetchApiUsageData(): Promise<ApiUsageData> {
  const response = await fetch(`${API_BASE}/salesforce/api-usage`, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Not authenticated');
    throw new Error('Failed to fetch API usage data');
  }

  return response.json();
}

// =============================================================================
// CSV EXPORT UTILITIES
// =============================================================================

export function exportToCSV<T>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; header: string }[]
): void {
  if (data.length === 0) return;

  // Use provided columns or generate from first object's keys
  const cols = columns || Object.keys(data[0] as object).map(key => ({ key: key as keyof T, header: key as string }));

  // Create header row
  const headerRow = cols.map(c => `"${String(c.header).replace(/"/g, '""')}"`).join(',');

  // Create data rows
  const dataRows = data.map(row =>
    cols.map(c => {
      const val = (row as Record<string, unknown>)[c.key as string];
      if (val === null || val === undefined) return '""';
      if (typeof val === 'boolean') return val ? '"Yes"' : '"No"';
      if (Array.isArray(val)) return `"${val.join('; ').replace(/"/g, '""')}"`;
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',')
  );

  const csv = [headerRow, ...dataRows].join('\n');

  // Download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
