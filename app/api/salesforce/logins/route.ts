import { NextResponse } from 'next/server';
import { getSession } from '@/lib/stateless-session';
import { getLoginHistory } from '@/lib/salesforce';

interface SalesforceLoginRecord {
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

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const rawLogins = await getLoginHistory(
      { accessToken: session.accessToken, instanceUrl: session.instanceUrl },
      Math.min(limit, 500)
    ) as SalesforceLoginRecord[];

    const logins = (rawLogins || []).map(l => ({
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
      city: null,
    }));

    return NextResponse.json({ logins });
  } catch (error) {
    console.error('[Salesforce] Failed to fetch login history:', error);
    return NextResponse.json({ error: 'Failed to fetch login history' }, { status: 500 });
  }
}
