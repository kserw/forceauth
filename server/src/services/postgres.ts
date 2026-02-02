import pg from 'pg';
import crypto from 'crypto';

const { Pool } = pg;

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/forceauth',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

// Test connection on startup
pool.on('connect', () => {
  console.log('[PostgreSQL] New client connected to pool');
});

pool.on('error', (err) => {
  console.error('[PostgreSQL] Unexpected error on idle client', err);
});

// Export pool for direct queries
export { pool };

// Helper for single queries
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'production' && duration > 100) {
      console.log('[PostgreSQL] Slow query', { text: text.substring(0, 100), duration, rows: result.rowCount });
    }
    return result;
  } catch (err) {
    console.error('[PostgreSQL] Query error', { text: text.substring(0, 100), error: err });
    throw err;
  }
}

// Helper for transactions
export async function transaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Database initialization
export async function initializeDatabase(): Promise<void> {
  console.log('[PostgreSQL] Initializing database schema...');

  // Users table
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      salesforce_user_id VARCHAR(64) UNIQUE NOT NULL,
      email VARCHAR(255),
      name VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      last_login_at TIMESTAMPTZ
    )
  `);

  // Org credentials table
  await query(`
    CREATE TABLE IF NOT EXISTS org_credentials (
      id VARCHAR(64) PRIMARY KEY,
      org_id VARCHAR(64),
      org_name VARCHAR(255) NOT NULL,
      environment VARCHAR(20) NOT NULL CHECK(environment IN ('production', 'sandbox')),
      client_id TEXT NOT NULL,
      client_secret_encrypted TEXT NOT NULL,
      redirect_uri TEXT NOT NULL,
      created_by_user_id VARCHAR(64) NOT NULL REFERENCES users(id),
      shared BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Sessions table with security enhancements
  await query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id VARCHAR(128) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL REFERENCES users(id),
      org_credentials_id VARCHAR(64) REFERENCES org_credentials(id),
      access_token_encrypted TEXT NOT NULL,
      refresh_token_encrypted TEXT,
      instance_url TEXT,
      environment VARCHAR(20),
      issued_at BIGINT,
      sf_org_id VARCHAR(64),
      sf_org_name VARCHAR(255),
      ip_address INET,
      user_agent TEXT,
      csrf_token VARCHAR(128),
      last_activity_at TIMESTAMPTZ DEFAULT NOW(),
      state VARCHAR(20) DEFAULT 'active' CHECK(state IN ('active', 'expired', 'revoked')),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Tracked integrations table
  await query(`
    CREATE TABLE IF NOT EXISTS tracked_integrations (
      id VARCHAR(64) PRIMARY KEY,
      app_name VARCHAR(255) NOT NULL,
      contact VARCHAR(255) DEFAULT '',
      contact_id VARCHAR(64),
      sf_username VARCHAR(255) DEFAULT '',
      sf_user_id VARCHAR(64),
      profile VARCHAR(255) DEFAULT '',
      in_retool BOOLEAN DEFAULT FALSE,
      has_ip_ranges BOOLEAN DEFAULT FALSE,
      notes TEXT DEFAULT '',
      ip_ranges JSONB DEFAULT '[]',
      status VARCHAR(20) DEFAULT 'pending' CHECK(status IN ('done', 'in_progress', 'pending', 'blocked')),
      created_by_user_id VARCHAR(64) NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Integration shares table
  await query(`
    CREATE TABLE IF NOT EXISTS integration_shares (
      id VARCHAR(64) PRIMARY KEY,
      integration_id VARCHAR(64) NOT NULL REFERENCES tracked_integrations(id) ON DELETE CASCADE,
      shared_with_user_id VARCHAR(64) NOT NULL REFERENCES users(id),
      permission VARCHAR(10) DEFAULT 'view' CHECK(permission IN ('view', 'edit')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(integration_id, shared_with_user_id)
    )
  `);

  // OAuth states table - persistent storage for OAuth flow
  await query(`
    CREATE TABLE IF NOT EXISTS oauth_states (
      state VARCHAR(128) PRIMARY KEY,
      environment VARCHAR(20) NOT NULL CHECK(environment IN ('production', 'sandbox')),
      return_url VARCHAR(2048) NOT NULL,
      nonce VARCHAR(128) NOT NULL,
      hmac_signature VARCHAR(128) NOT NULL,
      popup BOOLEAN DEFAULT FALSE,
      org_credentials_id VARCHAR(64),
      ip_address INET,
      user_agent TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    )
  `);

  // Audit logs table
  await query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id BIGSERIAL PRIMARY KEY,
      user_id VARCHAR(64),
      session_id VARCHAR(128),
      action VARCHAR(100) NOT NULL,
      resource_type VARCHAR(50),
      resource_id VARCHAR(64),
      details JSONB,
      ip_address INET,
      user_agent TEXT,
      success BOOLEAN DEFAULT TRUE,
      error_message TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Rate limits table
  await query(`
    CREATE TABLE IF NOT EXISTS rate_limits (
      id BIGSERIAL PRIMARY KEY,
      identifier VARCHAR(255) NOT NULL,
      endpoint VARCHAR(255) NOT NULL,
      window_start TIMESTAMPTZ NOT NULL,
      request_count INTEGER DEFAULT 1,
      UNIQUE(identifier, endpoint, window_start)
    )
  `);

  // Create indexes
  await query(`CREATE INDEX IF NOT EXISTS idx_org_credentials_client_id ON org_credentials(client_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_org_credentials_created_by ON org_credentials(created_by_user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_sessions_state ON sessions(state)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON sessions(last_activity_at)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_tracked_integrations_created_by ON tracked_integrations(created_by_user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_integration_shares_integration_id ON integration_shares(integration_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_integration_shares_shared_with ON integration_shares(shared_with_user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON oauth_states(expires_at)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier, endpoint)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start)`);

  // Insert system users
  await query(`
    INSERT INTO users (id, salesforce_user_id, email, name)
    VALUES ('pending', 'pending', NULL, 'Pending User')
    ON CONFLICT (id) DO NOTHING
  `);
  await query(`
    INSERT INTO users (id, salesforce_user_id, email, name)
    VALUES ('system', 'system', NULL, 'System User')
    ON CONFLICT (id) DO NOTHING
  `);

  console.log('[PostgreSQL] Database schema initialized successfully');
}

// Cleanup functions
export async function cleanupExpiredOAuthStates(): Promise<number> {
  const result = await query('DELETE FROM oauth_states WHERE expires_at < NOW()');
  return result.rowCount || 0;
}

export async function cleanupExpiredSessions(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<number> {
  const cutoffTime = new Date(Date.now() - maxAgeMs);
  const result = await query(
    "UPDATE sessions SET state = 'expired' WHERE state = 'active' AND last_activity_at < $1",
    [cutoffTime]
  );
  return result.rowCount || 0;
}

export async function cleanupOldRateLimits(): Promise<number> {
  // Remove rate limit entries older than 1 hour
  const result = await query(
    "DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '1 hour'"
  );
  return result.rowCount || 0;
}

// Health check
export async function healthCheck(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

// Graceful shutdown
export async function closePool(): Promise<void> {
  await pool.end();
  console.log('[PostgreSQL] Connection pool closed');
}
