import { NextResponse } from 'next/server';
import { getSession } from '@/lib/stateless-session';
import { getOrganizationInfo } from '@/lib/salesforce';

interface OrgRecord {
  Id: string;
  Name: string;
  Division: string | null;
  OrganizationType: string;
  InstanceName: string;
  IsSandbox: boolean;
  TrialExpirationDate: string | null;
  LanguageLocaleKey: string;
  TimeZoneSidKey: string;
  DefaultLocaleSidKey: string;
  CreatedDate: string;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const org = await getOrganizationInfo({
      accessToken: session.accessToken,
      instanceUrl: session.instanceUrl,
    }) as OrgRecord | null;

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: org.Id,
      name: org.Name,
      division: org.Division,
      type: org.OrganizationType,
      instance: org.InstanceName,
      isSandbox: org.IsSandbox,
      trialExpiration: org.TrialExpirationDate,
      language: org.LanguageLocaleKey,
      timezone: org.TimeZoneSidKey,
      locale: org.DefaultLocaleSidKey,
      createdDate: org.CreatedDate,
    });
  } catch (error) {
    console.error('[Salesforce] Failed to fetch organization:', error);
    return NextResponse.json({ error: 'Failed to fetch organization info' }, { status: 500 });
  }
}
