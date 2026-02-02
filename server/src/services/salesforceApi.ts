import type { SessionData } from '../types/index.js';

// Simple in-memory cache for slow queries (config health, etc.)
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data as T;
  }
  cache.delete(key);
  return null;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export interface SalesforceQueryResult<T> {
  totalSize: number;
  done: boolean;
  records: T[];
}

export interface SalesforceUser {
  Id: string;
  Username: string;
  Name: string;
  Email: string;
  IsActive: boolean;
  UserType: string;
  Profile: { Name: string } | null;
  LastLoginDate: string | null;
  CreatedDate: string;
  Department: string | null;
  Title: string | null;
  SmallPhotoUrl: string | null;
  UserRole?: { Name: string } | null;
  ManagerId?: string | null;
  FederationIdentifier?: string | null;
  LastPasswordChangeDate?: string | null;
}

export interface LoginHistory {
  Id: string;
  UserId: string;
  LoginTime: string;
  SourceIp: string;
  LoginType: string;
  Status: string;
  Application: string | null;
  Browser: string | null;
  Platform: string | null;
  LoginGeoId: string | null;
  CountryIso: string | null;
  City: string | null;
  AuthenticationServiceId?: string | null;
  TlsProtocol?: string | null;
  CipherSuite?: string | null;
}

export interface AuthSession {
  Id: string;
  UsersId: string;
  CreatedDate: string;
  LastModifiedDate: string;
  NumSecondsValid: number;
  SessionType: string;
  SourceIp: string;
  UserType: string;
  LoginType: string;
  SessionSecurityLevel: string;
  LogoutUrl: string | null;
  ParentId: string | null;
  LoginHistoryId: string | null;
  Users?: { Name: string; Username: string };
}

export interface UserLoginInfo {
  Id: string;
  UserId: string;
  IsFrozen: boolean;
  IsPasswordLocked: boolean;
  LastModifiedDate: string;
}

export interface Profile {
  Id: string;
  Name: string;
  UserType: string;
  UserLicenseId: string;
  UserLicense?: { Name: string };
}

export interface PermissionSetAssignment {
  Id: string;
  AssigneeId: string;
  PermissionSetId: string;
  PermissionSet: { Name: string; Label: string; IsOwnedByProfile: boolean };
  Assignee?: { Name: string; Username: string };
}

export interface ConnectedAppInfo {
  Id: string;
  Name: string;
  CreatedDate: string;
  LastModifiedDate: string;
}

export interface OAuthToken {
  Id: string;
  AppName: string;
  UserId: string;
  LastUsedDate: string | null;
  UseCount: number | null;
  DeleteToken: string;
  CreatedDate?: string;
  User?: {
    Name: string;
    Username: string;
    IsActive: boolean;
  };
}

export interface TokenRiskFactor {
  factor: string;
  description: string;
  points: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
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
  tokens: {
    tokenId: string;
    userId: string;
    userName: string;
    username: string;
    userActive: boolean;
    lastUsedDate: string | null;
    createdDate: string | null;
    useCount: number | null;
  }[];
}

export interface SetupAuditTrail {
  Id: string;
  Action: string;
  Section: string;
  CreatedDate: string;
  CreatedBy: { Name: string };
  Display: string;
}

export interface AsyncApexJob {
  Id: string;
  ApexClassId: string;
  Status: string;
  JobType: string;
  CreatedDate: string;
  CompletedDate: string | null;
  NumberOfErrors: number;
  TotalJobItems: number;
  JobItemsProcessed: number;
  ApexClass?: { Name: string };
  CreatedBy?: { Name: string };
}

export interface CronTrigger {
  Id: string;
  CronJobDetailId: string;
  CronJobDetail?: { Name: string; JobType: string };
  NextFireTime: string | null;
  PreviousFireTime: string | null;
  State: string;
  StartTime: string;
  EndTime: string | null;
  TimesTriggered: number;
  OwnerId: string;
}

export interface Organization {
  Id: string;
  Name: string;
  Division: string | null;
  OrganizationType: string;
  InstanceName: string;
  IsSandbox: boolean;
  TrialExpirationDate: string | null;
  LanguageLocaleKey: string;
  TimeZoneSidKey: string;
  DefaultLocaleSidKey: string;
  CreatedDate: string;
}

export interface SecurityHealthCheckRisk {
  RiskType: string;
  Setting: string;
  OrgValue: string;
  StandardValue: string;
}

// ============================================================================
// NEW SECURITY DASHBOARD INTERFACES
// ============================================================================

// Integrations Page
export interface IntegrationUser {
  Id: string;
  Username: string;
  Name: string;
  UserType: string;
  Profile: { Name: string } | null;
  LastLoginDate: string | null;
  IsActive: boolean;
  CreatedDate: string;
}

export interface InstalledPackage {
  Id: string;
  SubscriberPackageId: string;
  SubscriberPackage: {
    Name: string;
    NamespacePrefix: string | null;
    Description: string | null;
  } | null;
  SubscriberPackageVersionId: string;
  SubscriberPackageVersion: {
    Name: string;
    MajorVersion: number;
    MinorVersion: number;
    PatchVersion: number;
    BuildNumber: number;
  } | null;
}

export interface NamedCredential {
  Id: string;
  DeveloperName: string;
  MasterLabel: string;
  Endpoint: string | null;
  PrincipalType: string | null;
}

export interface IntegrationsData {
  integrationUsers: IntegrationUser[];
  oauthTokens: OAuthToken[];
  installedPackages: InstalledPackage[];
  namedCredentials: NamedCredential[];
}

// Permissions Page
export interface PermissionSetInfo {
  Id: string;
  Name: string;
  Label: string;
  Description: string | null;
  IsOwnedByProfile: boolean;
  PermissionsModifyAllData: boolean;
  PermissionsViewAllData: boolean;
  PermissionsAuthorApex: boolean;
  PermissionsManageUsers: boolean;
  PermissionsApiEnabled: boolean;
  assigneeCount?: number;
}

export interface HighRiskUser {
  AssigneeId: string;
  Assignee: {
    Name: string;
    Username: string;
    IsActive: boolean;
    Profile?: { Name: string } | null;
  };
  PermissionSet: {
    Name: string;
    Label: string;
    PermissionsModifyAllData: boolean;
    PermissionsViewAllData: boolean;
    PermissionsAuthorApex: boolean;
  };
}

export interface ProfileWithPermissions {
  Id: string;
  Name: string;
  UserType: string;
  PermissionsApiEnabled: boolean;
  PermissionsModifyAllData: boolean;
  PermissionsViewAllData: boolean;
  userCount: number;
}

export interface PermissionsData {
  permissionSets: PermissionSetInfo[];
  highRiskUsers: HighRiskUser[];
  profiles: ProfileWithPermissions[];
  summary: {
    totalPermissionSets: number;
    highRiskPermissionSets: number;
    usersWithModifyAll: number;
    usersWithViewAll: number;
  };
}

// Anomalies Page
export interface ConcurrentSession {
  userId: string;
  userName: string;
  sessionCount: number;
  sessions: Array<{
    id: string;
    sourceIp: string;
    sessionType: string;
    createdDate: string;
  }>;
}

export interface LoginAnomaly {
  userId: string;
  userName: string;
  anomalyType: 'unusual_hour' | 'rapid_location_change' | 'new_device' | 'new_ip';
  description: string;
  loginTime: string;
  sourceIp: string;
  country: string | null;
}

export interface FailedLoginPattern {
  sourceIp: string;
  country: string | null;
  failCount: number;
  lastAttempt: string;
  targetUsers: string[];
}

export interface AnomaliesData {
  concurrentSessions: ConcurrentSession[];
  loginAnomalies: LoginAnomaly[];
  failedLoginPatterns: FailedLoginPattern[];
  summary: {
    usersWithConcurrentSessions: number;
    totalAnomalies: number;
    suspiciousIps: number;
  };
}

// Config Health Page
export interface SecurityHealthCheck {
  score: number;
  totalRisks: number;
  highRisks: number;
  mediumRisks: number;
  lowRisks: number;
  risks: SecurityHealthCheckRisk[];
}

export interface MfaCoverage {
  totalUsers: number;
  mfaEnabled: number;
  mfaNotEnabled: number;
  percentage: number;
}

export interface Certificate {
  Id: string;
  DeveloperName: string;
  MasterLabel: string;
  ExpirationDate: string;
  IsExpired: boolean;
}

export interface ConfigHealthData {
  securityHealthCheck: SecurityHealthCheck | null;
  mfaCoverage: MfaCoverage;
  expiringCerts: Certificate[];
  overallScore: number;
}

// Data Access Page
export interface DataAuditEvent {
  Id: string;
  Action: string;
  Section: string;
  CreatedDate: string;
  CreatedBy: { Name: string };
  Display: string;
  DelegateUser: string | null;
}

export interface GuestUser {
  Id: string;
  Username: string;
  Name: string;
  UserType: string;
  Profile: { Name: string } | null;
  IsActive: boolean;
  LastLoginDate: string | null;
}

export interface SharingRuleSummary {
  objectName: string;
  ruleCount: number;
}

export interface DataAccessData {
  auditEvents: DataAuditEvent[];
  guestUsers: GuestUser[];
  sharingRules: SharingRuleSummary[];
  summary: {
    totalGuestUsers: number;
    activeGuestUsers: number;
    recentDataChanges: number;
  };
}

async function salesforceRequest<T>(
  session: SessionData,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${session.tokens.instanceUrl}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${session.tokens.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Salesforce API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  return data;
}

function soqlQuery<T>(session: SessionData, query: string): Promise<SalesforceQueryResult<T>> {
  const encoded = encodeURIComponent(query);
  return salesforceRequest<SalesforceQueryResult<T>>(
    session,
    `/services/data/v59.0/query?q=${encoded}`
  );
}

// Fetch active users
export async function getUsers(session: SessionData, limit = 100): Promise<SalesforceUser[]> {
  const query = `
    SELECT Id, Username, Name, Email, IsActive, UserType,
           Profile.Name, LastLoginDate, CreatedDate, Department, Title, SmallPhotoUrl
    FROM User
    WHERE IsActive = true
    ORDER BY LastLoginDate DESC NULLS LAST
    LIMIT ${limit}
  `;
  const result = await soqlQuery<SalesforceUser>(session, query);
  return result.records;
}

// Fetch all users (active and inactive)
export async function getAllUsers(session: SessionData, limit = 200): Promise<SalesforceUser[]> {
  const query = `
    SELECT Id, Username, Name, Email, IsActive, UserType,
           Profile.Name, LastLoginDate, CreatedDate, Department, Title, SmallPhotoUrl
    FROM User
    ORDER BY LastLoginDate DESC NULLS LAST
    LIMIT ${limit}
  `;
  const result = await soqlQuery<SalesforceUser>(session, query);
  return result.records;
}

// Fetch recent login history
export async function getLoginHistory(session: SessionData, limit = 100): Promise<LoginHistory[]> {
  const query = `
    SELECT Id, UserId, LoginTime, SourceIp, LoginType, Status,
           Application, Browser, Platform, CountryIso
    FROM LoginHistory
    ORDER BY LoginTime DESC
    LIMIT ${limit}
  `;
  try {
    const result = await soqlQuery<LoginHistory>(session, query);
    console.log('LoginHistory query returned', result.totalSize, 'records');
    return result.records || [];
  } catch (err) {
    console.error('LoginHistory query failed:', err);
    return [];
  }
}

// Fetch login history for a specific user
export async function getUserLoginHistory(
  session: SessionData,
  userId: string,
  limit = 50
): Promise<LoginHistory[]> {
  const query = `
    SELECT Id, UserId, LoginTime, SourceIp, LoginType, Status,
           Application, Browser, Platform, CountryIso
    FROM LoginHistory
    WHERE UserId = '${userId}'
    ORDER BY LoginTime DESC
    LIMIT ${limit}
  `;
  try {
    const result = await soqlQuery<LoginHistory>(session, query);
    return result.records;
  } catch (err) {
    console.error('Failed to query LoginHistory for user:', err);
    return [];
  }
}

// Fetch OAuth/Connected App tokens (integrations users have authorized)
export async function getOAuthTokens(session: SessionData): Promise<OAuthToken[]> {
  // This requires specific permissions - may not be available in all orgs
  try {
    const query = `
      SELECT Id, AppName, UserId, LastUsedDate, UseCount, DeleteToken
      FROM OauthToken
      ORDER BY LastUsedDate DESC NULLS LAST
      LIMIT 200
    `;
    const result = await soqlQuery<OAuthToken>(session, query);
    return result.records;
  } catch {
    // OauthToken might not be queryable in all orgs
    return [];
  }
}

// Fetch OAuth tokens with user info for risk analysis
export async function getTokenRiskData(session: SessionData): Promise<AppTokenRisk[]> {
  const cacheKey = `tokenRisk:${session.userInfo.organizationId}`;
  const cached = getCached<AppTokenRisk[]>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // Query tokens with user details
    const tokenQuery = `
      SELECT Id, AppName, UserId, LastUsedDate, UseCount, CreatedDate,
             User.Name, User.Username, User.IsActive
      FROM OauthToken
      ORDER BY AppName, LastUsedDate DESC NULLS LAST
      LIMIT 500
    `;

    interface TokenWithUser {
      Id: string;
      AppName: string;
      UserId: string;
      LastUsedDate: string | null;
      UseCount: number | null;
      CreatedDate: string | null;
      User: {
        Name: string;
        Username: string;
        IsActive: boolean;
      } | null;
    }

    const tokenResult = await soqlQuery<TokenWithUser>(session, tokenQuery);
    const tokens = tokenResult.records;

    // Group tokens by app
    const appTokensMap = new Map<string, TokenWithUser[]>();
    for (const token of tokens) {
      const existing = appTokensMap.get(token.AppName) || [];
      existing.push(token);
      appTokensMap.set(token.AppName, existing);
    }

    const now = Date.now();
    const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;
    const ONE_YEAR = 365 * 24 * 60 * 60 * 1000;

    // Calculate risk for each app
    const appRisks: AppTokenRisk[] = [];

    for (const [appName, appTokens] of appTokensMap) {
      const riskFactors: TokenRiskFactor[] = [];
      let riskScore = 0;

      // Count metrics
      const uniqueUserIds = new Set(appTokens.map(t => t.UserId));
      const inactiveUserTokens = appTokens.filter(t => t.User && !t.User.IsActive);
      const staleTokens = appTokens.filter(t => {
        if (!t.LastUsedDate) return true; // Never used = stale
        return (now - new Date(t.LastUsedDate).getTime()) > NINETY_DAYS;
      });
      const oldTokens = appTokens.filter(t => {
        if (!t.CreatedDate) return false;
        return (now - new Date(t.CreatedDate).getTime()) > ONE_YEAR;
      });

      // Find oldest and last used dates
      let oldestToken: string | null = null;
      let lastUsed: string | null = null;
      for (const t of appTokens) {
        if (t.CreatedDate && (!oldestToken || t.CreatedDate < oldestToken)) {
          oldestToken = t.CreatedDate;
        }
        if (t.LastUsedDate && (!lastUsed || t.LastUsedDate > lastUsed)) {
          lastUsed = t.LastUsedDate;
        }
      }

      // Risk scoring

      // 1. Tokens for inactive users (critical - user left but token still works)
      if (inactiveUserTokens.length > 0) {
        riskFactors.push({
          factor: 'Inactive User Tokens',
          description: `${inactiveUserTokens.length} token(s) for deactivated users`,
          points: 30,
          severity: 'critical'
        });
        riskScore += 30;
      }

      // 2. Stale tokens (not used in 90+ days)
      if (staleTokens.length > 0) {
        const stalePercent = Math.round((staleTokens.length / appTokens.length) * 100);
        if (stalePercent >= 50) {
          riskFactors.push({
            factor: 'Stale Tokens',
            description: `${staleTokens.length} token(s) unused for 90+ days (${stalePercent}%)`,
            points: 20,
            severity: 'high'
          });
          riskScore += 20;
        } else if (staleTokens.length > 0) {
          riskFactors.push({
            factor: 'Stale Tokens',
            description: `${staleTokens.length} token(s) unused for 90+ days`,
            points: 10,
            severity: 'medium'
          });
          riskScore += 10;
        }
      }

      // 3. Old tokens (created 1+ year ago)
      if (oldTokens.length > 0) {
        riskFactors.push({
          factor: 'Long-lived Tokens',
          description: `${oldTokens.length} token(s) older than 1 year`,
          points: 10,
          severity: 'medium'
        });
        riskScore += 10;
      }

      // 4. High token sprawl (many users with tokens)
      if (uniqueUserIds.size >= 20) {
        riskFactors.push({
          factor: 'Token Sprawl',
          description: `${uniqueUserIds.size} users have granted access to this app`,
          points: 10,
          severity: 'medium'
        });
        riskScore += 10;
      }

      // 5. No recent activity (app might be abandoned)
      if (lastUsed) {
        const daysSinceUse = Math.floor((now - new Date(lastUsed).getTime()) / (24 * 60 * 60 * 1000));
        if (daysSinceUse > 180) {
          riskFactors.push({
            factor: 'No Recent Activity',
            description: `App not used in ${daysSinceUse} days`,
            points: 15,
            severity: 'high'
          });
          riskScore += 15;
        }
      } else if (appTokens.length > 0) {
        riskFactors.push({
          factor: 'Never Used',
          description: 'Tokens exist but app has never been used',
          points: 20,
          severity: 'high'
        });
        riskScore += 20;
      }

      // Determine risk level
      let riskLevel: 'critical' | 'high' | 'medium' | 'low';
      if (riskScore >= 40) {
        riskLevel = 'critical';
      } else if (riskScore >= 25) {
        riskLevel = 'high';
      } else if (riskScore >= 10) {
        riskLevel = 'medium';
      } else {
        riskLevel = 'low';
      }

      appRisks.push({
        appName,
        tokenCount: appTokens.length,
        uniqueUsers: uniqueUserIds.size,
        oldestToken,
        lastUsed,
        inactiveUserTokens: inactiveUserTokens.length,
        staleTokens: staleTokens.length,
        riskScore: Math.min(riskScore, 100),
        riskLevel,
        riskFactors,
        tokens: appTokens.map(t => ({
          tokenId: t.Id,
          userId: t.UserId,
          userName: t.User?.Name || 'Unknown',
          username: t.User?.Username || 'Unknown',
          userActive: t.User?.IsActive ?? true,
          lastUsedDate: t.LastUsedDate,
          createdDate: t.CreatedDate,
          useCount: t.UseCount
        }))
      });
    }

    // Sort by risk score descending
    appRisks.sort((a, b) => b.riskScore - a.riskScore);

    setCache(cacheKey, appRisks);
    return appRisks;
  } catch (err) {
    console.error('Failed to get token risk data:', err);
    return [];
  }
}

// =============================================================================
// REMOTE SITE SETTINGS - External URLs the org can call
// =============================================================================

export interface RemoteSiteSetting {
  Id: string;
  SiteName: string;
  EndpointUrl: string;
  Description: string | null;
  IsActive: boolean;
  DisableProtocolSecurity: boolean;
}

export async function getRemoteSiteSettings(session: SessionData): Promise<RemoteSiteSetting[]> {
  try {
    const query = `
      SELECT Id, SiteName, EndpointUrl, Description, IsActive, DisableProtocolSecurity
      FROM RemoteProxy
      ORDER BY SiteName
      LIMIT 200
    `;
    const result = await soqlQuery<RemoteSiteSetting>(session, query);
    return result.records;
  } catch (err) {
    console.error('Failed to get remote site settings:', err);
    return [];
  }
}

// =============================================================================
// AUTH PROVIDERS - SSO/Identity Provider configurations
// =============================================================================

export interface AuthProvider {
  Id: string;
  DeveloperName: string;
  FriendlyName: string;
  ProviderType: string;
  ExecutionUserId: string | null;
  RegistrationHandlerId: string | null;
}

export async function getAuthProviders(session: SessionData): Promise<AuthProvider[]> {
  try {
    const query = `
      SELECT Id, DeveloperName, FriendlyName, ProviderType, ExecutionUserId, RegistrationHandlerId
      FROM AuthProvider
      ORDER BY FriendlyName
      LIMIT 50
    `;
    const result = await soqlQuery<AuthProvider>(session, query);
    return result.records;
  } catch (err) {
    console.error('Failed to get auth providers:', err);
    return [];
  }
}

// =============================================================================
// API USAGE - Track API consumption by connected app
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

export async function getApiUsageData(session: SessionData): Promise<ApiUsageData> {
  const cacheKey = `apiUsage:${session.userInfo.organizationId}`;
  const cached = getCached<ApiUsageData>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // Get API limits
    const limitsUrl = `${session.tokens.instanceUrl}/services/data/v59.0/limits`;
    const limitsResponse = await fetch(limitsUrl, {
      headers: {
        Authorization: `Bearer ${session.tokens.accessToken}`,
      },
    });

    let totalCalls = 0;
    let remainingCalls = 0;

    if (limitsResponse.ok) {
      const limits = await limitsResponse.json();
      if (limits.DailyApiRequests) {
        totalCalls = limits.DailyApiRequests.Max;
        remainingCalls = limits.DailyApiRequests.Remaining;
      }
    }

    // Query login history to approximate API usage by app (last 7 days)
    // Note: True API usage per app requires Event Monitoring (Shield) license
    // This approximates by looking at API/OAuth logins
    const query = `
      SELECT Application, COUNT(Id), MAX(LoginTime)
      FROM LoginHistory
      WHERE LoginTime >= LAST_N_DAYS:7
        AND (LoginType = 'Remote Access 2.0' OR LoginType = 'Remote Access Client')
      GROUP BY Application
      ORDER BY COUNT(Id) DESC
      LIMIT 20
    `;

    interface AppUsageRecord {
      Application: string;
      expr0: number;
      expr1: string;
    }

    let byApp: ApiUsageByApp[] = [];

    try {
      const result = await soqlQuery<AppUsageRecord>(session, query);
      const totalAppCalls = result.records.reduce((sum, r) => sum + r.expr0, 0);

      byApp = result.records.map(r => ({
        appName: r.Application || 'Unknown',
        callCount: r.expr0,
        lastUsed: r.expr1,
        uniqueUsers: 0, // Would need a separate query
        percentOfTotal: totalAppCalls > 0 ? Math.round((r.expr0 / totalAppCalls) * 100) : 0
      }));
    } catch (e) {
      console.warn('Could not query API usage by app:', e);
    }

    const usedCalls = totalCalls - remainingCalls;
    const data: ApiUsageData = {
      totalCalls,
      remainingCalls,
      usedPercent: totalCalls > 0 ? Math.round((usedCalls / totalCalls) * 100) : 0,
      byApp
    };

    setCache(cacheKey, data);
    return data;
  } catch (err) {
    console.error('Failed to get API usage data:', err);
    return {
      totalCalls: 0,
      remainingCalls: 0,
      usedPercent: 0,
      byApp: []
    };
  }
}

// Fetch setup audit trail (admin activity)
export async function getSetupAuditTrail(session: SessionData, limit = 50): Promise<SetupAuditTrail[]> {
  const query = `
    SELECT Id, Action, Section, CreatedDate, CreatedBy.Name, Display
    FROM SetupAuditTrail
    ORDER BY CreatedDate DESC
    LIMIT ${limit}
  `;
  const result = await soqlQuery<SetupAuditTrail>(session, query);
  return result.records;
}

// Get login statistics by IP
export async function getLoginStatsByIp(session: SessionData, days = 30): Promise<Map<string, number>> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString();

  const query = `
    SELECT SourceIp, COUNT(Id) cnt
    FROM LoginHistory
    WHERE LoginTime >= ${sinceStr}
    GROUP BY SourceIp
    ORDER BY COUNT(Id) DESC
    LIMIT 50
  `;

  try {
    const result = await soqlQuery<{ SourceIp: string; cnt: number }>(session, query);
    const stats = new Map<string, number>();
    result.records.forEach((r) => stats.set(r.SourceIp, r.cnt));
    return stats;
  } catch {
    return new Map();
  }
}

// Get login statistics by country
export async function getLoginStatsByCountry(session: SessionData, days = 30): Promise<Array<{ country: string; count: number }>> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString();

  const query = `
    SELECT CountryIso, COUNT(Id) cnt
    FROM LoginHistory
    WHERE LoginTime >= ${sinceStr} AND CountryIso != null
    GROUP BY CountryIso
    ORDER BY COUNT(Id) DESC
    LIMIT 20
  `;

  try {
    const result = await soqlQuery<{ CountryIso: string; cnt: number }>(session, query);
    return result.records.map((r) => ({ country: r.CountryIso, count: r.cnt }));
  } catch {
    return [];
  }
}

export async function getLoginStatsByCity(session: SessionData, days = 30): Promise<Array<{ city: string; country: string | null; count: number }>> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString();

  const query = `
    SELECT City, CountryIso, COUNT(Id) cnt
    FROM LoginHistory
    WHERE LoginTime >= ${sinceStr} AND City != null
    GROUP BY City, CountryIso
    ORDER BY COUNT(Id) DESC
    LIMIT 20
  `;

  try {
    const result = await soqlQuery<{ City: string; CountryIso: string | null; cnt: number }>(session, query);
    return result.records.map((r) => ({ city: r.City, country: r.CountryIso, count: r.cnt }));
  } catch {
    return [];
  }
}

export async function getLoginStatsBySource(session: SessionData, days = 30): Promise<Array<{ source: string; count: number }>> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString();

  // Use LoginType which is always populated and filterable
  const query = `
    SELECT LoginType, COUNT(Id) cnt
    FROM LoginHistory
    WHERE LoginTime >= ${sinceStr}
    GROUP BY LoginType
    ORDER BY COUNT(Id) DESC
    LIMIT 20
  `;

  try {
    console.log('Running LoginType query:', query);
    const result = await soqlQuery<{ LoginType: string | null; cnt: number }>(session, query);
    console.log('LoginType query result:', result.records.length, 'records');
    return result.records
      .filter((r) => r.LoginType)
      .map((r) => ({ source: r.LoginType!, count: r.cnt }));
  } catch (err) {
    console.error('Failed to get login stats by source:', err);
    return [];
  }
}

// Get org limits
export async function getOrgLimits(session: SessionData): Promise<Record<string, { Max: number; Remaining: number }>> {
  return salesforceRequest<Record<string, { Max: number; Remaining: number }>>(
    session,
    '/services/data/v59.0/limits'
  );
}

// Get login growth for a specific period (compares current period to previous period)
async function getLoginGrowth(session: SessionData, days: number): Promise<{
  current: number;
  previous: number;
  growth: number;
}> {
  const now = new Date();
  const periodStart = new Date();
  periodStart.setDate(now.getDate() - days);
  const previousStart = new Date();
  previousStart.setDate(now.getDate() - (days * 2));

  const periodStartStr = periodStart.toISOString();
  const previousStartStr = previousStart.toISOString();

  try {
    // Current period logins
    const currentQuery = `SELECT COUNT(Id) FROM LoginHistory WHERE LoginTime >= ${periodStartStr}`;
    const currentResult = await soqlQuery<{ expr0: number }>(session, currentQuery);
    const current = currentResult.records[0]?.expr0 || 0;

    // Previous period logins
    const previousQuery = `SELECT COUNT(Id) FROM LoginHistory WHERE LoginTime >= ${previousStartStr} AND LoginTime < ${periodStartStr}`;
    const previousResult = await soqlQuery<{ expr0: number }>(session, previousQuery);
    const previous = previousResult.records[0]?.expr0 || 0;

    // Calculate growth percentage
    const growth = previous === 0 ? (current > 0 ? 100 : 0) : Math.round(((current - previous) / previous) * 100);

    return { current, previous, growth };
  } catch (err) {
    console.error('Failed to get login growth:', err);
    return { current: 0, previous: 0, growth: 0 };
  }
}

// Get dashboard summary stats
export async function getDashboardStats(session: SessionData): Promise<{
  totalUsers: number;
  activeUsers: number;
  loginsToday: number;
  loginsThisWeek: number;
  uniqueIpsToday: number;
  growth: {
    '7d': { current: number; previous: number; growth: number };
    '30d': { current: number; previous: number; growth: number };
    '90d': { current: number; previous: number; growth: number };
  };
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString();

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString();

  try {
    // Get total user count
    const totalUsersQuery = `SELECT COUNT(Id) FROM User`;
    const totalUsersResult = await soqlQuery<{ expr0: number }>(session, totalUsersQuery);
    const totalUsers = totalUsersResult.records[0]?.expr0 || 0;

    // Get active user count
    const activeUsersQuery = `SELECT COUNT(Id) FROM User WHERE IsActive = true`;
    const activeUsersResult = await soqlQuery<{ expr0: number }>(session, activeUsersQuery);
    const activeUsers = activeUsersResult.records[0]?.expr0 || 0;

    // Get logins today
    const loginsTodayQuery = `SELECT COUNT(Id) FROM LoginHistory WHERE LoginTime >= ${todayStr}`;
    const loginsTodayResult = await soqlQuery<{ expr0: number }>(session, loginsTodayQuery);
    const loginsToday = loginsTodayResult.records[0]?.expr0 || 0;

    // Get logins this week
    const loginsWeekQuery = `SELECT COUNT(Id) FROM LoginHistory WHERE LoginTime >= ${weekAgoStr}`;
    const loginsWeekResult = await soqlQuery<{ expr0: number }>(session, loginsWeekQuery);
    const loginsThisWeek = loginsWeekResult.records[0]?.expr0 || 0;

    // Get unique IPs today
    const uniqueIpsQuery = `SELECT SourceIp FROM LoginHistory WHERE LoginTime >= ${todayStr} GROUP BY SourceIp`;
    const uniqueIpsResult = await soqlQuery<{ SourceIp: string }>(session, uniqueIpsQuery);
    const uniqueIpsToday = uniqueIpsResult.records.length;

    // Get growth for different periods
    const [growth7d, growth30d, growth90d] = await Promise.all([
      getLoginGrowth(session, 7),
      getLoginGrowth(session, 30),
      getLoginGrowth(session, 90),
    ]);

    return {
      totalUsers,
      activeUsers,
      loginsToday,
      loginsThisWeek,
      uniqueIpsToday,
      growth: {
        '7d': growth7d,
        '30d': growth30d,
        '90d': growth90d,
      },
    };
  } catch (err) {
    console.error('Failed to get dashboard stats:', err);
    throw err; // Re-throw so frontend can show error
  }
}

// Get active sessions
export async function getActiveSessions(session: SessionData, limit = 100): Promise<AuthSession[]> {
  const query = `
    SELECT Id, UsersId, CreatedDate, LastModifiedDate, NumSecondsValid,
           SessionType, SourceIp, UserType, LoginType, SessionSecurityLevel,
           LogoutUrl, ParentId, LoginHistoryId, Users.Name, Users.Username
    FROM AuthSession
    ORDER BY LastModifiedDate DESC
    LIMIT ${limit}
  `;
  try {
    const result = await soqlQuery<AuthSession>(session, query);
    return result.records;
  } catch (err) {
    console.error('Failed to get active sessions:', err);
    return [];
  }
}

// Get organization info
export async function getOrganization(session: SessionData): Promise<Organization | null> {
  const query = `
    SELECT Id, Name, Division, OrganizationType, InstanceName, IsSandbox,
           TrialExpirationDate, LanguageLocaleKey, TimeZoneSidKey,
           DefaultLocaleSidKey, CreatedDate
    FROM Organization
    LIMIT 1
  `;
  try {
    const result = await soqlQuery<Organization>(session, query);
    return result.records[0] || null;
  } catch (err) {
    console.error('Failed to get organization:', err);
    return null;
  }
}

// Get profiles with user counts
export async function getProfiles(session: SessionData): Promise<Array<Profile & { userCount: number }>> {
  const query = `
    SELECT Id, Name, UserType, UserLicenseId, UserLicense.Name
    FROM Profile
    WHERE UserType = 'Standard'
    ORDER BY Name
  `;
  try {
    const result = await soqlQuery<Profile>(session, query);

    // Get user counts per profile
    const countQuery = `
      SELECT ProfileId, COUNT(Id) cnt
      FROM User
      WHERE IsActive = true
      GROUP BY ProfileId
    `;
    const countResult = await soqlQuery<{ ProfileId: string; cnt: number }>(session, countQuery);
    const countMap = new Map(countResult.records.map(r => [r.ProfileId, r.cnt]));

    return result.records.map(p => ({
      ...p,
      userCount: countMap.get(p.Id) || 0
    }));
  } catch (err) {
    console.error('Failed to get profiles:', err);
    return [];
  }
}

// Get scheduled jobs
export async function getScheduledJobs(session: SessionData): Promise<CronTrigger[]> {
  const query = `
    SELECT Id, CronJobDetailId, CronJobDetail.Name, CronJobDetail.JobType,
           NextFireTime, PreviousFireTime, State, StartTime, EndTime,
           TimesTriggered, OwnerId
    FROM CronTrigger
    WHERE State != 'DELETED'
    ORDER BY NextFireTime ASC NULLS LAST
    LIMIT 50
  `;
  try {
    const result = await soqlQuery<CronTrigger>(session, query);
    return result.records;
  } catch (err) {
    console.error('Failed to get scheduled jobs:', err);
    return [];
  }
}

// Get recent async apex jobs
export async function getAsyncApexJobs(session: SessionData, limit = 50): Promise<AsyncApexJob[]> {
  const query = `
    SELECT Id, ApexClassId, ApexClass.Name, Status, JobType, CreatedDate,
           CompletedDate, NumberOfErrors, TotalJobItems, JobItemsProcessed,
           CreatedBy.Name
    FROM AsyncApexJob
    WHERE JobType IN ('BatchApex', 'Future', 'Queueable', 'ScheduledApex')
    ORDER BY CreatedDate DESC
    LIMIT ${limit}
  `;
  try {
    const result = await soqlQuery<AsyncApexJob>(session, query);
    return result.records;
  } catch (err) {
    console.error('Failed to get async apex jobs:', err);
    return [];
  }
}

// Get failed logins (fetch all and filter in JS since Status can't be filtered in SOQL)
export async function getFailedLogins(session: SessionData, days = 7, limit = 100): Promise<LoginHistory[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString();

  const query = `
    SELECT Id, UserId, LoginTime, SourceIp, LoginType, Status,
           Application, Browser, Platform, CountryIso
    FROM LoginHistory
    WHERE LoginTime >= ${sinceStr}
    ORDER BY LoginTime DESC
    LIMIT 500
  `;
  try {
    const result = await soqlQuery<LoginHistory>(session, query);
    // Filter for failed logins in JavaScript
    const failed = (result.records || []).filter(r => r.Status !== 'Success');
    return failed.slice(0, limit);
  } catch (err) {
    console.error('Failed to get failed logins:', err);
    return [];
  }
}

// Get login history grouped by login type
export async function getLoginsByType(session: SessionData, days = 30): Promise<Array<{ loginType: string; count: number }>> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString();

  const query = `
    SELECT LoginType, COUNT(Id) cnt
    FROM LoginHistory
    WHERE LoginTime >= ${sinceStr}
    GROUP BY LoginType
    ORDER BY COUNT(Id) DESC
  `;
  try {
    const result = await soqlQuery<{ LoginType: string; cnt: number }>(session, query);
    return result.records.map(r => ({ loginType: r.LoginType, count: r.cnt }));
  } catch (err) {
    console.error('Failed to get logins by type:', err);
    return [];
  }
}

// Get login history grouped by hour (for chart)
export async function getLoginsByHour(session: SessionData, days = 7): Promise<Array<{ hour: string; count: number }>> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString();

  const query = `
    SELECT HOUR_IN_DAY(LoginTime) hr, COUNT(Id) cnt
    FROM LoginHistory
    WHERE LoginTime >= ${sinceStr}
    GROUP BY HOUR_IN_DAY(LoginTime)
    ORDER BY HOUR_IN_DAY(LoginTime)
  `;
  try {
    const result = await soqlQuery<{ hr: number; cnt: number }>(session, query);
    return result.records.map(r => ({
      hour: `${r.hr.toString().padStart(2, '0')}:00`,
      count: r.cnt
    }));
  } catch (err) {
    console.error('Failed to get logins by hour:', err);
    return [];
  }
}

// Get login history grouped by day (for chart)
export async function getLoginsByDay(session: SessionData, days = 30): Promise<Array<{ date: string; count: number; successCount: number; failCount: number }>> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString();

  const query = `
    SELECT DAY_ONLY(LoginTime) day, Status, COUNT(Id) cnt
    FROM LoginHistory
    WHERE LoginTime >= ${sinceStr}
    GROUP BY DAY_ONLY(LoginTime), Status
    ORDER BY DAY_ONLY(LoginTime)
  `;
  try {
    const result = await soqlQuery<{ day: string; Status: string; cnt: number }>(session, query);

    // Aggregate by day
    const dayMap = new Map<string, { count: number; successCount: number; failCount: number }>();
    for (const r of result.records) {
      const existing = dayMap.get(r.day) || { count: 0, successCount: 0, failCount: 0 };
      existing.count += r.cnt;
      if (r.Status === 'Success') {
        existing.successCount += r.cnt;
      } else {
        existing.failCount += r.cnt;
      }
      dayMap.set(r.day, existing);
    }

    return Array.from(dayMap.entries()).map(([date, stats]) => ({
      date,
      ...stats
    }));
  } catch (err) {
    console.error('Failed to get logins by day:', err);
    return [];
  }
}

// Get users created over time (for user growth chart)
export async function getUserGrowth(session: SessionData, months = 6): Promise<Array<{ month: string; count: number; cumulative: number }>> {
  const since = new Date();
  since.setMonth(since.getMonth() - months);
  since.setDate(1);
  const sinceStr = since.toISOString();

  const query = `
    SELECT CALENDAR_MONTH(CreatedDate) month, CALENDAR_YEAR(CreatedDate) year, COUNT(Id) cnt
    FROM User
    WHERE CreatedDate >= ${sinceStr}
    GROUP BY CALENDAR_MONTH(CreatedDate), CALENDAR_YEAR(CreatedDate)
    ORDER BY CALENDAR_YEAR(CreatedDate), CALENDAR_MONTH(CreatedDate)
  `;
  try {
    const result = await soqlQuery<{ month: number; year: number; cnt: number }>(session, query);

    // Also get total users before the period for cumulative calculation
    const totalQuery = `SELECT COUNT(Id) FROM User WHERE CreatedDate < ${sinceStr}`;
    const totalResult = await soqlQuery<{ expr0: number }>(session, totalQuery);
    let cumulative = totalResult.records[0]?.expr0 || 0;

    return result.records.map(r => {
      cumulative += r.cnt;
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return {
        month: `${monthNames[r.month - 1]} ${r.year}`,
        count: r.cnt,
        cumulative
      };
    });
  } catch (err) {
    console.error('Failed to get user growth:', err);
    return [];
  }
}

// Get security insights
export async function getSecurityInsights(session: SessionData): Promise<{
  usersWithoutRecentLogin: number;
  usersNeverLoggedIn: number;
  failedLoginsLast24h: number;
  uniqueIpsLast24h: number;
  suspiciousIps: Array<{ ip: string; failCount: number; country: string | null }>;
  mfaAdoption: { enabled: number; total: number };
}> {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  try {
    const [
      neverLoggedIn,
      noRecentLogin,
      logins24h
    ] = await Promise.all([
      // Users who never logged in
      soqlQuery<{ expr0: number }>(session, `
        SELECT COUNT(Id) FROM User WHERE IsActive = true AND LastLoginDate = null
      `),
      // Active users without login in 30 days
      soqlQuery<{ expr0: number }>(session, `
        SELECT COUNT(Id) FROM User
        WHERE IsActive = true AND LastLoginDate != null AND LastLoginDate < ${thirtyDaysAgo.toISOString()}
      `),
      // All logins in last 24h (filter for failed in JS since Status can't be filtered)
      soqlQuery<{ SourceIp: string; Status: string; CountryIso: string | null }>(session, `
        SELECT SourceIp, Status, CountryIso FROM LoginHistory
        WHERE LoginTime >= ${yesterday.toISOString()}
        LIMIT 1000
      `)
    ]);

    // Process login data in JavaScript
    const allLogins = logins24h.records || [];
    const failedLogins = allLogins.filter(r => r.Status !== 'Success');
    const uniqueIps = new Set(allLogins.map(r => r.SourceIp));

    // Find suspicious IPs (3+ failed attempts)
    const ipFailCounts = new Map<string, { count: number; country: string | null }>();
    for (const login of failedLogins) {
      const existing = ipFailCounts.get(login.SourceIp);
      if (existing) {
        existing.count++;
      } else {
        ipFailCounts.set(login.SourceIp, { count: 1, country: login.CountryIso });
      }
    }
    const suspiciousIps = Array.from(ipFailCounts.entries())
      .filter(([, data]) => data.count >= 3)
      .map(([ip, data]) => ({ ip, failCount: data.count, country: data.country }))
      .sort((a, b) => b.failCount - a.failCount)
      .slice(0, 10);

    return {
      usersWithoutRecentLogin: noRecentLogin.records[0]?.expr0 || 0,
      usersNeverLoggedIn: neverLoggedIn.records[0]?.expr0 || 0,
      failedLoginsLast24h: failedLogins.length,
      uniqueIpsLast24h: uniqueIps.size,
      suspiciousIps,
      mfaAdoption: { enabled: 0, total: 0 }
    };
  } catch (err) {
    console.error('Failed to get security insights:', err);
    return {
      usersWithoutRecentLogin: 0,
      usersNeverLoggedIn: 0,
      failedLoginsLast24h: 0,
      uniqueIpsLast24h: 0,
      suspiciousIps: [],
      mfaAdoption: { enabled: 0, total: 0 }
    };
  }
}

// Get comprehensive dashboard data in one call
export async function getComprehensiveDashboard(session: SessionData): Promise<{
  stats: Awaited<ReturnType<typeof getDashboardStats>>;
  security: Awaited<ReturnType<typeof getSecurityInsights>>;
  loginsByDay: Awaited<ReturnType<typeof getLoginsByDay>>;
  loginsByCountry: Awaited<ReturnType<typeof getLoginStatsByCountry>>;
  loginsByType: Awaited<ReturnType<typeof getLoginsByType>>;
  userGrowth: Awaited<ReturnType<typeof getUserGrowth>>;
  recentLogins: LoginHistory[];
  activeSessions: AuthSession[];
  auditTrail: SetupAuditTrail[];
  limits: Record<string, { Max: number; Remaining: number }>;
}> {
  const [
    stats,
    security,
    loginsByDay,
    loginsByCountry,
    loginsByType,
    userGrowth,
    recentLogins,
    activeSessions,
    auditTrail,
    limits
  ] = await Promise.all([
    getDashboardStats(session),
    getSecurityInsights(session),
    getLoginsByDay(session, 30),
    getLoginStatsByCountry(session, 30),
    getLoginsByType(session, 30),
    getUserGrowth(session, 6),
    getLoginHistory(session, 50),
    getActiveSessions(session, 50),
    getSetupAuditTrail(session, 20),
    getOrgLimits(session)
  ]);

  return {
    stats,
    security,
    loginsByDay,
    loginsByCountry,
    loginsByType,
    userGrowth,
    recentLogins,
    activeSessions,
    auditTrail,
    limits
  };
}

// ============================================================================
// NEW SECURITY DASHBOARD SERVICE FUNCTIONS
// ============================================================================

// ------ INTEGRATIONS PAGE ------

// Get integration/automated process users
export async function getIntegrationUsers(session: SessionData): Promise<IntegrationUser[]> {
  const query = `
    SELECT Id, Username, Name, UserType, Profile.Name, LastLoginDate, IsActive, CreatedDate
    FROM User
    WHERE UserType IN ('AutomatedProcess', 'Integration')
       OR Profile.Name LIKE '%Integration%'
       OR Profile.Name LIKE '%API%'
       OR FirstName LIKE '%Integration%'
       OR LastName LIKE '%Integration%'
    ORDER BY LastLoginDate DESC NULLS LAST
    LIMIT 100
  `;
  try {
    const result = await soqlQuery<IntegrationUser>(session, query);
    return result.records;
  } catch (err) {
    console.error('Failed to get integration users:', err);
    return [];
  }
}

// Get installed packages (requires Tooling API)
export async function getInstalledPackages(session: SessionData): Promise<InstalledPackage[]> {
  try {
    const result = await salesforceRequest<SalesforceQueryResult<InstalledPackage>>(
      session,
      '/services/data/v59.0/tooling/query?q=' +
        encodeURIComponent(`
          SELECT Id, SubscriberPackageId, SubscriberPackage.Name, SubscriberPackage.NamespacePrefix,
                 SubscriberPackage.Description, SubscriberPackageVersionId,
                 SubscriberPackageVersion.Name, SubscriberPackageVersion.MajorVersion,
                 SubscriberPackageVersion.MinorVersion, SubscriberPackageVersion.PatchVersion,
                 SubscriberPackageVersion.BuildNumber
          FROM InstalledSubscriberPackage
          ORDER BY SubscriberPackage.Name
          LIMIT 100
        `)
    );
    return result.records || [];
  } catch (err) {
    console.error('Failed to get installed packages:', err);
    return [];
  }
}

// Get named credentials (using Tooling API)
export async function getNamedCredentials(session: SessionData): Promise<NamedCredential[]> {
  try {
    const result = await salesforceRequest<SalesforceQueryResult<NamedCredential>>(
      session,
      '/services/data/v59.0/tooling/query?q=' +
        encodeURIComponent('SELECT Id, DeveloperName, MasterLabel, Endpoint, PrincipalType FROM NamedCredential LIMIT 50')
    );
    return result.records || [];
  } catch (err) {
    console.error('Failed to get named credentials:', err);
    return [];
  }
}

// Get all integrations data
export async function getIntegrationsData(session: SessionData): Promise<IntegrationsData> {
  const [integrationUsers, oauthTokens, installedPackages, namedCredentials] = await Promise.all([
    getIntegrationUsers(session),
    getOAuthTokens(session),
    getInstalledPackages(session),
    getNamedCredentials(session)
  ]);

  return {
    integrationUsers,
    oauthTokens,
    installedPackages,
    namedCredentials
  };
}

// ------ PERMISSIONS PAGE ------

// Get permission sets with high-risk flags
export async function getPermissionSetsWithRisks(session: SessionData): Promise<PermissionSetInfo[]> {
  const query = `
    SELECT Id, Name, Label, Description, IsOwnedByProfile,
           PermissionsModifyAllData, PermissionsViewAllData, PermissionsAuthorApex,
           PermissionsManageUsers, PermissionsApiEnabled
    FROM PermissionSet
    WHERE IsOwnedByProfile = false
    ORDER BY Name
    LIMIT 200
  `;
  try {
    const result = await soqlQuery<PermissionSetInfo>(session, query);

    // Get assignee counts
    const countQuery = `
      SELECT PermissionSetId, COUNT(Id) cnt
      FROM PermissionSetAssignment
      WHERE PermissionSet.IsOwnedByProfile = false
      GROUP BY PermissionSetId
    `;
    const countResult = await soqlQuery<{ PermissionSetId: string; cnt: number }>(session, countQuery);
    const countMap = new Map(countResult.records.map(r => [r.PermissionSetId, r.cnt]));

    return result.records.map(ps => ({
      ...ps,
      assigneeCount: countMap.get(ps.Id) || 0
    }));
  } catch (err) {
    console.error('Failed to get permission sets:', err);
    return [];
  }
}

// Get high-risk users (users with ModifyAllData, ViewAllData, or AuthorApex)
export async function getHighRiskUsers(session: SessionData): Promise<HighRiskUser[]> {
  const query = `
    SELECT AssigneeId, Assignee.Name, Assignee.Username, Assignee.IsActive, Assignee.Profile.Name,
           PermissionSet.Name, PermissionSet.Label,
           PermissionSet.PermissionsModifyAllData, PermissionSet.PermissionsViewAllData,
           PermissionSet.PermissionsAuthorApex
    FROM PermissionSetAssignment
    WHERE (PermissionSet.PermissionsModifyAllData = true
           OR PermissionSet.PermissionsViewAllData = true
           OR PermissionSet.PermissionsAuthorApex = true)
      AND Assignee.IsActive = true
    ORDER BY Assignee.Name
    LIMIT 200
  `;
  try {
    const result = await soqlQuery<HighRiskUser>(session, query);
    return result.records;
  } catch (err) {
    console.error('Failed to get high risk users:', err);
    return [];
  }
}

// Get profiles with permissions and user counts
export async function getProfilesWithPermissions(session: SessionData): Promise<ProfileWithPermissions[]> {
  const query = `
    SELECT Id, Name, UserType, PermissionsApiEnabled, PermissionsModifyAllData, PermissionsViewAllData
    FROM Profile
    ORDER BY Name
    LIMIT 100
  `;
  try {
    const result = await soqlQuery<ProfileWithPermissions>(session, query);

    // Get user counts per profile
    const countQuery = `
      SELECT ProfileId, COUNT(Id) cnt
      FROM User
      WHERE IsActive = true
      GROUP BY ProfileId
    `;
    const countResult = await soqlQuery<{ ProfileId: string; cnt: number }>(session, countQuery);
    const countMap = new Map(countResult.records.map(r => [r.ProfileId, r.cnt]));

    return result.records.map(p => ({
      ...p,
      userCount: countMap.get(p.Id) || 0
    }));
  } catch (err) {
    console.error('Failed to get profiles with permissions:', err);
    return [];
  }
}

// Get all permissions data
export async function getPermissionsData(session: SessionData): Promise<PermissionsData> {
  const [permissionSets, highRiskUsers, profiles] = await Promise.all([
    getPermissionSetsWithRisks(session),
    getHighRiskUsers(session),
    getProfilesWithPermissions(session)
  ]);

  // Deduplicate high-risk users by AssigneeId
  const uniqueUserIds = new Set<string>();
  const modifyAllUserIds = new Set<string>();
  const viewAllUserIds = new Set<string>();

  highRiskUsers.forEach(hr => {
    uniqueUserIds.add(hr.AssigneeId);
    if (hr.PermissionSet.PermissionsModifyAllData) modifyAllUserIds.add(hr.AssigneeId);
    if (hr.PermissionSet.PermissionsViewAllData) viewAllUserIds.add(hr.AssigneeId);
  });

  const highRiskPermissionSets = permissionSets.filter(ps =>
    ps.PermissionsModifyAllData || ps.PermissionsViewAllData || ps.PermissionsAuthorApex
  );

  return {
    permissionSets,
    highRiskUsers,
    profiles,
    summary: {
      totalPermissionSets: permissionSets.length,
      highRiskPermissionSets: highRiskPermissionSets.length,
      usersWithModifyAll: modifyAllUserIds.size,
      usersWithViewAll: viewAllUserIds.size
    }
  };
}

// ------ ANOMALIES PAGE ------

// Get concurrent sessions (users with multiple active sessions)
export async function getConcurrentSessions(session: SessionData): Promise<ConcurrentSession[]> {
  const query = `
    SELECT UsersId, Users.Name, Users.Username, Id, SourceIp, SessionType, CreatedDate
    FROM AuthSession
    ORDER BY UsersId, CreatedDate DESC
  `;
  try {
    const result = await soqlQuery<{
      UsersId: string;
      Users: { Name: string; Username: string };
      Id: string;
      SourceIp: string;
      SessionType: string;
      CreatedDate: string;
    }>(session, query);

    // Group by user
    const userSessions = new Map<string, {
      userName: string;
      sessions: Array<{ id: string; sourceIp: string; sessionType: string; createdDate: string }>;
    }>();

    for (const record of result.records) {
      const existing = userSessions.get(record.UsersId);
      const sessionInfo = {
        id: record.Id,
        sourceIp: record.SourceIp,
        sessionType: record.SessionType,
        createdDate: record.CreatedDate
      };

      if (existing) {
        existing.sessions.push(sessionInfo);
      } else {
        userSessions.set(record.UsersId, {
          userName: record.Users?.Name || 'Unknown',
          sessions: [sessionInfo]
        });
      }
    }

    // Filter to users with multiple sessions
    const concurrent: ConcurrentSession[] = [];
    for (const [userId, data] of userSessions) {
      if (data.sessions.length > 1) {
        concurrent.push({
          userId,
          userName: data.userName,
          sessionCount: data.sessions.length,
          sessions: data.sessions.slice(0, 5)
        });
      }
    }

    return concurrent.sort((a, b) => b.sessionCount - a.sessionCount);
  } catch (err) {
    console.error('Failed to get concurrent sessions:', err);
    return [];
  }
}

// Analyze login history for anomalies
export async function getLoginAnomalies(session: SessionData, days = 7): Promise<LoginAnomaly[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString();

  // Note: Status field cannot be filtered in SOQL, so we fetch all and filter in JS
  const query = `
    SELECT UserId, LoginTime, SourceIp, CountryIso, Browser, Platform, Status
    FROM LoginHistory
    WHERE LoginTime >= ${sinceStr}
    ORDER BY UserId, LoginTime DESC
    LIMIT 1000
  `;

  try {
    const result = await soqlQuery<{
      UserId: string;
      LoginTime: string;
      SourceIp: string;
      CountryIso: string | null;
      Browser: string | null;
      Platform: string | null;
      Status: string;
    }>(session, query);

    const anomalies: LoginAnomaly[] = [];
    const userLogins = new Map<string, typeof result.records>();

    // Filter for successful logins only (Status cannot be filtered in SOQL)
    const successfulLogins = result.records.filter(r => r.Status === 'Success');

    // Group by user
    for (const login of successfulLogins) {
      const existing = userLogins.get(login.UserId);
      if (existing) {
        existing.push(login);
      } else {
        userLogins.set(login.UserId, [login]);
      }
    }

    // Analyze each user's logins
    for (const [userId, logins] of userLogins) {
      for (let i = 0; i < logins.length - 1; i++) {
        const current = logins[i];
        const previous = logins[i + 1];

        // Check for unusual hours (outside 6am-10pm)
        const hour = new Date(current.LoginTime).getHours();
        if (hour < 6 || hour > 22) {
          anomalies.push({
            userId,
            userName: userId, // Will be enriched later
            anomalyType: 'unusual_hour',
            description: `Login at unusual hour (${hour}:00)`,
            loginTime: current.LoginTime,
            sourceIp: current.SourceIp,
            country: current.CountryIso
          });
        }

        // Check for rapid location changes (different country within 2 hours)
        if (current.CountryIso && previous.CountryIso && current.CountryIso !== previous.CountryIso) {
          const timeDiff = new Date(current.LoginTime).getTime() - new Date(previous.LoginTime).getTime();
          const hoursDiff = timeDiff / (1000 * 60 * 60);
          if (hoursDiff < 2) {
            anomalies.push({
              userId,
              userName: userId,
              anomalyType: 'rapid_location_change',
              description: `Location change from ${previous.CountryIso} to ${current.CountryIso} in ${hoursDiff.toFixed(1)} hours`,
              loginTime: current.LoginTime,
              sourceIp: current.SourceIp,
              country: current.CountryIso
            });
          }
        }
      }
    }

    // Enrich with user names
    if (anomalies.length > 0) {
      const userIds = [...new Set(anomalies.map(a => a.userId))];
      const userQuery = `SELECT Id, Name FROM User WHERE Id IN ('${userIds.join("','")}')`;
      const userResult = await soqlQuery<{ Id: string; Name: string }>(session, userQuery);
      const userMap = new Map(userResult.records.map(u => [u.Id, u.Name]));

      anomalies.forEach(a => {
        a.userName = userMap.get(a.userId) || a.userId;
      });
    }

    return anomalies.slice(0, 50);
  } catch (err) {
    console.error('Failed to get login anomalies:', err);
    return [];
  }
}

// Get failed login patterns
export async function getFailedLoginPatterns(session: SessionData, days = 7): Promise<FailedLoginPattern[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString();

  const query = `
    SELECT SourceIp, CountryIso, UserId, LoginTime, Status
    FROM LoginHistory
    WHERE LoginTime >= ${sinceStr}
    ORDER BY SourceIp, LoginTime DESC
    LIMIT 1000
  `;

  try {
    const result = await soqlQuery<{
      SourceIp: string;
      CountryIso: string | null;
      UserId: string;
      LoginTime: string;
      Status: string;
    }>(session, query);

    // Filter for failed logins and group by IP
    const ipPatterns = new Map<string, {
      country: string | null;
      failCount: number;
      lastAttempt: string;
      targetUsers: Set<string>;
    }>();

    for (const login of result.records) {
      if (login.Status !== 'Success') {
        const existing = ipPatterns.get(login.SourceIp);
        if (existing) {
          existing.failCount++;
          existing.targetUsers.add(login.UserId);
          if (login.LoginTime > existing.lastAttempt) {
            existing.lastAttempt = login.LoginTime;
          }
        } else {
          ipPatterns.set(login.SourceIp, {
            country: login.CountryIso,
            failCount: 1,
            lastAttempt: login.LoginTime,
            targetUsers: new Set([login.UserId])
          });
        }
      }
    }

    // Convert to array and filter for patterns with 3+ failures
    const patterns: FailedLoginPattern[] = [];
    for (const [sourceIp, data] of ipPatterns) {
      if (data.failCount >= 3) {
        patterns.push({
          sourceIp,
          country: data.country,
          failCount: data.failCount,
          lastAttempt: data.lastAttempt,
          targetUsers: Array.from(data.targetUsers).slice(0, 5)
        });
      }
    }

    return patterns.sort((a, b) => b.failCount - a.failCount).slice(0, 20);
  } catch (err) {
    console.error('Failed to get failed login patterns:', err);
    return [];
  }
}

// Get all anomalies data
export async function getAnomaliesData(session: SessionData, days = 7): Promise<AnomaliesData> {
  const [concurrentSessions, loginAnomalies, failedLoginPatterns] = await Promise.all([
    getConcurrentSessions(session),
    getLoginAnomalies(session, days),
    getFailedLoginPatterns(session, days)
  ]);

  return {
    concurrentSessions,
    loginAnomalies,
    failedLoginPatterns,
    summary: {
      usersWithConcurrentSessions: concurrentSessions.length,
      totalAnomalies: loginAnomalies.length,
      suspiciousIps: failedLoginPatterns.length
    }
  };
}

// ------ CONFIG HEALTH PAGE ------

// Get security health check (REST API endpoint)
export async function getSecurityHealthCheck(session: SessionData): Promise<SecurityHealthCheck | null> {
  try {
    // Try the Security Health Check REST endpoint
    const result = await salesforceRequest<SalesforceQueryResult<SecurityHealthCheckRisk>>(
      session,
      '/services/data/v59.0/tooling/query?q=' +
        encodeURIComponent('SELECT RiskType, Setting, OrgValue, StandardValue FROM SecurityHealthCheckRisks')
    );

    // If we get risks, calculate the score
    if (result.records && result.records.length > 0) {
      const risks = result.records;
      const highRisks = risks.filter(r => r.RiskType === 'HIGH_RISK').length;
      const mediumRisks = risks.filter(r => r.RiskType === 'MEDIUM_RISK').length;
      const lowRisks = risks.filter(r => r.RiskType === 'LOW_RISK' || r.RiskType === 'INFORMATIONAL').length;

      // Simple score calculation: 100 - (high*10 + medium*5 + low*1)
      const score = Math.max(0, 100 - (highRisks * 10 + mediumRisks * 5 + lowRisks * 1));

      return {
        score,
        totalRisks: risks.length,
        highRisks,
        mediumRisks,
        lowRisks,
        risks
      };
    }

    return null;
  } catch (err) {
    console.error('Failed to get security health check:', err);
    return null;
  }
}

// Get MFA coverage
export async function getMfaCoverage(session: SessionData): Promise<MfaCoverage> {
  try {
    // Get total active users
    const totalQuery = `SELECT COUNT(Id) FROM User WHERE IsActive = true`;
    const totalResult = await soqlQuery<{ expr0: number }>(session, totalQuery);
    const totalUsers = totalResult.records[0]?.expr0 || 0;

    // Try to get users with MFA enabled through permission sets
    // This is an approximation since MFA status can be complex
    const mfaQuery = `
      SELECT COUNT(Id) FROM PermissionSetAssignment
      WHERE PermissionSet.Name LIKE '%MFA%' OR PermissionSet.Name LIKE '%TwoFactor%'
    `;
    let mfaEnabled = 0;
    try {
      const mfaResult = await soqlQuery<{ expr0: number }>(session, mfaQuery);
      mfaEnabled = mfaResult.records[0]?.expr0 || 0;
    } catch {
      // MFA query might fail, that's okay
    }

    return {
      totalUsers,
      mfaEnabled,
      mfaNotEnabled: totalUsers - mfaEnabled,
      percentage: totalUsers > 0 ? Math.round((mfaEnabled / totalUsers) * 100) : 0
    };
  } catch (err) {
    console.error('Failed to get MFA coverage:', err);
    return { totalUsers: 0, mfaEnabled: 0, mfaNotEnabled: 0, percentage: 0 };
  }
}

// Get expiring certificates (Tooling API)
export async function getExpiringCertificates(session: SessionData): Promise<Certificate[]> {
  try {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const result = await salesforceRequest<SalesforceQueryResult<Certificate>>(
      session,
      '/services/data/v59.0/tooling/query?q=' +
        encodeURIComponent(`SELECT Id, DeveloperName, MasterLabel, ExpirationDate FROM Certificate ORDER BY ExpirationDate LIMIT 20`)
    );

    return (result.records || []).map(cert => ({
      ...cert,
      IsExpired: new Date(cert.ExpirationDate) < new Date()
    }));
  } catch (err) {
    console.error('Failed to get certificates:', err);
    return [];
  }
}

// Get all config health data
export async function getConfigHealthData(session: SessionData): Promise<ConfigHealthData> {
  // Use org-specific cache key
  const cacheKey = `configHealth:${session.userInfo.organizationId}`;
  const cached = getCached<ConfigHealthData>(cacheKey);
  if (cached) {
    return cached;
  }

  const [securityHealthCheck, mfaCoverage, expiringCerts] = await Promise.all([
    getSecurityHealthCheck(session),
    getMfaCoverage(session),
    getExpiringCertificates(session)
  ]);

  // Calculate overall score based on available data
  let overallScore = 50; // Default
  if (securityHealthCheck) {
    overallScore = securityHealthCheck.score;
  }

  // Adjust score based on MFA coverage
  if (mfaCoverage.percentage < 50) {
    overallScore = Math.max(0, overallScore - 20);
  } else if (mfaCoverage.percentage >= 80) {
    overallScore = Math.min(100, overallScore + 10);
  }

  // Adjust for expiring certs
  const expiredOrExpiring = expiringCerts.filter(c => c.IsExpired || new Date(c.ExpirationDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  if (expiredOrExpiring.length > 0) {
    overallScore = Math.max(0, overallScore - expiredOrExpiring.length * 5);
  }

  const result = {
    securityHealthCheck,
    mfaCoverage,
    expiringCerts,
    overallScore: Math.round(overallScore)
  };

  setCache(cacheKey, result);
  return result;
}

// ------ DATA ACCESS PAGE ------

// Get data-related audit events
export async function getDataAuditEvents(session: SessionData, limit = 50): Promise<DataAuditEvent[]> {
  // Note: Section field cannot be filtered in SOQL, so we fetch all and filter in JS
  const query = `
    SELECT Id, Action, Section, CreatedDate, CreatedBy.Name, Display, DelegateUser
    FROM SetupAuditTrail
    ORDER BY CreatedDate DESC
    LIMIT 500
  `;
  try {
    const result = await soqlQuery<DataAuditEvent>(session, query);
    // Filter for security and data-related sections in JavaScript
    const dataRelatedSections = [
      // Data access and sharing
      'Sharing Rules', 'Sharing Settings', 'Field Level Security',
      'Data Export', 'Data Management', 'Record Type',
      // Objects and schema
      'Custom Object', 'Custom Field', 'Validation Rules',
      'Page Layouts', 'Workflow Rules', 'Process Builder',
      // Security and permissions
      'Permission Sets', 'Profiles', 'Roles', 'Groups',
      'Login Access Policies', 'Password Policies', 'Session Settings',
      'Certificate and Key Management', 'Identity Provider',
      // Users and authentication
      'Users', 'Manage Users', 'Login History',
      'Connected Apps', 'Auth. Providers', 'Named Credentials',
      // API and integrations
      'Remote Site Settings', 'API', 'Apex Class',
      'Apex Trigger', 'Visualforce', 'Lightning',
      // Other security-relevant
      'Email Administration', 'Delegated Administration',
      'Company Information', 'Organization', 'Security Controls'
    ];
    const filtered = result.records.filter(r => dataRelatedSections.includes(r.Section));
    return filtered.slice(0, limit);
  } catch (err) {
    console.error('Failed to get data audit events:', err);
    return [];
  }
}

// Get guest/external users
export async function getGuestUsers(session: SessionData): Promise<GuestUser[]> {
  const query = `
    SELECT Id, Username, Name, UserType, Profile.Name, IsActive, LastLoginDate
    FROM User
    WHERE UserType IN ('Guest', 'CspLitePortal', 'CustomerSuccess', 'PowerCustomerSuccess', 'CsnOnly')
    ORDER BY LastLoginDate DESC NULLS LAST
    LIMIT 100
  `;
  try {
    const result = await soqlQuery<GuestUser>(session, query);
    return result.records;
  } catch (err) {
    console.error('Failed to get guest users:', err);
    return [];
  }
}

// Get sharing rules summary (approximation from SetupAuditTrail)
export async function getSharingRulesSummary(session: SessionData): Promise<SharingRuleSummary[]> {
  // We can't directly query sharing rules, so this returns an empty summary
  // In a real implementation, you might use Metadata API
  return [];
}

// Get all data access data
export async function getDataAccessData(session: SessionData): Promise<DataAccessData> {
  const [auditEvents, guestUsers, sharingRules] = await Promise.all([
    getDataAuditEvents(session),
    getGuestUsers(session),
    getSharingRulesSummary(session)
  ]);

  const activeGuestUsers = guestUsers.filter(u => u.IsActive).length;

  return {
    auditEvents,
    guestUsers,
    sharingRules,
    summary: {
      totalGuestUsers: guestUsers.length,
      activeGuestUsers,
      recentDataChanges: auditEvents.length
    }
  };
}

// ------ USER RISK SCORING ------

export interface UserRiskScore {
  userId: string;
  username: string;
  name: string;
  email: string;
  profile: string | null;
  isActive: boolean;
  riskScore: number; // 0-100, higher = more risk
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  riskFactors: RiskFactor[];
  lastLoginDate: string | null;
}

export interface RiskFactor {
  factor: string;
  description: string;
  points: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

interface UserWithPermissions {
  Id: string;
  Username: string;
  Name: string;
  Email: string;
  IsActive: boolean;
  Profile: { Name: string; PermissionsModifyAllData: boolean; PermissionsViewAllData: boolean; PermissionsAuthorApex: boolean } | null;
  LastLoginDate: string | null;
  LastPasswordChangeDate: string | null;
  CreatedDate: string;
}

interface PermissionSetAssignmentWithPerms {
  AssigneeId: string;
  PermissionSet: {
    Name: string;
    PermissionsModifyAllData: boolean;
    PermissionsViewAllData: boolean;
    PermissionsAuthorApex: boolean;
    PermissionsManageUsers: boolean;
    PermissionsApiEnabled: boolean;
  };
}

export async function getUserRiskScores(session: SessionData): Promise<UserRiskScore[]> {
  const cacheKey = `userRiskScores:${session.userInfo.organizationId}`;
  const cached = getCached<UserRiskScore[]>(cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch users with profile - we'll query profile permissions separately if needed
  const usersQuery = `
    SELECT Id, Username, Name, Email, IsActive, LastLoginDate, LastPasswordChangeDate, CreatedDate,
           Profile.Name
    FROM User
    WHERE IsActive = true AND UserType = 'Standard'
    ORDER BY Name
    LIMIT 500
  `;

  // Fetch profile permissions separately
  const profilePermissionsQuery = `
    SELECT Id, Name, PermissionsModifyAllData, PermissionsViewAllData, PermissionsAuthorApex
    FROM Profile
    WHERE PermissionsModifyAllData = true OR PermissionsViewAllData = true OR PermissionsAuthorApex = true
  `;

  // Fetch permission set assignments with dangerous permissions
  const permSetQuery = `
    SELECT AssigneeId, PermissionSet.Name, PermissionSet.PermissionsModifyAllData,
           PermissionSet.PermissionsViewAllData, PermissionSet.PermissionsAuthorApex,
           PermissionSet.PermissionsManageUsers, PermissionSet.PermissionsApiEnabled
    FROM PermissionSetAssignment
    WHERE PermissionSet.IsOwnedByProfile = false
  `;

  // Fetch failed logins in last 7 days
  const failedLoginsQuery = `
    SELECT UserId, COUNT(Id)
    FROM LoginHistory
    WHERE Status != 'Success' AND LoginTime >= LAST_N_DAYS:7
    GROUP BY UserId
  `;

  // Fetch login count by user (to detect inactive users)
  const loginCountQuery = `
    SELECT UserId, COUNT(Id)
    FROM LoginHistory
    WHERE LoginTime >= LAST_N_DAYS:30
    GROUP BY UserId
  `;

  try {
    // Run queries with fallbacks for non-critical data
    interface SimpleUser {
      Id: string;
      Username: string;
      Name: string;
      Email: string;
      IsActive: boolean;
      LastLoginDate: string | null;
      LastPasswordChangeDate: string | null;
      CreatedDate: string;
      Profile: { Name: string } | null;
    }

    interface ProfilePerms {
      Id: string;
      Name: string;
      PermissionsModifyAllData: boolean;
      PermissionsViewAllData: boolean;
      PermissionsAuthorApex: boolean;
    }

    const usersResult = await soqlQuery<SimpleUser>(session, usersQuery);

    let profilePermsResult: { records: ProfilePerms[] } = { records: [] };
    let permSetResult: { records: PermissionSetAssignmentWithPerms[] } = { records: [] };
    let failedLoginsResult: { records: { UserId: string; expr0: number }[] } = { records: [] };
    let loginCountResult: { records: { UserId: string; expr0: number }[] } = { records: [] };

    try {
      profilePermsResult = await soqlQuery<ProfilePerms>(session, profilePermissionsQuery);
    } catch (e) {
      console.warn('Could not fetch profile permissions:', e);
    }

    try {
      permSetResult = await soqlQuery<PermissionSetAssignmentWithPerms>(session, permSetQuery);
    } catch (e) {
      console.warn('Could not fetch permission set assignments:', e);
    }

    try {
      failedLoginsResult = await soqlQuery<{ UserId: string; expr0: number }>(session, failedLoginsQuery);
    } catch (e) {
      console.warn('Could not fetch failed logins:', e);
    }

    try {
      loginCountResult = await soqlQuery<{ UserId: string; expr0: number }>(session, loginCountQuery);
    } catch (e) {
      console.warn('Could not fetch login counts:', e);
    }

    // Build lookup maps
    const profilePermsByName = new Map<string, ProfilePerms>();
    for (const prof of profilePermsResult.records) {
      profilePermsByName.set(prof.Name, prof);
    }

    const permSetsByUser = new Map<string, PermissionSetAssignmentWithPerms[]>();
    for (const psa of permSetResult.records) {
      const existing = permSetsByUser.get(psa.AssigneeId) || [];
      existing.push(psa);
      permSetsByUser.set(psa.AssigneeId, existing);
    }

    const failedLoginsByUser = new Map<string, number>();
    for (const fl of failedLoginsResult.records) {
      failedLoginsByUser.set(fl.UserId, fl.expr0);
    }

    const loginCountByUser = new Map<string, number>();
    for (const lc of loginCountResult.records) {
      loginCountByUser.set(lc.UserId, lc.expr0);
    }

    // Known admin profile names (expected to have elevated permissions)
    const adminProfileNames = new Set([
      'System Administrator',
      'システム管理者', // Japanese
      'Administrateur système', // French
      'Systemadministrator', // German
    ]);

    // Calculate risk scores - focus on anomalies and hygiene, not just having permissions
    const riskScores: UserRiskScore[] = usersResult.records.map(user => {
      const riskFactors: RiskFactor[] = [];
      let riskScore = 0;

      // Get profile permissions for this user
      const profileName = user.Profile?.Name || '';
      const profilePerms = profileName ? profilePermsByName.get(profileName) : null;
      const isAdminProfile = adminProfileNames.has(profileName);

      // Determine if user has privileged access (for context)
      const hasProfilePrivileges = profilePerms?.PermissionsModifyAllData ||
                                    profilePerms?.PermissionsViewAllData ||
                                    profilePerms?.PermissionsAuthorApex;

      const userPermSets = permSetsByUser.get(user.Id) || [];
      const hasPermSetPrivileges = userPermSets.some(psa =>
        psa.PermissionSet.PermissionsModifyAllData ||
        psa.PermissionSet.PermissionsManageUsers
      );

      const isPrivileged = hasProfilePrivileges || hasPermSetPrivileges;

      // Get activity data
      const failedLogins = failedLoginsByUser.get(user.Id) || 0;
      const loginCount = loginCountByUser.get(user.Id) || 0;
      const daysSincePasswordChange = user.LastPasswordChangeDate
        ? Math.floor((Date.now() - new Date(user.LastPasswordChangeDate).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      // ===========================================
      // RISK SCORING - Focus on actual risk indicators
      // ===========================================

      // 1. Dormant privileged account (highest risk - attack vector)
      if (isPrivileged && loginCount === 0) {
        riskFactors.push({
          factor: 'Dormant Privileged Account',
          description: 'Privileged account with no logins in 30 days',
          points: 35,
          severity: 'critical'
        });
        riskScore += 35;
      }

      // 2. Failed logins on privileged account (possible brute force target)
      if (isPrivileged && failedLogins >= 3) {
        riskFactors.push({
          factor: 'Failed Logins (Privileged)',
          description: `${failedLogins} failed attempts on privileged account`,
          points: 25,
          severity: 'high'
        });
        riskScore += 25;
      }

      // 3. Old password on privileged account
      if (isPrivileged && daysSincePasswordChange && daysSincePasswordChange > 180) {
        riskFactors.push({
          factor: 'Old Password (Privileged)',
          description: `Password unchanged for ${daysSincePasswordChange} days on privileged account`,
          points: 20,
          severity: 'high'
        });
        riskScore += 20;
      }

      // 4. Non-admin profile with elevated permission sets (unexpected privilege)
      if (!isAdminProfile && hasPermSetPrivileges) {
        const elevatedPermSets = userPermSets
          .filter(psa => psa.PermissionSet.PermissionsModifyAllData || psa.PermissionSet.PermissionsManageUsers)
          .map(psa => psa.PermissionSet.Name);

        riskFactors.push({
          factor: 'Unexpected Elevated Permissions',
          description: `Non-admin with elevated access via: ${elevatedPermSets.join(', ')}`,
          points: 25,
          severity: 'high'
        });
        riskScore += 25;
      }

      // 5. Failed logins on any account (lower priority)
      if (!isPrivileged && failedLogins >= 5) {
        riskFactors.push({
          factor: 'Multiple Failed Logins',
          description: `${failedLogins} failed login attempts in last 7 days`,
          points: 10,
          severity: 'medium'
        });
        riskScore += 10;
      }

      // 6. Old password on any account (minor hygiene issue)
      if (!isPrivileged && daysSincePasswordChange && daysSincePasswordChange > 180) {
        riskFactors.push({
          factor: 'Old Password',
          description: `Password unchanged for ${daysSincePasswordChange} days`,
          points: 5,
          severity: 'low'
        });
        riskScore += 5;
      }

      // 7. Never logged in (might indicate orphan account)
      if (!user.LastLoginDate) {
        riskFactors.push({
          factor: 'Never Logged In',
          description: 'Account has never been used',
          points: isPrivileged ? 15 : 5,
          severity: isPrivileged ? 'high' : 'low'
        });
        riskScore += isPrivileged ? 15 : 5;
      }

      // Determine risk level
      let riskLevel: 'critical' | 'high' | 'medium' | 'low';
      if (riskScore >= 40) {
        riskLevel = 'critical';
      } else if (riskScore >= 25) {
        riskLevel = 'high';
      } else if (riskScore >= 10) {
        riskLevel = 'medium';
      } else {
        riskLevel = 'low';
      }

      return {
        userId: user.Id,
        username: user.Username,
        name: user.Name,
        email: user.Email,
        profile: user.Profile?.Name || null,
        isActive: user.IsActive,
        riskScore: Math.min(riskScore, 100),
        riskLevel,
        riskFactors,
        lastLoginDate: user.LastLoginDate
      };
    });

    // Sort by risk score descending
    riskScores.sort((a, b) => b.riskScore - a.riskScore);

    setCache(cacheKey, riskScores);
    return riskScores;
  } catch (err) {
    console.error('Failed to calculate user risk scores:', err);
    throw err;
  }
}
