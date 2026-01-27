import type { SessionData } from '../types/index.js';
import crypto from 'crypto';
import db, { type DbSession } from './database.js';
import { encryptSecret, decryptSecret } from './credentialsStore.js';

// Extended session data that includes user ID
export interface ExtendedSessionData extends SessionData {
  userId: string;  // Our internal user ID
  orgCredentialsId?: string;
}

export function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function setSession(sessionId: string, data: ExtendedSessionData): void {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO sessions
    (id, user_id, org_credentials_id, access_token_encrypted, refresh_token_encrypted, instance_url, environment, issued_at, sf_org_id, sf_org_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    sessionId,
    data.userId,
    data.orgCredentialsId || null,
    encryptSecret(data.tokens.accessToken),
    data.tokens.refreshToken ? encryptSecret(data.tokens.refreshToken) : null,
    data.tokens.instanceUrl,
    data.environment,
    data.tokens.issuedAt,
    data.userInfo.organizationId || null,
    data.userInfo.orgName || null
  );
}

export function getSession(sessionId: string): ExtendedSessionData | undefined {
  const stmt = db.prepare('SELECT * FROM sessions WHERE id = ?');
  const row = stmt.get(sessionId) as DbSession | undefined;

  if (!row) return undefined;

  try {
    return {
      userId: row.user_id,
      orgCredentialsId: row.org_credentials_id || undefined,
      tokens: {
        accessToken: decryptSecret(row.access_token_encrypted),
        refreshToken: row.refresh_token_encrypted ? decryptSecret(row.refresh_token_encrypted) : '',
        instanceUrl: row.instance_url || '',
        issuedAt: row.issued_at || Date.now(),
      },
      userInfo: {
        id: '',  // User ID is fetched from users table
        username: '',
        displayName: '',
        email: '',
        organizationId: row.sf_org_id || '',
        orgName: row.sf_org_name || undefined,
      },
      environment: (row.environment as 'production' | 'sandbox') || 'sandbox',
    };
  } catch {
    // Decryption failed, session is invalid
    deleteSession(sessionId);
    return undefined;
  }
}

export function deleteSession(sessionId: string): void {
  const stmt = db.prepare('DELETE FROM sessions WHERE id = ?');
  stmt.run(sessionId);
}

export function updateSessionTokens(
  sessionId: string,
  accessToken: string,
  refreshToken?: string
): boolean {
  const stmt = db.prepare(`
    UPDATE sessions SET
      access_token_encrypted = ?,
      refresh_token_encrypted = COALESCE(?, refresh_token_encrypted),
      issued_at = ?
    WHERE id = ?
  `);
  const result = stmt.run(
    encryptSecret(accessToken),
    refreshToken ? encryptSecret(refreshToken) : null,
    Date.now(),
    sessionId
  );
  return result.changes > 0;
}

// Get user ID from session
export function getSessionUserId(sessionId: string): string | undefined {
  const stmt = db.prepare('SELECT user_id FROM sessions WHERE id = ?');
  const row = stmt.get(sessionId) as { user_id: string } | undefined;
  return row?.user_id;
}

// Clean up expired sessions (call periodically)
export function cleanupExpiredSessions(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
  const cutoff = Date.now() - maxAgeMs;
  const stmt = db.prepare('DELETE FROM sessions WHERE issued_at < ?');
  const result = stmt.run(cutoff);
  return result.changes;
}
