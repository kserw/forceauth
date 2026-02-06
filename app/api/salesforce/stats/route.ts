import { NextResponse } from 'next/server';
import { getSession } from '@/lib/stateless-session';
import { getDashboardStats } from '@/lib/salesforce';
import { handleApiError } from '@/lib/api-error';

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
    return handleApiError(error, 'fetch dashboard stats');
  }
}
