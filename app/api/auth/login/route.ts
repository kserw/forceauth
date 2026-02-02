import { NextRequest, NextResponse } from 'next/server';
import {
  generateAuthUrl,
  type SalesforceEnvironment,
} from '@/lib/stateless-oauth';

// POST /api/auth/login - Initiate PKCE OAuth flow
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      clientId,
      redirectUri,
      environment = 'production',
      returnUrl = '/',
      popup = false,
    } = body;

    // PKCE flow only requires clientId and redirectUri (no secret!)
    if (!clientId || !redirectUri) {
      return NextResponse.json(
        { error: 'clientId and redirectUri are required' },
        { status: 400 }
      );
    }

    // Generate auth URL with PKCE challenge
    // The code_verifier is stored in the signed state for the callback to use
    const { authUrl } = generateAuthUrl({
      environment: environment as SalesforceEnvironment,
      clientId,
      redirectUri,
      returnUrl,
      popup,
    });

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('[Auth] Login initiation failed:', error);
    return NextResponse.json(
      { error: 'Failed to initiate login' },
      { status: 500 }
    );
  }
}

// GET /api/auth/login - Direct browser redirect for PKCE OAuth
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const redirectUri = searchParams.get('redirectUri');
    const environment = (searchParams.get('env') || 'production') as SalesforceEnvironment;
    const returnUrl = searchParams.get('returnUrl') || '/';
    const popup = searchParams.get('popup') === 'true';

    if (!clientId || !redirectUri) {
      return NextResponse.json(
        { error: 'clientId and redirectUri are required' },
        { status: 400 }
      );
    }

    const { authUrl } = generateAuthUrl({
      environment,
      clientId,
      redirectUri,
      returnUrl,
      popup,
    });

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('[Auth] Login initiation failed:', error);
    return NextResponse.json(
      { error: 'Failed to initiate login' },
      { status: 500 }
    );
  }
}
