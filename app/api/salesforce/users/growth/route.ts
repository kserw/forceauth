import { NextResponse } from 'next/server';
import { getSession } from '@/lib/stateless-session';
import { salesforceQuery } from '@/lib/salesforce';
import { handleApiError } from '@/lib/api-error';

interface UserRecord {
  CreatedDate: string;
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const months = parseInt(searchParams.get('months') || '6', 10);

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    const startDateStr = startDate.toISOString().split('T')[0];

    const users = await salesforceQuery<UserRecord>(
      { accessToken: session.accessToken, instanceUrl: session.instanceUrl },
      `SELECT CreatedDate FROM User WHERE CreatedDate >= ${startDateStr}T00:00:00Z ORDER BY CreatedDate ASC`
    );

    // Also get total user count
    const totalResult = await salesforceQuery<{ expr0: number }>(
      { accessToken: session.accessToken, instanceUrl: session.instanceUrl },
      'SELECT COUNT(Id) FROM User WHERE IsActive = true'
    );
    const totalUsers = totalResult[0]?.expr0 || 0;

    // Group by month
    const monthCounts = new Map<string, number>();

    users.forEach(user => {
      const month = user.CreatedDate.slice(0, 7); // YYYY-MM
      monthCounts.set(month, (monthCounts.get(month) || 0) + 1);
    });

    // Build growth array with cumulative counts
    const sortedMonths = Array.from(monthCounts.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    // Calculate base (users created before our start date)
    const newUsersInPeriod = sortedMonths.reduce((sum, [, count]) => sum + count, 0);
    let cumulative = totalUsers - newUsersInPeriod;

    const growth = sortedMonths.map(([month, count]) => {
      cumulative += count;
      return { month, count, cumulative };
    });

    return NextResponse.json({ growth });
  } catch (error) {
    return handleApiError(error, 'fetch user growth');
  }
}
