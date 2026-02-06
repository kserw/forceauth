import { NextResponse } from 'next/server';
import { getSession } from '@/lib/stateless-session';
import { getUserLicenses } from '@/lib/salesforce';
import { handleApiError } from '@/lib/api-error';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const licenses = await getUserLicenses({
      accessToken: session.accessToken,
      instanceUrl: session.instanceUrl,
    });

    return NextResponse.json({ licenses });
  } catch (error) {
    return handleApiError(error, 'fetch licenses');
  }
}
