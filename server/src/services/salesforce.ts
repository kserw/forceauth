import { config } from '../config/index.js';
import type { SalesforceEnvironment, SalesforceTokens, SalesforceUserInfo, OAuthState, OrgCredentials } from '../types/index.js';
import { getOrgCredentials, getDecryptedClientSecret, updateOrgId } from './credentialsStore.js';
import crypto from 'crypto';

const pendingStates = new Map<string, OAuthState>();

// Get auth URL base based on environment
function getAuthUrlBase(environment: SalesforceEnvironment): string {
  return environment === 'production'
    ? 'https://login.salesforce.com'
    : 'https://test.salesforce.com';
}

// Get credentials - either from registered org or fallback to env config
function getCredentials(orgCredentialsId?: string, environment: SalesforceEnvironment = 'production') {
  if (orgCredentialsId) {
    const orgCreds = getOrgCredentials(orgCredentialsId);
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
}

export function generateAuthUrl(options: GenerateAuthUrlOptions = {}): string {
  const {
    environment = 'production',
    returnUrl = '/',
    popup = false,
    orgCredentialsId,
  } = options;

  const creds = getCredentials(orgCredentialsId, environment);
  const nonce = crypto.randomBytes(16).toString('hex');
  const state = crypto.randomBytes(16).toString('hex');

  pendingStates.set(state, {
    environment: creds.environment,
    returnUrl,
    nonce,
    popup,
    orgCredentialsId: creds.orgCredentialsId,
  });

  // Clean up old states after 10 minutes
  setTimeout(() => pendingStates.delete(state), 10 * 60 * 1000);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: creds.clientId,
    redirect_uri: creds.redirectUri,
    scope: 'api refresh_token',
    state,
  });

  return `${creds.authUrl}/services/oauth2/authorize?${params.toString()}`;
}

export function validateAndConsumeState(state: string): OAuthState | null {
  const stateData = pendingStates.get(state);
  if (stateData) {
    pendingStates.delete(state);
    return stateData;
  }
  return null;
}

export async function exchangeCodeForTokens(
  code: string,
  stateData: OAuthState
): Promise<SalesforceTokens> {
  const creds = getCredentials(stateData.orgCredentialsId, stateData.environment);

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    redirect_uri: creds.redirectUri,
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
  const creds = getCredentials(orgCredentialsId, environment);

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
export function linkOrgIdToCredentials(orgCredentialsId: string, salesforceOrgId: string): void {
  updateOrgId(orgCredentialsId, salesforceOrgId);
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
