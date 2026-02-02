import { Router, type Request, type Response } from 'express';
import { getSessionUserId } from '../services/tokenStore.js';
import {
  listVisibleIntegrations,
  getIntegrationById,
  createIntegration,
  updateIntegration,
  deleteIntegration,
  shareIntegration,
  removeShare,
  listShares,
  importFromCsv,
  checkPermission,
} from '../services/trackedIntegrationsStore.js';
import {
  validateBody,
  trackedIntegrationSchema,
  trackedIntegrationUpdateSchema,
  integrationShareSchema,
  csvImportSchema,
} from '../middleware/validation.js';
import {
  logIntegrationCreated,
  logIntegrationUpdated,
  logIntegrationDeleted,
  logAudit,
} from '../services/auditLog.js';

const router = Router();
const COOKIE_NAME = 'forceauth_session';

// Helper to get client info from request
function getClientInfo(req: Request): { ipAddress: string; userAgent: string } {
  const forwarded = req.headers['x-forwarded-for'];
  const ipAddress = forwarded
    ? (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',')[0].trim()
    : req.ip || req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  return { ipAddress, userAgent };
}

// Helper to require authentication
async function requireAuth(req: Request, res: Response): Promise<string | null> {
  const sessionId = req.cookies[COOKIE_NAME];
  if (!sessionId) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }

  const userId = await getSessionUserId(sessionId);
  if (!userId || userId === 'pending') {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }

  return userId;
}

// GET /api/tracked-integrations - List visible integrations
router.get('/', async (req: Request, res: Response) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;

  try {
    const integrations = await listVisibleIntegrations(userId);
    res.json({ integrations });
  } catch (err) {
    console.error('Failed to get tracked integrations:', err);
    res.status(500).json({ error: 'Failed to fetch tracked integrations' });
  }
});

// GET /api/tracked-integrations/:id - Get a single tracked integration
router.get('/:id', async (req: Request, res: Response) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;

  try {
    const integration = await getIntegrationById(req.params.id, userId);
    if (!integration) {
      res.status(404).json({ error: 'Integration not found or access denied' });
      return;
    }
    res.json(integration);
  } catch (err) {
    console.error('Failed to get tracked integration:', err);
    res.status(500).json({ error: 'Failed to fetch tracked integration' });
  }
});

// POST /api/tracked-integrations - Create a new tracked integration
router.post('/', validateBody(trackedIntegrationSchema), async (req: Request, res: Response) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;

  const sessionId = req.cookies[COOKIE_NAME];
  const { ipAddress, userAgent } = getClientInfo(req);

  try {
    const {
      appName,
      contact,
      contactId,
      sfUsername,
      sfUserId,
      profile,
      inRetool,
      hasIpRanges,
      notes,
      ipRanges,
      status,
    } = req.body;

    const integration = await createIntegration({
      appName,
      contact: contact || '',
      contactId: contactId || null,
      sfUsername: sfUsername || '',
      sfUserId: sfUserId || null,
      profile: profile || '',
      inRetool: inRetool ?? false,
      hasIpRanges: hasIpRanges ?? false,
      notes: notes || '',
      ipRanges: ipRanges || [],
      status: status || 'pending',
    }, userId);

    // Log audit event
    await logIntegrationCreated(userId, sessionId, integration.id, appName, ipAddress, userAgent);

    res.status(201).json(integration);
  } catch (err) {
    console.error('Failed to create tracked integration:', err);
    res.status(500).json({ error: 'Failed to create tracked integration' });
  }
});

// PUT /api/tracked-integrations/:id - Update a tracked integration
router.put('/:id', validateBody(trackedIntegrationUpdateSchema), async (req: Request, res: Response) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;

  const sessionId = req.cookies[COOKIE_NAME];
  const { ipAddress, userAgent } = getClientInfo(req);

  try {
    // Check permission first
    if (!await checkPermission(req.params.id, userId, 'edit')) {
      res.status(403).json({ error: 'You do not have permission to edit this integration' });
      return;
    }

    const {
      appName,
      contact,
      contactId,
      sfUsername,
      sfUserId,
      profile,
      inRetool,
      hasIpRanges,
      notes,
      ipRanges,
      status,
    } = req.body;

    const integration = await updateIntegration(req.params.id, {
      ...(appName !== undefined && { appName }),
      ...(contact !== undefined && { contact }),
      ...(contactId !== undefined && { contactId }),
      ...(sfUsername !== undefined && { sfUsername }),
      ...(sfUserId !== undefined && { sfUserId }),
      ...(profile !== undefined && { profile }),
      ...(inRetool !== undefined && { inRetool }),
      ...(hasIpRanges !== undefined && { hasIpRanges }),
      ...(notes !== undefined && { notes }),
      ...(ipRanges !== undefined && { ipRanges }),
      ...(status !== undefined && { status }),
    }, userId);

    if (!integration) {
      res.status(404).json({ error: 'Integration not found' });
      return;
    }

    // Log audit event with changes
    await logIntegrationUpdated(userId, sessionId, req.params.id, req.body, ipAddress, userAgent);

    res.json(integration);
  } catch (err) {
    console.error('Failed to update tracked integration:', err);
    res.status(500).json({ error: 'Failed to update tracked integration' });
  }
});

// DELETE /api/tracked-integrations/:id - Delete a tracked integration (owner only)
router.delete('/:id', async (req: Request, res: Response) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;

  const sessionId = req.cookies[COOKIE_NAME];
  const { ipAddress, userAgent } = getClientInfo(req);

  try {
    // Check ownership
    if (!await checkPermission(req.params.id, userId, 'owner')) {
      res.status(403).json({ error: 'Only the owner can delete this integration' });
      return;
    }

    const deleted = await deleteIntegration(req.params.id, userId);
    if (!deleted) {
      res.status(404).json({ error: 'Integration not found' });
      return;
    }

    // Log audit event
    await logIntegrationDeleted(userId, sessionId, req.params.id, ipAddress, userAgent);

    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete tracked integration:', err);
    res.status(500).json({ error: 'Failed to delete tracked integration' });
  }
});

// POST /api/tracked-integrations/import - Import from CSV
router.post('/import', validateBody(csvImportSchema), async (req: Request, res: Response) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;

  const sessionId = req.cookies[COOKIE_NAME];
  const { ipAddress, userAgent } = getClientInfo(req);

  try {
    const { csvContent } = req.body;

    const integrations = await importFromCsv(csvContent, userId);

    // Log audit event
    await logAudit({
      userId,
      sessionId,
      action: 'integration.imported',
      resourceType: 'tracked_integration',
      details: { count: integrations.length },
      ipAddress,
      userAgent,
      success: true,
    });

    res.json({
      success: true,
      imported: integrations.length,
      integrations,
    });
  } catch (err) {
    console.error('Failed to import integrations:', err);
    res.status(500).json({ error: 'Failed to import integrations' });
  }
});

// ============================================================================
// SHARING ENDPOINTS
// ============================================================================

// POST /api/tracked-integrations/:id/share - Share with a user
router.post('/:id/share', validateBody(integrationShareSchema), async (req: Request, res: Response) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;

  const sessionId = req.cookies[COOKIE_NAME];
  const { ipAddress, userAgent } = getClientInfo(req);

  try {
    const { sharedWithUserId, permission } = req.body;

    // Only owner can share
    if (!await checkPermission(req.params.id, userId, 'owner')) {
      res.status(403).json({ error: 'Only the owner can share this integration' });
      return;
    }

    const share = await shareIntegration(req.params.id, userId, sharedWithUserId, permission || 'view');

    if (!share) {
      res.status(400).json({ error: 'Failed to share integration' });
      return;
    }

    // Log audit event
    await logAudit({
      userId,
      sessionId,
      action: 'integration.shared',
      resourceType: 'tracked_integration',
      resourceId: req.params.id,
      details: { sharedWithUserId, permission },
      ipAddress,
      userAgent,
      success: true,
    });

    res.status(201).json(share);
  } catch (err) {
    console.error('Failed to share integration:', err);
    res.status(500).json({ error: 'Failed to share integration' });
  }
});

// DELETE /api/tracked-integrations/:id/share/:userId - Remove share
router.delete('/:id/share/:sharedUserId', async (req: Request, res: Response) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;

  const sessionId = req.cookies[COOKIE_NAME];
  const { ipAddress, userAgent } = getClientInfo(req);

  try {
    // Only owner can remove shares
    if (!await checkPermission(req.params.id, userId, 'owner')) {
      res.status(403).json({ error: 'Only the owner can remove shares' });
      return;
    }

    const removed = await removeShare(req.params.id, userId, req.params.sharedUserId);

    if (!removed) {
      res.status(404).json({ error: 'Share not found' });
      return;
    }

    // Log audit event
    await logAudit({
      userId,
      sessionId,
      action: 'integration.unshared',
      resourceType: 'tracked_integration',
      resourceId: req.params.id,
      details: { unsharedUserId: req.params.sharedUserId },
      ipAddress,
      userAgent,
      success: true,
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Failed to remove share:', err);
    res.status(500).json({ error: 'Failed to remove share' });
  }
});

// GET /api/tracked-integrations/:id/shares - List shares
router.get('/:id/shares', async (req: Request, res: Response) => {
  const userId = await requireAuth(req, res);
  if (!userId) return;

  try {
    // Only owner can see shares
    if (!await checkPermission(req.params.id, userId, 'owner')) {
      res.status(403).json({ error: 'Only the owner can view shares' });
      return;
    }

    const shares = await listShares(req.params.id, userId);
    res.json({ shares });
  } catch (err) {
    console.error('Failed to list shares:', err);
    res.status(500).json({ error: 'Failed to list shares' });
  }
});

export default router;
