import crypto from 'crypto';
import { query, type DbTrackedIntegration, type DbIntegrationShare } from './database.js';

export interface TrackedIntegration {
  id: string;
  appName: string;
  contact: string;
  contactId: string | null;
  sfUsername: string;
  sfUserId: string | null;
  profile: string;
  inRetool: boolean;
  hasIpRanges: boolean;
  notes: string;
  ipRanges: string[];
  status: 'done' | 'in_progress' | 'pending' | 'blocked';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  isOwner?: boolean;
  permission?: 'owner' | 'edit' | 'view';
}

export interface IntegrationShare {
  id: string;
  integrationId: string;
  sharedWithUserId: string;
  sharedWithUserName?: string;
  sharedWithUserEmail?: string;
  permission: 'view' | 'edit';
  createdAt: string;
}

function generateId(): string {
  return `ti_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

function generateShareId(): string {
  return `sh_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

function dbRowToIntegration(row: DbTrackedIntegration & { permission?: 'owner' | 'edit' | 'view' }): TrackedIntegration {
  return {
    id: row.id,
    appName: row.app_name,
    contact: row.contact,
    contactId: row.contact_id,
    sfUsername: row.sf_username,
    sfUserId: row.sf_user_id,
    profile: row.profile,
    inRetool: row.in_retool === true,
    hasIpRanges: row.has_ip_ranges === true,
    notes: row.notes,
    ipRanges: Array.isArray(row.ip_ranges) ? row.ip_ranges : JSON.parse(row.ip_ranges as unknown as string || '[]'),
    status: row.status,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
    createdBy: row.created_by_user_id,
    isOwner: row.permission === 'owner',
    permission: row.permission,
  };
}

// List integrations visible to a user (owned + shared with them)
export async function listVisibleIntegrations(userId: string): Promise<TrackedIntegration[]> {
  // Get owned integrations
  const ownedResult = await query<DbTrackedIntegration>(
    `SELECT * FROM tracked_integrations
     WHERE created_by_user_id = $1
     ORDER BY updated_at DESC`,
    [userId]
  );
  const owned = ownedResult.rows.map(row => dbRowToIntegration({ ...row, permission: 'owner' }));

  // Get shared integrations
  const sharedResult = await query<DbTrackedIntegration & { permission: 'view' | 'edit' }>(
    `SELECT ti.*, s.permission
     FROM tracked_integrations ti
     JOIN integration_shares s ON ti.id = s.integration_id
     WHERE s.shared_with_user_id = $1
     ORDER BY ti.updated_at DESC`,
    [userId]
  );
  const shared = sharedResult.rows.map(row => dbRowToIntegration(row));

  return [...owned, ...shared];
}

// Get a single integration by ID with access check
export async function getIntegrationById(id: string, userId: string): Promise<TrackedIntegration | null> {
  // Check if user owns it
  const ownedResult = await query<DbTrackedIntegration>(
    `SELECT * FROM tracked_integrations
     WHERE id = $1 AND created_by_user_id = $2`,
    [id, userId]
  );
  if (ownedResult.rows[0]) {
    return dbRowToIntegration({ ...ownedResult.rows[0], permission: 'owner' });
  }

  // Check if shared with user
  const sharedResult = await query<DbTrackedIntegration & { permission: 'view' | 'edit' }>(
    `SELECT ti.*, s.permission
     FROM tracked_integrations ti
     JOIN integration_shares s ON ti.id = s.integration_id
     WHERE ti.id = $1 AND s.shared_with_user_id = $2`,
    [id, userId]
  );
  if (sharedResult.rows[0]) {
    return dbRowToIntegration(sharedResult.rows[0]);
  }

  return null;
}

// Check if user has at least the specified permission level
export async function checkPermission(integrationId: string, userId: string, requiredPermission: 'view' | 'edit' | 'owner'): Promise<boolean> {
  // Check ownership
  const ownerResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM tracked_integrations WHERE id = $1 AND created_by_user_id = $2`,
    [integrationId, userId]
  );
  const isOwner = parseInt(ownerResult.rows[0]?.count || '0') > 0;

  if (isOwner) return true;
  if (requiredPermission === 'owner') return false;

  // Check shared permission
  const shareResult = await query<{ permission: string }>(
    `SELECT permission FROM integration_shares
     WHERE integration_id = $1 AND shared_with_user_id = $2`,
    [integrationId, userId]
  );
  const share = shareResult.rows[0];

  if (!share) return false;
  if (requiredPermission === 'view') return true;
  return share.permission === 'edit';
}

// Create a new integration
export async function createIntegration(
  data: Omit<TrackedIntegration, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'isOwner' | 'permission'>,
  userId: string
): Promise<TrackedIntegration> {
  const id = generateId();
  const now = new Date();

  await query(
    `INSERT INTO tracked_integrations
     (id, app_name, contact, contact_id, sf_username, sf_user_id, profile, in_retool, has_ip_ranges, notes, ip_ranges, status, created_by_user_id, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
    [
      id,
      data.appName,
      data.contact || '',
      data.contactId || null,
      data.sfUsername || '',
      data.sfUserId || null,
      data.profile || '',
      data.inRetool ?? false,
      data.hasIpRanges ?? false,
      data.notes || '',
      JSON.stringify(data.ipRanges || []),
      data.status || 'pending',
      userId,
      now,
      now,
    ]
  );

  const result = await getIntegrationById(id, userId);
  return result!;
}

// Update an integration (requires edit or owner permission)
export async function updateIntegration(
  id: string,
  data: Partial<Omit<TrackedIntegration, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'isOwner' | 'permission'>>,
  userId: string
): Promise<TrackedIntegration | null> {
  if (!await checkPermission(id, userId, 'edit')) {
    return null;
  }

  const existing = await getIntegrationById(id, userId);
  if (!existing) return null;

  const now = new Date();

  await query(
    `UPDATE tracked_integrations SET
       app_name = $1,
       contact = $2,
       contact_id = $3,
       sf_username = $4,
       sf_user_id = $5,
       profile = $6,
       in_retool = $7,
       has_ip_ranges = $8,
       notes = $9,
       ip_ranges = $10,
       status = $11,
       updated_at = $12
     WHERE id = $13`,
    [
      data.appName ?? existing.appName,
      data.contact ?? existing.contact,
      data.contactId !== undefined ? data.contactId : existing.contactId,
      data.sfUsername ?? existing.sfUsername,
      data.sfUserId !== undefined ? data.sfUserId : existing.sfUserId,
      data.profile ?? existing.profile,
      (data.inRetool ?? existing.inRetool) ? true : false,
      (data.hasIpRanges ?? existing.hasIpRanges) ? true : false,
      data.notes ?? existing.notes,
      JSON.stringify(data.ipRanges ?? existing.ipRanges),
      data.status ?? existing.status,
      now,
      id,
    ]
  );

  return getIntegrationById(id, userId);
}

// Delete an integration (owner only)
export async function deleteIntegration(id: string, userId: string): Promise<boolean> {
  if (!await checkPermission(id, userId, 'owner')) {
    return false;
  }

  const result = await query(
    'DELETE FROM tracked_integrations WHERE id = $1',
    [id]
  );
  return (result.rowCount || 0) > 0;
}

// Share an integration with another user
export async function shareIntegration(
  integrationId: string,
  ownerId: string,
  sharedWithUserId: string,
  permission: 'view' | 'edit' = 'view'
): Promise<IntegrationShare | null> {
  // Only owner can share
  if (!await checkPermission(integrationId, ownerId, 'owner')) {
    return null;
  }

  // Can't share with yourself
  if (ownerId === sharedWithUserId) {
    return null;
  }

  const id = generateShareId();
  const now = new Date().toISOString();

  await query(
    `INSERT INTO integration_shares
     (id, integration_id, shared_with_user_id, permission, created_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (integration_id, shared_with_user_id)
     DO UPDATE SET permission = EXCLUDED.permission`,
    [id, integrationId, sharedWithUserId, permission, now]
  );

  return {
    id,
    integrationId,
    sharedWithUserId,
    permission,
    createdAt: now,
  };
}

// Remove a share
export async function removeShare(integrationId: string, ownerId: string, sharedWithUserId: string): Promise<boolean> {
  // Only owner can remove shares
  if (!await checkPermission(integrationId, ownerId, 'owner')) {
    return false;
  }

  const result = await query(
    `DELETE FROM integration_shares
     WHERE integration_id = $1 AND shared_with_user_id = $2`,
    [integrationId, sharedWithUserId]
  );
  return (result.rowCount || 0) > 0;
}

// List shares for an integration (owner only)
export async function listShares(integrationId: string, ownerId: string): Promise<IntegrationShare[]> {
  if (!await checkPermission(integrationId, ownerId, 'owner')) {
    return [];
  }

  const result = await query<DbIntegrationShare & { user_name: string | null; user_email: string | null }>(
    `SELECT s.*, u.name as user_name, u.email as user_email
     FROM integration_shares s
     LEFT JOIN users u ON s.shared_with_user_id = u.id
     WHERE s.integration_id = $1`,
    [integrationId]
  );

  return result.rows.map(row => ({
    id: row.id,
    integrationId: row.integration_id,
    sharedWithUserId: row.shared_with_user_id,
    sharedWithUserName: row.user_name || undefined,
    sharedWithUserEmail: row.user_email || undefined,
    permission: row.permission,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  }));
}

// Import from CSV (assigns to user)
export async function importFromCsv(csvContent: string, userId: string): Promise<TrackedIntegration[]> {
  const lines = csvContent.trim().split('\n');
  const imported: TrackedIntegration[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length < 4) continue;

    const ipRanges: string[] = [];
    for (let j = 6; j < values.length; j++) {
      const ip = values[j]?.trim();
      if (ip && ip !== '' && !ip.includes(' ')) {
        ipRanges.push(ip);
      }
    }

    const statusMap: Record<string, TrackedIntegration['status']> = {
      'done': 'done',
      'in progress': 'in_progress',
      'in_progress': 'in_progress',
      'pending': 'pending',
      'blocked': 'blocked',
    };

    const statusValue = values[4]?.trim().toLowerCase() || '';
    const status = statusMap[statusValue] || 'pending';
    const contactId = values[1]?.trim() || null;
    const sfUserId = values[2]?.trim() || null;
    const notes = values[5]?.trim() || '';

    const integration = await createIntegration({
      appName: values[0]?.trim() || '',
      contact: '',
      contactId,
      sfUsername: '',
      sfUserId,
      profile: values[3]?.trim() || '',
      inRetool: false,
      hasIpRanges: ipRanges.length > 0,
      notes,
      ipRanges,
      status,
    }, userId);

    imported.push(integration);
  }

  return imported;
}

// Migrate existing JSON data to database (called once during migration)
export async function migrateFromJson(integrations: Array<{
  id: string;
  appName: string;
  contact: string;
  contactId: string | null;
  sfUsername: string;
  sfUserId: string | null;
  profile: string;
  inRetool: boolean;
  hasIpRanges: boolean;
  notes: string;
  ipRanges: string[];
  status: 'done' | 'in_progress' | 'pending' | 'blocked';
  createdAt: string;
  updatedAt: string;
}>, defaultUserId: string = 'system'): Promise<number> {
  let count = 0;
  for (const i of integrations) {
    const result = await query(
      `INSERT INTO tracked_integrations
       (id, app_name, contact, contact_id, sf_username, sf_user_id, profile, in_retool, has_ip_ranges, notes, ip_ranges, status, created_by_user_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (id) DO NOTHING`,
      [
        i.id,
        i.appName,
        i.contact,
        i.contactId,
        i.sfUsername,
        i.sfUserId,
        i.profile,
        i.inRetool ? true : false,
        i.hasIpRanges ? true : false,
        i.notes,
        JSON.stringify(i.ipRanges),
        i.status,
        defaultUserId,
        i.createdAt,
        i.updatedAt,
      ]
    );
    if ((result.rowCount || 0) > 0) count++;
  }

  return count;
}
