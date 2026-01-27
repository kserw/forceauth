import type { OrgCredentials, SalesforceEnvironment } from '../types/index.js';
import crypto from 'crypto';
import db, { type DbOrgCredentials } from './database.js';

// Encryption key - in production, use a proper secret manager
const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex'),
    iv
  );
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptSecret(encrypted: string): string {
  const [ivHex, authTagHex, dataHex] = encrypted.split(':');
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex'),
    Buffer.from(ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  return decipher.update(dataHex, 'hex', 'utf8') + decipher.final('utf8');
}

export function generateCredentialsId(): string {
  return crypto.randomBytes(16).toString('hex');
}

function dbRowToOrgCredentials(row: DbOrgCredentials): OrgCredentials {
  return {
    id: row.id,
    orgId: row.org_id || '',
    orgName: row.org_name,
    environment: row.environment,
    clientId: row.client_id,
    clientSecret: row.client_secret_encrypted,
    redirectUri: row.redirect_uri,
    createdAt: new Date(row.created_at),
    createdBy: row.created_by_user_id,
    shared: row.shared === 1,
  };
}

export function registerOrgCredentials(
  orgName: string,
  environment: SalesforceEnvironment,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  createdByUserId: string
): OrgCredentials {
  const id = generateCredentialsId();
  const encryptedSecret = encryptSecret(clientSecret);

  const stmt = db.prepare(`
    INSERT INTO org_credentials (id, org_name, environment, client_id, client_secret_encrypted, redirect_uri, created_by_user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, orgName, environment, clientId, encryptedSecret, redirectUri, createdByUserId);

  return {
    id,
    orgId: '',
    orgName,
    environment,
    clientId,
    clientSecret: encryptedSecret,
    redirectUri,
    createdAt: new Date(),
    createdBy: createdByUserId,
    shared: false,
  };
}

export function getOrgCredentials(id: string): OrgCredentials | undefined {
  const stmt = db.prepare('SELECT * FROM org_credentials WHERE id = ?');
  const row = stmt.get(id) as DbOrgCredentials | undefined;
  return row ? dbRowToOrgCredentials(row) : undefined;
}

export function getDecryptedClientSecret(credentials: OrgCredentials): string {
  return decryptSecret(credentials.clientSecret);
}

export function listOrgCredentials(createdByUserId?: string): OrgCredentials[] {
  let rows: DbOrgCredentials[];
  if (createdByUserId) {
    const stmt = db.prepare('SELECT * FROM org_credentials WHERE created_by_user_id = ?');
    rows = stmt.all(createdByUserId) as DbOrgCredentials[];
  } else {
    const stmt = db.prepare('SELECT * FROM org_credentials');
    rows = stmt.all() as DbOrgCredentials[];
  }
  return rows.map(dbRowToOrgCredentials);
}

// Get orgs visible to a user (own orgs + shared orgs from same team/clientId)
export function listVisibleOrgCredentials(userId: string): OrgCredentials[] {
  const stmt = db.prepare(`
    SELECT DISTINCT oc.* FROM org_credentials oc
    WHERE oc.created_by_user_id = ?
    OR (
      oc.shared = 1
      AND oc.client_id IN (
        SELECT client_id FROM org_credentials WHERE created_by_user_id = ?
      )
    )
  `);
  const rows = stmt.all(userId, userId) as DbOrgCredentials[];
  return rows.map(dbRowToOrgCredentials);
}

export function updateOrgId(credentialsId: string, orgId: string): void {
  const stmt = db.prepare('UPDATE org_credentials SET org_id = ? WHERE id = ?');
  stmt.run(orgId, credentialsId);
}

export function setOrgShared(credentialsId: string, shared: boolean): boolean {
  const stmt = db.prepare('UPDATE org_credentials SET shared = ? WHERE id = ?');
  const result = stmt.run(shared ? 1 : 0, credentialsId);
  return result.changes > 0;
}

export function deleteOrgCredentials(id: string): boolean {
  const stmt = db.prepare('DELETE FROM org_credentials WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// Get the owner user ID of an org credential
export function getOrgOwner(credentialsId: string): string | null {
  const stmt = db.prepare('SELECT created_by_user_id FROM org_credentials WHERE id = ?');
  const row = stmt.get(credentialsId) as { created_by_user_id: string } | undefined;
  return row?.created_by_user_id || null;
}

// Claim a pending org credential for a user (called after OAuth login)
export function claimOrgCredentials(credentialsId: string, userId: string): boolean {
  const stmt = db.prepare(`
    UPDATE org_credentials
    SET created_by_user_id = ?
    WHERE id = ? AND (created_by_user_id = 'pending' OR created_by_user_id = 'system')
  `);
  const result = stmt.run(userId, credentialsId);
  return result.changes > 0;
}

// Claim ALL pending org credentials for a user (called after OAuth login)
export function claimAllPendingOrgCredentials(userId: string): number {
  const stmt = db.prepare(`
    UPDATE org_credentials
    SET created_by_user_id = ?
    WHERE created_by_user_id = 'pending' OR created_by_user_id = 'system'
  `);
  const result = stmt.run(userId);
  return result.changes;
}
