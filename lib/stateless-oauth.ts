import crypto from 'crypto';

const HMAC_SECRET = process.env.CSRF_SECRET || 'default-secret-change-in-production';
const STATE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

export type SalesforceEnvironment = 'production' | 'sandbox';

export interface OAuthStateData {
  environment: SalesforceEnvironment;
  returnUrl: string;
  popup: boolean;
  clientId: string;
  redirectUri: string;
  codeVerifier: string; // PKCE: stored in signed state
  expiresAt: number;
}

// =============================================================================
// PKCE HELPERS
// =============================================================================

// Generate a cryptographically random code verifier (43-128 characters)
export function generateCodeVerifier(): string {
  // 32 bytes = 43 characters in base64url
  return crypto.randomBytes(32).toString('base64url');
}

// Generate code challenge from verifier using SHA256
export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

// =============================================================================
// HMAC STATE SIGNING
// =============================================================================

// Generate HMAC signature
function generateHmac(data: string): string {
  return crypto.createHmac('sha256', HMAC_SECRET).update(data).digest('hex');
}

// Create a signed OAuth state (no database needed)
export function createOAuthState(data: Omit<OAuthStateData, 'expiresAt'>): string {
  const stateData: OAuthStateData = {
    ...data,
    expiresAt: Date.now() + STATE_EXPIRY_MS,
  };

  const payload = Buffer.from(JSON.stringify(stateData)).toString('base64url');
  const signature = generateHmac(payload);

  return `${payload}.${signature}`;
}

// Validate and parse OAuth state
export function validateOAuthState(state: string): OAuthStateData | null {
  try {
    const [payload, signature] = state.split('.');

    if (!payload || !signature) {
      console.error('[OAuth] Invalid state format');
      return null;
    }

    // Verify signature
    const expectedSignature = generateHmac(payload);
    if (signature !== expectedSignature) {
      console.error('[OAuth] Invalid state signature');
      return null;
    }

    // Parse payload
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as OAuthStateData;

    // Check expiry
    if (Date.now() > data.expiresAt) {
      console.error('[OAuth] State expired');
      return null;
    }

    return data;
  } catch (error) {
    console.error('[OAuth] Failed to validate state:', error);
    return null;
  }
}

// =============================================================================
// SALESFORCE OAUTH URLS
// =============================================================================

export function getSalesforceAuthUrl(environment: SalesforceEnvironment): string {
  return environment === 'sandbox'
    ? 'https://test.salesforce.com/services/oauth2/authorize'
    : 'https://login.salesforce.com/services/oauth2/authorize';
}

export function getSalesforceTokenUrl(environment: SalesforceEnvironment): string {
  return environment === 'sandbox'
    ? 'https://test.salesforce.com/services/oauth2/token'
    : 'https://login.salesforce.com/services/oauth2/token';
}

// =============================================================================
// PKCE OAUTH FLOW
// =============================================================================

// Generate authorization URL with PKCE
export function generateAuthUrl(options: {
  environment: SalesforceEnvironment;
  clientId: string;
  redirectUri: string;
  returnUrl?: string;
  popup?: boolean;
}): { authUrl: string; codeVerifier: string } {
  // Generate PKCE code verifier and challenge
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  // Create signed state containing the verifier
  const state = createOAuthState({
    environment: options.environment,
    returnUrl: options.returnUrl || '/',
    popup: options.popup || false,
    clientId: options.clientId,
    redirectUri: options.redirectUri,
    codeVerifier, // Store in state for callback to use
  });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: options.clientId,
    redirect_uri: options.redirectUri,
    state,
    scope: 'api refresh_token',
    // PKCE parameters
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return {
    authUrl: `${getSalesforceAuthUrl(options.environment)}?${params.toString()}`,
    codeVerifier,
  };
}

// Exchange code for tokens using PKCE (no client secret needed)
export async function exchangeCodeForTokens(options: {
  code: string;
  environment: SalesforceEnvironment;
  clientId: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<{
  access_token: string;
  refresh_token?: string;
  instance_url: string;
  id: string;
  issued_at: string;
}> {
  const tokenUrl = getSalesforceTokenUrl(options.environment);

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: options.code,
      client_id: options.clientId,
      code_verifier: options.codeVerifier, // PKCE: verifier instead of secret
      redirect_uri: options.redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return response.json();
}

// Refresh access token (PKCE apps don't require client_secret for refresh)
export async function refreshAccessToken(options: {
  refreshToken: string;
  environment: SalesforceEnvironment;
  clientId: string;
}): Promise<{
  access_token: string;
  instance_url: string;
  issued_at: string;
}> {
  const tokenUrl = getSalesforceTokenUrl(options.environment);

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: options.refreshToken,
      client_id: options.clientId,
      // No client_secret needed for PKCE-enabled apps
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  return response.json();
}
