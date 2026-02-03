// Mock data for demo mode - shows realistic sample data when not connected to an org

import type { DashboardStats, SalesforceUser, SecurityInsights, UserGrowthStat, LoginDayStat, CountryStat, CityStat, OrgLimit } from '../services/api';

// Generate dates relative to now
const now = new Date();
const daysAgo = (days: number) => {
  const date = new Date(now);
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

const hoursAgo = (hours: number) => {
  const date = new Date(now);
  date.setHours(date.getHours() - hours);
  return date.toISOString();
};

const minutesAgo = (minutes: number) => {
  const date = new Date(now);
  date.setMinutes(date.getMinutes() - minutes);
  return date.toISOString();
};

// Mock dashboard stats
export const mockDashboardStats: DashboardStats = {
  activeUsers: 847,
  totalUsers: 1234,
  loginsToday: 156,
  loginsThisWeek: 892,
  uniqueIpsToday: 89,
  growth: {
    '7d': { current: 156, previous: 142, growth: 9.9 },
    '30d': { current: 612, previous: 580, growth: 5.5 },
    '90d': { current: 1847, previous: 1650, growth: 11.9 },
  },
};

// Mock users
export const mockUsers: SalesforceUser[] = [
  {
    id: 'demo-001',
    name: 'Sarah Chen',
    username: 'sarah.chen@acme.com',
    email: 'sarah.chen@acme.com',
    profile: 'System Administrator',
    userType: 'Standard',
    isActive: true,
    lastLoginDate: minutesAgo(12),
    createdDate: daysAgo(180),
    department: 'IT',
    title: 'Admin',
    photoUrl: null,
  },
  {
    id: 'demo-002',
    name: 'Marcus Johnson',
    username: 'marcus.johnson@acme.com',
    email: 'marcus.johnson@acme.com',
    profile: 'Sales Manager',
    userType: 'Standard',
    isActive: true,
    lastLoginDate: minutesAgo(45),
    createdDate: daysAgo(120),
    department: 'Sales',
    title: 'Manager',
    photoUrl: null,
  },
  {
    id: 'demo-003',
    name: 'Emily Rodriguez',
    username: 'emily.rodriguez@acme.com',
    email: 'emily.rodriguez@acme.com',
    profile: 'Marketing User',
    userType: 'Standard',
    isActive: true,
    lastLoginDate: hoursAgo(2),
    createdDate: daysAgo(90),
    department: 'Marketing',
    title: 'Specialist',
    photoUrl: null,
  },
  {
    id: 'demo-004',
    name: 'James Wilson',
    username: 'james.wilson@acme.com',
    email: 'james.wilson@acme.com',
    profile: 'Standard User',
    userType: 'Standard',
    isActive: true,
    lastLoginDate: hoursAgo(4),
    createdDate: daysAgo(60),
    department: 'Support',
    title: 'Rep',
    photoUrl: null,
  },
  {
    id: 'demo-005',
    name: 'Lisa Park',
    username: 'lisa.park@acme.com',
    email: 'lisa.park@acme.com',
    profile: 'Customer Support',
    userType: 'Standard',
    isActive: true,
    lastLoginDate: hoursAgo(8),
    createdDate: daysAgo(45),
    department: 'Support',
    title: 'Lead',
    photoUrl: null,
  },
  {
    id: 'demo-006',
    name: 'David Thompson',
    username: 'david.thompson@acme.com',
    email: 'david.thompson@acme.com',
    profile: 'Standard User',
    userType: 'Standard',
    isActive: false,
    lastLoginDate: daysAgo(15),
    createdDate: daysAgo(200),
    department: 'Finance',
    title: 'Analyst',
    photoUrl: null,
  },
];

// Mock security insights
export const mockSecurityInsights: SecurityInsights = {
  failedLoginsLast24h: 7,
  usersNeverLoggedIn: 12,
  usersWithoutRecentLogin: 34,
  uniqueIpsLast24h: 89,
  suspiciousIps: [
    { ip: '185.220.101.42', failCount: 3, country: 'RU' },
    { ip: '45.33.32.156', failCount: 2, country: 'CN' },
  ],
  mfaAdoption: { enabled: 756, total: 847 },
};

// Mock user growth data (last 6 months)
export const mockUserGrowth: UserGrowthStat[] = [
  { month: 'Sep', count: 45, cumulative: 1012 },
  { month: 'Oct', count: 52, cumulative: 1064 },
  { month: 'Nov', count: 48, cumulative: 1112 },
  { month: 'Dec', count: 38, cumulative: 1150 },
  { month: 'Jan', count: 42, cumulative: 1192 },
  { month: 'Feb', count: 42, cumulative: 1234 },
];

// Mock logins by day (last 14 days)
const generateMockLoginsByDay = (): LoginDayStat[] => {
  const result: LoginDayStat[] = [];
  for (let i = 13; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const baseCount = isWeekend ? 45 : 120;
    const variation = Math.floor((Math.sin(i * 0.5) + 1) * 20);
    const count = baseCount + variation;
    const failCount = Math.floor(Math.abs(Math.sin(i * 0.3)) * 6) + 2;
    result.push({
      date: date.toISOString().split('T')[0],
      count,
      successCount: count - failCount,
      failCount,
    });
  }
  return result;
};
export const mockLoginsByDay: LoginDayStat[] = generateMockLoginsByDay();

// Mock country stats
export const mockCountryStats: CountryStat[] = [
  { country: 'US', count: 423 },
  { country: 'GB', count: 187 },
  { country: 'DE', count: 134 },
  { country: 'CA', count: 98 },
  { country: 'AU', count: 76 },
  { country: 'FR', count: 65 },
  { country: 'IN', count: 54 },
  { country: 'JP', count: 42 },
  { country: 'NL', count: 38 },
  { country: 'SG', count: 28 },
];

// Mock city stats
export const mockCityStats: CityStat[] = [
  { city: 'San Francisco', country: 'US', count: 156 },
  { city: 'London', country: 'GB', count: 134 },
  { city: 'New York', country: 'US', count: 112 },
  { city: 'Berlin', country: 'DE', count: 87 },
  { city: 'Toronto', country: 'CA', count: 72 },
];

// Mock activity items for ticker
export interface MockActivity {
  id: string;
  type: 'audit' | 'login' | 'failed_login';
  timestamp: string;
  primary: string;
  secondary: string;
  badge: string;
}

export const mockActivities: MockActivity[] = [
  {
    id: 'demo-act-1',
    type: 'login',
    timestamp: minutesAgo(5),
    primary: 'Sarah Chen logged in',
    secondary: 'San Francisco, US',
    badge: 'Login',
  },
  {
    id: 'demo-act-2',
    type: 'audit',
    timestamp: minutesAgo(12),
    primary: 'Profile permissions updated',
    secondary: 'Marcus Johnson',
    badge: 'Setup',
  },
  {
    id: 'demo-act-3',
    type: 'login',
    timestamp: minutesAgo(18),
    primary: 'Emily Rodriguez logged in',
    secondary: 'London, GB',
    badge: 'Login',
  },
  {
    id: 'demo-act-4',
    type: 'failed_login',
    timestamp: minutesAgo(25),
    primary: 'Failed login attempt',
    secondary: 'unknown@example.com from 185.220.101.42',
    badge: 'Security',
  },
  {
    id: 'demo-act-5',
    type: 'audit',
    timestamp: minutesAgo(32),
    primary: 'New field created on Account',
    secondary: 'James Wilson',
    badge: 'Customize',
  },
  {
    id: 'demo-act-6',
    type: 'login',
    timestamp: minutesAgo(45),
    primary: 'Marcus Johnson logged in',
    secondary: 'New York, US',
    badge: 'Login',
  },
  {
    id: 'demo-act-7',
    type: 'audit',
    timestamp: hoursAgo(1),
    primary: 'Validation rule modified',
    secondary: 'Lisa Park',
    badge: 'Customize',
  },
  {
    id: 'demo-act-8',
    type: 'login',
    timestamp: hoursAgo(2),
    primary: 'David Thompson logged in',
    secondary: 'Berlin, DE',
    badge: 'Login',
  },
];

// Mock login sources
export interface MockSourceStat {
  source: string;
  count: number;
}

export const mockSourceStats: MockSourceStat[] = [
  { source: 'Salesforce for iOS', count: 234 },
  { source: 'Application', count: 187 },
  { source: 'Salesforce for Android', count: 145 },
  { source: 'Lightning Experience', count: 98 },
  { source: 'Dataloader', count: 42 },
];

// Mock org limits
export const mockOrgLimits: Record<string, OrgLimit> = {
  DailyApiRequests: { Max: 100000, Remaining: 87234 },
  DailyAsyncApexExecutions: { Max: 250000, Remaining: 249123 },
  DailyBulkApiRequests: { Max: 10000, Remaining: 9876 },
  DataStorageMB: { Max: 10240, Remaining: 8432 },
  FileStorageMB: { Max: 10240, Remaining: 7821 },
  HourlyTimeBasedWorkflow: { Max: 1000, Remaining: 987 },
};

// Mock user license data
export interface MockUserLicense {
  Id: string;
  Name: string;
  TotalLicenses: number;
  UsedLicenses: number;
  Status: string;
}

export const mockLicenses: MockUserLicense[] = [
  { Id: '1', Name: 'Salesforce', TotalLicenses: 100, UsedLicenses: 87, Status: 'Active' },
  { Id: '2', Name: 'Salesforce Platform', TotalLicenses: 50, UsedLicenses: 23, Status: 'Active' },
  { Id: '3', Name: 'Identity', TotalLicenses: 10, UsedLicenses: 5, Status: 'Active' },
  { Id: '4', Name: 'Customer Community Plus', TotalLicenses: 200, UsedLicenses: 156, Status: 'Active' },
  { Id: '5', Name: 'Partner Community', TotalLicenses: 25, UsedLicenses: 18, Status: 'Active' },
];

// Mock active sessions
export const mockActiveSessions = [
  { id: 'sess-001', userId: 'demo-001', userName: 'Sarah Chen', userUsername: 'sarah.chen@acme.com', createdDate: minutesAgo(12), lastModifiedDate: minutesAgo(2), sessionType: 'UI', sourceIp: '192.168.1.100', userType: 'Standard', loginType: 'Application', securityLevel: 'Standard', validSeconds: 7200 },
  { id: 'sess-002', userId: 'demo-002', userName: 'Marcus Johnson', userUsername: 'marcus.johnson@acme.com', createdDate: minutesAgo(45), lastModifiedDate: minutesAgo(10), sessionType: 'UI', sourceIp: '10.0.0.50', userType: 'Standard', loginType: 'Application', securityLevel: 'Standard', validSeconds: 7200 },
  { id: 'sess-003', userId: 'demo-003', userName: 'Emily Rodriguez', userUsername: 'emily.rodriguez@acme.com', createdDate: hoursAgo(2), lastModifiedDate: hoursAgo(1), sessionType: 'UI', sourceIp: '172.16.0.25', userType: 'Standard', loginType: 'SAML', securityLevel: 'HIGH', validSeconds: 7200 },
  { id: 'sess-004', userId: 'demo-004', userName: 'James Wilson', userUsername: 'james.wilson@acme.com', createdDate: hoursAgo(4), lastModifiedDate: hoursAgo(2), sessionType: 'API', sourceIp: '192.168.1.150', userType: 'Standard', loginType: 'OAuth', securityLevel: 'Standard', validSeconds: 3600 },
];

// Mock audit trail
export const mockAuditTrail = [
  { id: 'audit-001', action: 'Changed', section: 'Manage Users', createdDate: minutesAgo(15), createdBy: 'Sarah Chen', display: 'Changed permission set assignments for user Marcus Johnson' },
  { id: 'audit-002', action: 'Created', section: 'Customize', createdDate: minutesAgo(32), createdBy: 'James Wilson', display: 'Created custom field Account.Customer_Segment__c' },
  { id: 'audit-003', action: 'Changed', section: 'Security Controls', createdDate: hoursAgo(1), createdBy: 'Sarah Chen', display: 'Changed password policy: minimum length from 8 to 12' },
  { id: 'audit-004', action: 'Changed', section: 'Manage Users', createdDate: hoursAgo(2), createdBy: 'Lisa Park', display: 'Changed profile for user David Thompson' },
  { id: 'audit-005', action: 'Created', section: 'Customize', createdDate: hoursAgo(3), createdBy: 'Emily Rodriguez', display: 'Created validation rule on Contact object' },
];

// Mock permission sets
export const mockPermissionSets = [
  { id: 'ps-001', name: 'Sales_Cloud_User', label: 'Sales Cloud User', description: 'Access to Sales Cloud features', isOwnedByProfile: false, modifyAllData: false, viewAllData: false, authorApex: false, manageUsers: false, apiEnabled: true, assigneeCount: 234 },
  { id: 'ps-002', name: 'Admin_Access', label: 'Admin Access', description: 'Full administrative access', isOwnedByProfile: false, modifyAllData: true, viewAllData: true, authorApex: true, manageUsers: true, apiEnabled: true, assigneeCount: 5 },
  { id: 'ps-003', name: 'Service_Console', label: 'Service Console', description: 'Service Cloud console access', isOwnedByProfile: false, modifyAllData: false, viewAllData: false, authorApex: false, manageUsers: false, apiEnabled: true, assigneeCount: 89 },
  { id: 'ps-004', name: 'API_Only', label: 'API Only', description: 'API access only', isOwnedByProfile: false, modifyAllData: false, viewAllData: true, authorApex: false, manageUsers: false, apiEnabled: true, assigneeCount: 12 },
];

// Mock profile permissions
export const mockProfilePermissions = [
  { id: 'prof-001', name: 'System Administrator', userType: 'Standard', apiEnabled: true, modifyAllData: true, viewAllData: true, userCount: 5 },
  { id: 'prof-002', name: 'Standard User', userType: 'Standard', apiEnabled: true, modifyAllData: false, viewAllData: false, userCount: 456 },
  { id: 'prof-003', name: 'Sales Manager', userType: 'Standard', apiEnabled: true, modifyAllData: false, viewAllData: true, userCount: 34 },
  { id: 'prof-004', name: 'Marketing User', userType: 'Standard', apiEnabled: true, modifyAllData: false, viewAllData: false, userCount: 67 },
  { id: 'prof-005', name: 'Read Only', userType: 'Standard', apiEnabled: false, modifyAllData: false, viewAllData: true, userCount: 23 },
];

// Mock user risk scores
export const mockUserRiskScores = [
  { userId: 'demo-001', username: 'sarah.chen@acme.com', name: 'Sarah Chen', email: 'sarah.chen@acme.com', profile: 'System Administrator', isActive: true, riskScore: 75, riskLevel: 'high' as const, riskFactors: [{ factor: 'admin_access', description: 'Has Modify All Data permission', points: 40, severity: 'high' as const }, { factor: 'api_enabled', description: 'API access enabled', points: 20, severity: 'medium' as const }], lastLoginDate: minutesAgo(12) },
  { userId: 'demo-002', username: 'marcus.johnson@acme.com', name: 'Marcus Johnson', email: 'marcus.johnson@acme.com', profile: 'Sales Manager', isActive: true, riskScore: 35, riskLevel: 'medium' as const, riskFactors: [{ factor: 'view_all', description: 'Has View All Data permission', points: 25, severity: 'medium' as const }], lastLoginDate: minutesAgo(45) },
  { userId: 'demo-006', username: 'david.thompson@acme.com', name: 'David Thompson', email: 'david.thompson@acme.com', profile: 'Standard User', isActive: false, riskScore: 45, riskLevel: 'medium' as const, riskFactors: [{ factor: 'inactive_user', description: 'Account inactive but not deprovisioned', points: 30, severity: 'medium' as const }], lastLoginDate: daysAgo(15) },
];

// Mock high risk users
export const mockHighRiskUsers = [
  { userId: 'demo-001', userName: 'Sarah Chen', username: 'sarah.chen@acme.com', isActive: true, profile: 'System Administrator', permissionSetName: 'Admin_Access', permissionSetLabel: 'Admin Access', hasModifyAll: true, hasViewAll: true, hasAuthorApex: true },
  { userId: 'demo-007', userName: 'Integration User', username: 'integration@acme.com', isActive: true, profile: 'System Administrator', permissionSetName: 'Admin_Access', permissionSetLabel: 'Admin Access', hasModifyAll: true, hasViewAll: true, hasAuthorApex: false },
];

// Mock guest users
export const mockGuestUsers = [
  { id: 'guest-001', username: 'Site Guest User', name: 'Site Guest User', userType: 'Guest', profile: 'Customer Community Guest', isActive: true, lastLoginDate: hoursAgo(1) },
  { id: 'guest-002', username: 'Partner Portal Guest', name: 'Partner Portal Guest', userType: 'Guest', profile: 'Partner Community Guest', isActive: true, lastLoginDate: daysAgo(3) },
];

// Mock connected apps
export const mockConnectedApps = [
  { name: 'Salesforce Mobile', description: 'Salesforce mobile application', contactEmail: 'mobile@salesforce.com', createdDate: daysAgo(365), lastModifiedDate: daysAgo(30) },
  { name: 'Dataloader', description: 'Data import/export tool', contactEmail: 'support@salesforce.com', createdDate: daysAgo(200), lastModifiedDate: daysAgo(60) },
  { name: 'Acme Integration', description: 'Internal integration app', contactEmail: 'it@acme.com', createdDate: daysAgo(90), lastModifiedDate: daysAgo(7) },
];

// Mock named credentials
export const mockNamedCredentials = [
  { id: 'nc-001', developerName: 'Stripe_API', label: 'Stripe Payment API', endpoint: 'https://api.stripe.com', principalType: 'NamedUser' },
  { id: 'nc-002', developerName: 'Slack_Webhook', label: 'Slack Notifications', endpoint: 'https://hooks.slack.com', principalType: 'Anonymous' },
  { id: 'nc-003', developerName: 'Internal_ERP', label: 'Internal ERP System', endpoint: 'https://erp.acme.internal', principalType: 'NamedUser' },
];

// Mock installed packages
export const mockInstalledPackages = [
  { id: 'pkg-001', name: 'Salesforce CPQ', namespace: 'SBQQ', description: 'Configure, Price, Quote', version: '238.0' },
  { id: 'pkg-002', name: 'Pardot', namespace: 'pi', description: 'Marketing Automation', version: '1.72' },
  { id: 'pkg-003', name: 'DocuSign', namespace: 'dsfs', description: 'Electronic Signatures', version: '7.0' },
];

// Mock integration users
export const mockIntegrationUsers = [
  { id: 'int-001', username: 'api.integration@acme.com', name: 'API Integration', userType: 'Standard', profile: 'Salesforce API Only System Integrations', lastLoginDate: minutesAgo(5), isActive: true, createdDate: daysAgo(180) },
  { id: 'int-002', username: 'dataloader@acme.com', name: 'Dataloader User', userType: 'Standard', profile: 'System Administrator', lastLoginDate: hoursAgo(2), isActive: true, createdDate: daysAgo(365) },
];

// Mock auth providers
export const mockAuthProviders = [
  { Id: 'ap-001', DeveloperName: 'Okta', FriendlyName: 'Okta SSO', ProviderType: 'OpenIdConnect', ExecutionUserId: null, RegistrationHandlerId: null },
  { Id: 'ap-002', DeveloperName: 'Google', FriendlyName: 'Google Workspace', ProviderType: 'Google', ExecutionUserId: null, RegistrationHandlerId: 'handler-001' },
];

// Mock API usage
export const mockApiUsage = {
  totalCalls: 100000,
  remainingCalls: 87234,
  usedPercent: 12.8,
  byApp: [
    { appName: 'Dataloader', callCount: 5234, lastUsed: hoursAgo(2), uniqueUsers: 3, percentOfTotal: 41 },
    { appName: 'Acme Integration', callCount: 4521, lastUsed: minutesAgo(5), uniqueUsers: 1, percentOfTotal: 35 },
    { appName: 'Salesforce Mobile', callCount: 2011, lastUsed: minutesAgo(30), uniqueUsers: 156, percentOfTotal: 16 },
    { appName: 'Other', callCount: 1000, lastUsed: hoursAgo(1), uniqueUsers: 45, percentOfTotal: 8 },
  ],
};

// Mock token risk
export const mockTokenRisk = [
  { appName: 'Legacy Integration', tokenCount: 12, uniqueUsers: 3, oldestToken: daysAgo(400), lastUsed: daysAgo(90), inactiveUserTokens: 2, staleTokens: 8, riskScore: 85, riskLevel: 'critical' as const, riskFactors: [{ factor: 'stale_tokens', description: '8 tokens unused for 90+ days', points: 40, severity: 'high' as const }], tokens: [] },
  { appName: 'Dataloader', tokenCount: 5, uniqueUsers: 5, oldestToken: daysAgo(180), lastUsed: hoursAgo(2), inactiveUserTokens: 0, staleTokens: 1, riskScore: 25, riskLevel: 'low' as const, riskFactors: [], tokens: [] },
];

// Mock concurrent sessions
export const mockConcurrentSessions = [
  { userId: 'demo-001', userName: 'Sarah Chen', sessionCount: 3, sessions: [{ id: 's1', sourceIp: '192.168.1.100', sessionType: 'UI', createdDate: minutesAgo(12) }, { id: 's2', sourceIp: '10.0.0.50', sessionType: 'API', createdDate: minutesAgo(30) }] },
];

// Mock login anomalies
export const mockLoginAnomalies = [
  { userId: 'demo-002', userName: 'Marcus Johnson', anomalyType: 'unusual_hour' as const, description: 'Login at 3:42 AM local time', loginTime: hoursAgo(6), sourceIp: '192.168.1.50', country: 'US' },
  { userId: 'demo-003', userName: 'Emily Rodriguez', anomalyType: 'new_ip' as const, description: 'First login from this IP address', loginTime: hoursAgo(2), sourceIp: '203.0.113.50', country: 'GB' },
];

// Mock failed login patterns
export const mockFailedLoginPatterns = [
  { sourceIp: '185.220.101.42', country: 'RU', failCount: 23, lastAttempt: hoursAgo(1), targetUsers: ['admin@acme.com', 'test@acme.com'] },
  { sourceIp: '45.33.32.156', country: 'CN', failCount: 15, lastAttempt: hoursAgo(3), targetUsers: ['sales@acme.com'] },
];

// Mock data audit events
export const mockDataAuditEvents = [
  { id: 'da-001', action: 'Query', section: 'Account', createdDate: minutesAgo(5), createdBy: 'API Integration', display: 'Queried 500 Account records', delegateUser: null },
  { id: 'da-002', action: 'Export', section: 'Contact', createdDate: minutesAgo(30), createdBy: 'Sarah Chen', display: 'Exported 1,234 Contact records', delegateUser: null },
  { id: 'da-003', action: 'Delete', section: 'Lead', createdDate: hoursAgo(2), createdBy: 'Marcus Johnson', display: 'Deleted 45 Lead records', delegateUser: null },
];

// Legacy exports for backwards compatibility
export const chartData = [
  { date: 'Dec 8', users: 7200 },
  { date: 'Dec 15', users: 7350 },
  { date: 'Dec 22', users: 7500 },
  { date: 'Dec 29', users: 7680 },
  { date: 'Jan 5', users: 7850 },
  { date: 'Jan 12', users: 8050 },
  { date: 'Jan 19', users: 8200 },
];

export const recentUsers = [
  { id: 1, time: '9h ago', name: 'Vincent Willemsen', avatar: 'V', color: 'bg-purple-500', location: '-', device: '-' },
  { id: 2, time: '9h ago', name: 'Lewis Ndegwa', avatar: 'L', color: 'bg-orange-500', location: '-', device: '-' },
  { id: 3, time: '9h ago', name: 'Vahan Merty', avatar: null, color: 'bg-blue-500', location: '-', device: '-' },
  { id: 4, time: '10h ago', name: 'Drew Benjamin', avatar: 'D', color: 'bg-gray-500', location: '-', device: '-' },
  { id: 5, time: '10h ago', name: 'Slade Wooten', avatar: null, color: 'bg-blue-400', location: '-', device: '-' },
  { id: 6, time: '11h ago', name: 'R S', avatar: 'R', color: 'bg-green-500', location: '-', device: '-' },
];

export const activityEvents = [
  { type: 'added', email: 'de222@gmail.com', target: 'aaaaaaaaaa', time: '23:26' },
  { type: 'session', user: 'Lijan Haque', action: 'Session created for', time: '23:26' },
  { type: 'signin', user: 'Lijan Haque', action: 'signed in', time: '23:26' },
  { type: 'linked', user: 'Lijan Haque', provider: 'google', time: '23:21' },
  { type: 'revoked', user: 'krishnA tiwari', action: 'Session revoked for', time: '21:32' },
  { type: 'joined', user: 'krishnA tiwari', action: 'has joined', time: '21:31' },
  { type: 'linked', user: 'BL19', provider: 'github', time: '21:04' },
];

export const topCountries = [
  { rank: 1, country: 'India', flag: '🇮🇳', count: 152, percentage: 12.6 },
  { rank: 2, country: 'Thailand', flag: '🇹🇭', count: 51, percentage: 4.2 },
  { rank: 3, country: 'Brazil', flag: '🇧🇷', count: 31, percentage: 2.5 },
  { rank: 4, country: 'Pakistan', flag: '🇵🇰', count: 31, percentage: 2.5 },
  { rank: 5, country: 'Turkey', flag: '🇹🇷', count: 21, percentage: 1.7 },
];

export const insights = [
  {
    id: 1,
    type: 'security',
    title: 'IP Address Headers Not Configured',
    description: 'Configure IP headers based on your deployment platform for accurate rate limiting.',
  },
  {
    id: 2,
    type: 'performance',
    title: 'Secondary Storage Not Configured',
    description: 'Define secondary storage for faster session lookups and better rate limiting.',
  },
];
