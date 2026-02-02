import { NextResponse } from 'next/server';
import { getSession } from '@/lib/stateless-session';
import { salesforceQuery } from '@/lib/salesforce';

interface UserRecord {
  Id: string;
  Username: string;
  Name: string;
  Email: string;
  Profile?: { Name: string } | null;
  IsActive: boolean;
  LastLoginDate: string | null;
}

interface PermAssignRecord {
  AssigneeId: string;
  PermissionSet: {
    PermissionsModifyAllData: boolean;
    PermissionsViewAllData: boolean;
    PermissionsAuthorApex: boolean;
    PermissionsManageUsers: boolean;
  };
}

interface RiskFactor {
  factor: string;
  description: string;
  points: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

function calculateRiskScore(user: UserRecord, permissions: PermAssignRecord[]): { score: number; factors: RiskFactor[] } {
  const factors: RiskFactor[] = [];
  let score = 0;

  // Check permissions
  const userPerms = permissions.filter(p => p.AssigneeId === user.Id);
  const hasModifyAll = userPerms.some(p => p.PermissionSet.PermissionsModifyAllData);
  const hasViewAll = userPerms.some(p => p.PermissionSet.PermissionsViewAllData);
  const hasAuthorApex = userPerms.some(p => p.PermissionSet.PermissionsAuthorApex);
  const hasManageUsers = userPerms.some(p => p.PermissionSet.PermissionsManageUsers);

  if (hasModifyAll) {
    score += 40;
    factors.push({
      factor: 'ModifyAllData',
      description: 'User has permission to modify all data in the org',
      points: 40,
      severity: 'critical',
    });
  }

  if (hasViewAll) {
    score += 20;
    factors.push({
      factor: 'ViewAllData',
      description: 'User has permission to view all data in the org',
      points: 20,
      severity: 'high',
    });
  }

  if (hasAuthorApex) {
    score += 25;
    factors.push({
      factor: 'AuthorApex',
      description: 'User can create and edit Apex code',
      points: 25,
      severity: 'high',
    });
  }

  if (hasManageUsers) {
    score += 15;
    factors.push({
      factor: 'ManageUsers',
      description: 'User can manage other users',
      points: 15,
      severity: 'medium',
    });
  }

  // Check last login
  if (!user.LastLoginDate) {
    score += 10;
    factors.push({
      factor: 'NeverLoggedIn',
      description: 'User has never logged in but has active permissions',
      points: 10,
      severity: 'medium',
    });
  } else {
    const daysSinceLogin = Math.floor((Date.now() - new Date(user.LastLoginDate).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceLogin > 90) {
      score += 10;
      factors.push({
        factor: 'InactiveUser',
        description: `User has not logged in for ${daysSinceLogin} days`,
        points: 10,
        severity: 'medium',
      });
    }
  }

  return { score, factors };
}

function getRiskLevel(score: number): 'critical' | 'high' | 'medium' | 'low' {
  if (score >= 60) return 'critical';
  if (score >= 40) return 'high';
  if (score >= 20) return 'medium';
  return 'low';
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const opts = { accessToken: session.accessToken, instanceUrl: session.instanceUrl };

    // Get active users
    const users = await salesforceQuery<UserRecord>(opts,
      `SELECT Id, Username, Name, Email, Profile.Name, IsActive, LastLoginDate
       FROM User
       WHERE IsActive = true
       ORDER BY Name LIMIT 500`
    );

    // Get permission set assignments with high-risk permissions
    const permAssignments = await salesforceQuery<PermAssignRecord>(opts,
      `SELECT AssigneeId, PermissionSet.PermissionsModifyAllData,
              PermissionSet.PermissionsViewAllData, PermissionSet.PermissionsAuthorApex,
              PermissionSet.PermissionsManageUsers
       FROM PermissionSetAssignment
       WHERE PermissionSet.PermissionsModifyAllData = true
          OR PermissionSet.PermissionsViewAllData = true
          OR PermissionSet.PermissionsAuthorApex = true
          OR PermissionSet.PermissionsManageUsers = true`
    );

    // Calculate risk scores
    const userRiskScores = users.map(user => {
      const { score, factors } = calculateRiskScore(user, permAssignments);
      return {
        userId: user.Id,
        username: user.Username,
        name: user.Name,
        email: user.Email,
        profile: user.Profile?.Name || null,
        isActive: user.IsActive,
        riskScore: score,
        riskLevel: getRiskLevel(score),
        riskFactors: factors,
        lastLoginDate: user.LastLoginDate,
      };
    });

    // Sort by risk score descending
    userRiskScores.sort((a, b) => b.riskScore - a.riskScore);

    return NextResponse.json({ users: userRiskScores });
  } catch (error) {
    console.error('[Salesforce] Failed to fetch user risk scores:', error);
    return NextResponse.json({ error: 'Failed to fetch user risk scores' }, { status: 500 });
  }
}
