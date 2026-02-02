import crypto from 'crypto';
import { query, type DbUser } from './database.js';

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
export async function findOrCreateUser(salesforceUserId: string, email?: string, name?: string): Promise<User> {
  // Try to find existing user
  const findResult = await query<DbUser>(
    'SELECT * FROM users WHERE salesforce_user_id = $1',
    [salesforceUserId]
  );
  const existing = findResult.rows[0];

  if (existing) {
    // Update last login and any new info
    await query(
      `UPDATE users SET
         last_login_at = NOW(),
         email = COALESCE($1, email),
         name = COALESCE($2, name)
       WHERE id = $3`,
      [email || null, name || null, existing.id]
    );

    return {
      ...dbRowToUser(existing),
      lastLoginAt: new Date(),
      email: email || existing.email,
      name: name || existing.name,
    };
  }

  // Create new user
  const id = generateUserId();
  await query(
    `INSERT INTO users (id, salesforce_user_id, email, name, last_login_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [id, salesforceUserId, email || null, name || null]
  );

  return {
    id,
    salesforceUserId,
    email: email || null,
    name: name || null,
    createdAt: new Date(),
    lastLoginAt: new Date(),
  };
}

export async function getUserById(id: string): Promise<User | undefined> {
  const result = await query<DbUser>(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
  const row = result.rows[0];
  return row ? dbRowToUser(row) : undefined;
}

export async function getUserBySalesforceId(salesforceUserId: string): Promise<User | undefined> {
  const result = await query<DbUser>(
    'SELECT * FROM users WHERE salesforce_user_id = $1',
    [salesforceUserId]
  );
  const row = result.rows[0];
  return row ? dbRowToUser(row) : undefined;
}

export async function updateUser(id: string, updates: { email?: string; name?: string }): Promise<User | undefined> {
  const result = await query<DbUser>(
    `UPDATE users SET
       email = COALESCE($1, email),
       name = COALESCE($2, name)
     WHERE id = $3
     RETURNING *`,
    [updates.email || null, updates.name || null, id]
  );
  const row = result.rows[0];
  return row ? dbRowToUser(row) : undefined;
}

export async function listUsers(limit: number = 100): Promise<User[]> {
  const result = await query<DbUser>(
    'SELECT * FROM users WHERE id NOT IN ($1, $2) ORDER BY last_login_at DESC NULLS LAST LIMIT $3',
    ['pending', 'system', limit]
  );
  return result.rows.map(dbRowToUser);
}
