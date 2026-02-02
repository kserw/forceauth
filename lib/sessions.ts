// Sessions module - NOT USED in stateless mode
// In stateless mode, sessions are stored in encrypted cookies
// Use lib/stateless-session.ts instead

export interface SessionData {
  userId: string;
  accessToken: string;
  refreshToken?: string;
  instanceUrl: string;
  environment: 'production' | 'sandbox';
  issuedAt?: number;
  orgId?: string;
  orgName?: string;
  orgCredentialsId?: string;
}

export interface Session extends SessionData {
  id: string;
  csrfToken: string;
  createdAt: Date;
  lastActivityAt: Date;
}

export async function createSession(): Promise<{ sessionId: string; csrfToken: string }> {
  throw new Error('Database not available in stateless mode. Use stateless-session instead.');
}

export async function getSession(): Promise<Session | null> {
  throw new Error('Database not available in stateless mode. Use stateless-session instead.');
}

export async function getSessionUserId(): Promise<string | null> {
  throw new Error('Database not available in stateless mode. Use stateless-session instead.');
}

export async function updateSessionTokens(): Promise<void> {
  throw new Error('Database not available in stateless mode. Use stateless-session instead.');
}

export async function invalidateSession(): Promise<void> {
  throw new Error('Database not available in stateless mode. Use stateless-session instead.');
}

export async function verifyCsrfToken(): Promise<boolean> {
  throw new Error('Database not available in stateless mode. Use stateless-session instead.');
}
