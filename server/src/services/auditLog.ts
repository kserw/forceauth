import { query } from './database.js';

// Audit log action types
export type AuditAction =
  // Authentication
  | 'auth.login.success'
  | 'auth.login.failed'
  | 'auth.logout'
  | 'auth.token.refresh'
  | 'auth.session.expired'
  | 'auth.session.revoked'
  // Org credentials
  | 'org.created'
  | 'org.deleted'
  | 'org.shared'
  | 'org.unshared'
  | 'org.claimed'
  // Integrations
  | 'integration.created'
  | 'integration.updated'
  | 'integration.deleted'
  | 'integration.shared'
  | 'integration.unshared'
  | 'integration.imported'
  // Data access
  | 'data.export'
  | 'data.salesforce.query'
  // Security events
  | 'security.csrf.failed'
  | 'security.rate.limited'
  | 'security.ip.mismatch';

export interface AuditLogEntry {
  userId?: string;
  sessionId?: string;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  errorMessage?: string;
}

/**
 * Log an audit event to the database
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    await query(
      `INSERT INTO audit_logs
       (user_id, session_id, action, resource_type, resource_id, details, ip_address, user_agent, success, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        entry.userId || null,
        entry.sessionId || null,
        entry.action,
        entry.resourceType || null,
        entry.resourceId || null,
        entry.details ? JSON.stringify(entry.details) : null,
        entry.ipAddress || null,
        entry.userAgent || null,
        entry.success ?? true,
        entry.errorMessage || null,
      ]
    );
  } catch (error) {
    // Don't let audit logging failures break the application
    console.error('[AuditLog] Failed to write audit log:', error, entry);
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS FOR COMMON AUDIT EVENTS
// =============================================================================

export async function logLoginSuccess(
  userId: string,
  sessionId: string,
  ipAddress?: string,
  userAgent?: string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAudit({
    userId,
    sessionId,
    action: 'auth.login.success',
    resourceType: 'session',
    resourceId: sessionId,
    ipAddress,
    userAgent,
    details,
    success: true,
  });
}

export async function logLoginFailed(
  ipAddress?: string,
  userAgent?: string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAudit({
    action: 'auth.login.failed',
    ipAddress,
    userAgent,
    details,
    success: false,
  });
}

export async function logLogout(
  userId: string,
  sessionId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAudit({
    userId,
    sessionId,
    action: 'auth.logout',
    resourceType: 'session',
    resourceId: sessionId,
    ipAddress,
    userAgent,
    success: true,
  });
}

export async function logOrgCreated(
  userId: string,
  sessionId: string | undefined,
  orgId: string,
  orgName: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAudit({
    userId,
    sessionId,
    action: 'org.created',
    resourceType: 'org_credentials',
    resourceId: orgId,
    details: { orgName },
    ipAddress,
    userAgent,
    success: true,
  });
}

export async function logOrgDeleted(
  userId: string,
  sessionId: string | undefined,
  orgId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAudit({
    userId,
    sessionId,
    action: 'org.deleted',
    resourceType: 'org_credentials',
    resourceId: orgId,
    ipAddress,
    userAgent,
    success: true,
  });
}

export async function logOrgShared(
  userId: string,
  sessionId: string | undefined,
  orgId: string,
  shared: boolean,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAudit({
    userId,
    sessionId,
    action: shared ? 'org.shared' : 'org.unshared',
    resourceType: 'org_credentials',
    resourceId: orgId,
    details: { shared },
    ipAddress,
    userAgent,
    success: true,
  });
}

export async function logIntegrationCreated(
  userId: string,
  sessionId: string | undefined,
  integrationId: string,
  appName: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAudit({
    userId,
    sessionId,
    action: 'integration.created',
    resourceType: 'tracked_integration',
    resourceId: integrationId,
    details: { appName },
    ipAddress,
    userAgent,
    success: true,
  });
}

export async function logIntegrationUpdated(
  userId: string,
  sessionId: string | undefined,
  integrationId: string,
  changes: Record<string, unknown>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAudit({
    userId,
    sessionId,
    action: 'integration.updated',
    resourceType: 'tracked_integration',
    resourceId: integrationId,
    details: { changes },
    ipAddress,
    userAgent,
    success: true,
  });
}

export async function logIntegrationDeleted(
  userId: string,
  sessionId: string | undefined,
  integrationId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAudit({
    userId,
    sessionId,
    action: 'integration.deleted',
    resourceType: 'tracked_integration',
    resourceId: integrationId,
    ipAddress,
    userAgent,
    success: true,
  });
}

export async function logSecurityEvent(
  action: AuditAction,
  details: Record<string, unknown>,
  ipAddress?: string,
  userAgent?: string,
  userId?: string,
  sessionId?: string
): Promise<void> {
  await logAudit({
    userId,
    sessionId,
    action,
    details,
    ipAddress,
    userAgent,
    success: false,
  });
}

// =============================================================================
// AUDIT LOG QUERIES
// =============================================================================

export interface AuditLogQueryOptions {
  userId?: string;
  action?: AuditAction;
  resourceType?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditLogRecord {
  id: number;
  userId: string | null;
  sessionId: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  success: boolean;
  errorMessage: string | null;
  createdAt: Date;
}

export async function queryAuditLogs(options: AuditLogQueryOptions): Promise<AuditLogRecord[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (options.userId) {
    conditions.push(`user_id = $${paramIndex++}`);
    params.push(options.userId);
  }
  if (options.action) {
    conditions.push(`action = $${paramIndex++}`);
    params.push(options.action);
  }
  if (options.resourceType) {
    conditions.push(`resource_type = $${paramIndex++}`);
    params.push(options.resourceType);
  }
  if (options.resourceId) {
    conditions.push(`resource_id = $${paramIndex++}`);
    params.push(options.resourceId);
  }
  if (options.startDate) {
    conditions.push(`created_at >= $${paramIndex++}`);
    params.push(options.startDate);
  }
  if (options.endDate) {
    conditions.push(`created_at <= $${paramIndex++}`);
    params.push(options.endDate);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = options.limit || 100;
  const offset = options.offset || 0;

  const result = await query<{
    id: number;
    user_id: string | null;
    session_id: string | null;
    action: string;
    resource_type: string | null;
    resource_id: string | null;
    details: Record<string, unknown> | null;
    ip_address: string | null;
    user_agent: string | null;
    success: boolean;
    error_message: string | null;
    created_at: Date;
  }>(
    `SELECT * FROM audit_logs
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limit, offset]
  );

  return result.rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    sessionId: row.session_id,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    details: row.details,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    success: row.success,
    errorMessage: row.error_message,
    createdAt: row.created_at,
  }));
}

/**
 * Get recent authentication events for a user
 */
export async function getRecentAuthEvents(userId: string, limit: number = 10): Promise<AuditLogRecord[]> {
  return queryAuditLogs({
    userId,
    limit,
  });
}

/**
 * Get security events (failed logins, CSRF failures, etc.)
 */
export async function getSecurityEvents(limit: number = 100): Promise<AuditLogRecord[]> {
  const result = await query<{
    id: number;
    user_id: string | null;
    session_id: string | null;
    action: string;
    resource_type: string | null;
    resource_id: string | null;
    details: Record<string, unknown> | null;
    ip_address: string | null;
    user_agent: string | null;
    success: boolean;
    error_message: string | null;
    created_at: Date;
  }>(
    `SELECT * FROM audit_logs
     WHERE action LIKE 'security.%' OR action = 'auth.login.failed'
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  );

  return result.rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    sessionId: row.session_id,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    details: row.details,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    success: row.success,
    errorMessage: row.error_message,
    createdAt: row.created_at,
  }));
}
