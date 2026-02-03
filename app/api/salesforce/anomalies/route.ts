import { NextResponse } from 'next/server';
import { getSession } from '@/lib/stateless-session';
import {
  salesforceQuery,
  getActiveSessions,
  getLoginHistory,
  getUsersByIds,
  SessionRecord,
  LoginHistoryRecord,
} from '@/lib/salesforce';
import { parseIntWithBounds, PARAM_BOUNDS } from '@/lib/security';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseIntWithBounds(searchParams.get('days'), PARAM_BOUNDS.days.default, PARAM_BOUNDS.days.min, PARAM_BOUNDS.days.max);

    const opts = { accessToken: session.accessToken, instanceUrl: session.instanceUrl };

    // Fetch active sessions (now includes user data) and failed logins in parallel
    const [sessionResults, failedLogins] = await Promise.all([
      getActiveSessions(opts, 500),
      getLoginHistory(opts, 500, { days, statusFilter: 'failed' }),
    ]);

    // Group sessions by user
    const sessionsByUser = new Map<string, SessionRecord[]>();
    sessionResults.forEach(s => {
      const existing = sessionsByUser.get(s.UsersId) || [];
      existing.push(s);
      sessionsByUser.set(s.UsersId, existing);
    });

    // Find users with multiple concurrent sessions - user data now from SOQL relationship
    const concurrentSessions = Array.from(sessionsByUser.entries())
      .filter(([, sessions]) => sessions.length > 1)
      .map(([userId, sessions]) => ({
        userId,
        userName: sessions[0]?.Users?.Name || 'Unknown',
        sessionCount: sessions.length,
        sessions: sessions.map(s => ({
          id: s.Id,
          sourceIp: s.SourceIp,
          sessionType: s.SessionType,
          createdDate: s.CreatedDate,
        })),
      }));

    // Group failed logins by IP
    const failedByIp = new Map<string, { country: string | null; logins: LoginHistoryRecord[] }>();
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
    const recentLogins = await getLoginHistory(opts, 200, { days });

    // Filter for unusual hours first
    const unusualHourLogins = recentLogins.filter(login => {
      const hour = new Date(login.LoginTime).getHours();
      return hour < 6 || hour > 20;
    }).slice(0, 20);

    // Get user names for anomaly logins using parallel helper
    const anomalyUserIds = [...new Set(unusualHourLogins.map(l => l.UserId))];
    const userMap = await getUsersByIds(opts, anomalyUserIds);

    const loginAnomalies = unusualHourLogins.map(login => ({
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
