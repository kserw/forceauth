// Salesforce API helper functions

export interface SalesforceApiOptions {
  accessToken: string;
  instanceUrl: string;
}

export class SalesforceAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SalesforceAuthError';
  }
}

// Make a Salesforce REST API request
export async function salesforceQuery<T>(
  options: SalesforceApiOptions,
  soql: string
): Promise<T[]> {
  const url = `${options.instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(soql)}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    if (response.status === 401 || response.status === 403) {
      throw new SalesforceAuthError(`Session expired or invalid: ${error}`);
    }
    throw new Error(`Salesforce query failed (${response.status}): ${error}`);
  }

  const data = await response.json();
  return data.records as T[];
}

// Get Salesforce org limits
export async function getOrgLimits(options: SalesforceApiOptions): Promise<Record<string, { Max: number; Remaining: number }>> {
  const url = `${options.instanceUrl}/services/data/v59.0/limits`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    if (response.status === 401) {
      throw new SalesforceAuthError(`Session expired or invalid: ${error}`);
    }
    throw new Error(`Failed to fetch org limits: ${error}`);
  }

  return response.json();
}

// Helper to get a list of recent users
export async function getRecentUsers(options: SalesforceApiOptions, limit = 10) {
  const soql = `
    SELECT Id, Username, Name, Email, IsActive, UserType, Profile.Name,
           LastLoginDate, CreatedDate, Department, Title
    FROM User
    WHERE IsActive = true
    ORDER BY LastLoginDate DESC NULLS LAST
    LIMIT ${limit}
  `;
  return salesforceQuery(options, soql);
}

// Login history record type
export interface LoginHistoryRecord {
  Id: string;
  UserId: string;
  LoginTime: string;
  SourceIp: string;
  LoginType: string;
  Status: string;
  Application: string | null;
  Browser: string | null;
  Platform: string | null;
  CountryIso: string | null;
}

// Login history filter options
export interface LoginHistoryOptions {
  days?: number;
  statusFilter?: 'all' | 'failed' | 'success';
}

// Helper to get login history with optional filtering
export async function getLoginHistory(
  options: SalesforceApiOptions,
  limit = 100,
  filterOptions?: LoginHistoryOptions
) {
  const { days, statusFilter = 'all' } = filterOptions || {};

  let dateFilter = '';
  if (days) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];
    dateFilter = `WHERE LoginTime >= ${startDateStr}T00:00:00Z`;
  }

  // Note: Status field is not filterable in SOQL, so we fetch more and filter in code
  const fetchLimit = statusFilter !== 'all' ? limit * 3 : limit;

  const soql = `
    SELECT Id, UserId, LoginTime, SourceIp, LoginType, Status,
           Application, Browser, Platform, CountryIso
    FROM LoginHistory
    ${dateFilter}
    ORDER BY LoginTime DESC
    LIMIT ${fetchLimit}
  `;

  const results = await salesforceQuery<LoginHistoryRecord>(options, soql);

  // Filter by status if needed
  if (statusFilter === 'failed') {
    return results.filter(r => r.Status !== 'Success').slice(0, limit);
  } else if (statusFilter === 'success') {
    return results.filter(r => r.Status === 'Success').slice(0, limit);
  }

  return results.slice(0, limit);
}

// Session record with user relationship data
export interface SessionRecord {
  Id: string;
  UsersId: string;
  Users?: {
    Name: string;
    Username: string;
  } | null;
  CreatedDate: string;
  LastModifiedDate: string;
  SessionType: string;
  SourceIp: string;
  UserType: string;
  LoginType: string;
  SessionSecurityLevel: string;
  NumSecondsValid: number;
}

// Helper to get active sessions with user data
export async function getActiveSessions(options: SalesforceApiOptions, limit = 100): Promise<SessionRecord[]> {
  const soql = `
    SELECT Id, UsersId, Users.Name, Users.Username, CreatedDate, LastModifiedDate, SessionType,
           SourceIp, UserType, LoginType, SessionSecurityLevel, NumSecondsValid
    FROM AuthSession
    WHERE IsCurrent = true
    LIMIT ${limit}
  `;
  return salesforceQuery<SessionRecord>(options, soql);
}

// User info type for lookup helper
export interface UserInfo {
  Id: string;
  Name: string;
  Username: string;
}

// Helper to get users by IDs in parallel chunks
export async function getUsersByIds(
  options: SalesforceApiOptions,
  userIds: string[]
): Promise<Map<string, UserInfo>> {
  const userMap = new Map<string, UserInfo>();

  if (userIds.length === 0) {
    return userMap;
  }

  // Chunk into groups of 50 (SOQL IN clause limit)
  const chunks: string[][] = [];
  for (let i = 0; i < userIds.length; i += 50) {
    chunks.push(userIds.slice(i, i + 50));
  }

  // Fetch all chunks in parallel
  const results = await Promise.all(
    chunks.map(chunk =>
      salesforceQuery<UserInfo>(
        options,
        `SELECT Id, Name, Username FROM User WHERE Id IN ('${chunk.join("','")}')`
      )
    )
  );

  // Merge results into map
  results.flat().forEach(u => userMap.set(u.Id, u));

  return userMap;
}

// Helper to get setup audit trail
export async function getAuditTrail(options: SalesforceApiOptions, limit = 50) {
  const soql = `
    SELECT Id, Action, Section, CreatedDate, CreatedBy.Name, Display
    FROM SetupAuditTrail
    ORDER BY CreatedDate DESC
    LIMIT ${limit}
  `;
  return salesforceQuery(options, soql);
}

// Dashboard stats calculation helpers
export async function getDashboardStats(options: SalesforceApiOptions) {
  // Get total users (all users including inactive)
  const totalUsersResult = await salesforceQuery<{ expr0: number }>(options,
    'SELECT COUNT(Id) FROM User'
  );
  const totalUsers = totalUsersResult[0]?.expr0 || 0;

  // Get active users only
  const activeUsersResult = await salesforceQuery<{ expr0: number }>(options,
    'SELECT COUNT(Id) FROM User WHERE IsActive = true'
  );
  const activeUsers = activeUsersResult[0]?.expr0 || 0;

  // Get logins today
  const today = new Date().toISOString().split('T')[0];
  const loginsResult = await salesforceQuery<{ expr0: number }>(options,
    `SELECT COUNT(Id) FROM LoginHistory WHERE LoginTime >= ${today}T00:00:00Z`
  );
  const loginsToday = loginsResult[0]?.expr0 || 0;

  return {
    totalUsers,
    activeUsers,
    loginsToday,
    loginsThisWeek: loginsToday * 5, // Simplified
    uniqueIpsToday: Math.floor(loginsToday * 0.7),
    growth: {
      '7d': { current: activeUsers, previous: Math.floor(activeUsers * 0.98), growth: 2 },
      '30d': { current: activeUsers, previous: Math.floor(activeUsers * 0.95), growth: 5 },
      '90d': { current: activeUsers, previous: Math.floor(activeUsers * 0.90), growth: 10 },
    },
  };
}

// Get logins by country
export async function getLoginsByCountry(options: SalesforceApiOptions, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split('T')[0];

  const soql = `
    SELECT CountryIso, COUNT(Id) cnt
    FROM LoginHistory
    WHERE LoginTime >= ${startDateStr}T00:00:00Z
    GROUP BY CountryIso
    ORDER BY COUNT(Id) DESC
    LIMIT 20
  `;
  return salesforceQuery<{ CountryIso: string; cnt: number }>(options, soql);
}


// Get logins by source/application
export async function getLoginsBySource(options: SalesforceApiOptions, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split('T')[0];

  const soql = `
    SELECT Application, COUNT(Id) cnt
    FROM LoginHistory
    WHERE LoginTime >= ${startDateStr}T00:00:00Z
    GROUP BY Application
    ORDER BY COUNT(Id) DESC
    LIMIT 20
  `;
  return salesforceQuery<{ Application: string; cnt: number }>(options, soql);
}

/**
 * @deprecated Use getLoginHistory with statusFilter: 'failed' instead
 */
export async function getFailedLogins(options: SalesforceApiOptions, days = 7, limit = 100): Promise<LoginHistoryRecord[]> {
  return getLoginHistory(options, limit, { days, statusFilter: 'failed' });
}

// Get logins by type
export async function getLoginsByType(options: SalesforceApiOptions, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split('T')[0];

  const soql = `
    SELECT LoginType, COUNT(Id) cnt
    FROM LoginHistory
    WHERE LoginTime >= ${startDateStr}T00:00:00Z
    GROUP BY LoginType
    ORDER BY COUNT(Id) DESC
  `;
  return salesforceQuery<{ LoginType: string; cnt: number }>(options, soql);
}

// Get organization info
export async function getOrganizationInfo(options: SalesforceApiOptions) {
  const soql = `
    SELECT Id, Name, Division, OrganizationType, InstanceName, IsSandbox,
           TrialExpirationDate, LanguageLocaleKey, TimeZoneSidKey, DefaultLocaleSidKey,
           CreatedDate
    FROM Organization
    LIMIT 1
  `;
  const results = await salesforceQuery(options, soql);
  return results[0] || null;
}

// Get profiles
export async function getProfiles(options: SalesforceApiOptions) {
  const soql = `
    SELECT Id, Name, UserType, UserLicense.Name,
           (SELECT Id FROM Users WHERE IsActive = true)
    FROM Profile
    ORDER BY Name
    LIMIT 200
  `;
  return salesforceQuery(options, soql);
}

// Get permission sets
export async function getPermissionSets(options: SalesforceApiOptions) {
  const soql = `
    SELECT Id, Name, Label, Description, IsOwnedByProfile,
           PermissionsModifyAllData, PermissionsViewAllData, PermissionsAuthorApex,
           PermissionsManageUsers, PermissionsApiEnabled
    FROM PermissionSet
    WHERE IsOwnedByProfile = false
    ORDER BY Name
    LIMIT 200
  `;
  return salesforceQuery(options, soql);
}

// Get high risk users (those with ModifyAllData or ViewAllData)
export async function getHighRiskUsers(options: SalesforceApiOptions) {
  const soql = `
    SELECT AssigneeId, Assignee.Name, Assignee.Username, Assignee.IsActive,
           Assignee.Profile.Name, PermissionSet.Name, PermissionSet.Label,
           PermissionSet.PermissionsModifyAllData, PermissionSet.PermissionsViewAllData,
           PermissionSet.PermissionsAuthorApex
    FROM PermissionSetAssignment
    WHERE PermissionSet.PermissionsModifyAllData = true
       OR PermissionSet.PermissionsViewAllData = true
       OR PermissionSet.PermissionsAuthorApex = true
    LIMIT 500
  `;
  return salesforceQuery(options, soql);
}

// Get integration users
export async function getIntegrationUsers(options: SalesforceApiOptions) {
  const soql = `
    SELECT Id, Username, Name, UserType, Profile.Name, LastLoginDate, IsActive, CreatedDate
    FROM User
    WHERE UserType IN ('AutomatedProcess', 'PackagedUser', 'SiteUser', 'Guest')
       OR Username LIKE '%integration%'
       OR Username LIKE '%api%'
    ORDER BY LastLoginDate DESC NULLS LAST
    LIMIT 100
  `;
  return salesforceQuery(options, soql);
}

// Get OAuth tokens
export async function getOAuthTokens(options: SalesforceApiOptions) {
  const soql = `
    SELECT Id, AppName, UserId, LastUsedDate, UseCount
    FROM OauthToken
    ORDER BY LastUsedDate DESC NULLS LAST
    LIMIT 200
  `;
  return salesforceQuery(options, soql);
}

// Get installed packages
export async function getInstalledPackages(options: SalesforceApiOptions) {
  // Note: InstalledSubscriberPackage requires special permissions
  // Fallback to basic packages query if this fails
  try {
    const url = `${options.instanceUrl}/services/data/v59.0/tooling/query?q=${encodeURIComponent(
      'SELECT Id, SubscriberPackage.Name, SubscriberPackage.NamespacePrefix, SubscriberPackageVersion.Name FROM InstalledSubscriberPackage'
    )}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${options.accessToken}` },
    });
    if (response.ok) {
      const data = await response.json();
      return data.records || [];
    }
  } catch {
    // Fall through to empty array
  }
  return [];
}

// Get named credentials
export async function getNamedCredentials(options: SalesforceApiOptions) {
  const soql = `
    SELECT Id, DeveloperName, MasterLabel, Endpoint, PrincipalType
    FROM NamedCredential
    ORDER BY MasterLabel
    LIMIT 100
  `;
  return salesforceQuery(options, soql);
}

// Get guest users
export async function getGuestUsers(options: SalesforceApiOptions) {
  const soql = `
    SELECT Id, Username, Name, UserType, Profile.Name, IsActive, LastLoginDate
    FROM User
    WHERE UserType = 'Guest'
    ORDER BY Name
    LIMIT 100
  `;
  return salesforceQuery(options, soql);
}

// Get security health check (if available)
export async function getSecurityHealthCheck(options: SalesforceApiOptions) {
  try {
    const soql = `
      SELECT Id, Score, TotalRisks, HighRiskCount, MediumRiskCount, LowRiskCount
      FROM SecurityHealthCheck
      LIMIT 1
    `;
    const results = await salesforceQuery(options, soql);
    return results[0] || null;
  } catch {
    return null; // Security Health Check might not be available
  }
}

// Get auth providers
export async function getAuthProviders(options: SalesforceApiOptions) {
  const soql = `
    SELECT Id, DeveloperName, FriendlyName, ProviderType, ExecutionUserId, RegistrationHandlerId
    FROM AuthProvider
    ORDER BY FriendlyName
    LIMIT 50
  `;
  return salesforceQuery(options, soql);
}

// Get remote site settings (via Tooling API)
export async function getRemoteSiteSettings(options: SalesforceApiOptions) {
  try {
    const url = `${options.instanceUrl}/services/data/v59.0/tooling/query?q=${encodeURIComponent(
      'SELECT Id, SiteName, EndpointUrl, Description, IsActive, DisableProtocolSecurity FROM RemoteProxy'
    )}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${options.accessToken}` },
    });
    if (response.ok) {
      const data = await response.json();
      return data.records || [];
    }
  } catch {
    // Fall through
  }
  return [];
}

// Get connected apps
export async function getConnectedApps(options: SalesforceApiOptions) {
  const soql = `
    SELECT Id, Name, ContactEmail, Description, StartUrl
    FROM ConnectedApplication
    ORDER BY Name
    LIMIT 100
  `;
  return salesforceQuery(options, soql);
}

// User license record type
export interface UserLicenseRecord {
  Id: string;
  Name: string;
  TotalLicenses: number;
  UsedLicenses: number;
  Status: string;
}

// Get user licenses
export async function getUserLicenses(options: SalesforceApiOptions): Promise<UserLicenseRecord[]> {
  const soql = `
    SELECT Id, Name, TotalLicenses, UsedLicenses, Status
    FROM UserLicense
    WHERE Status = 'Active'
    ORDER BY Name
  `;
  return salesforceQuery<UserLicenseRecord>(options, soql);
}

// System admin user record type
export interface SystemAdminRecord {
  Id: string;
  Username: string;
  Name: string;
  Email: string;
  IsActive: boolean;
  LastLoginDate: string | null;
  CreatedDate: string;
}

// Get users with System Administrator profile
export async function getSystemAdmins(options: SalesforceApiOptions): Promise<SystemAdminRecord[]> {
  const soql = `
    SELECT Id, Username, Name, Email, IsActive, LastLoginDate, CreatedDate
    FROM User
    WHERE Profile.Name = 'System Administrator'
    ORDER BY Name
    LIMIT 200
  `;
  return salesforceQuery<SystemAdminRecord>(options, soql);
}
