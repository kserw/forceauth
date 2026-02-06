import { NextResponse } from 'next/server';
import { getSession } from '@/lib/stateless-session';
import { getIntegrationUsers, getOAuthTokens, getInstalledPackages, getNamedCredentials } from '@/lib/salesforce';
import { handleApiError } from '@/lib/api-error';

interface IntegrationUserRecord {
  Id: string;
  Username: string;
  Name: string;
  UserType: string;
  Profile?: { Name: string } | null;
  LastLoginDate: string | null;
  IsActive: boolean;
  CreatedDate: string;
}

interface OAuthTokenRecord {
  Id: string;
  AppName: string;
  UserId: string;
  LastUsedDate: string | null;
  UseCount: number | null;
}

interface InstalledPackageRecord {
  Id: string;
  SubscriberPackage?: { Name: string; NamespacePrefix: string } | null;
  SubscriberPackageVersion?: { Name: string } | null;
}

interface NamedCredentialRecord {
  Id: string;
  DeveloperName: string;
  MasterLabel: string;
  Endpoint: string | null;
  PrincipalType: string | null;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const opts = { accessToken: session.accessToken, instanceUrl: session.instanceUrl };

    // Fetch all integration data in parallel
    const [integrationUserResults, oauthTokenResults, packageResults, credentialResults] = await Promise.all([
      getIntegrationUsers(opts) as Promise<IntegrationUserRecord[]>,
      getOAuthTokens(opts) as Promise<OAuthTokenRecord[]>,
      getInstalledPackages(opts) as Promise<InstalledPackageRecord[]>,
      getNamedCredentials(opts) as Promise<NamedCredentialRecord[]>,
    ]);

    const integrationUsers = integrationUserResults.map(u => ({
      id: u.Id,
      username: u.Username,
      name: u.Name,
      userType: u.UserType,
      profile: u.Profile?.Name || null,
      lastLoginDate: u.LastLoginDate,
      isActive: u.IsActive,
      createdDate: u.CreatedDate,
    }));

    const oauthTokens = oauthTokenResults.map(t => ({
      id: t.Id,
      appName: t.AppName,
      userId: t.UserId,
      lastUsedDate: t.LastUsedDate,
      useCount: t.UseCount,
    }));

    const installedPackages = packageResults.map(p => ({
      id: p.Id,
      name: p.SubscriberPackage?.Name || 'Unknown',
      namespace: p.SubscriberPackage?.NamespacePrefix || null,
      description: null,
      version: p.SubscriberPackageVersion?.Name || null,
    }));

    const namedCredentials = credentialResults.map(nc => ({
      id: nc.Id,
      developerName: nc.DeveloperName,
      label: nc.MasterLabel,
      endpoint: nc.Endpoint,
      principalType: nc.PrincipalType,
    }));

    return NextResponse.json({
      integrationUsers,
      oauthTokens,
      installedPackages,
      namedCredentials,
    });
  } catch (error) {
    return handleApiError(error, 'fetch integrations');
  }
}
