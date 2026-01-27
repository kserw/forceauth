import { Router, type Request, type Response } from 'express';
import { getSession } from '../services/tokenStore.js';
import {
  getUsers,
  getAllUsers,
  getLoginHistory,
  getUserLoginHistory,
  getSetupAuditTrail,
  getLoginStatsByCountry,
  getLoginStatsByCity,
  getLoginStatsBySource,
  getOrgLimits,
  getDashboardStats,
  getActiveSessions,
  getOrganization,
  getProfiles,
  getScheduledJobs,
  getAsyncApexJobs,
  getFailedLogins,
  getLoginsByType,
  getLoginsByHour,
  getLoginsByDay,
  getUserGrowth,
  getSecurityInsights,
  getComprehensiveDashboard,
  // New security dashboard functions
  getIntegrationsData,
  getPermissionsData,
  getAnomaliesData,
  getConfigHealthData,
  getDataAccessData,
  getUserRiskScores,
  getTokenRiskData,
  getRemoteSiteSettings,
  getAuthProviders,
  getApiUsageData,
} from '../services/salesforceApi.js';

const router = Router();

const COOKIE_NAME = 'forceauth_session';

// Middleware to require authentication
function requireAuth(req: Request, res: Response, next: () => void) {
  const sessionId = req.cookies[COOKIE_NAME];
  if (!sessionId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const session = getSession(sessionId);
  if (!session) {
    res.status(401).json({ error: 'Session expired' });
    return;
  }

  // Attach session to request for use in handlers
  (req as Request & { session: typeof session }).session = session;
  next();
}

router.use(requireAuth);

// GET /api/salesforce/stats - Dashboard summary statistics
router.get('/stats', async (req: Request, res: Response) => {
  const session = (req as Request & { session: ReturnType<typeof getSession> }).session!;
  try {
    const stats = await getDashboardStats(session);
    res.json(stats);
  } catch (err) {
    console.error('Failed to get stats:', err);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// GET /api/salesforce/users - List users
router.get('/users', async (req: Request, res: Response) => {
  const session = (req as Request & { session: ReturnType<typeof getSession> }).session!;
  const all = req.query.all === 'true';
  const limit = parseInt(req.query.limit as string) || 100;

  try {
    const users = all
      ? await getAllUsers(session, limit)
      : await getUsers(session, limit);

    res.json({
      users: users.map((u) => ({
        id: u.Id,
        username: u.Username,
        name: u.Name,
        email: u.Email,
        isActive: u.IsActive,
        userType: u.UserType,
        profile: u.Profile?.Name || null,
        lastLoginDate: u.LastLoginDate,
        createdDate: u.CreatedDate,
        department: u.Department,
        title: u.Title,
        photoUrl: u.SmallPhotoUrl,
      })),
    });
  } catch (err) {
    console.error('Failed to get users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/salesforce/logins - Recent login history
router.get('/logins', async (req: Request, res: Response) => {
  const session = (req as Request & { session: ReturnType<typeof getSession> }).session!;
  const limit = parseInt(req.query.limit as string) || 100;
  const userId = req.query.userId as string | undefined;

  try {
    const logins = userId
      ? await getUserLoginHistory(session, userId, limit)
      : await getLoginHistory(session, limit);

    res.json({
      logins: logins.map((l) => ({
        id: l.Id,
        userId: l.UserId,
        loginTime: l.LoginTime,
        sourceIp: l.SourceIp,
        loginType: l.LoginType,
        status: l.Status,
        application: l.Application,
        browser: l.Browser,
        platform: l.Platform,
        country: l.CountryIso,
        city: l.City,
      })),
    });
  } catch (err) {
    console.error('Failed to get logins:', err);
    // Return empty array instead of 500 error
    res.json({ logins: [] });
  }
});

// GET /api/salesforce/logins/by-country - Login stats by country
router.get('/logins/by-country', async (req: Request, res: Response) => {
  const session = (req as Request & { session: ReturnType<typeof getSession> }).session!;
  const days = parseInt(req.query.days as string) || 30;

  try {
    const stats = await getLoginStatsByCountry(session, days);
    res.json({ stats });
  } catch (err) {
    console.error('Failed to get login stats by country:', err);
    res.status(500).json({ error: 'Failed to fetch login statistics' });
  }
});

// GET /api/salesforce/logins/by-city - Login stats by city
router.get('/logins/by-city', async (req: Request, res: Response) => {
  const session = (req as Request & { session: ReturnType<typeof getSession> }).session!;
  const days = parseInt(req.query.days as string) || 30;

  try {
    const stats = await getLoginStatsByCity(session, days);
    res.json({ stats });
  } catch (err) {
    console.error('Failed to get login stats by city:', err);
    res.status(500).json({ error: 'Failed to fetch login statistics' });
  }
});

// GET /api/salesforce/logins/by-source - Login stats by application/source
router.get('/logins/by-source', async (req: Request, res: Response) => {
  const session = (req as Request & { session: ReturnType<typeof getSession> }).session!;
  const days = parseInt(req.query.days as string) || 30;

  try {
    console.log('Fetching login stats by source...');
    const stats = await getLoginStatsBySource(session, days);
    console.log('Login stats by source result:', JSON.stringify(stats, null, 2));
    res.json({ stats });
  } catch (err) {
    console.error('Failed to get login stats by source:', err);
    res.status(500).json({ error: 'Failed to fetch login statistics' });
  }
});

// GET /api/salesforce/audit - Setup audit trail
router.get('/audit', async (req: Request, res: Response) => {
  const session = (req as Request & { session: ReturnType<typeof getSession> }).session!;
  const limit = parseInt(req.query.limit as string) || 50;

  try {
    const trail = await getSetupAuditTrail(session, limit);
    res.json({
      events: trail.map((e) => ({
        id: e.Id,
        action: e.Action,
        section: e.Section,
        createdDate: e.CreatedDate,
        createdBy: e.CreatedBy?.Name,
        display: e.Display,
      })),
    });
  } catch (err) {
    console.error('Failed to get audit trail:', err);
    res.status(500).json({ error: 'Failed to fetch audit trail' });
  }
});

// GET /api/salesforce/limits - Org limits
router.get('/limits', async (req: Request, res: Response) => {
  const session = (req as Request & { session: ReturnType<typeof getSession> }).session!;
  const all = req.query.all === 'true';

  try {
    const limits = await getOrgLimits(session);

    if (all) {
      res.json({ limits });
      return;
    }

    // Return a subset of important limits
    const importantLimits = [
      'DailyApiRequests',
      'DailyAsyncApexExecutions',
      'DailyBulkApiRequests',
      'DailyStreamingApiEvents',
      'DataStorageMB',
      'FileStorageMB',
      'HourlyODataCallout',
      'SingleEmail',
      'MassEmail',
      'ConcurrentAsyncGetReportInstances',
      'ConcurrentSyncReportRuns',
      'HourlyAsyncReportRuns',
      'HourlySyncReportRuns',
      'HourlyDashboardRefreshes',
      'HourlyDashboardStatuses',
    ];

    const filtered = Object.fromEntries(
      Object.entries(limits).filter(([key]) => importantLimits.includes(key))
    );

    res.json({ limits: filtered });
  } catch (err) {
    console.error('Failed to get limits:', err);
    res.status(500).json({ error: 'Failed to fetch org limits' });
  }
});

// GET /api/salesforce/sessions - Active sessions
router.get('/sessions', async (req: Request, res: Response) => {
  const session = (req as Request & { session: ReturnType<typeof getSession> }).session!;
  const limit = parseInt(req.query.limit as string) || 100;

  try {
    const sessions = await getActiveSessions(session, limit);
    res.json({
      sessions: sessions.map((s) => ({
        id: s.Id,
        userId: s.UsersId,
        userName: s.Users?.Name,
        userUsername: s.Users?.Username,
        createdDate: s.CreatedDate,
        lastModifiedDate: s.LastModifiedDate,
        sessionType: s.SessionType,
        sourceIp: s.SourceIp,
        userType: s.UserType,
        loginType: s.LoginType,
        securityLevel: s.SessionSecurityLevel,
        validSeconds: s.NumSecondsValid,
      })),
    });
  } catch (err) {
    console.error('Failed to get sessions:', err);
    res.status(500).json({ error: 'Failed to fetch active sessions' });
  }
});

// GET /api/salesforce/organization - Org info
router.get('/organization', async (req: Request, res: Response) => {
  const session = (req as Request & { session: ReturnType<typeof getSession> }).session!;

  try {
    const org = await getOrganization(session);
    if (!org) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }
    res.json({
      id: org.Id,
      name: org.Name,
      division: org.Division,
      type: org.OrganizationType,
      instance: org.InstanceName,
      isSandbox: org.IsSandbox,
      trialExpiration: org.TrialExpirationDate,
      language: org.LanguageLocaleKey,
      timezone: org.TimeZoneSidKey,
      locale: org.DefaultLocaleSidKey,
      createdDate: org.CreatedDate,
    });
  } catch (err) {
    console.error('Failed to get organization:', err);
    res.status(500).json({ error: 'Failed to fetch organization info' });
  }
});

// GET /api/salesforce/profiles - Profiles with user counts
router.get('/profiles', async (req: Request, res: Response) => {
  const session = (req as Request & { session: ReturnType<typeof getSession> }).session!;

  try {
    const profiles = await getProfiles(session);
    res.json({
      profiles: profiles.map((p) => ({
        id: p.Id,
        name: p.Name,
        userType: p.UserType,
        license: p.UserLicense?.Name,
        userCount: p.userCount,
      })),
    });
  } catch (err) {
    console.error('Failed to get profiles:', err);
    res.status(500).json({ error: 'Failed to fetch profiles' });
  }
});

// GET /api/salesforce/jobs/scheduled - Scheduled jobs
router.get('/jobs/scheduled', async (req: Request, res: Response) => {
  const session = (req as Request & { session: ReturnType<typeof getSession> }).session!;

  try {
    const jobs = await getScheduledJobs(session);
    res.json({
      jobs: jobs.map((j) => ({
        id: j.Id,
        name: j.CronJobDetail?.Name,
        jobType: j.CronJobDetail?.JobType,
        nextFireTime: j.NextFireTime,
        previousFireTime: j.PreviousFireTime,
        state: j.State,
        startTime: j.StartTime,
        endTime: j.EndTime,
        timesTriggered: j.TimesTriggered,
      })),
    });
  } catch (err) {
    console.error('Failed to get scheduled jobs:', err);
    res.status(500).json({ error: 'Failed to fetch scheduled jobs' });
  }
});

// GET /api/salesforce/jobs/async - Recent async apex jobs
router.get('/jobs/async', async (req: Request, res: Response) => {
  const session = (req as Request & { session: ReturnType<typeof getSession> }).session!;
  const limit = parseInt(req.query.limit as string) || 50;

  try {
    const jobs = await getAsyncApexJobs(session, limit);
    res.json({
      jobs: jobs.map((j) => ({
        id: j.Id,
        className: j.ApexClass?.Name,
        status: j.Status,
        jobType: j.JobType,
        createdDate: j.CreatedDate,
        completedDate: j.CompletedDate,
        numberOfErrors: j.NumberOfErrors,
        totalJobItems: j.TotalJobItems,
        jobItemsProcessed: j.JobItemsProcessed,
        createdBy: j.CreatedBy?.Name,
      })),
    });
  } catch (err) {
    console.error('Failed to get async jobs:', err);
    res.status(500).json({ error: 'Failed to fetch async apex jobs' });
  }
});

// GET /api/salesforce/logins/failed - Failed login attempts
router.get('/logins/failed', async (req: Request, res: Response) => {
  const session = (req as Request & { session: ReturnType<typeof getSession> }).session!;
  const days = parseInt(req.query.days as string) || 7;
  const limit = parseInt(req.query.limit as string) || 100;

  try {
    const logins = await getFailedLogins(session, days, limit);
    res.json({
      logins: logins.map((l) => ({
        id: l.Id,
        userId: l.UserId,
        loginTime: l.LoginTime,
        sourceIp: l.SourceIp,
        loginType: l.LoginType,
        status: l.Status,
        application: l.Application,
        browser: l.Browser,
        platform: l.Platform,
        country: l.CountryIso,
        city: l.City,
      })),
    });
  } catch (err) {
    console.error('Failed to get failed logins:', err);
    res.status(500).json({ error: 'Failed to fetch failed logins' });
  }
});

// GET /api/salesforce/logins/by-type - Login stats by type
router.get('/logins/by-type', async (req: Request, res: Response) => {
  const session = (req as Request & { session: ReturnType<typeof getSession> }).session!;
  const days = parseInt(req.query.days as string) || 30;

  try {
    const stats = await getLoginsByType(session, days);
    res.json({ stats });
  } catch (err) {
    console.error('Failed to get login stats by type:', err);
    res.status(500).json({ error: 'Failed to fetch login statistics' });
  }
});

// GET /api/salesforce/logins/by-hour - Login stats by hour
router.get('/logins/by-hour', async (req: Request, res: Response) => {
  const session = (req as Request & { session: ReturnType<typeof getSession> }).session!;
  const days = parseInt(req.query.days as string) || 7;

  try {
    const stats = await getLoginsByHour(session, days);
    res.json({ stats });
  } catch (err) {
    console.error('Failed to get login stats by hour:', err);
    res.status(500).json({ error: 'Failed to fetch login statistics' });
  }
});

// GET /api/salesforce/logins/by-day - Login stats by day
router.get('/logins/by-day', async (req: Request, res: Response) => {
  const session = (req as Request & { session: ReturnType<typeof getSession> }).session!;
  const days = parseInt(req.query.days as string) || 30;

  try {
    const stats = await getLoginsByDay(session, days);
    res.json({ stats });
  } catch (err) {
    console.error('Failed to get login stats by day:', err);
    res.status(500).json({ error: 'Failed to fetch login statistics' });
  }
});

// GET /api/salesforce/users/growth - User growth over time
router.get('/users/growth', async (req: Request, res: Response) => {
  const session = (req as Request & { session: ReturnType<typeof getSession> }).session!;
  const months = parseInt(req.query.months as string) || 6;

  try {
    const growth = await getUserGrowth(session, months);
    res.json({ growth });
  } catch (err) {
    console.error('Failed to get user growth:', err);
    res.status(500).json({ error: 'Failed to fetch user growth' });
  }
});

// GET /api/salesforce/security - Security insights
router.get('/security', async (req: Request, res: Response) => {
  const session = (req as Request & { session: ReturnType<typeof getSession> }).session!;

  try {
    const insights = await getSecurityInsights(session);
    res.json(insights);
  } catch (err) {
    console.error('Failed to get security insights:', err);
    res.status(500).json({ error: 'Failed to fetch security insights' });
  }
});

// GET /api/salesforce/dashboard - Comprehensive dashboard data
router.get('/dashboard', async (req: Request, res: Response) => {
  const session = (req as Request & { session: ReturnType<typeof getSession> }).session!;

  try {
    const dashboard = await getComprehensiveDashboard(session);
    res.json(dashboard);
  } catch (err) {
    console.error('Failed to get dashboard:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// ============================================================================
// NEW SECURITY DASHBOARD ENDPOINTS
// ============================================================================

// GET /api/salesforce/integrations - Integration users, OAuth tokens, packages, credentials
router.get('/integrations', async (req: Request, res: Response) => {
  const session = (req as Request & { session: ReturnType<typeof getSession> }).session!;

  try {
    const data = await getIntegrationsData(session);
    res.json({
      integrationUsers: data.integrationUsers.map(u => ({
        id: u.Id,
        username: u.Username,
        name: u.Name,
        userType: u.UserType,
        profile: u.Profile?.Name || null,
        lastLoginDate: u.LastLoginDate,
        isActive: u.IsActive,
        createdDate: u.CreatedDate,
      })),
      oauthTokens: data.oauthTokens.map(t => ({
        id: t.Id,
        appName: t.AppName,
        userId: t.UserId,
        lastUsedDate: t.LastUsedDate,
        useCount: t.UseCount,
      })),
      installedPackages: data.installedPackages.map(p => ({
        id: p.Id,
        name: p.SubscriberPackage?.Name || 'Unknown',
        namespace: p.SubscriberPackage?.NamespacePrefix,
        description: p.SubscriberPackage?.Description,
        version: p.SubscriberPackageVersion
          ? `${p.SubscriberPackageVersion.MajorVersion}.${p.SubscriberPackageVersion.MinorVersion}.${p.SubscriberPackageVersion.PatchVersion}`
          : null,
      })),
      namedCredentials: data.namedCredentials.map(nc => ({
        id: nc.Id,
        developerName: nc.DeveloperName,
        label: nc.MasterLabel,
        endpoint: nc.Endpoint,
        principalType: nc.PrincipalType,
      })),
    });
  } catch (err) {
    console.error('Failed to get integrations:', err);
    res.status(500).json({ error: 'Failed to fetch integrations data' });
  }
});

// GET /api/salesforce/permissions - Permission sets, high-risk users, profiles
router.get('/permissions', async (req: Request, res: Response) => {
  const session = (req as Request & { session: ReturnType<typeof getSession> }).session!;

  try {
    const data = await getPermissionsData(session);
    res.json({
      permissionSets: data.permissionSets.map(ps => ({
        id: ps.Id,
        name: ps.Name,
        label: ps.Label,
        description: ps.Description,
        isOwnedByProfile: ps.IsOwnedByProfile,
        modifyAllData: ps.PermissionsModifyAllData,
        viewAllData: ps.PermissionsViewAllData,
        authorApex: ps.PermissionsAuthorApex,
        manageUsers: ps.PermissionsManageUsers,
        apiEnabled: ps.PermissionsApiEnabled,
        assigneeCount: ps.assigneeCount || 0,
      })),
      highRiskUsers: data.highRiskUsers.map(hr => ({
        userId: hr.AssigneeId,
        userName: hr.Assignee.Name,
        username: hr.Assignee.Username,
        isActive: hr.Assignee.IsActive,
        profile: hr.Assignee.Profile?.Name || null,
        permissionSetName: hr.PermissionSet.Name,
        permissionSetLabel: hr.PermissionSet.Label,
        hasModifyAll: hr.PermissionSet.PermissionsModifyAllData,
        hasViewAll: hr.PermissionSet.PermissionsViewAllData,
        hasAuthorApex: hr.PermissionSet.PermissionsAuthorApex,
      })),
      profiles: data.profiles.map(p => ({
        id: p.Id,
        name: p.Name,
        userType: p.UserType,
        apiEnabled: p.PermissionsApiEnabled,
        modifyAllData: p.PermissionsModifyAllData,
        viewAllData: p.PermissionsViewAllData,
        userCount: p.userCount,
      })),
      summary: data.summary,
    });
  } catch (err) {
    console.error('Failed to get permissions:', err);
    res.status(500).json({ error: 'Failed to fetch permissions data' });
  }
});

// GET /api/salesforce/anomalies - Concurrent sessions, login anomalies, failed patterns
router.get('/anomalies', async (req: Request, res: Response) => {
  const session = (req as Request & { session: ReturnType<typeof getSession> }).session!;
  const days = parseInt(req.query.days as string) || 7;

  try {
    const data = await getAnomaliesData(session, days);
    res.json({
      concurrentSessions: data.concurrentSessions.map(cs => ({
        userId: cs.userId,
        userName: cs.userName,
        sessionCount: cs.sessionCount,
        sessions: cs.sessions.map(s => ({
          id: s.id,
          sourceIp: s.sourceIp,
          sessionType: s.sessionType,
          createdDate: s.createdDate,
        })),
      })),
      loginAnomalies: data.loginAnomalies.map(la => ({
        userId: la.userId,
        userName: la.userName,
        anomalyType: la.anomalyType,
        description: la.description,
        loginTime: la.loginTime,
        sourceIp: la.sourceIp,
        country: la.country,
      })),
      failedLoginPatterns: data.failedLoginPatterns.map(fp => ({
        sourceIp: fp.sourceIp,
        country: fp.country,
        failCount: fp.failCount,
        lastAttempt: fp.lastAttempt,
        targetUsers: fp.targetUsers,
      })),
      summary: data.summary,
    });
  } catch (err) {
    console.error('Failed to get anomalies:', err);
    res.status(500).json({ error: 'Failed to fetch anomalies data' });
  }
});

// GET /api/salesforce/config-health - Security health check, MFA coverage, certificates
router.get('/config-health', async (req: Request, res: Response) => {
  const session = (req as Request & { session: ReturnType<typeof getSession> }).session!;

  try {
    const data = await getConfigHealthData(session);
    res.json({
      securityHealthCheck: data.securityHealthCheck
        ? {
            score: data.securityHealthCheck.score,
            totalRisks: data.securityHealthCheck.totalRisks,
            highRisks: data.securityHealthCheck.highRisks,
            mediumRisks: data.securityHealthCheck.mediumRisks,
            lowRisks: data.securityHealthCheck.lowRisks,
            risks: data.securityHealthCheck.risks.map(r => ({
              riskType: r.RiskType,
              setting: r.Setting,
              orgValue: r.OrgValue,
              standardValue: r.StandardValue,
            })),
          }
        : null,
      mfaCoverage: {
        totalUsers: data.mfaCoverage.totalUsers,
        mfaEnabled: data.mfaCoverage.mfaEnabled,
        mfaNotEnabled: data.mfaCoverage.mfaNotEnabled,
        percentage: data.mfaCoverage.percentage,
      },
      expiringCerts: data.expiringCerts.map(c => ({
        id: c.Id,
        developerName: c.DeveloperName,
        label: c.MasterLabel,
        expirationDate: c.ExpirationDate,
        isExpired: c.IsExpired,
      })),
      overallScore: data.overallScore,
    });
  } catch (err) {
    console.error('Failed to get config health:', err);
    res.status(500).json({ error: 'Failed to fetch config health data' });
  }
});

// GET /api/salesforce/data-access - Audit events, guest users, sharing rules
router.get('/data-access', async (req: Request, res: Response) => {
  const session = (req as Request & { session: ReturnType<typeof getSession> }).session!;

  try {
    const data = await getDataAccessData(session);
    res.json({
      auditEvents: data.auditEvents.map(e => ({
        id: e.Id,
        action: e.Action,
        section: e.Section,
        createdDate: e.CreatedDate,
        createdBy: e.CreatedBy?.Name || 'Unknown',
        display: e.Display,
        delegateUser: e.DelegateUser,
      })),
      guestUsers: data.guestUsers.map(u => ({
        id: u.Id,
        username: u.Username,
        name: u.Name,
        userType: u.UserType,
        profile: u.Profile?.Name || null,
        isActive: u.IsActive,
        lastLoginDate: u.LastLoginDate,
      })),
      sharingRules: data.sharingRules.map(sr => ({
        objectName: sr.objectName,
        ruleCount: sr.ruleCount,
      })),
      summary: data.summary,
    });
  } catch (err) {
    console.error('Failed to get data access:', err);
    res.status(500).json({ error: 'Failed to fetch data access data' });
  }
});

// GET /api/salesforce/user-risk-scores - User risk scoring based on permissions, activity, and patterns
router.get('/user-risk-scores', async (req: Request, res: Response) => {
  const session = (req as Request & { session: ReturnType<typeof getSession> }).session!;

  try {
    const riskScores = await getUserRiskScores(session);
    res.json({ users: riskScores });
  } catch (err) {
    console.error('Failed to get user risk scores:', err);
    res.status(500).json({ error: 'Failed to fetch user risk scores' });
  }
});

// GET /api/salesforce/token-risk - OAuth token risk analysis
router.get('/token-risk', async (req: Request, res: Response) => {
  const session = (req as Request & { session: ReturnType<typeof getSession> }).session!;

  try {
    const tokenRisk = await getTokenRiskData(session);
    res.json({ apps: tokenRisk });
  } catch (err) {
    console.error('Failed to get token risk data:', err);
    res.status(500).json({ error: 'Failed to fetch token risk data' });
  }
});

// GET /api/salesforce/remote-sites - Remote site settings (external URLs org can call)
router.get('/remote-sites', async (req: Request, res: Response) => {
  const session = (req as Request & { session: ReturnType<typeof getSession> }).session!;

  try {
    const sites = await getRemoteSiteSettings(session);
    res.json({ sites });
  } catch (err) {
    console.error('Failed to get remote site settings:', err);
    res.status(500).json({ error: 'Failed to fetch remote site settings' });
  }
});

// GET /api/salesforce/auth-providers - SSO/Auth provider configurations
router.get('/auth-providers', async (req: Request, res: Response) => {
  const session = (req as Request & { session: ReturnType<typeof getSession> }).session!;

  try {
    const providers = await getAuthProviders(session);
    res.json({ providers });
  } catch (err) {
    console.error('Failed to get auth providers:', err);
    res.status(500).json({ error: 'Failed to fetch auth providers' });
  }
});

// GET /api/salesforce/api-usage - API usage statistics
router.get('/api-usage', async (req: Request, res: Response) => {
  const session = (req as Request & { session: ReturnType<typeof getSession> }).session!;

  try {
    const usage = await getApiUsageData(session);
    res.json(usage);
  } catch (err) {
    console.error('Failed to get API usage data:', err);
    res.status(500).json({ error: 'Failed to fetch API usage data' });
  }
});

export default router;
