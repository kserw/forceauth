import { NextResponse } from 'next/server';
import { getSession } from '@/lib/stateless-session';
import { salesforceQuery, getActiveSessions, getFailedLogins } from '@/lib/salesforce';
import { filterValidSalesforceIds, parseIntWithBounds, PARAM_BOUNDS } from '@/lib/security';

interface SessionRecord {
  Id: string;
  UsersId: string;
  SourceIp: string;
  SessionType: string;
  CreatedDate: string;
}

interface LoginRecord {
  Id: string;
  UserId: string;
  LoginTime: string;
  SourceIp: string;
  LoginType: string;
  Status: string;
  CountryIso: string | null;
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseIntWithBounds(searchParams.get('days'), PARAM_BOUNDS.days.default, PARAM_BOUNDS.days.min, PARAM_BOUNDS.days.max);

    const opts = { accessToken: session.accessToken, instanceUrl: session.instanceUrl };

    // Fetch active sessions and group by user to find concurrent sessions
    const sessionResults = await getActiveSessions(opts, 500) as SessionRecord[];

    // Get user info for sessions
    const userIds = filterValidSalesforceIds([...new Set(sessionResults.map(s => s.UsersId))]);
    const userMap = new Map<string, { Name: string; Username: string }>();

    if (userIds.length > 0) {
      const userChunks = [];
      for (let i = 0; i < userIds.length; i += 50) {
        userChunks.push(userIds.slice(i, i + 50));
      }

      for (const chunk of userChunks) {
        const userResults = await salesforceQuery<{ Id: string; Name: string; Username: string }>(opts,
          `SELECT Id, Name, Username FROM User WHERE Id IN ('${chunk.join("','")}')`
        );
        userResults.forEach(u => userMap.set(u.Id, { Name: u.Name, Username: u.Username }));
      }
    }

    // Group sessions by user
    const sessionsByUser = new Map<string, SessionRecord[]>();
    sessionResults.forEach(s => {
      const existing = sessionsByUser.get(s.UsersId) || [];
      existing.push(s);
      sessionsByUser.set(s.UsersId, existing);
    });

    // Find users with multiple concurrent sessions
    const concurrentSessions = Array.from(sessionsByUser.entries())
      .filter(([, sessions]) => sessions.length > 1)
      .map(([userId, sessions]) => ({
        userId,
        userName: userMap.get(userId)?.Name || 'Unknown',
        sessionCount: sessions.length,
        sessions: sessions.map(s => ({
          id: s.Id,
          sourceIp: s.SourceIp,
          sessionType: s.SessionType,
          createdDate: s.CreatedDate,
        })),
      }));

    // Get failed logins for patterns
    const failedLogins = await getFailedLogins(opts, days, 500) as LoginRecord[];

    // Group failed logins by IP
    const failedByIp = new Map<string, { country: string | null; logins: LoginRecord[] }>();
    failedLogins.forEach(login => {
      const existing = failedByIp.get(login.SourceIp);
      if (existing) {
        existing.logins.push(login);
      } else {
        failedByIp.set(login.SourceIp, { country: login.CountryIso, logins: [login] });
      }
    });

    const failedLoginPatterns = Array.from(failedByIp.entries())
      .filter(([, data]) => data.logins.length >= 3)
      .map(([ip, data]) => ({
        sourceIp: ip,
        country: data.country,
        failCount: data.logins.length,
        lastAttempt: data.logins[0].LoginTime,
        targetUsers: [...new Set(data.logins.map(l => l.UserId))],
      }))
      .sort((a, b) => b.failCount - a.failCount)
      .slice(0, 20);

    // Simple login anomalies - unusual hours (outside 6am-8pm)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const recentLogins = await salesforceQuery<LoginRecord>(opts,
      `SELECT Id, UserId, LoginTime, SourceIp, CountryIso FROM LoginHistory
       WHERE LoginTime >= ${startDate.toISOString().split('T')[0]}T00:00:00Z
       ORDER BY LoginTime DESC LIMIT 200`
    );

    const loginAnomalies = recentLogins
      .filter(login => {
        const hour = new Date(login.LoginTime).getHours();
        return hour < 6 || hour > 20;
      })
      .slice(0, 20)
      .map(login => ({
        userId: login.UserId,
        userName: userMap.get(login.UserId)?.Name || 'Unknown',
        anomalyType: 'unusual_hour' as const,
        description: `Login at unusual hour (${new Date(login.LoginTime).getHours()}:00)`,
        loginTime: login.LoginTime,
        sourceIp: login.SourceIp,
        country: login.CountryIso,
      }));

    return NextResponse.json({
      concurrentSessions,
      loginAnomalies,
      failedLoginPatterns,
      summary: {
        usersWithConcurrentSessions: concurrentSessions.length,
        totalAnomalies: loginAnomalies.length,
        suspiciousIps: failedLoginPatterns.length,
      },
    });
  } catch (error) {
    console.error('[Salesforce] Failed to fetch anomalies:', error);
    return NextResponse.json({ error: 'Failed to fetch anomalies data' }, { status: 500 });
  }
}
