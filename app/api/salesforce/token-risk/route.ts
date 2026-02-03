import { NextResponse } from 'next/server';
import { getSession } from '@/lib/stateless-session';
import { getOAuthTokens, salesforceQuery } from '@/lib/salesforce';
import { filterValidSalesforceIds } from '@/lib/security';

interface OAuthTokenRecord {
  Id: string;
  AppName: string;
  UserId: string;
  LastUsedDate: string | null;
  UseCount: number | null;
}

interface UserRecord {
  Id: string;
  Name: string;
  Username: string;
  IsActive: boolean;
}

interface TokenRiskFactor {
  factor: string;
  description: string;
  points: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

function getRiskLevel(score: number): 'critical' | 'high' | 'medium' | 'low' {
  if (score >= 60) return 'critical';
  if (score >= 40) return 'high';
  if (score >= 20) return 'medium';
  return 'low';
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const opts = { accessToken: session.accessToken, instanceUrl: session.instanceUrl };

    // Get OAuth tokens
    const tokens = await getOAuthTokens(opts) as OAuthTokenRecord[];

    // Get user info for all token users
    const userIds = filterValidSalesforceIds([...new Set(tokens.map(t => t.UserId))]);
    const userMap = new Map<string, UserRecord>();

    if (userIds.length > 0) {
      const userChunks = [];
      for (let i = 0; i < userIds.length; i += 50) {
        userChunks.push(userIds.slice(i, i + 50));
      }

      for (const chunk of userChunks) {
        const userResults = await salesforceQuery<UserRecord>(opts,
          `SELECT Id, Name, Username, IsActive FROM User WHERE Id IN ('${chunk.join("','")}')`
        );
        userResults.forEach(u => userMap.set(u.Id, u));
      }
    }

    // Group tokens by app
    const tokensByApp = new Map<string, OAuthTokenRecord[]>();
    tokens.forEach(t => {
      const existing = tokensByApp.get(t.AppName) || [];
      existing.push(t);
      tokensByApp.set(t.AppName, existing);
    });

    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Calculate risk for each app
    const appRisks = Array.from(tokensByApp.entries()).map(([appName, appTokens]) => {
      const riskFactors: TokenRiskFactor[] = [];
      let score = 0;

      // Analyze tokens
      const uniqueUsers = new Set(appTokens.map(t => t.UserId)).size;
      const inactiveUserTokens = appTokens.filter(t => {
        const user = userMap.get(t.UserId);
        return user && !user.IsActive;
      }).length;

      const staleTokens = appTokens.filter(t => {
        if (!t.LastUsedDate) return true;
        return new Date(t.LastUsedDate) < ninetyDaysAgo;
      }).length;

      const oldestToken = appTokens
        .filter(t => t.LastUsedDate)
        .sort((a, b) => new Date(a.LastUsedDate!).getTime() - new Date(b.LastUsedDate!).getTime())[0];

      const lastUsed = appTokens
        .filter(t => t.LastUsedDate)
        .sort((a, b) => new Date(b.LastUsedDate!).getTime() - new Date(a.LastUsedDate!).getTime())[0];

      // Risk factors
      if (inactiveUserTokens > 0) {
        const points = Math.min(30, inactiveUserTokens * 10);
        score += points;
        riskFactors.push({
          factor: 'InactiveUserTokens',
          description: `${inactiveUserTokens} token(s) belong to inactive users`,
          points,
          severity: 'critical',
        });
      }

      if (staleTokens > appTokens.length * 0.5) {
        score += 20;
        riskFactors.push({
          factor: 'HighStaleRatio',
          description: `${staleTokens} of ${appTokens.length} tokens are stale (>90 days)`,
          points: 20,
          severity: 'high',
        });
      } else if (staleTokens > 0) {
        score += 10;
        riskFactors.push({
          factor: 'StaleTokens',
          description: `${staleTokens} token(s) are stale (>90 days)`,
          points: 10,
          severity: 'medium',
        });
      }

      if (appTokens.length > 50) {
        score += 15;
        riskFactors.push({
          factor: 'HighTokenCount',
          description: `Large number of tokens (${appTokens.length})`,
          points: 15,
          severity: 'medium',
        });
      }

      const tokenInfos = appTokens.map(t => {
        const user = userMap.get(t.UserId);
        return {
          tokenId: t.Id,
          userId: t.UserId,
          userName: user?.Name || 'Unknown',
          username: user?.Username || 'Unknown',
          userActive: user?.IsActive ?? false,
          lastUsedDate: t.LastUsedDate,
          createdDate: null,
          useCount: t.UseCount,
        };
      });

      return {
        appName,
        tokenCount: appTokens.length,
        uniqueUsers,
        oldestToken: oldestToken?.LastUsedDate || null,
        lastUsed: lastUsed?.LastUsedDate || null,
        inactiveUserTokens,
        staleTokens,
        riskScore: score,
        riskLevel: getRiskLevel(score),
        riskFactors,
        tokens: tokenInfos,
      };
    });

    // Sort by risk score descending
    appRisks.sort((a, b) => b.riskScore - a.riskScore);

    return NextResponse.json({ apps: appRisks });
  } catch (error) {
    console.error('[Salesforce] Failed to fetch token risk:', error);
    return NextResponse.json({ error: 'Failed to fetch token risk data' }, { status: 500 });
  }
}
