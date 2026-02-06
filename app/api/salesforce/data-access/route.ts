import { NextResponse } from 'next/server';
import { getSession } from '@/lib/stateless-session';
import { getAuditTrail, getGuestUsers } from '@/lib/salesforce';
import { handleApiError } from '@/lib/api-error';

interface AuditRecord {
  Id: string;
  Action: string;
  Section: string;
  CreatedDate: string;
  CreatedBy?: { Name: string } | null;
  Display: string;
  DelegateUser?: string | null;
}

interface GuestUserRecord {
  Id: string;
  Username: string;
  Name: string;
  UserType: string;
  Profile?: { Name: string } | null;
  IsActive: boolean;
  LastLoginDate: string | null;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const opts = { accessToken: session.accessToken, instanceUrl: session.instanceUrl };

    // Fetch audit trail and guest users
    const [auditResults, guestResults] = await Promise.all([
      getAuditTrail(opts, 100) as Promise<AuditRecord[]>,
      getGuestUsers(opts) as Promise<GuestUserRecord[]>,
    ]);

    const auditEvents = auditResults.map(a => ({
      id: a.Id,
      action: a.Action,
      section: a.Section,
      createdDate: a.CreatedDate,
      createdBy: a.CreatedBy?.Name || 'System',
      display: a.Display,
      delegateUser: a.DelegateUser || null,
    }));

    const guestUsers = guestResults.map(g => ({
      id: g.Id,
      username: g.Username,
      name: g.Name,
      userType: g.UserType,
      profile: g.Profile?.Name || null,
      isActive: g.IsActive,
      lastLoginDate: g.LastLoginDate,
    }));

    // Simplified sharing rules (would need metadata API for full implementation)
    const sharingRules: Array<{ objectName: string; ruleCount: number }> = [];

    const activeGuestUsers = guestUsers.filter(g => g.isActive).length;
    const recentDataChanges = auditEvents.filter(e =>
      e.section.toLowerCase().includes('data') ||
      e.action.toLowerCase().includes('modify') ||
      e.action.toLowerCase().includes('delete')
    ).length;

    return NextResponse.json({
      auditEvents,
      guestUsers,
      sharingRules,
      summary: {
        totalGuestUsers: guestUsers.length,
        activeGuestUsers,
        recentDataChanges,
      },
    });
  } catch (error) {
    return handleApiError(error, 'fetch data access');
  }
}
