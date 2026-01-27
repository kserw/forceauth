import Database, { type Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/forceauth.db');

// Ensure data directory exists
import fs from 'fs';
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db: DatabaseType = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  -- Users table: tracks users by their Salesforce identity
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    salesforce_user_id TEXT UNIQUE NOT NULL,
    email TEXT,
    name TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_login_at TEXT
  );

  -- Org credentials: Connected App configurations
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
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id)
  );

  -- Sessions table: persistent sessions
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    org_credentials_id TEXT,
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT,
    instance_url TEXT,
    environment TEXT,
    issued_at INTEGER,
    expires_at INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (org_credentials_id) REFERENCES org_credentials(id)
  );

  -- Tracked integrations: user-owned integration tracking
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
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id)
  );

  -- Integration shares: explicit per-user sharing
  CREATE TABLE IF NOT EXISTS integration_shares (
    id TEXT PRIMARY KEY,
    integration_id TEXT NOT NULL,
    shared_with_user_id TEXT NOT NULL,
    permission TEXT DEFAULT 'view' CHECK(permission IN ('view', 'edit')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (integration_id) REFERENCES tracked_integrations(id) ON DELETE CASCADE,
    FOREIGN KEY (shared_with_user_id) REFERENCES users(id),
    UNIQUE(integration_id, shared_with_user_id)
  );

  -- Indexes for performance
  CREATE INDEX IF NOT EXISTS idx_org_credentials_client_id ON org_credentials(client_id);
  CREATE INDEX IF NOT EXISTS idx_org_credentials_created_by ON org_credentials(created_by_user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_tracked_integrations_created_by ON tracked_integrations(created_by_user_id);
  CREATE INDEX IF NOT EXISTS idx_integration_shares_integration_id ON integration_shares(integration_id);
  CREATE INDEX IF NOT EXISTS idx_integration_shares_shared_with ON integration_shares(shared_with_user_id);

  -- System users for pre-login registration flow
  INSERT OR IGNORE INTO users (id, salesforce_user_id, email, name) VALUES ('pending', 'pending', NULL, 'Pending User');
  INSERT OR IGNORE INTO users (id, salesforce_user_id, email, name) VALUES ('system', 'system', NULL, 'System User');
`);

// Migration: Add sf_org_id and sf_org_name columns to sessions if they don't exist
try {
  db.exec(`ALTER TABLE sessions ADD COLUMN sf_org_id TEXT`);
} catch {
  // Column already exists
}
try {
  db.exec(`ALTER TABLE sessions ADD COLUMN sf_org_name TEXT`);
} catch {
  // Column already exists
}

// TESTING: Wipe all orgs and sessions on restart (development only)
if (process.env.NODE_ENV !== 'production' && process.env.WIPE_DB_ON_START === 'true') {
  console.log('[DB] Wiping all orgs and sessions for testing...');
  db.exec(`DELETE FROM sessions`);
  db.exec(`DELETE FROM org_credentials`);
  console.log('[DB] Orgs and sessions wiped');
}

export default db;

// Helper types
export interface DbUser {
  id: string;
  salesforce_user_id: string;
  email: string | null;
  name: string | null;
  created_at: string;
  last_login_at: string | null;
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
  shared: number;
  created_at: string;
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
  expires_at: number | null;
  sf_org_id: string | null;
  sf_org_name: string | null;
  created_at: string;
}

export interface DbTrackedIntegration {
  id: string;
  app_name: string;
  contact: string;
  contact_id: string | null;
  sf_username: string;
  sf_user_id: string | null;
  profile: string;
  in_retool: number;
  has_ip_ranges: number;
  notes: string;
  ip_ranges: string; // JSON string array
  status: 'done' | 'in_progress' | 'pending' | 'blocked';
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface DbIntegrationShare {
  id: string;
  integration_id: string;
  shared_with_user_id: string;
  permission: 'view' | 'edit';
  created_at: string;
}
