import { NextResponse } from 'next/server';
import { getSession } from '@/lib/stateless-session';
import { getRecentUsers } from '@/lib/salesforce';
import { handleApiError } from '@/lib/api-error';

interface SalesforceUserRecord {
  Id: string;
  Username: string;
  Name: string;
  Email: string;
  IsActive: boolean;
  UserType: string;
  Profile?: { Name: string } | null;
  LastLoginDate: string | null;
  CreatedDate: string;
  Department: string | null;
  Title: string | null;
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const rawUsers = await getRecentUsers(
      { accessToken: session.accessToken, instanceUrl: session.instanceUrl },
      Math.min(limit, 200)
    ) as SalesforceUserRecord[];

    const users = (rawUsers || []).map(u => ({
      id: u.Id,
      username: u.Username,
      name: u.Name,
      email: u.Email,
      isActive: u.IsActive,
      userType: u.UserType,
      profile: u.Profile?.Name || null,
      lastLoginDate: u.LastLoginDate,
      createdDate: u.CreatedDate,
      department: u.Department,
      title: u.Title,
      photoUrl: null,
    }));

    return NextResponse.json({ users });
  } catch (error) {
    return handleApiError(error, 'fetch users');
  }
}
