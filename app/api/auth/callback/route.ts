import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  validateOAuthState,
  exchangeCodeForTokens,
} from '@/lib/stateless-oauth';
import {
  createSessionCookie,
  COOKIE_OPTIONS,
  type SessionData,
} from '@/lib/stateless-session';

const COOKIE_NAME = 'forceauth_session';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle OAuth error
    if (error) {
      console.error('[Auth] OAuth error:', error, errorDescription);
      return createErrorResponse(errorDescription || error, false);
    }

    if (!code || !state) {
      return createErrorResponse('Missing code or state', false);
    }

    // Validate OAuth state (contains the PKCE code_verifier)
    const oauthState = validateOAuthState(state);
    if (!oauthState) {
      return createErrorResponse('Invalid or expired state', false);
    }

    // Exchange code for tokens using PKCE (no client secret needed!)
    const tokens = await exchangeCodeForTokens({
      code,
      environment: oauthState.environment,
      clientId: oauthState.clientId,
      codeVerifier: oauthState.codeVerifier, // PKCE verifier from signed state
      redirectUri: oauthState.redirectUri,
    });

    // Extract user ID from the ID URL
    // Format: https://login.salesforce.com/id/00D.../005...
    const idParts = tokens.id.split('/');
    const salesforceOrgId = idParts[idParts.length - 2];
    const salesforceUserId = idParts[idParts.length - 1];

    // Fetch user info from Salesforce
    const userInfoResponse = await fetch(tokens.id, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    let userEmail = '';
    let userName = '';
    let displayName = '';

    if (userInfoResponse.ok) {
      const userInfo = await userInfoResponse.json();
      userEmail = userInfo.email || '';
      userName = userInfo.username || userInfo.email || '';
      displayName = userInfo.display_name || userInfo.name || '';
    }

    // Create session data (store clientId for token refresh)
    const sessionData: SessionData = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      instanceUrl: tokens.instance_url,
      environment: oauthState.environment,
      issuedAt: Date.now(),
      userId: salesforceUserId,
      username: userName,
      displayName,
      email: userEmail,
      orgId: salesforceOrgId,
      clientId: oauthState.clientId, // Store for refresh token requests
    };

    // Create encrypted session cookie
    const sessionCookie = createSessionCookie(sessionData);

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, sessionCookie, COOKIE_OPTIONS);

    // Handle popup or redirect
    if (oauthState.popup) {
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
          <head>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
                background: #0a0a0a;
                color: #fafafa;
                height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .container {
                text-align: center;
                padding: 2rem;
              }
              .check {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background: rgba(34, 197, 94, 0.1);
                border: 2px solid #22c55e;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 1rem;
              }
              .check svg { color: #22c55e; }
              h1 { font-size: 1.25rem; margin-bottom: 0.5rem; }
              p { font-size: 0.75rem; color: #a1a1aa; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="check">
                <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <h1>// authenticated</h1>
              <p>closing window...</p>
            </div>
            <script>
              setTimeout(() => {
                if (window.opener) {
                  window.opener.postMessage({ type: 'forceauth_oauth_success' }, window.location.origin);
                  window.close();
                } else {
                  window.location.href = '${oauthState.returnUrl || '/dashboard'}';
                }
              }, 1000);
            </script>
          </body>
        </html>`,
        {
          headers: {
            'Content-Type': 'text/html',
            'Set-Cookie': `${COOKIE_NAME}=${sessionCookie}; Path=/; HttpOnly; ${
              process.env.NODE_ENV === 'production' ? 'Secure; ' : ''
            }SameSite=Lax; Max-Age=${COOKIE_OPTIONS.maxAge}`,
          },
        }
      );
    }

    // Redirect to return URL
    const returnUrl = oauthState.returnUrl || '/dashboard';
    return NextResponse.redirect(new URL(returnUrl, request.url));
  } catch (error) {
    console.error('[Auth] Callback error:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Authentication failed',
      false
    );
  }
}

function createErrorResponse(message: string, isPopup: boolean): NextResponse {
  if (isPopup) {
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'forceauth_oauth_error', error: '${message.replace(/'/g, "\\'")}' }, window.location.origin);
              window.close();
            } else {
              document.body.innerHTML = '<p>Error: ${message.replace(/'/g, "\\'")}</p>';
            }
          </script>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  return NextResponse.redirect(
    new URL(
      `/dashboard?error=${encodeURIComponent(message)}`,
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    )
  );
}
