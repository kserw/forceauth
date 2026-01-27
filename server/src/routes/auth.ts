import { Router, type Request, type Response } from 'express';
import { config } from '../config/index.js';
import {
  generateAuthUrl,
  validateAndConsumeState,
  exchangeCodeForTokens,
  getUserInfo,
  revokeToken,
  refreshAccessToken,
  linkOrgIdToCredentials,
} from '../services/salesforce.js';
import { getOrganization } from '../services/salesforceApi.js';
import {
  generateSessionId,
  setSession,
  getSession,
  deleteSession,
  updateSessionTokens,
  getSessionUserId,
} from '../services/tokenStore.js';
import { findOrCreateUser, getUserById } from '../services/userStore.js';
import { claimOrgCredentials, claimAllPendingOrgCredentials } from '../services/credentialsStore.js';
import type { SalesforceEnvironment } from '../types/index.js';

const router = Router();

const COOKIE_NAME = 'forceauth_session';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
};

// Helper to generate popup callback HTML
function generatePopupCallbackHtml(success: boolean, error?: string): string {
  const message = success
    ? JSON.stringify({ type: 'forceauth_oauth_success' })
    : JSON.stringify({ type: 'forceauth_oauth_error', error: error || 'Unknown error' });

  const statusIcon = success
    ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
    : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

  return `<!DOCTYPE html>
<html>
<head>
  <title>forceauth ${success ? '// authenticated' : '// error'}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }

    body {
      font-family: 'Geist Mono', 'SF Mono', 'Consolas', monospace;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: hsl(0 0% 2%);
      color: hsl(0 0% 92%);
      font-size: 13px;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }

    .container {
      text-align: center;
      padding: 2.5rem;
      background: hsl(0 0% 4%);
      border: 1px solid hsl(0 0% 10%);
      border-radius: 6px;
      box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.5);
      max-width: 320px;
    }

    .icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.25rem;
      ${success
        ? 'background: hsl(142 72% 10%); color: hsl(142 72% 42%); box-shadow: 0 0 20px -5px hsl(142 72% 42% / 0.25);'
        : 'background: hsl(0 72% 10%); color: hsl(0 72% 50%);'}
    }

    .terminal-line {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }

    .prompt {
      color: hsl(0 0% 50%);
    }

    .command {
      color: hsl(0 0% 92%);
    }

    .status {
      font-size: 11px;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      ${success
        ? 'background: hsl(142 72% 10%); color: hsl(142 72% 42%);'
        : 'background: hsl(0 72% 10%); color: hsl(0 72% 50%);'}
    }

    .message {
      color: hsl(0 0% 50%);
      font-size: 12px;
      margin-top: 1rem;
    }

    .error-detail {
      color: hsl(0 72% 50%);
      font-size: 11px;
      margin-top: 0.75rem;
      padding: 0.5rem;
      background: hsl(0 72% 10%);
      border-radius: 4px;
      word-break: break-word;
    }

    .cursor {
      display: inline-block;
      width: 8px;
      height: 14px;
      background: hsl(0 0% 92%);
      margin-left: 2px;
      animation: blink 1s step-end infinite;
    }

    @keyframes blink {
      0%, 50% { opacity: 1; }
      51%, 100% { opacity: 0; }
    }

    .progress {
      margin-top: 1.25rem;
      height: 2px;
      background: hsl(0 0% 10%);
      border-radius: 1px;
      overflow: hidden;
    }

    .progress-bar {
      height: 100%;
      background: ${success ? 'hsl(142 72% 42%)' : 'hsl(0 72% 50%)'};
      animation: progress 1.5s ease-out forwards;
    }

    @keyframes progress {
      from { width: 0%; }
      to { width: 100%; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">${statusIcon}</div>

    <div class="terminal-line">
      <span class="prompt">$</span>
      <span class="command">auth ${success ? '--success' : '--failed'}</span>
    </div>

    <div class="status">${success ? 'authenticated' : 'error'}</div>

    ${!success && error ? `<div class="error-detail">${error}</div>` : ''}

    <div class="message">
      ${success ? 'closing window' : 'redirecting'}<span class="cursor"></span>
    </div>

    <div class="progress">
      <div class="progress-bar"></div>
    </div>
  </div>

  <script>
    if (window.opener) {
      window.opener.postMessage(${message}, '${config.frontendUrl}');
      setTimeout(() => window.close(), 1500);
    } else {
      setTimeout(() => {
        window.location.href = '${config.frontendUrl}${success ? '' : '?error=' + encodeURIComponent(error || 'Authentication failed')}';
      }, 1500);
    }
  </script>
</body>
</html>`;
}

// GET /api/auth/login - Initiate OAuth flow
router.get('/login', (req: Request, res: Response) => {
  const environment = (req.query.env as SalesforceEnvironment) || 'production';
  const returnUrl = (req.query.returnUrl as string) || '/';
  const popup = req.query.popup === 'true';
  const orgId = req.query.orgId as string | undefined; // Optional: use specific org's credentials

  if (environment !== 'production' && environment !== 'sandbox') {
    res.status(400).json({ error: 'Invalid environment. Must be "production" or "sandbox".' });
    return;
  }

  try {
    const authUrl = generateAuthUrl({
      environment,
      returnUrl,
      popup,
      orgCredentialsId: orgId,
    });
    res.redirect(authUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Configuration error';
    if (popup) {
      res.send(generatePopupCallbackHtml(false, message));
    } else {
      res.redirect(`${config.frontendUrl}?error=${encodeURIComponent(message)}`);
    }
  }
});

// GET /api/auth/callback - OAuth callback
router.get('/callback', async (req: Request, res: Response) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    console.error('OAuth error:', error, error_description);
    const errorMsg = String(error_description || error);
    res.redirect(`${config.frontendUrl}?error=${encodeURIComponent(errorMsg)}`);
    return;
  }

  if (!code || !state) {
    res.redirect(`${config.frontendUrl}?error=${encodeURIComponent('Missing code or state')}`);
    return;
  }

  const stateData = validateAndConsumeState(String(state));
  if (!stateData) {
    res.redirect(`${config.frontendUrl}?error=${encodeURIComponent('Invalid or expired state')}`);
    return;
  }

  try {
    const tokens = await exchangeCodeForTokens(String(code), stateData);
    const userInfo = await getUserInfo(tokens.accessToken, tokens.instanceUrl);

    // Fetch the organization name
    const tempSession = {
      tokens,
      userInfo,
      environment: stateData.environment,
    };
    const org = await getOrganization(tempSession);
    if (org) {
      userInfo.orgName = org.Name;
      console.log('[auth/callback] Fetched org name:', org.Name);
    }

    // If using org credentials, link the Salesforce Org ID
    if (stateData.orgCredentialsId) {
      linkOrgIdToCredentials(stateData.orgCredentialsId, userInfo.organizationId);
    }

    // Find or create user based on Salesforce identity
    const user = findOrCreateUser(userInfo.id, userInfo.email, userInfo.displayName);

    // Claim the org credentials if they were pending (pre-login registration)
    if (stateData.orgCredentialsId) {
      claimOrgCredentials(stateData.orgCredentialsId, user.id);
    }

    // Also claim any other pending org credentials this user may have created before login
    const claimedCount = claimAllPendingOrgCredentials(user.id);
    if (claimedCount > 0) {
      console.log(`[auth/callback] Claimed ${claimedCount} pending org credentials for user ${user.id}`);
    }

    const sessionId = generateSessionId();
    setSession(sessionId, {
      userId: user.id,
      orgCredentialsId: stateData.orgCredentialsId,
      tokens,
      userInfo,
      environment: stateData.environment,
    });

    res.cookie(COOKIE_NAME, sessionId, COOKIE_OPTIONS);

    if (stateData.popup) {
      res.send(generatePopupCallbackHtml(true));
    } else {
      res.redirect(config.frontendUrl + stateData.returnUrl);
    }
  } catch (err) {
    console.error('OAuth callback error:', err);
    const message = err instanceof Error ? err.message : 'Authentication failed';

    if (stateData.popup) {
      res.send(generatePopupCallbackHtml(false, message));
    } else {
      res.redirect(`${config.frontendUrl}?error=${encodeURIComponent(message)}`);
    }
  }
});

// GET /api/auth/status - Check authentication status
router.get('/status', async (req: Request, res: Response) => {
  const sessionId = req.cookies[COOKIE_NAME];

  if (!sessionId) {
    res.json({ authenticated: false });
    return;
  }

  const session = getSession(sessionId);
  if (!session) {
    res.clearCookie(COOKIE_NAME);
    res.json({ authenticated: false });
    return;
  }

  // Check if token might be expired (issued more than 1 hour ago)
  const tokenAge = Date.now() - session.tokens.issuedAt;
  if (tokenAge > 55 * 60 * 1000) {
    try {
      const newTokens = await refreshAccessToken(
        session.tokens.refreshToken,
        session.environment
      );
      updateSessionTokens(sessionId, newTokens.accessToken, newTokens.refreshToken);
    } catch (err) {
      console.error('Token refresh failed:', err);
      deleteSession(sessionId);
      res.clearCookie(COOKIE_NAME);
      res.json({ authenticated: false });
      return;
    }
  }

  // Fetch user info from users table
  const dbUser = getUserById(session.userId);

  console.log('[auth/status] session.userInfo:', JSON.stringify(session.userInfo, null, 2));

  const userInfo = dbUser ? {
    id: dbUser.salesforceUserId,
    username: dbUser.email || '',
    displayName: dbUser.name || '',
    email: dbUser.email || '',
    organizationId: session.userInfo.organizationId || '',
    orgName: session.userInfo.orgName,
  } : session.userInfo;

  console.log('[auth/status] Returning userInfo:', JSON.stringify(userInfo, null, 2));

  res.json({
    authenticated: true,
    userId: session.userId,
    user: userInfo,
    environment: session.environment,
    instanceUrl: session.tokens.instanceUrl,
    orgCredentialsId: session.orgCredentialsId || null,
  });
});

// POST /api/auth/logout - Log out
router.post('/logout', async (req: Request, res: Response) => {
  const sessionId = req.cookies[COOKIE_NAME];

  if (sessionId) {
    const session = getSession(sessionId);
    if (session) {
      try {
        await revokeToken(session.tokens.accessToken, session.environment);
      } catch (err) {
        console.error('Token revocation failed:', err);
      }
      deleteSession(sessionId);
    }
  }

  res.clearCookie(COOKIE_NAME);
  res.json({ success: true });
});

// POST /api/auth/refresh - Manually refresh token
router.post('/refresh', async (req: Request, res: Response) => {
  const sessionId = req.cookies[COOKIE_NAME];

  if (!sessionId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const session = getSession(sessionId);
  if (!session) {
    res.clearCookie(COOKIE_NAME);
    res.status(401).json({ error: 'Session not found' });
    return;
  }

  try {
    const newTokens = await refreshAccessToken(
      session.tokens.refreshToken,
      session.environment
    );
    updateSessionTokens(sessionId, newTokens.accessToken, newTokens.refreshToken);
    res.json({ success: true });
  } catch (err) {
    console.error('Token refresh failed:', err);
    deleteSession(sessionId);
    res.clearCookie(COOKIE_NAME);
    res.status(401).json({ error: 'Token refresh failed' });
  }
});

export default router;
