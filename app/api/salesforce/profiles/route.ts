import { NextResponse } from 'next/server';
import { getSession } from '@/lib/stateless-session';
import { getProfiles } from '@/lib/salesforce';
import { handleApiError } from '@/lib/api-error';

interface ProfileRecord {
  Id: string;
  Name: string;
  UserType: string;
  UserLicense?: { Name: string } | null;
  Users?: { records: { Id: string }[] } | null;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const results = await getProfiles({
      accessToken: session.accessToken,
      instanceUrl: session.instanceUrl,
    }) as ProfileRecord[];

    const profiles = results.map(r => ({
      id: r.Id,
      name: r.Name,
      userType: r.UserType,
      license: r.UserLicense?.Name || null,
      userCount: r.Users?.records?.length || 0,
    }));

    return NextResponse.json({ profiles });
  } catch (error) {
    return handleApiError(error, 'fetch profiles');
  }
}
