export type SalesforceEnvironment = 'production' | 'sandbox';

export interface SalesforceTokens {
  accessToken: string;
  refreshToken: string;
  instanceUrl: string;
  issuedAt: number;
}

export interface SalesforceUserInfo {
  id: string;
  username: string;
  displayName: string;
  email: string;
  organizationId: string;
  orgName?: string;
}

export interface SessionData {
  tokens: SalesforceTokens;
  userInfo: SalesforceUserInfo;
  environment: SalesforceEnvironment;
}

export interface OAuthState {
  environment: SalesforceEnvironment;
  returnUrl: string;
  nonce: string;
  popup?: boolean;
  orgCredentialsId?: string; // For multi-tenant: which org's credentials to use
}

// For External Client App multi-tenant setup
// Each subscriber org provides their own Consumer Key/Secret after installing your package
export interface OrgCredentials {
  id: string;
  orgId: string;                    // Salesforce Organization ID
  orgName: string;                  // Friendly name
  environment: SalesforceEnvironment;
  clientId: string;                 // Consumer Key from their installed External Client App
  clientSecret: string;             // Consumer Secret (encrypted)
  redirectUri: string;
  createdAt: Date;
  createdBy: string;                // User ID who registered this org
  shared: boolean;                  // If true, visible to teammates (same clientId)
}

// A connected Salesforce user (after OAuth)
export interface SalesforceConnection {
  id: string;

  // Your app's user
  userId: string;

  // The org they connected to
  orgCredentialsId: string;
  orgId: string;

  // Their Salesforce identity
  sfUserId: string;
  sfUsername: string;
  sfDisplayName: string;
  sfEmail: string;

  // Connection details
  instanceUrl: string;
  accessToken: string;              // Encrypted
  refreshToken: string;             // Encrypted
  tokenIssuedAt: Date;

  // Status
  status: 'active' | 'requires_reauth' | 'revoked';
  connectedAt: Date;
  lastUsedAt: Date;
}
