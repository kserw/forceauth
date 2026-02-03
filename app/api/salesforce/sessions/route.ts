import { NextResponse } from 'next/server';
import { getSession } from '@/lib/stateless-session';
import { getActiveSessions } from '@/lib/salesforce';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const rawSessions = await getActiveSessions(
      { accessToken: session.accessToken, instanceUrl: session.instanceUrl },
      Math.min(limit, 500)
    );

    // User data now included from SOQL relationship
    const sessions = (rawSessions || []).map(s => ({
      id: s.Id,
      userId: s.UsersId,
      userName: s.Users?.Name || null,
      userUsername: s.Users?.Username || null,
      createdDate: s.CreatedDate,
      lastModifiedDate: s.LastModifiedDate,
      sessionType: s.SessionType || 'Unknown',
      sourceIp: s.SourceIp,
      userType: s.UserType,
      loginType: s.LoginType || 'Unknown',
      securityLevel: s.SessionSecurityLevel || 'Standard',
      validSeconds: s.NumSecondsValid,
    }));

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('[Salesforce] Failed to fetch active sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch active sessions' }, { status: 500 });
  }
}
