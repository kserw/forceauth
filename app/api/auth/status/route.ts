import { NextResponse } from 'next/server';
import { getSession } from '@/lib/stateless-session';

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ authenticated: false });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.userId,
        username: session.username,
        displayName: session.displayName,
        email: session.email,
        organizationId: session.orgId,
        orgName: session.orgName || '',
      },
      environment: session.environment,
      instanceUrl: session.instanceUrl,
    });
  } catch (error) {
    console.error('[Auth] Status check failed:', error);
    return NextResponse.json({ authenticated: false });
  }
}
