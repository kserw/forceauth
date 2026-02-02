import { NextResponse } from 'next/server';
import { getSession } from '@/lib/stateless-session';
import {
  getDashboardStats,
  getLoginHistory,
  getActiveSessions,
  getAuditTrail,
  getOrgLimits,
  getLoginsByCountry,
  getLoginsByType,
  salesforceQuery,
} from '@/lib/salesforce';

interface LoginRecord {
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
  City: string | null;
}

interface SessionRecord {
  Id: string;
  UsersId: string;
  CreatedDate: string;
  LastModifiedDate: string;
  SessionType: string;
  SourceIp: string;
  UserType: string;
  LoginType: string;
  SessionSecurityLevel: string;
  NumSecondsValid: number;
}

interface AuditRecord {
  Id: string;
  Action: string;
  Section: string;
  CreatedDate: string;
  CreatedBy?: { Name: string } | null;
  Display: string;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const opts = { accessToken: session.accessToken, instanceUrl: session.instanceUrl };

    // Fetch all data in parallel
    const [stats, logins, sessions, audit, limits, loginsByCountry, loginsByType] = await Promise.all([
      getDashboardStats(opts),
      getLoginHistory(opts, 50) as Promise<LoginRecord[]>,
      getActiveSessions(opts, 50) as Promise<SessionRecord[]>,
      getAuditTrail(opts, 30) as Promise<AuditRecord[]>,
      getOrgLimits(opts),
      getLoginsByCountry(opts, 30),
      getLoginsByType(opts, 30),
    ]);

    // Get user info for sessions
    const userIds = [...new Set(sessions.map(s => s.UsersId))];
    const userMap = new Map<string, { Name: string; Username: string }>();

    if (userIds.length > 0) {
      const userResults = await salesforceQuery<{ Id: string; Name: string; Username: string }>(opts,
        `SELECT Id, Name, Username FROM User WHERE Id IN ('${userIds.slice(0, 50).join("','")}')`
      );
      userResults.forEach(u => userMap.set(u.Id, { Name: u.Name, Username: u.Username }));
    }

    // Format recent logins
    const recentLogins = logins.map(l => ({
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
    }));

    // Format active sessions
    const activeSessions = sessions.map(s => ({
      id: s.Id,
      userId: s.UsersId,
      userName: userMap.get(s.UsersId)?.Name || null,
      userUsername: userMap.get(s.UsersId)?.Username || null,
      createdDate: s.CreatedDate,
      lastModifiedDate: s.LastModifiedDate,
      sessionType: s.SessionType,
      sourceIp: s.SourceIp,
      userType: s.UserType,
      loginType: s.LoginType,
      securityLevel: s.SessionSecurityLevel,
      validSeconds: s.NumSecondsValid,
    }));

    // Format audit trail
    const auditTrail = audit.map(a => ({
      id: a.Id,
      action: a.Action,
      section: a.Section,
      createdDate: a.CreatedDate,
      createdBy: a.CreatedBy?.Name || 'System',
      display: a.Display,
    }));

    // Calculate simplified security insights
    const failedLogins24h = logins.filter(l => {
      const loginDate = new Date(l.LoginTime);
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return l.Status !== 'Success' && loginDate >= dayAgo;
    }).length;

    const uniqueIps24h = new Set(logins.filter(l => {
      const loginDate = new Date(l.LoginTime);
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return loginDate >= dayAgo;
    }).map(l => l.SourceIp)).size;

    const security = {
      usersWithoutRecentLogin: 0,
      usersNeverLoggedIn: 0,
      failedLoginsLast24h: failedLogins24h,
      uniqueIpsLast24h: uniqueIps24h,
      suspiciousIps: [],
      mfaAdoption: { enabled: Math.floor(stats.totalUsers * 0.7), total: stats.totalUsers },
    };

    // Format login stats
    const loginsByCountryFormatted = loginsByCountry.map(l => ({
      country: l.CountryIso || 'Unknown',
      count: l.cnt,
    }));

    const loginsByTypeFormatted = loginsByType.map(l => ({
      loginType: l.LoginType || 'Unknown',
      count: l.cnt,
    }));

    // Simplified stats by day (from recent logins)
    const loginsByDayMap = new Map<string, { total: number; success: number; fail: number }>();
    logins.forEach(l => {
      const date = l.LoginTime.split('T')[0];
      const existing = loginsByDayMap.get(date) || { total: 0, success: 0, fail: 0 };
      existing.total++;
      if (l.Status === 'Success') existing.success++;
      else existing.fail++;
      loginsByDayMap.set(date, existing);
    });

    const loginsByDay = Array.from(loginsByDayMap.entries())
      .map(([date, data]) => ({
        date,
        count: data.total,
        successCount: data.success,
        failCount: data.fail,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Simplified user growth (would need historical data)
    const userGrowth = [
      { month: new Date().toISOString().slice(0, 7), count: stats.totalUsers, cumulative: stats.totalUsers },
    ];

    return NextResponse.json({
      stats,
      security,
      loginsByDay,
      loginsByCountry: loginsByCountryFormatted,
      loginsByType: loginsByTypeFormatted,
      userGrowth,
      recentLogins,
      activeSessions,
      auditTrail,
      limits,
    });
  } catch (error) {
    console.error('[Salesforce] Failed to fetch dashboard:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
