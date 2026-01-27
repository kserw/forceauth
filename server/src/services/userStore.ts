import crypto from 'crypto';
import db, { type DbUser } from './database.js';

export interface User {
  id: string;
  salesforceUserId: string;
  email: string | null;
  name: string | null;
  createdAt: Date;
  lastLoginAt: Date | null;
}

function dbRowToUser(row: DbUser): User {
  return {
    id: row.id,
    salesforceUserId: row.salesforce_user_id,
    email: row.email,
    name: row.name,
    createdAt: new Date(row.created_at),
    lastLoginAt: row.last_login_at ? new Date(row.last_login_at) : null,
  };
}

export function generateUserId(): string {
  return crypto.randomBytes(16).toString('hex');
}

// Find or create a user based on their Salesforce identity
export function findOrCreateUser(salesforceUserId: string, email?: string, name?: string): User {
  // Try to find existing user
  const findStmt = db.prepare('SELECT * FROM users WHERE salesforce_user_id = ?');
  const existing = findStmt.get(salesforceUserId) as DbUser | undefined;

  if (existing) {
    // Update last login and any new info
    const updateStmt = db.prepare(`
      UPDATE users SET
        last_login_at = CURRENT_TIMESTAMP,
        email = COALESCE(?, email),
        name = COALESCE(?, name)
      WHERE id = ?
    `);
    updateStmt.run(email || null, name || null, existing.id);

    return {
      ...dbRowToUser(existing),
      lastLoginAt: new Date(),
      email: email || existing.email,
      name: name || existing.name,
    };
  }

  // Create new user
  const id = generateUserId();
  const insertStmt = db.prepare(`
    INSERT INTO users (id, salesforce_user_id, email, name, last_login_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);
  insertStmt.run(id, salesforceUserId, email || null, name || null);

  return {
    id,
    salesforceUserId,
    email: email || null,
    name: name || null,
    createdAt: new Date(),
    lastLoginAt: new Date(),
  };
}

export function getUserById(id: string): User | undefined {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  const row = stmt.get(id) as DbUser | undefined;
  return row ? dbRowToUser(row) : undefined;
}

export function getUserBySalesforceId(salesforceUserId: string): User | undefined {
  const stmt = db.prepare('SELECT * FROM users WHERE salesforce_user_id = ?');
  const row = stmt.get(salesforceUserId) as DbUser | undefined;
  return row ? dbRowToUser(row) : undefined;
}
