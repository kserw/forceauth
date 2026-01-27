import crypto from 'crypto';
import db, { type DbTrackedIntegration, type DbIntegrationShare } from './database.js';

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

function dbRowToIntegration(row: DbTrackedIntegration, permission?: 'owner' | 'edit' | 'view'): TrackedIntegration {
  return {
    id: row.id,
    appName: row.app_name,
    contact: row.contact,
    contactId: row.contact_id,
    sfUsername: row.sf_username,
    sfUserId: row.sf_user_id,
    profile: row.profile,
    inRetool: row.in_retool === 1,
    hasIpRanges: row.has_ip_ranges === 1,
    notes: row.notes,
    ipRanges: JSON.parse(row.ip_ranges || '[]'),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by_user_id,
    isOwner: permission === 'owner',
    permission,
  };
}

// List integrations visible to a user (owned + shared with them)
export function listVisibleIntegrations(userId: string): TrackedIntegration[] {
  // Get owned integrations
  const ownedStmt = db.prepare(`
    SELECT * FROM tracked_integrations
    WHERE created_by_user_id = ?
    ORDER BY updated_at DESC
  `);
  const ownedRows = ownedStmt.all(userId) as DbTrackedIntegration[];
  const owned = ownedRows.map(row => dbRowToIntegration(row, 'owner'));

  // Get shared integrations
  const sharedStmt = db.prepare(`
    SELECT ti.*, s.permission
    FROM tracked_integrations ti
    JOIN integration_shares s ON ti.id = s.integration_id
    WHERE s.shared_with_user_id = ?
    ORDER BY ti.updated_at DESC
  `);
  const sharedRows = sharedStmt.all(userId) as (DbTrackedIntegration & { permission: 'view' | 'edit' })[];
  const shared = sharedRows.map(row => dbRowToIntegration(row, row.permission));

  return [...owned, ...shared];
}

// Get a single integration by ID with access check
export function getIntegrationById(id: string, userId: string): TrackedIntegration | null {
  // Check if user owns it
  const ownedStmt = db.prepare(`
    SELECT * FROM tracked_integrations
    WHERE id = ? AND created_by_user_id = ?
  `);
  const ownedRow = ownedStmt.get(id, userId) as DbTrackedIntegration | undefined;
  if (ownedRow) {
    return dbRowToIntegration(ownedRow, 'owner');
  }

  // Check if shared with user
  const sharedStmt = db.prepare(`
    SELECT ti.*, s.permission
    FROM tracked_integrations ti
    JOIN integration_shares s ON ti.id = s.integration_id
    WHERE ti.id = ? AND s.shared_with_user_id = ?
  `);
  const sharedRow = sharedStmt.get(id, userId) as (DbTrackedIntegration & { permission: 'view' | 'edit' }) | undefined;
  if (sharedRow) {
    return dbRowToIntegration(sharedRow, sharedRow.permission);
  }

  return null;
}

// Check if user has at least the specified permission level
export function checkPermission(integrationId: string, userId: string, requiredPermission: 'view' | 'edit' | 'owner'): boolean {
  // Check ownership
  const ownerStmt = db.prepare(`
    SELECT 1 FROM tracked_integrations WHERE id = ? AND created_by_user_id = ?
  `);
  const isOwner = !!ownerStmt.get(integrationId, userId);

  if (isOwner) return true;
  if (requiredPermission === 'owner') return false;

  // Check shared permission
  const shareStmt = db.prepare(`
    SELECT permission FROM integration_shares
    WHERE integration_id = ? AND shared_with_user_id = ?
  `);
  const share = shareStmt.get(integrationId, userId) as { permission: string } | undefined;

  if (!share) return false;
  if (requiredPermission === 'view') return true;
  return share.permission === 'edit';
}

// Create a new integration
export function createIntegration(
  data: Omit<TrackedIntegration, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'isOwner' | 'permission'>,
  userId: string
): TrackedIntegration {
  const id = generateId();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO tracked_integrations
    (id, app_name, contact, contact_id, sf_username, sf_user_id, profile, in_retool, has_ip_ranges, notes, ip_ranges, status, created_by_user_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    data.appName,
    data.contact || '',
    data.contactId || null,
    data.sfUsername || '',
    data.sfUserId || null,
    data.profile || '',
    data.inRetool ? 1 : 0,
    data.hasIpRanges ? 1 : 0,
    data.notes || '',
    JSON.stringify(data.ipRanges || []),
    data.status || 'pending',
    userId,
    now,
    now
  );

  return getIntegrationById(id, userId)!;
}

// Update an integration (requires edit or owner permission)
export function updateIntegration(
  id: string,
  data: Partial<Omit<TrackedIntegration, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'isOwner' | 'permission'>>,
  userId: string
): TrackedIntegration | null {
  if (!checkPermission(id, userId, 'edit')) {
    return null;
  }

  const existing = getIntegrationById(id, userId);
  if (!existing) return null;

  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE tracked_integrations SET
      app_name = ?,
      contact = ?,
      contact_id = ?,
      sf_username = ?,
      sf_user_id = ?,
      profile = ?,
      in_retool = ?,
      has_ip_ranges = ?,
      notes = ?,
      ip_ranges = ?,
      status = ?,
      updated_at = ?
    WHERE id = ?
  `);

  stmt.run(
    data.appName ?? existing.appName,
    data.contact ?? existing.contact,
    data.contactId !== undefined ? data.contactId : existing.contactId,
    data.sfUsername ?? existing.sfUsername,
    data.sfUserId !== undefined ? data.sfUserId : existing.sfUserId,
    data.profile ?? existing.profile,
    (data.inRetool ?? existing.inRetool) ? 1 : 0,
    (data.hasIpRanges ?? existing.hasIpRanges) ? 1 : 0,
    data.notes ?? existing.notes,
    JSON.stringify(data.ipRanges ?? existing.ipRanges),
    data.status ?? existing.status,
    now,
    id
  );

  return getIntegrationById(id, userId);
}

// Delete an integration (owner only)
export function deleteIntegration(id: string, userId: string): boolean {
  if (!checkPermission(id, userId, 'owner')) {
    return false;
  }

  const stmt = db.prepare('DELETE FROM tracked_integrations WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// Share an integration with another user
export function shareIntegration(
  integrationId: string,
  ownerId: string,
  sharedWithUserId: string,
  permission: 'view' | 'edit' = 'view'
): IntegrationShare | null {
  // Only owner can share
  if (!checkPermission(integrationId, ownerId, 'owner')) {
    return null;
  }

  // Can't share with yourself
  if (ownerId === sharedWithUserId) {
    return null;
  }

  const id = generateShareId();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO integration_shares
    (id, integration_id, shared_with_user_id, permission, created_at)
    VALUES (
      COALESCE((SELECT id FROM integration_shares WHERE integration_id = ? AND shared_with_user_id = ?), ?),
      ?, ?, ?, ?
    )
  `);

  stmt.run(integrationId, sharedWithUserId, id, integrationId, sharedWithUserId, permission, now);

  return {
    id,
    integrationId,
    sharedWithUserId,
    permission,
    createdAt: now,
  };
}

// Remove a share
export function removeShare(integrationId: string, ownerId: string, sharedWithUserId: string): boolean {
  // Only owner can remove shares
  if (!checkPermission(integrationId, ownerId, 'owner')) {
    return false;
  }

  const stmt = db.prepare(`
    DELETE FROM integration_shares
    WHERE integration_id = ? AND shared_with_user_id = ?
  `);
  const result = stmt.run(integrationId, sharedWithUserId);
  return result.changes > 0;
}

// List shares for an integration (owner only)
export function listShares(integrationId: string, ownerId: string): IntegrationShare[] {
  if (!checkPermission(integrationId, ownerId, 'owner')) {
    return [];
  }

  const stmt = db.prepare(`
    SELECT s.*, u.name as user_name, u.email as user_email
    FROM integration_shares s
    LEFT JOIN users u ON s.shared_with_user_id = u.id
    WHERE s.integration_id = ?
  `);
  const rows = stmt.all(integrationId) as (DbIntegrationShare & { user_name: string | null; user_email: string | null })[];

  return rows.map(row => ({
    id: row.id,
    integrationId: row.integration_id,
    sharedWithUserId: row.shared_with_user_id,
    sharedWithUserName: row.user_name || undefined,
    sharedWithUserEmail: row.user_email || undefined,
    permission: row.permission,
    createdAt: row.created_at,
  }));
}

// Import from CSV (assigns to user)
export function importFromCsv(csvContent: string, userId: string): TrackedIntegration[] {
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

    const integration = createIntegration({
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
export function migrateFromJson(integrations: Array<{
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
}>, defaultUserId: string = 'system'): number {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO tracked_integrations
    (id, app_name, contact, contact_id, sf_username, sf_user_id, profile, in_retool, has_ip_ranges, notes, ip_ranges, status, created_by_user_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let count = 0;
  for (const i of integrations) {
    const result = stmt.run(
      i.id,
      i.appName,
      i.contact,
      i.contactId,
      i.sfUsername,
      i.sfUserId,
      i.profile,
      i.inRetool ? 1 : 0,
      i.hasIpRanges ? 1 : 0,
      i.notes,
      JSON.stringify(i.ipRanges),
      i.status,
      defaultUserId,
      i.createdAt,
      i.updatedAt
    );
    if (result.changes > 0) count++;
  }

  return count;
}
