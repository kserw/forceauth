import { NextResponse } from 'next/server';
import { getSession } from '@/lib/stateless-session';
import { getPermissionSets, getHighRiskUsers, salesforceQuery } from '@/lib/salesforce';

interface PermissionSetRecord {
  Id: string;
  Name: string;
  Label: string;
  Description: string | null;
  IsOwnedByProfile: boolean;
  PermissionsModifyAllData: boolean;
  PermissionsViewAllData: boolean;
  PermissionsAuthorApex: boolean;
  PermissionsManageUsers: boolean;
  PermissionsApiEnabled: boolean;
}

interface HighRiskUserRecord {
  AssigneeId: string;
  Assignee: {
    Name: string;
    Username: string;
    IsActive: boolean;
    Profile?: { Name: string } | null;
  };
  PermissionSet: {
    Name: string;
    Label: string;
    PermissionsModifyAllData: boolean;
    PermissionsViewAllData: boolean;
    PermissionsAuthorApex: boolean;
  };
}

interface ProfilePermRecord {
  Id: string;
  Name: string;
  UserType: string;
  PermissionsApiEnabled: boolean;
  PermissionsModifyAllData: boolean;
  PermissionsViewAllData: boolean;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const opts = { accessToken: session.accessToken, instanceUrl: session.instanceUrl };

    // Fetch permission sets
    const permSetResults = await getPermissionSets(opts) as PermissionSetRecord[];

    // Get assignment counts
    const assignmentCounts = await salesforceQuery<{ PermissionSetId: string; cnt: number }>(opts,
      `SELECT PermissionSetId, COUNT(Id) cnt FROM PermissionSetAssignment GROUP BY PermissionSetId`
    );
    const countMap = new Map(assignmentCounts.map(a => [a.PermissionSetId, a.cnt]));

    const permissionSets = permSetResults.map(ps => ({
      id: ps.Id,
      name: ps.Name,
      label: ps.Label,
      description: ps.Description,
      isOwnedByProfile: ps.IsOwnedByProfile,
      modifyAllData: ps.PermissionsModifyAllData,
      viewAllData: ps.PermissionsViewAllData,
      authorApex: ps.PermissionsAuthorApex,
      manageUsers: ps.PermissionsManageUsers,
      apiEnabled: ps.PermissionsApiEnabled,
      assigneeCount: countMap.get(ps.Id) || 0,
    }));

    // Fetch high risk users
    const highRiskResults = await getHighRiskUsers(opts) as HighRiskUserRecord[];
    const highRiskUsers = highRiskResults.map(hr => ({
      userId: hr.AssigneeId,
      userName: hr.Assignee.Name,
      username: hr.Assignee.Username,
      isActive: hr.Assignee.IsActive,
      profile: hr.Assignee.Profile?.Name || null,
      permissionSetName: hr.PermissionSet.Name,
      permissionSetLabel: hr.PermissionSet.Label,
      hasModifyAll: hr.PermissionSet.PermissionsModifyAllData,
      hasViewAll: hr.PermissionSet.PermissionsViewAllData,
      hasAuthorApex: hr.PermissionSet.PermissionsAuthorApex,
    }));

    // Fetch profile permissions
    const profileResults = await salesforceQuery<ProfilePermRecord>(opts,
      `SELECT Id, Name, UserType, PermissionsApiEnabled, PermissionsModifyAllData, PermissionsViewAllData FROM Profile LIMIT 200`
    );

    // Get user counts per profile
    const profileUserCounts = await salesforceQuery<{ ProfileId: string; cnt: number }>(opts,
      `SELECT ProfileId, COUNT(Id) cnt FROM User WHERE IsActive = true GROUP BY ProfileId`
    );
    const profileCountMap = new Map(profileUserCounts.map(p => [p.ProfileId, p.cnt]));

    const profiles = profileResults.map(p => ({
      id: p.Id,
      name: p.Name,
      userType: p.UserType,
      apiEnabled: p.PermissionsApiEnabled,
      modifyAllData: p.PermissionsModifyAllData,
      viewAllData: p.PermissionsViewAllData,
      userCount: profileCountMap.get(p.Id) || 0,
    }));

    // Summary
    const highRiskPermSets = permissionSets.filter(ps => ps.modifyAllData || ps.viewAllData || ps.authorApex);
    const uniqueModifyAllUsers = new Set(highRiskUsers.filter(u => u.hasModifyAll).map(u => u.userId));
    const uniqueViewAllUsers = new Set(highRiskUsers.filter(u => u.hasViewAll).map(u => u.userId));

    return NextResponse.json({
      permissionSets,
      highRiskUsers,
      profiles,
      summary: {
        totalPermissionSets: permissionSets.length,
        highRiskPermissionSets: highRiskPermSets.length,
        usersWithModifyAll: uniqueModifyAllUsers.size,
        usersWithViewAll: uniqueViewAllUsers.size,
      },
    });
  } catch (error) {
    console.error('[Salesforce] Failed to fetch permissions:', error);
    return NextResponse.json({ error: 'Failed to fetch permissions data' }, { status: 500 });
  }
}
