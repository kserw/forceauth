import { NextResponse } from 'next/server';
import { getSession } from '@/lib/stateless-session';
import { getLoginHistory } from '@/lib/salesforce';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const logins = await getLoginHistory(
      { accessToken: session.accessToken, instanceUrl: session.instanceUrl },
      Math.min(limit, 500)
    );

    return NextResponse.json({ logins });
  } catch (error) {
    console.error('[Salesforce] Failed to fetch login history:', error);
    return NextResponse.json({ error: 'Failed to fetch login history' }, { status: 500 });
  }
}
