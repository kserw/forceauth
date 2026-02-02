import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'forceauth_session';

export async function POST() {
  try {
    const cookieStore = await cookies();

    // Delete the session cookie
    cookieStore.delete(COOKIE_NAME);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Auth] Logout failed:', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
