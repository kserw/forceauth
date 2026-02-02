import { NextResponse } from 'next/server';
import { getSession } from '@/lib/stateless-session';
import { getRecentUsers } from '@/lib/salesforce';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const users = await getRecentUsers(
      { accessToken: session.accessToken, instanceUrl: session.instanceUrl },
      Math.min(limit, 200)
    );

    return NextResponse.json({ users });
  } catch (error) {
    console.error('[Salesforce] Failed to fetch users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
