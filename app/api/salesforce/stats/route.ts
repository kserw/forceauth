import { NextResponse } from 'next/server';
import { getSession } from '@/lib/stateless-session';
import { getDashboardStats } from '@/lib/salesforce';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const stats = await getDashboardStats({
      accessToken: session.accessToken,
      instanceUrl: session.instanceUrl,
    });

    return NextResponse.json(stats);
  } catch (error) {
    console.error('[Salesforce] Failed to fetch stats:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
}
