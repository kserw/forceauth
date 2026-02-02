import type { OrgCredentials, SalesforceEnvironment } from '../types/index.js';
import crypto from 'crypto';
import { query, type DbOrgCredentials } from './database.js';

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
    shared: row.shared === true,
  };
}

export async function registerOrgCredentials(
  orgName: string,
  environment: SalesforceEnvironment,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  createdByUserId: string
): Promise<OrgCredentials> {
  const id = generateCredentialsId();
  const encryptedSecret = encryptSecret(clientSecret);

  await query(
    `INSERT INTO org_credentials (id, org_name, environment, client_id, client_secret_encrypted, redirect_uri, created_by_user_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, orgName, environment, clientId, encryptedSecret, redirectUri, createdByUserId]
  );

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

export async function getOrgCredentials(id: string): Promise<OrgCredentials | undefined> {
  const result = await query<DbOrgCredentials>(
    'SELECT * FROM org_credentials WHERE id = $1',
    [id]
  );
  const row = result.rows[0];
  return row ? dbRowToOrgCredentials(row) : undefined;
}

export function getDecryptedClientSecret(credentials: OrgCredentials): string {
  return decryptSecret(credentials.clientSecret);
}

export async function listOrgCredentials(createdByUserId?: string): Promise<OrgCredentials[]> {
  let result;
  if (createdByUserId) {
    result = await query<DbOrgCredentials>(
      'SELECT * FROM org_credentials WHERE created_by_user_id = $1',
      [createdByUserId]
    );
  } else {
    result = await query<DbOrgCredentials>('SELECT * FROM org_credentials');
  }
  return result.rows.map(dbRowToOrgCredentials);
}

// Get orgs visible to a user (own orgs + shared orgs from same team/clientId)
export async function listVisibleOrgCredentials(userId: string): Promise<OrgCredentials[]> {
  const result = await query<DbOrgCredentials>(
    `SELECT DISTINCT oc.* FROM org_credentials oc
     WHERE oc.created_by_user_id = $1
     OR (
       oc.shared = TRUE
       AND oc.client_id IN (
         SELECT client_id FROM org_credentials WHERE created_by_user_id = $1
       )
     )`,
    [userId]
  );
  return result.rows.map(dbRowToOrgCredentials);
}

export async function updateOrgId(credentialsId: string, orgId: string): Promise<void> {
  await query(
    'UPDATE org_credentials SET org_id = $1 WHERE id = $2',
    [orgId, credentialsId]
  );
}

export async function setOrgShared(credentialsId: string, shared: boolean): Promise<boolean> {
  const result = await query(
    'UPDATE org_credentials SET shared = $1 WHERE id = $2',
    [shared, credentialsId]
  );
  return (result.rowCount || 0) > 0;
}

export async function deleteOrgCredentials(id: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM org_credentials WHERE id = $1',
    [id]
  );
  return (result.rowCount || 0) > 0;
}

// Get the owner user ID of an org credential
export async function getOrgOwner(credentialsId: string): Promise<string | null> {
  const result = await query<{ created_by_user_id: string }>(
    'SELECT created_by_user_id FROM org_credentials WHERE id = $1',
    [credentialsId]
  );
  return result.rows[0]?.created_by_user_id || null;
}

// Claim a pending org credential for a user (called after OAuth login)
export async function claimOrgCredentials(credentialsId: string, userId: string): Promise<boolean> {
  const result = await query(
    `UPDATE org_credentials
     SET created_by_user_id = $1
     WHERE id = $2 AND (created_by_user_id = 'pending' OR created_by_user_id = 'system')`,
    [userId, credentialsId]
  );
  return (result.rowCount || 0) > 0;
}

// Claim ALL pending org credentials for a user (called after OAuth login)
export async function claimAllPendingOrgCredentials(userId: string): Promise<number> {
  const result = await query(
    `UPDATE org_credentials
     SET created_by_user_id = $1
     WHERE created_by_user_id = 'pending' OR created_by_user_id = 'system'`,
    [userId]
  );
  return result.rowCount || 0;
}
