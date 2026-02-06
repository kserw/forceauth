import { NextResponse } from 'next/server';
import { getSession } from '@/lib/stateless-session';
import { getAuditTrail } from '@/lib/salesforce';
import { handleApiError } from '@/lib/api-error';

interface SalesforceAuditRecord {
  Id: string;
  Action: string;
  Section: string;
  CreatedDate: string;
  CreatedBy?: { Name: string } | null;
  Display: string;
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const rawAudit = await getAuditTrail(
      { accessToken: session.accessToken, instanceUrl: session.instanceUrl },
      Math.min(limit, 200)
    ) as SalesforceAuditRecord[];

    const events = (rawAudit || []).map(a => ({
      id: a.Id,
      action: a.Action,
      section: a.Section,
      createdDate: a.CreatedDate,
      createdBy: a.CreatedBy?.Name || 'Unknown',
      display: a.Display,
    }));

    return NextResponse.json({ events });
  } catch (error) {
    return handleApiError(error, 'fetch audit trail');
  }
}
