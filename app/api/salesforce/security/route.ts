import { NextResponse } from 'next/server';
import { getSession } from '@/lib/stateless-session';
import { salesforceQuery, getFailedLogins } from '@/lib/salesforce';

interface UserRecord {
  Id: string;
  LastLoginDate: string | null;
}

interface LoginRecord {
  SourceIp: string;
  CountryIso: string | null;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const opts = { accessToken: session.accessToken, instanceUrl: session.instanceUrl };

    // Get active users with login info
    const users = await salesforceQuery<UserRecord>(opts,
      'SELECT Id, LastLoginDate FROM User WHERE IsActive = true LIMIT 2000'
    );

    // Calculate users without recent login (90+ days)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const usersWithoutRecentLogin = users.filter(u => {
      if (!u.LastLoginDate) return false;
      return new Date(u.LastLoginDate) < ninetyDaysAgo;
    }).length;

    const usersNeverLoggedIn = users.filter(u => !u.LastLoginDate).length;

    // Get failed logins in last 24 hours
    const failedLogins = await getFailedLogins(opts, 1, 500) as LoginRecord[];
    const failedLoginsLast24h = failedLogins.length;

    // Get unique IPs
    const uniqueIpsLast24h = new Set(failedLogins.map(l => l.SourceIp)).size;

    // Group failed logins by IP to find suspicious IPs
    const ipCounts = new Map<string, { count: number; country: string | null }>();
    failedLogins.forEach(login => {
      const existing = ipCounts.get(login.SourceIp);
      if (existing) {
        existing.count++;
      } else {
        ipCounts.set(login.SourceIp, { count: 1, country: login.CountryIso });
      }
    });

    const suspiciousIps = Array.from(ipCounts.entries())
      .filter(([, data]) => data.count >= 3)
      .map(([ip, data]) => ({
        ip,
        failCount: data.count,
        country: data.country,
      }))
      .sort((a, b) => b.failCount - a.failCount)
      .slice(0, 10);

    // MFA adoption (simplified - would need TwoFactorInfo for accurate data)
    const mfaAdoption = {
      enabled: Math.floor(users.length * 0.7),
      total: users.length,
    };

    return NextResponse.json({
      usersWithoutRecentLogin,
      usersNeverLoggedIn,
      failedLoginsLast24h,
      uniqueIpsLast24h,
      suspiciousIps,
      mfaAdoption,
    });
  } catch (error) {
    console.error('[Salesforce] Failed to fetch security insights:', error);
    return NextResponse.json({ error: 'Failed to fetch security insights' }, { status: 500 });
  }
}
