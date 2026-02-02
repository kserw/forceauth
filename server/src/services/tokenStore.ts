import type { SessionData } from '../types/index.js';
import crypto from 'crypto';
import { query, type DbSession } from './database.js';
import { encryptSecret, decryptSecret } from './credentialsStore.js';

// Extended session data that includes user ID and fingerprinting
export interface ExtendedSessionData extends SessionData {
  userId: string;
  orgCredentialsId?: string;
  ipAddress?: string;
  userAgent?: string;
  csrfToken?: string;
}

export function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Create session fingerprint for validation
export function createSessionFingerprint(ipAddress?: string, userAgent?: string): string {
  const data = `${ipAddress || ''}|${userAgent || ''}`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
}

export async function setSession(
  sessionId: string,
  data: ExtendedSessionData,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  const csrfToken = generateCsrfToken();

  await query(
    `INSERT INTO sessions
     (id, user_id, org_credentials_id, access_token_encrypted, refresh_token_encrypted,
      instance_url, environment, issued_at, sf_org_id, sf_org_name, ip_address, user_agent, csrf_token, last_activity_at, state)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), 'active')
     ON CONFLICT (id) DO UPDATE SET
       access_token_encrypted = EXCLUDED.access_token_encrypted,
       refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
       instance_url = EXCLUDED.instance_url,
       environment = EXCLUDED.environment,
       issued_at = EXCLUDED.issued_at,
       sf_org_id = EXCLUDED.sf_org_id,
       sf_org_name = EXCLUDED.sf_org_name,
       ip_address = EXCLUDED.ip_address,
       user_agent = EXCLUDED.user_agent,
       csrf_token = EXCLUDED.csrf_token,
       last_activity_at = NOW(),
       state = 'active'`,
    [
      sessionId,
      data.userId,
      data.orgCredentialsId || null,
      encryptSecret(data.tokens.accessToken),
      data.tokens.refreshToken ? encryptSecret(data.tokens.refreshToken) : null,
      data.tokens.instanceUrl,
      data.environment,
      data.tokens.issuedAt,
      data.userInfo.organizationId || null,
      data.userInfo.orgName || null,
      ipAddress || null,
      userAgent || null,
      csrfToken,
    ]
  );

  return csrfToken;
}

export async function getSession(sessionId: string): Promise<ExtendedSessionData | undefined> {
  const result = await query<DbSession>(
    "SELECT * FROM sessions WHERE id = $1 AND state = 'active'",
    [sessionId]
  );
  const row = result.rows[0];

  if (!row) return undefined;

  try {
    // Update last activity timestamp
    await query(
      'UPDATE sessions SET last_activity_at = NOW() WHERE id = $1',
      [sessionId]
    );

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
        id: '',
        username: '',
        displayName: '',
        email: '',
        organizationId: row.sf_org_id || '',
        orgName: row.sf_org_name || undefined,
      },
      environment: (row.environment as 'production' | 'sandbox') || 'sandbox',
      ipAddress: row.ip_address || undefined,
      userAgent: row.user_agent || undefined,
      csrfToken: row.csrf_token || undefined,
    };
  } catch {
    // Decryption failed, session is invalid
    await deleteSession(sessionId);
    return undefined;
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  await query(
    "UPDATE sessions SET state = 'revoked' WHERE id = $1",
    [sessionId]
  );
}

export async function updateSessionTokens(
  sessionId: string,
  accessToken: string,
  refreshToken?: string
): Promise<boolean> {
  const result = await query(
    `UPDATE sessions SET
       access_token_encrypted = $1,
       refresh_token_encrypted = COALESCE($2, refresh_token_encrypted),
       issued_at = $3,
       last_activity_at = NOW()
     WHERE id = $4 AND state = 'active'`,
    [
      encryptSecret(accessToken),
      refreshToken ? encryptSecret(refreshToken) : null,
      Date.now(),
      sessionId,
    ]
  );
  return (result.rowCount || 0) > 0;
}

// Get user ID from session
export async function getSessionUserId(sessionId: string): Promise<string | undefined> {
  const result = await query<{ user_id: string }>(
    "SELECT user_id FROM sessions WHERE id = $1 AND state = 'active'",
    [sessionId]
  );
  return result.rows[0]?.user_id;
}

// Get CSRF token from session
export async function getSessionCsrfToken(sessionId: string): Promise<string | undefined> {
  const result = await query<{ csrf_token: string }>(
    "SELECT csrf_token FROM sessions WHERE id = $1 AND state = 'active'",
    [sessionId]
  );
  return result.rows[0]?.csrf_token;
}

// Validate session fingerprint (IP and User-Agent)
export async function validateSessionFingerprint(
  sessionId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<boolean> {
  const result = await query<{ ip_address: string | null; user_agent: string | null }>(
    "SELECT ip_address, user_agent FROM sessions WHERE id = $1 AND state = 'active'",
    [sessionId]
  );
  const row = result.rows[0];
  if (!row) return false;

  // For now, we just check if IP changed significantly
  // In production, you might want more sophisticated fingerprinting
  if (row.ip_address && ipAddress && row.ip_address !== ipAddress) {
    console.warn('[Session] IP address mismatch', {
      sessionId: sessionId.substring(0, 8) + '...',
      stored: row.ip_address,
      current: ipAddress,
    });
    // Allow for now but log - in strict mode, return false
  }

  return true;
}

// Rotate session (create new session ID, invalidate old)
export async function rotateSession(
  oldSessionId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ newSessionId: string; csrfToken: string } | null> {
  const session = await getSession(oldSessionId);
  if (!session) return null;

  // Generate new session ID
  const newSessionId = generateSessionId();

  // Create new session with same data
  const csrfToken = await setSession(newSessionId, session, ipAddress, userAgent);

  // Invalidate old session
  await deleteSession(oldSessionId);

  return { newSessionId, csrfToken };
}

// Clean up expired sessions
export async function cleanupExpiredSessions(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<number> {
  const cutoffTime = new Date(Date.now() - maxAgeMs);
  const result = await query(
    "UPDATE sessions SET state = 'expired' WHERE state = 'active' AND last_activity_at < $1",
    [cutoffTime]
  );
  return result.rowCount || 0;
}

// Get all active sessions for a user
export async function getUserSessions(userId: string): Promise<Array<{
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  lastActivityAt: Date;
  createdAt: Date;
}>> {
  const result = await query<{
    id: string;
    ip_address: string | null;
    user_agent: string | null;
    last_activity_at: Date;
    created_at: Date;
  }>(
    "SELECT id, ip_address, user_agent, last_activity_at, created_at FROM sessions WHERE user_id = $1 AND state = 'active' ORDER BY last_activity_at DESC",
    [userId]
  );

  return result.rows.map(row => ({
    id: row.id,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    lastActivityAt: row.last_activity_at,
    createdAt: row.created_at,
  }));
}

// Revoke all sessions for a user except current
export async function revokeOtherSessions(userId: string, currentSessionId: string): Promise<number> {
  const result = await query(
    "UPDATE sessions SET state = 'revoked' WHERE user_id = $1 AND id != $2 AND state = 'active'",
    [userId, currentSessionId]
  );
  return result.rowCount || 0;
}
