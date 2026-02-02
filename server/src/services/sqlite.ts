import Database, { type Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Database path - use environment variable or default to data directory
const DB_PATH = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'data', 'forceauth.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create database instance
const db: DatabaseType = Database(DB_PATH);

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');

console.log(`[SQLite] Database initialized at ${DB_PATH}`);

// Initialize database schema
export function initializeDatabase(): void {
  console.log('[SQLite] Initializing database schema...');

  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      salesforce_user_id TEXT UNIQUE NOT NULL,
      email TEXT,
      name TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      last_login_at TEXT
    )
  `);

  // Org credentials table
  db.exec(`
    CREATE TABLE IF NOT EXISTS org_credentials (
      id TEXT PRIMARY KEY,
      org_id TEXT,
      org_name TEXT NOT NULL,
      environment TEXT NOT NULL CHECK(environment IN ('production', 'sandbox')),
      client_id TEXT NOT NULL,
      client_secret_encrypted TEXT NOT NULL,
      redirect_uri TEXT NOT NULL,
      created_by_user_id TEXT NOT NULL,
      shared INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (created_by_user_id) REFERENCES users(id)
    )
  `);

  // Sessions table with security enhancements
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      org_credentials_id TEXT,
      access_token_encrypted TEXT NOT NULL,
      refresh_token_encrypted TEXT,
      instance_url TEXT,
      environment TEXT,
      issued_at INTEGER,
      sf_org_id TEXT,
      sf_org_name TEXT,
      ip_address TEXT,
      user_agent TEXT,
      csrf_token TEXT,
      last_activity_at TEXT DEFAULT (datetime('now')),
      state TEXT DEFAULT 'active' CHECK(state IN ('active', 'expired', 'revoked')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (org_credentials_id) REFERENCES org_credentials(id)
    )
  `);

  // Tracked integrations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tracked_integrations (
      id TEXT PRIMARY KEY,
      app_name TEXT NOT NULL,
      contact TEXT DEFAULT '',
      contact_id TEXT,
      sf_username TEXT DEFAULT '',
      sf_user_id TEXT,
      profile TEXT DEFAULT '',
      in_retool INTEGER DEFAULT 0,
      has_ip_ranges INTEGER DEFAULT 0,
      notes TEXT DEFAULT '',
      ip_ranges TEXT DEFAULT '[]',
      status TEXT DEFAULT 'pending' CHECK(status IN ('done', 'in_progress', 'pending', 'blocked')),
      created_by_user_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (created_by_user_id) REFERENCES users(id)
    )
  `);

  // Integration shares table
  db.exec(`
    CREATE TABLE IF NOT EXISTS integration_shares (
      id TEXT PRIMARY KEY,
      integration_id TEXT NOT NULL,
      shared_with_user_id TEXT NOT NULL,
      permission TEXT DEFAULT 'view' CHECK(permission IN ('view', 'edit')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (integration_id) REFERENCES tracked_integrations(id) ON DELETE CASCADE,
      FOREIGN KEY (shared_with_user_id) REFERENCES users(id),
      UNIQUE(integration_id, shared_with_user_id)
    )
  `);

  // OAuth states table
  db.exec(`
    CREATE TABLE IF NOT EXISTS oauth_states (
      state TEXT PRIMARY KEY,
      environment TEXT NOT NULL CHECK(environment IN ('production', 'sandbox')),
      return_url TEXT NOT NULL,
      nonce TEXT NOT NULL,
      hmac_signature TEXT NOT NULL,
      popup INTEGER DEFAULT 0,
      org_credentials_id TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    )
  `);

  // Audit logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      session_id TEXT,
      action TEXT NOT NULL,
      resource_type TEXT,
      resource_id TEXT,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      success INTEGER DEFAULT 1,
      error_message TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Rate limits table
  db.exec(`
    CREATE TABLE IF NOT EXISTS rate_limits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      identifier TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      window_start TEXT NOT NULL,
      request_count INTEGER DEFAULT 1,
      UNIQUE(identifier, endpoint, window_start)
    )
  `);

  // Create indexes
  db.exec(`CREATE INDEX IF NOT EXISTS idx_org_credentials_client_id ON org_credentials(client_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_org_credentials_created_by ON org_credentials(created_by_user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_state ON sessions(state)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON sessions(last_activity_at)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_tracked_integrations_created_by ON tracked_integrations(created_by_user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_integration_shares_integration_id ON integration_shares(integration_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_integration_shares_shared_with ON integration_shares(shared_with_user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON oauth_states(expires_at)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier, endpoint)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start)`);

  // Insert system users
  const insertSystemUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, salesforce_user_id, email, name)
    VALUES (?, ?, NULL, ?)
  `);
  insertSystemUser.run('pending', 'pending', 'Pending User');
  insertSystemUser.run('system', 'system', 'System User');

  console.log('[SQLite] Database schema initialized successfully');
}

// Query interface that mimics pg.QueryResult
export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}

// Convert a single parameter value to SQLite-compatible type
function convertParam(value: unknown): unknown {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    // Convert objects (including arrays) to JSON strings
    return JSON.stringify(value);
  }
  return value;
}

// Convert all parameters to SQLite-compatible types
function convertParams(params?: unknown[]): unknown[] {
  if (!params) return [];
  return params.map(convertParam);
}

// Helper for parameterized queries - converts $1, $2 placeholders to ? for SQLite
export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  // Convert PostgreSQL-style $1, $2 placeholders to SQLite ? placeholders
  // PostgreSQL allows reusing $1 multiple times, but SQLite's ? are positional
  // So we need to expand params to match each ? occurrence
  let sqliteText = text;
  const expandedParams: unknown[] = [];

  // Find all $N placeholders and track their positions
  const placeholderRegex = /\$(\d+)/g;
  let match;
  const placeholders: number[] = [];

  while ((match = placeholderRegex.exec(text)) !== null) {
    placeholders.push(parseInt(match[1], 10));
  }

  // Build expanded params array based on placeholder order
  if (params) {
    for (const idx of placeholders) {
      // PostgreSQL params are 1-indexed, array is 0-indexed
      expandedParams.push(params[idx - 1]);
    }
  }

  // Now replace all $N with ?
  sqliteText = sqliteText.replace(/\$\d+/g, '?');

  // Handle PostgreSQL-specific syntax
  sqliteText = sqliteText
    // Convert TIMESTAMPTZ to TEXT for SQLite
    .replace(/TIMESTAMPTZ/gi, 'TEXT')
    // Convert INET to TEXT for SQLite
    .replace(/INET/gi, 'TEXT')
    // Convert JSONB to TEXT for SQLite
    .replace(/JSONB/gi, 'TEXT')
    // Convert BIGSERIAL to INTEGER PRIMARY KEY AUTOINCREMENT
    .replace(/BIGSERIAL PRIMARY KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
    // Convert NOW() to datetime('now')
    .replace(/NOW\(\)/gi, "datetime('now')")
    // Convert boolean TRUE/FALSE to 1/0
    .replace(/\bTRUE\b/gi, '1')
    .replace(/\bFALSE\b/gi, '0')
    // Convert ON CONFLICT with DO UPDATE
    .replace(/ON CONFLICT \(([^)]+)\)\s*DO UPDATE SET/gi, 'ON CONFLICT($1) DO UPDATE SET')
    // Handle PostgreSQL interval syntax
    .replace(/NOW\(\) - INTERVAL '(\d+) hour'/gi, "datetime('now', '-$1 hours')");

  // Convert parameters to SQLite-compatible types
  const sqliteParams = convertParams(expandedParams);

  try {
    const isSelect = sqliteText.trim().toUpperCase().startsWith('SELECT');
    const isInsertReturning = sqliteText.toUpperCase().includes('RETURNING');
    const isUpdate = sqliteText.trim().toUpperCase().startsWith('UPDATE');
    const isDelete = sqliteText.trim().toUpperCase().startsWith('DELETE');

    if (isSelect) {
      const stmt = db.prepare(sqliteText);
      const rows = stmt.all(sqliteParams) as T[];
      return { rows, rowCount: rows.length };
    } else if (isInsertReturning) {
      // Handle INSERT ... RETURNING
      const returningMatch = sqliteText.match(/RETURNING\s+(.+)$/i);
      const insertPart = sqliteText.replace(/\s*RETURNING\s+.+$/i, '');

      const stmt = db.prepare(insertPart);
      const info = stmt.run(sqliteParams);

      if (returningMatch) {
        // For RETURNING, fetch the last inserted row
        const tableName = insertPart.match(/INSERT\s+(?:OR\s+\w+\s+)?INTO\s+(\w+)/i)?.[1];
        if (tableName) {
          const selectStmt = db.prepare(`SELECT * FROM ${tableName} WHERE rowid = ?`);
          const row = selectStmt.get(info.lastInsertRowid) as T;
          return { rows: row ? [row] : [], rowCount: info.changes };
        }
      }
      return { rows: [], rowCount: info.changes };
    } else if (isUpdate || isDelete) {
      // Handle UPDATE/DELETE with optional RETURNING
      const mainPart = sqliteText.replace(/\s*RETURNING\s+.+$/i, '');

      const stmt = db.prepare(mainPart);
      const info = stmt.run(sqliteParams);

      return { rows: [], rowCount: info.changes };
    } else {
      // DDL or other statements
      const stmt = db.prepare(sqliteText);
      const info = stmt.run(sqliteParams);
      return { rows: [], rowCount: info.changes };
    }
  } catch (error) {
    console.error('[SQLite] Query error', { text: text.substring(0, 100), error });
    throw error;
  }
}

// Cleanup functions
export async function cleanupExpiredOAuthStates(): Promise<number> {
  const result = await query("DELETE FROM oauth_states WHERE expires_at < datetime('now')");
  return result.rowCount || 0;
}

export async function cleanupExpiredSessions(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<number> {
  const cutoffTime = new Date(Date.now() - maxAgeMs).toISOString();
  const result = await query(
    "UPDATE sessions SET state = 'expired' WHERE state = 'active' AND last_activity_at < ?",
    [cutoffTime]
  );
  return result.rowCount || 0;
}

export async function cleanupOldRateLimits(): Promise<number> {
  const result = await query(
    "DELETE FROM rate_limits WHERE window_start < datetime('now', '-1 hour')"
  );
  return result.rowCount || 0;
}

// Health check
export async function healthCheck(): Promise<boolean> {
  try {
    db.prepare('SELECT 1').get();
    return true;
  } catch {
    return false;
  }
}

// Close database
export function closeDatabase(): void {
  db.close();
  console.log('[SQLite] Database closed');
}

// Export the raw db for transactions if needed
export { db };
