import { NextResponse } from 'next/server';
import { getSession } from '@/lib/stateless-session';
import { getRemoteSiteSettings } from '@/lib/salesforce';

interface RemoteSiteRecord {
  Id: string;
  SiteName: string;
  EndpointUrl: string;
  Description: string | null;
  IsActive: boolean;
  DisableProtocolSecurity: boolean;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const results = await getRemoteSiteSettings({
      accessToken: session.accessToken,
      instanceUrl: session.instanceUrl,
    }) as RemoteSiteRecord[];

    const sites = results.map(s => ({
      Id: s.Id,
      SiteName: s.SiteName,
      EndpointUrl: s.EndpointUrl,
      Description: s.Description,
      IsActive: s.IsActive,
      DisableProtocolSecurity: s.DisableProtocolSecurity,
    }));

    return NextResponse.json({ sites });
  } catch (error) {
    console.error('[Salesforce] Failed to fetch remote sites:', error);
    return NextResponse.json({ error: 'Failed to fetch remote site settings' }, { status: 500 });
  }
}
