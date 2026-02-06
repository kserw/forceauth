import { NextResponse } from 'next/server';
import { getSession } from '@/lib/stateless-session';
import { getLoginsByCountry } from '@/lib/salesforce';
import { handleApiError } from '@/lib/api-error';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);

    const results = await getLoginsByCountry(
      { accessToken: session.accessToken, instanceUrl: session.instanceUrl },
      days
    );

    const stats = (results || []).map(r => ({
      country: r.CountryIso || 'Unknown',
      count: r.cnt,
    }));

    return NextResponse.json({ stats });
  } catch (error) {
    return handleApiError(error, 'fetch logins by country');
  }
}
