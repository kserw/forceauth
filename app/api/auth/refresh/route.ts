import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession, createSessionCookie, COOKIE_OPTIONS, type SessionData } from '@/lib/stateless-session';
import { refreshAccessToken } from '@/lib/stateless-oauth';

const COOKIE_NAME = 'forceauth_session';

// POST /api/auth/refresh - Refresh access token using PKCE (no client secret needed)
export async function POST() {
  try {
    const session = await getSession();

    if (!session || !session.refreshToken) {
      return NextResponse.json({ error: 'No refresh token available' }, { status: 401 });
    }

    // PKCE apps don't require client_secret for refresh
    // The clientId is stored in the session from the original auth
    if (!session.clientId) {
      return NextResponse.json(
        { error: 'Session missing clientId. Please re-authenticate.' },
        { status: 401 }
      );
    }

    // Refresh the token (no client_secret needed for PKCE)
    const tokens = await refreshAccessToken({
      refreshToken: session.refreshToken,
      environment: session.environment,
      clientId: session.clientId,
    });

    // Create updated session data
    const updatedSession: SessionData = {
      ...session,
      accessToken: tokens.access_token,
      instanceUrl: tokens.instance_url,
      issuedAt: Date.now(),
    };

    // Create and set new session cookie
    const sessionCookie = createSessionCookie(updatedSession);
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, sessionCookie, COOKIE_OPTIONS);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Auth] Token refresh failed:', error);
    return NextResponse.json({ error: 'Token refresh failed' }, { status: 500 });
  }
}
