import { config, isValidReturnUrl } from '../config/index.js';
import type { SalesforceEnvironment, SalesforceTokens, SalesforceUserInfo, OAuthState, OrgCredentials } from '../types/index.js';
import { getOrgCredentials, getDecryptedClientSecret, updateOrgId } from './credentialsStore.js';
import { createOAuthState, validateAndConsumeOAuthState } from './oauthStateStore.js';

// Get auth URL base based on environment
function getAuthUrlBase(environment: SalesforceEnvironment): string {
  return environment === 'production'
    ? 'https://login.salesforce.com'
    : 'https://test.salesforce.com';
}

// Get credentials - either from registered org or fallback to env config
async function getCredentials(orgCredentialsId?: string, environment: SalesforceEnvironment = 'production') {
  if (orgCredentialsId) {
    const orgCreds = await getOrgCredentials(orgCredentialsId);
    if (!orgCreds) {
      throw new Error('Org credentials not found');
    }
    return {
      clientId: orgCreds.clientId,
      clientSecret: getDecryptedClientSecret(orgCreds),
      redirectUri: orgCreds.redirectUri,
      authUrl: getAuthUrlBase(orgCreds.environment),
      environment: orgCreds.environment,
      orgCredentialsId,
    };
  }

  // Fallback to environment config (legacy mode)
  const envConfig = environment === 'production'
    ? config.salesforce.production
    : config.salesforce.sandbox;

  if (!envConfig.clientId || !envConfig.clientSecret) {
    throw new Error(`Salesforce ${environment} credentials not configured`);
  }

  return {
    clientId: envConfig.clientId,
    clientSecret: envConfig.clientSecret,
    redirectUri: envConfig.redirectUri,
    authUrl: envConfig.authUrl,
    environment,
    orgCredentialsId: undefined,
  };
}

export interface GenerateAuthUrlOptions {
  environment?: SalesforceEnvironment;
  returnUrl?: string;
  popup?: boolean;
  orgCredentialsId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function generateAuthUrl(options: GenerateAuthUrlOptions = {}): Promise<string> {
  const {
    environment = 'production',
    returnUrl = '/',
    popup = false,
    orgCredentialsId,
    ipAddress,
    userAgent,
  } = options;

  const creds = await getCredentials(orgCredentialsId, environment);

  // Validate return URL against whitelist
  const validReturnUrl = isValidReturnUrl(returnUrl) ? returnUrl : '/';

  // Create persistent OAuth state
  const state = await createOAuthState({
    environment: creds.environment,
    returnUrl: validReturnUrl,
    popup,
    orgCredentialsId: creds.orgCredentialsId,
    ipAddress,
    userAgent,
  });

  console.log('[generateAuthUrl] Created OAuth state:', {
    statePrefix: state.substring(0, 8) + '...',
    environment: creds.environment,
    orgCredentialsId: creds.orgCredentialsId,
    redirectUri: creds.redirectUri,
  });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: creds.clientId,
    redirect_uri: creds.redirectUri,
    scope: 'api refresh_token',
    state,
  });

  return `${creds.authUrl}/services/oauth2/authorize?${params.toString()}`;
}

export async function validateAndConsumeState(state: string, ipAddress?: string): Promise<OAuthState | null> {
  return validateAndConsumeOAuthState(state, ipAddress);
}

export async function exchangeCodeForTokens(
  code: string,
  stateData: OAuthState
): Promise<SalesforceTokens> {
  const creds = await getCredentials(stateData.orgCredentialsId, stateData.environment);

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    redirect_uri: creds.redirectUri,
  });

  console.log('[exchangeCodeForTokens] Exchanging code for tokens:', {
    authUrl: creds.authUrl,
    redirectUri: creds.redirectUri,
    clientIdPrefix: creds.clientId?.substring(0, 10) + '...',
    orgCredentialsId: stateData.orgCredentialsId,
  });

  const response = await fetch(`${creds.authUrl}/services/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[exchangeCodeForTokens] Token exchange failed:', {
      status: response.status,
      error,
      redirectUri: creds.redirectUri,
    });
    throw new Error(`Token exchange failed: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    instanceUrl: data.instance_url,
    issuedAt: Date.now(),
  };
}

export async function refreshAccessToken(
  refreshToken: string,
  environment: SalesforceEnvironment,
  orgCredentialsId?: string
): Promise<{ accessToken: string; refreshToken?: string }> {
  const creds = await getCredentials(orgCredentialsId, environment);

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
  });

  const response = await fetch(`${creds.authUrl}/services/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  };
}

export async function getUserInfo(
  accessToken: string,
  instanceUrl: string
): Promise<SalesforceUserInfo> {
  const response = await fetch(`${instanceUrl}/services/oauth2/userinfo`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get user info: ${error}`);
  }

  const data = await response.json();

  console.log('[getUserInfo] Raw SFDC userinfo response:', JSON.stringify(data, null, 2));

  return {
    id: data.user_id,
    username: data.preferred_username,
    displayName: data.name,
    email: data.email,
    organizationId: data.organization_id,
    orgName: data.organization_name,
  };
}

// Update the org credentials with the actual Salesforce Org ID after successful auth
export async function linkOrgIdToCredentials(orgCredentialsId: string, salesforceOrgId: string): Promise<void> {
  await updateOrgId(orgCredentialsId, salesforceOrgId);
}

export async function revokeToken(
  accessToken: string,
  environment: SalesforceEnvironment
): Promise<void> {
  const authUrl = getAuthUrlBase(environment);
  const params = new URLSearchParams({ token: accessToken });

  await fetch(`${authUrl}/services/oauth2/revoke?${params.toString()}`, {
    method: 'POST',
  });
}
