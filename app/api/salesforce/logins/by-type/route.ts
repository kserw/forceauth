import { NextResponse } from 'next/server';
import { getSession } from '@/lib/stateless-session';
import { getLoginsByType } from '@/lib/salesforce';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);

    const results = await getLoginsByType(
      { accessToken: session.accessToken, instanceUrl: session.instanceUrl },
      days
    );

    const stats = (results || []).map(r => ({
      loginType: r.LoginType || 'Unknown',
      count: r.cnt,
    }));

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('[Salesforce] Failed to fetch logins by type:', error);
    return NextResponse.json({ error: 'Failed to fetch login stats' }, { status: 500 });
  }
}
