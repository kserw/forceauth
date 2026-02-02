// Credentials module - NOT USED in stateless mode
// In stateless mode, org credentials are stored client-side in localStorage

export type SalesforceEnvironment = 'production' | 'sandbox';

export interface OrgCredentials {
  id: string;
  orgId: string | null;
  orgName: string;
  environment: SalesforceEnvironment;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  createdBy: string;
  shared: boolean;
  createdAt: Date;
}

export async function registerOrgCredentials(): Promise<OrgCredentials> {
  throw new Error('Database not available in stateless mode');
}

export async function getOrgCredentials(): Promise<OrgCredentials | null> {
  throw new Error('Database not available in stateless mode');
}

export async function listVisibleOrgCredentials(): Promise<OrgCredentials[]> {
  throw new Error('Database not available in stateless mode');
}

export async function updateOrgId(): Promise<void> {
  throw new Error('Database not available in stateless mode');
}

export async function setOrgShared(): Promise<boolean> {
  throw new Error('Database not available in stateless mode');
}

export async function deleteOrgCredentials(): Promise<boolean> {
  throw new Error('Database not available in stateless mode');
}

export async function getOrgOwner(): Promise<string | null> {
  throw new Error('Database not available in stateless mode');
}

export async function claimOrgCredentials(): Promise<void> {
  throw new Error('Database not available in stateless mode');
}
