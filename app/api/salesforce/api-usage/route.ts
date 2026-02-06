import { NextResponse } from 'next/server';
import { getSession } from '@/lib/stateless-session';
import { getOrgLimits, getOAuthTokens } from '@/lib/salesforce';
import { handleApiError } from '@/lib/api-error';

interface OAuthTokenRecord {
  Id: string;
  AppName: string;
  UserId: string;
  LastUsedDate: string | null;
  UseCount: number | null;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const opts = { accessToken: session.accessToken, instanceUrl: session.instanceUrl };

    // Get org limits for API usage
    const limits = await getOrgLimits(opts);
    const dailyApiRequests = limits.DailyApiRequests || { Max: 0, Remaining: 0 };

    const totalCalls = dailyApiRequests.Max;
    const remainingCalls = dailyApiRequests.Remaining;
    const usedCalls = totalCalls - remainingCalls;
    const usedPercent = totalCalls > 0 ? Math.round((usedCalls / totalCalls) * 100) : 0;

    // Get OAuth tokens for app usage breakdown
    const tokens = await getOAuthTokens(opts) as OAuthTokenRecord[];

    // Group by app and calculate usage
    const usageByApp = new Map<string, { count: number; lastUsed: string | null; users: Set<string> }>();

    tokens.forEach(token => {
      const existing = usageByApp.get(token.AppName);
      const useCount = token.UseCount || 0;

      if (existing) {
        existing.count += useCount;
        existing.users.add(token.UserId);
        if (token.LastUsedDate && (!existing.lastUsed || token.LastUsedDate > existing.lastUsed)) {
          existing.lastUsed = token.LastUsedDate;
        }
      } else {
        usageByApp.set(token.AppName, {
          count: useCount,
          lastUsed: token.LastUsedDate,
          users: new Set([token.UserId]),
        });
      }
    });

    // Calculate totals for percentages
    const totalAppCalls = Array.from(usageByApp.values()).reduce((sum, app) => sum + app.count, 0);

    const byApp = Array.from(usageByApp.entries())
      .map(([appName, data]) => ({
        appName,
        callCount: data.count,
        lastUsed: data.lastUsed,
        uniqueUsers: data.users.size,
        percentOfTotal: totalAppCalls > 0 ? Math.round((data.count / totalAppCalls) * 100) : 0,
      }))
      .sort((a, b) => b.callCount - a.callCount);

    return NextResponse.json({
      totalCalls,
      remainingCalls,
      usedPercent,
      byApp,
    });
  } catch (error) {
    return handleApiError(error, 'fetch API usage');
  }
}
