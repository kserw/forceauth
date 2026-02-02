import { NextResponse } from 'next/server';
import { getSession } from '@/lib/stateless-session';
import { getFailedLogins } from '@/lib/salesforce';

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

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7', 10);
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const results = await getFailedLogins(
      { accessToken: session.accessToken, instanceUrl: session.instanceUrl },
      days,
      Math.min(limit, 500)
    ) as LoginRecord[];

    const logins = results.map(r => ({
      id: r.Id,
      userId: r.UserId,
      loginTime: r.LoginTime,
      sourceIp: r.SourceIp,
      loginType: r.LoginType,
      status: r.Status,
      application: r.Application,
      browser: r.Browser,
      platform: r.Platform,
      country: r.CountryIso,
      city: r.City,
    }));

    return NextResponse.json({ logins });
  } catch (error) {
    console.error('[Salesforce] Failed to fetch failed logins:', error);
    return NextResponse.json({ error: 'Failed to fetch failed logins' }, { status: 500 });
  }
}
