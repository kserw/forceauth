// OAuth module - NOT USED in stateless mode
// Use lib/stateless-oauth.ts instead

export type SalesforceEnvironment = 'production' | 'sandbox';

export interface OAuthState {
  environment: SalesforceEnvironment;
  returnUrl: string;
  nonce: string;
  popup?: boolean;
  orgCredentialsId?: string;
}

export async function createOAuthState(): Promise<string> {
  throw new Error('Database not available in stateless mode. Use stateless-oauth instead.');
}

export async function validateAndConsumeOAuthState(): Promise<OAuthState | null> {
  throw new Error('Database not available in stateless mode. Use stateless-oauth instead.');
}

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

export async function generateAuthUrl(): Promise<string> {
  throw new Error('Database not available in stateless mode. Use stateless-oauth instead.');
}

export async function exchangeCodeForTokens(): Promise<{
  access_token: string;
  refresh_token?: string;
  instance_url: string;
  id: string;
  issued_at: string;
}> {
  throw new Error('Database not available in stateless mode. Use stateless-oauth instead.');
}

export async function refreshAccessToken(): Promise<{
  access_token: string;
  instance_url: string;
  issued_at: string;
}> {
  throw new Error('Database not available in stateless mode. Use stateless-oauth instead.');
}
