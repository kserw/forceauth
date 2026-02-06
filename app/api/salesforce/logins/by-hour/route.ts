import { NextResponse } from 'next/server';
import { getSession } from '@/lib/stateless-session';
import { salesforceQuery } from '@/lib/salesforce';
import { handleApiError } from '@/lib/api-error';

interface LoginRecord {
  LoginTime: string;
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7', 10);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const logins = await salesforceQuery<LoginRecord>(
      { accessToken: session.accessToken, instanceUrl: session.instanceUrl },
      `SELECT LoginTime FROM LoginHistory WHERE LoginTime >= ${startDateStr}T00:00:00Z LIMIT 2000`
    );

    // Group by hour
    const hourCounts = new Map<string, number>();
    for (let i = 0; i < 24; i++) {
      hourCounts.set(i.toString().padStart(2, '0'), 0);
    }

    logins.forEach(login => {
      const hour = new Date(login.LoginTime).getUTCHours().toString().padStart(2, '0');
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    const stats = Array.from(hourCounts.entries())
      .map(([hour, count]) => ({ hour: `${hour}:00`, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour));

    return NextResponse.json({ stats });
  } catch (error) {
    return handleApiError(error, 'fetch logins by hour');
  }
}
