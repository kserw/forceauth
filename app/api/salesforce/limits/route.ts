import { NextResponse } from 'next/server';
import { getSession } from '@/lib/stateless-session';
import { getOrgLimits } from '@/lib/salesforce';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const limits = await getOrgLimits({
      accessToken: session.accessToken,
      instanceUrl: session.instanceUrl,
    });

    return NextResponse.json({ limits });
  } catch (error) {
    console.error('[Salesforce] Failed to fetch limits:', error);
    return NextResponse.json({ error: 'Failed to fetch org limits' }, { status: 500 });
  }
}
