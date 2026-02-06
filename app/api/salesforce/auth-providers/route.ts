import { NextResponse } from 'next/server';
import { getSession } from '@/lib/stateless-session';
import { getAuthProviders } from '@/lib/salesforce';
import { handleApiError } from '@/lib/api-error';

interface AuthProviderRecord {
  Id: string;
  DeveloperName: string;
  FriendlyName: string;
  ProviderType: string;
  ExecutionUserId: string | null;
  RegistrationHandlerId: string | null;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const results = await getAuthProviders({
      accessToken: session.accessToken,
      instanceUrl: session.instanceUrl,
    }) as AuthProviderRecord[];

    const providers = (results || []).map(p => ({
      Id: p.Id,
      DeveloperName: p.DeveloperName,
      FriendlyName: p.FriendlyName,
      ProviderType: p.ProviderType,
      ExecutionUserId: p.ExecutionUserId,
      RegistrationHandlerId: p.RegistrationHandlerId,
    }));

    return NextResponse.json({ providers });
  } catch (error) {
    return handleApiError(error, 'fetch auth providers');
  }
}
