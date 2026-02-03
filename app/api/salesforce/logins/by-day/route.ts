import { NextResponse } from 'next/server';
import { getSession } from '@/lib/stateless-session';
import { salesforceQuery } from '@/lib/salesforce';
import { parseIntWithBounds, PARAM_BOUNDS } from '@/lib/security';

interface LoginRecord {
  LoginTime: string;
  Status: string;
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseIntWithBounds(searchParams.get('days'), 30, PARAM_BOUNDS.days.min, PARAM_BOUNDS.days.max);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const logins = await salesforceQuery<LoginRecord>(
      { accessToken: session.accessToken, instanceUrl: session.instanceUrl },
      `SELECT LoginTime, Status FROM LoginHistory WHERE LoginTime >= ${startDateStr}T00:00:00Z LIMIT 5000`
    );

    // Group by day
    const dayCounts = new Map<string, { total: number; success: number; fail: number }>();

    logins.forEach(login => {
      const date = login.LoginTime.split('T')[0];
      const existing = dayCounts.get(date) || { total: 0, success: 0, fail: 0 };
      existing.total++;
      if (login.Status === 'Success') existing.success++;
      else existing.fail++;
      dayCounts.set(date, existing);
    });

    const stats = Array.from(dayCounts.entries())
      .map(([date, data]) => ({
        date,
        count: data.total,
        successCount: data.success,
        failCount: data.fail,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('[Salesforce] Failed to fetch logins by day:', error);
    return NextResponse.json({ error: 'Failed to fetch login stats' }, { status: 500 });
  }
}
