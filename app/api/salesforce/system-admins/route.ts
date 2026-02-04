import { NextResponse } from 'next/server';
import { getSession } from '@/lib/stateless-session';
import { getSystemAdmins } from '@/lib/salesforce';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const rawUsers = await getSystemAdmins({
      accessToken: session.accessToken,
      instanceUrl: session.instanceUrl,
    });

    const users = (rawUsers || []).map(u => ({
      id: u.Id,
      username: u.Username,
      name: u.Name,
      email: u.Email,
      isActive: u.IsActive,
      lastLoginDate: u.LastLoginDate,
      createdDate: u.CreatedDate,
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error('[Salesforce] Failed to fetch system admins:', error);
    return NextResponse.json({ error: 'Failed to fetch system admins' }, { status: 500 });
  }
}
