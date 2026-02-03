import { NextResponse } from 'next/server';
import { getSession } from '@/lib/stateless-session';
import { getLoginsByCountry } from '@/lib/salesforce';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);

    // Use getLoginsByCountry - City field is not available in all Salesforce editions
    const results = await getLoginsByCountry(
      { accessToken: session.accessToken, instanceUrl: session.instanceUrl },
      days
    );

    // Map country data to city format (city shown as country name since city data unavailable)
    const stats = (results || []).map(r => ({
      city: r.CountryIso || 'Unknown',
      country: r.CountryIso || null,
      count: r.cnt,
    }));

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('[Salesforce] Failed to fetch logins by city:', error);
    return NextResponse.json({ error: 'Failed to fetch login stats' }, { status: 500 });
  }
}
