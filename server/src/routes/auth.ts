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
  rotateSession,
} from '../services/tokenStore.js';
import { findOrCreateUser, getUserById } from '../services/userStore.js';
import { claimOrgCredentials, claimAllPendingOrgCredentials } from '../services/credentialsStore.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { logLoginSuccess, logLoginFailed, logLogout } from '../services/auditLog.js';
import { getCsrfTokenForSession } from '../middleware/csrf.js';
import type { SalesforceEnvironment } from '../types/index.js';

const router = Router();

const COOKIE_NAME = 'forceauth_session';
const isProduction = process.env.NODE_ENV === 'production';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
  maxAge: config.session.maxAge,
  path: '/api',
};

// Helper to get client info from request
function getClientInfo(req: Request): { ipAddress: string; userAgent: string } {
  const forwarded = req.headers['x-forwarded-for'];
  const ipAddress = forwarded
    ? (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',')[0].trim()
    : req.ip || req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  return { ipAddress, userAgent };
}

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

// GET /api/auth/login - Initiate OAuth flow (rate limited)
router.get('/login', authRateLimiter, async (req: Request, res: Response) => {
  const environment = (req.query.env as SalesforceEnvironment) || 'production';
  const returnUrl = (req.query.returnUrl as string) || '/';
  const popup = req.query.popup === 'true';
  const orgId = req.query.orgId as string | undefined;
  const { ipAddress, userAgent } = getClientInfo(req);

  if (environment !== 'production' && environment !== 'sandbox') {
    res.status(400).json({ error: 'Invalid environment. Must be "production" or "sandbox".' });
    return;
  }

  try {
    const authUrl = await generateAuthUrl({
      environment,
      returnUrl,
      popup,
      orgCredentialsId: orgId,
      ipAddress,
      userAgent,
    });
    res.redirect(authUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Configuration error';
    await logLoginFailed(ipAddress, userAgent, { error: message, environment });
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
  const { ipAddress, userAgent } = getClientInfo(req);

  if (error) {
    console.error('OAuth error:', error, error_description);
    const errorMsg = String(error_description || error);
    await logLoginFailed(ipAddress, userAgent, { error: errorMsg });
    res.redirect(`${config.frontendUrl}?error=${encodeURIComponent(errorMsg)}`);
    return;
  }

  if (!code || !state) {
    await logLoginFailed(ipAddress, userAgent, { error: 'Missing code or state' });
    res.redirect(`${config.frontendUrl}?error=${encodeURIComponent('Missing code or state')}`);
    return;
  }

  const stateData = await validateAndConsumeState(String(state), ipAddress);
  if (!stateData) {
    await logLoginFailed(ipAddress, userAgent, { error: 'Invalid or expired state' });
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
      await linkOrgIdToCredentials(stateData.orgCredentialsId, userInfo.organizationId);
    }

    // Find or create user based on Salesforce identity
    const user = await findOrCreateUser(userInfo.id, userInfo.email, userInfo.displayName);

    // Claim the org credentials if they were pending (pre-login registration)
    if (stateData.orgCredentialsId) {
      await claimOrgCredentials(stateData.orgCredentialsId, user.id);
    }

    // Also claim any other pending org credentials this user may have created before login
    const claimedCount = await claimAllPendingOrgCredentials(user.id);
    if (claimedCount > 0) {
      console.log(`[auth/callback] Claimed ${claimedCount} pending org credentials for user ${user.id}`);
    }

    const sessionId = generateSessionId();
    const csrfToken = await setSession(sessionId, {
      userId: user.id,
      orgCredentialsId: stateData.orgCredentialsId,
      tokens,
      userInfo,
      environment: stateData.environment,
    }, ipAddress, userAgent);

    // Log successful login
    await logLoginSuccess(user.id, sessionId, ipAddress, userAgent, {
      environment: stateData.environment,
      orgCredentialsId: stateData.orgCredentialsId,
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
    await logLoginFailed(ipAddress, userAgent, { error: message });

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

  const session = await getSession(sessionId);
  if (!session) {
    res.clearCookie(COOKIE_NAME, { path: '/api' });
    res.json({ authenticated: false });
    return;
  }

  // Check if token might be expired (issued more than 55 minutes ago)
  const tokenAge = Date.now() - session.tokens.issuedAt;
  if (tokenAge > 55 * 60 * 1000) {
    try {
      const newTokens = await refreshAccessToken(
        session.tokens.refreshToken,
        session.environment
      );
      await updateSessionTokens(sessionId, newTokens.accessToken, newTokens.refreshToken);
    } catch (err) {
      console.error('Token refresh failed:', err);
      await deleteSession(sessionId);
      res.clearCookie(COOKIE_NAME, { path: '/api' });
      res.json({ authenticated: false });
      return;
    }
  }

  // Fetch user info from users table
  const dbUser = await getUserById(session.userId);

  const userInfo = dbUser ? {
    id: dbUser.salesforceUserId,
    username: dbUser.email || '',
    displayName: dbUser.name || '',
    email: dbUser.email || '',
    organizationId: session.userInfo.organizationId || '',
    orgName: session.userInfo.orgName,
  } : session.userInfo;

  // Include CSRF token in response
  const csrfToken = await getCsrfTokenForSession(sessionId);

  res.json({
    authenticated: true,
    userId: session.userId,
    user: userInfo,
    environment: session.environment,
    instanceUrl: session.tokens.instanceUrl,
    orgCredentialsId: session.orgCredentialsId || null,
    csrfToken,
  });
});

// POST /api/auth/logout - Log out
router.post('/logout', async (req: Request, res: Response) => {
  const sessionId = req.cookies[COOKIE_NAME];
  const { ipAddress, userAgent } = getClientInfo(req);

  if (sessionId) {
    const session = await getSession(sessionId);
    if (session) {
      try {
        await revokeToken(session.tokens.accessToken, session.environment);
      } catch (err) {
        console.error('Token revocation failed:', err);
      }
      await logLogout(session.userId, sessionId, ipAddress, userAgent);
      await deleteSession(sessionId);
    }
  }

  res.clearCookie(COOKIE_NAME, { path: '/api' });
  res.json({ success: true });
});

// POST /api/auth/refresh - Manually refresh token
router.post('/refresh', async (req: Request, res: Response) => {
  const sessionId = req.cookies[COOKIE_NAME];
  const { ipAddress, userAgent } = getClientInfo(req);

  if (!sessionId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const session = await getSession(sessionId);
  if (!session) {
    res.clearCookie(COOKIE_NAME, { path: '/api' });
    res.status(401).json({ error: 'Session not found' });
    return;
  }

  try {
    const newTokens = await refreshAccessToken(
      session.tokens.refreshToken,
      session.environment
    );
    await updateSessionTokens(sessionId, newTokens.accessToken, newTokens.refreshToken);

    // Optionally rotate session on token refresh for extra security
    const rotated = await rotateSession(sessionId, ipAddress, userAgent);
    if (rotated) {
      res.cookie(COOKIE_NAME, rotated.newSessionId, COOKIE_OPTIONS);
      res.json({ success: true, csrfToken: rotated.csrfToken });
    } else {
      res.json({ success: true });
    }
  } catch (err) {
    console.error('Token refresh failed:', err);
    await deleteSession(sessionId);
    res.clearCookie(COOKIE_NAME, { path: '/api' });
    res.status(401).json({ error: 'Token refresh failed' });
  }
});

export default router;
