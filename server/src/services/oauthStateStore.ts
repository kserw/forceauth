import crypto from 'crypto';
import { query, type DbOAuthState } from './database.js';
import { config, isValidReturnUrl } from '../config/index.js';
import type { SalesforceEnvironment, OAuthState } from '../types/index.js';

// HMAC secret for state integrity
const HMAC_SECRET = config.csrfSecret;

/**
 * Generate an HMAC signature for OAuth state data
 */
function generateHmacSignature(data: {
  state: string;
  environment: string;
  nonce: string;
  orgCredentialsId?: string;
}): string {
  const payload = `${data.state}|${data.environment}|${data.nonce}|${data.orgCredentialsId || ''}`;
  return crypto.createHmac('sha256', HMAC_SECRET).update(payload).digest('hex');
}

/**
 * Verify HMAC signature for OAuth state
 */
function verifyHmacSignature(
  signature: string,
  data: {
    state: string;
    environment: string;
    nonce: string;
    orgCredentialsId?: string;
  }
): boolean {
  const expected = generateHmacSignature(data);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export interface CreateOAuthStateOptions {
  environment: SalesforceEnvironment;
  returnUrl: string;
  popup?: boolean;
  orgCredentialsId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create and store a new OAuth state
 */
export async function createOAuthState(options: CreateOAuthStateOptions): Promise<string> {
  // Validate return URL against whitelist
  const returnUrl = options.returnUrl || '/';
  if (!isValidReturnUrl(returnUrl)) {
    console.warn('[OAuth] Invalid return URL, using default:', returnUrl);
    options.returnUrl = '/';
  }

  const state = crypto.randomBytes(32).toString('hex');
  const nonce = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + config.oauth.stateExpiry);

  const hmacSignature = generateHmacSignature({
    state,
    environment: options.environment,
    nonce,
    orgCredentialsId: options.orgCredentialsId,
  });

  await query(
    `INSERT INTO oauth_states
     (state, environment, return_url, nonce, hmac_signature, popup, org_credentials_id, ip_address, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      state,
      options.environment,
      options.returnUrl || '/',
      nonce,
      hmacSignature,
      options.popup ?? false,
      options.orgCredentialsId || null,
      options.ipAddress || null,
      options.userAgent || null,
      expiresAt,
    ]
  );

  console.log('[OAuth] Created state:', {
    statePrefix: state.substring(0, 8) + '...',
    environment: options.environment,
    orgCredentialsId: options.orgCredentialsId,
    expiresAt: expiresAt.toISOString(),
  });

  return state;
}

/**
 * Validate and consume an OAuth state
 * Returns the state data if valid, null otherwise
 * The state is deleted after consumption (one-time use)
 */
export async function validateAndConsumeOAuthState(
  state: string,
  ipAddress?: string
): Promise<OAuthState | null> {
  // Retrieve state from database
  const result = await query<DbOAuthState>(
    `DELETE FROM oauth_states
     WHERE state = $1 AND expires_at > NOW()
     RETURNING *`,
    [state]
  );

  const row = result.rows[0];
  if (!row) {
    console.warn('[OAuth] State not found or expired:', state.substring(0, 8) + '...');
    return null;
  }

  // Verify HMAC signature
  const isValid = verifyHmacSignature(row.hmac_signature, {
    state: row.state,
    environment: row.environment,
    nonce: row.nonce,
    orgCredentialsId: row.org_credentials_id || undefined,
  });

  if (!isValid) {
    console.error('[OAuth] HMAC signature verification failed for state:', state.substring(0, 8) + '...');
    return null;
  }

  // Optional: Validate IP address binding (warn but don't fail)
  if (row.ip_address && ipAddress && row.ip_address !== ipAddress) {
    console.warn('[OAuth] IP address mismatch:', {
      statePrefix: state.substring(0, 8) + '...',
      original: row.ip_address,
      current: ipAddress,
    });
    // In strict mode, you might return null here
  }

  console.log('[OAuth] Validated and consumed state:', {
    statePrefix: state.substring(0, 8) + '...',
    environment: row.environment,
    orgCredentialsId: row.org_credentials_id,
  });

  return {
    environment: row.environment,
    returnUrl: row.return_url,
    nonce: row.nonce,
    popup: Boolean(row.popup),
    orgCredentialsId: row.org_credentials_id || undefined,
  };
}

/**
 * Clean up expired OAuth states
 */
export async function cleanupExpiredStates(): Promise<number> {
  const result = await query('DELETE FROM oauth_states WHERE expires_at < NOW()');
  const count = result.rowCount || 0;
  if (count > 0) {
    console.log('[OAuth] Cleaned up', count, 'expired states');
  }
  return count;
}

/**
 * Get count of pending OAuth states (for monitoring)
 */
export async function getPendingStateCount(): Promise<number> {
  const result = await query<{ count: string }>('SELECT COUNT(*) as count FROM oauth_states WHERE expires_at > NOW()');
  return parseInt(result.rows[0]?.count || '0', 10);
}
