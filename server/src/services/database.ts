// Database abstraction layer - supports both SQLite (dev) and PostgreSQL (prod)
// This module provides a unified interface for database operations

const DATABASE_URL = process.env.DATABASE_URL || '';
const USE_POSTGRES = DATABASE_URL.startsWith('postgresql://') || DATABASE_URL.startsWith('postgres://');

// Dynamic imports based on database type
let dbModule: {
  query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount: number | null }>;
  initializeDatabase: () => void | Promise<void>;
  cleanupExpiredOAuthStates: () => Promise<number>;
  cleanupExpiredSessions: (maxAgeMs?: number) => Promise<number>;
  cleanupOldRateLimits: () => Promise<number>;
  healthCheck: () => Promise<boolean>;
  pool?: unknown;
  db?: unknown;
};

// Initialize database on module load
let initialized = false;
let initPromise: Promise<void> | null = null;

async function loadDatabaseModule() {
  if (USE_POSTGRES) {
    console.log('[Database] Using PostgreSQL backend');
    const pg = await import('./postgres.js');
    dbModule = {
      query: pg.query,
      initializeDatabase: pg.initializeDatabase,
      cleanupExpiredOAuthStates: pg.cleanupExpiredOAuthStates,
      cleanupExpiredSessions: pg.cleanupExpiredSessions,
      cleanupOldRateLimits: pg.cleanupOldRateLimits,
      healthCheck: pg.healthCheck,
      pool: pg.pool,
    };
  } else {
    console.log('[Database] Using SQLite backend (development mode)');
    const sqlite = await import('./sqlite.js');
    dbModule = {
      query: sqlite.query,
      initializeDatabase: sqlite.initializeDatabase,
      cleanupExpiredOAuthStates: sqlite.cleanupExpiredOAuthStates,
      cleanupExpiredSessions: sqlite.cleanupExpiredSessions,
      cleanupOldRateLimits: sqlite.cleanupOldRateLimits,
      healthCheck: sqlite.healthCheck,
      db: sqlite.db,
    };
  }
}

export async function ensureInitialized(): Promise<void> {
  if (initialized) return;

  if (!initPromise) {
    initPromise = (async () => {
      await loadDatabaseModule();
      await dbModule.initializeDatabase();
      initialized = true;
    })();
  }

  await initPromise;
}

// Export query function that ensures initialization
export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<{ rows: T[]; rowCount: number }> {
  await ensureInitialized();
  const result = await dbModule.query(text, params);
  return {
    rows: result.rows as T[],
    rowCount: result.rowCount ?? 0,
  };
}

// Export cleanup functions
export async function cleanupExpiredOAuthStates(): Promise<number> {
  await ensureInitialized();
  return dbModule.cleanupExpiredOAuthStates();
}

export async function cleanupExpiredSessions(maxAgeMs?: number): Promise<number> {
  await ensureInitialized();
  return dbModule.cleanupExpiredSessions(maxAgeMs);
}

export async function cleanupOldRateLimits(): Promise<number> {
  await ensureInitialized();
  return dbModule.cleanupOldRateLimits();
}

export async function healthCheck(): Promise<boolean> {
  await ensureInitialized();
  return dbModule.healthCheck();
}

// Helper types matching the database schema
export interface DbUser {
  id: string;
  salesforce_user_id: string;
  email: string | null;
  name: string | null;
  created_at: Date | string;
  last_login_at: Date | string | null;
}

export interface DbOrgCredentials {
  id: string;
  org_id: string | null;
  org_name: string;
  environment: 'production' | 'sandbox';
  client_id: string;
  client_secret_encrypted: string;
  redirect_uri: string;
  created_by_user_id: string;
  shared: boolean | number;
  created_at: Date | string;
}

export interface DbSession {
  id: string;
  user_id: string;
  org_credentials_id: string | null;
  access_token_encrypted: string;
  refresh_token_encrypted: string | null;
  instance_url: string | null;
  environment: string | null;
  issued_at: number | null;
  sf_org_id: string | null;
  sf_org_name: string | null;
  ip_address: string | null;
  user_agent: string | null;
  csrf_token: string | null;
  last_activity_at: Date | string;
  state: 'active' | 'expired' | 'revoked';
  created_at: Date | string;
}

export interface DbTrackedIntegration {
  id: string;
  app_name: string;
  contact: string;
  contact_id: string | null;
  sf_username: string;
  sf_user_id: string | null;
  profile: string;
  in_retool: boolean | number;
  has_ip_ranges: boolean | number;
  notes: string;
  ip_ranges: string[] | string;
  status: 'done' | 'in_progress' | 'pending' | 'blocked';
  created_by_user_id: string;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface DbIntegrationShare {
  id: string;
  integration_id: string;
  shared_with_user_id: string;
  permission: 'view' | 'edit';
  created_at: Date | string;
}

export interface DbOAuthState {
  state: string;
  environment: 'production' | 'sandbox';
  return_url: string;
  nonce: string;
  hmac_signature: string;
  popup: boolean | number;
  org_credentials_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date | string;
  expires_at: Date | string;
}

export interface DbAuditLog {
  id: number;
  user_id: string | null;
  session_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, unknown> | string | null;
  ip_address: string | null;
  user_agent: string | null;
  success: boolean | number;
  error_message: string | null;
  created_at: Date | string;
}

export interface DbRateLimit {
  id: number;
  identifier: string;
  endpoint: string;
  window_start: Date | string;
  request_count: number;
}

// Default export for backward compatibility
export default {
  query,
  ensureInitialized,
};
