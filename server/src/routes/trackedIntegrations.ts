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
  type TrackedIntegration,
} from '../services/trackedIntegrationsStore.js';

const router = Router();
const COOKIE_NAME = 'forceauth_session';

// Helper to require authentication
function requireAuth(req: Request, res: Response): string | null {
  const sessionId = req.cookies[COOKIE_NAME];
  if (!sessionId) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }

  const userId = getSessionUserId(sessionId);
  if (!userId || userId === 'pending') {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }

  return userId;
}

// GET /api/tracked-integrations - List visible integrations
router.get('/', (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  try {
    const integrations = listVisibleIntegrations(userId);
    res.json({ integrations });
  } catch (err) {
    console.error('Failed to get tracked integrations:', err);
    res.status(500).json({ error: 'Failed to fetch tracked integrations' });
  }
});

// GET /api/tracked-integrations/:id - Get a single tracked integration
router.get('/:id', (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  try {
    const integration = getIntegrationById(req.params.id, userId);
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
router.post('/', (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

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

    if (!appName) {
      res.status(400).json({ error: 'appName is required' });
      return;
    }

    const integration = createIntegration({
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

    res.status(201).json(integration);
  } catch (err) {
    console.error('Failed to create tracked integration:', err);
    res.status(500).json({ error: 'Failed to create tracked integration' });
  }
});

// PUT /api/tracked-integrations/:id - Update a tracked integration
router.put('/:id', (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  try {
    // Check permission first
    if (!checkPermission(req.params.id, userId, 'edit')) {
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

    const integration = updateIntegration(req.params.id, {
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

    res.json(integration);
  } catch (err) {
    console.error('Failed to update tracked integration:', err);
    res.status(500).json({ error: 'Failed to update tracked integration' });
  }
});

// DELETE /api/tracked-integrations/:id - Delete a tracked integration (owner only)
router.delete('/:id', (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  try {
    // Check ownership
    if (!checkPermission(req.params.id, userId, 'owner')) {
      res.status(403).json({ error: 'Only the owner can delete this integration' });
      return;
    }

    const deleted = deleteIntegration(req.params.id, userId);
    if (!deleted) {
      res.status(404).json({ error: 'Integration not found' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete tracked integration:', err);
    res.status(500).json({ error: 'Failed to delete tracked integration' });
  }
});

// POST /api/tracked-integrations/import - Import from CSV
router.post('/import', (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  try {
    const { csvContent } = req.body;
    if (!csvContent) {
      res.status(400).json({ error: 'csvContent is required' });
      return;
    }

    const integrations = importFromCsv(csvContent, userId);

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
router.post('/:id/share', (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  try {
    const { sharedWithUserId, permission } = req.body;

    if (!sharedWithUserId) {
      res.status(400).json({ error: 'sharedWithUserId is required' });
      return;
    }

    if (permission && !['view', 'edit'].includes(permission)) {
      res.status(400).json({ error: 'permission must be "view" or "edit"' });
      return;
    }

    // Only owner can share
    if (!checkPermission(req.params.id, userId, 'owner')) {
      res.status(403).json({ error: 'Only the owner can share this integration' });
      return;
    }

    const share = shareIntegration(req.params.id, userId, sharedWithUserId, permission || 'view');

    if (!share) {
      res.status(400).json({ error: 'Failed to share integration' });
      return;
    }

    res.status(201).json(share);
  } catch (err) {
    console.error('Failed to share integration:', err);
    res.status(500).json({ error: 'Failed to share integration' });
  }
});

// DELETE /api/tracked-integrations/:id/share/:userId - Remove share
router.delete('/:id/share/:sharedUserId', (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  try {
    // Only owner can remove shares
    if (!checkPermission(req.params.id, userId, 'owner')) {
      res.status(403).json({ error: 'Only the owner can remove shares' });
      return;
    }

    const removed = removeShare(req.params.id, userId, req.params.sharedUserId);

    if (!removed) {
      res.status(404).json({ error: 'Share not found' });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Failed to remove share:', err);
    res.status(500).json({ error: 'Failed to remove share' });
  }
});

// GET /api/tracked-integrations/:id/shares - List shares
router.get('/:id/shares', (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  try {
    // Only owner can see shares
    if (!checkPermission(req.params.id, userId, 'owner')) {
      res.status(403).json({ error: 'Only the owner can view shares' });
      return;
    }

    const shares = listShares(req.params.id, userId);
    res.json({ shares });
  } catch (err) {
    console.error('Failed to list shares:', err);
    res.status(500).json({ error: 'Failed to list shares' });
  }
});

export default router;
