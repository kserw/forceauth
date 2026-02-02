import { Router, type Request, type Response } from 'express';
import {
  registerOrgCredentials,
  listVisibleOrgCredentials,
  getOrgCredentials,
  deleteOrgCredentials,
  setOrgShared,
  getOrgOwner,
} from '../services/credentialsStore.js';
import { getSessionUserId } from '../services/tokenStore.js';
import { validateBody, orgRegistrationSchema, orgSharingSchema } from '../middleware/validation.js';
import { logOrgCreated, logOrgDeleted, logOrgShared } from '../services/auditLog.js';
import type { SalesforceEnvironment } from '../types/index.js';

const COOKIE_NAME = 'forceauth_session';

const router = Router();

// Helper to get client info from request
function getClientInfo(req: Request): { ipAddress: string; userAgent: string } {
  const forwarded = req.headers['x-forwarded-for'];
  const ipAddress = forwarded
    ? (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',')[0].trim()
    : req.ip || req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  return { ipAddress, userAgent };
}

// POST /api/orgs - Register a new org's External Client App credentials
router.post('/', validateBody(orgRegistrationSchema), async (req: Request, res: Response) => {
  const sessionId = req.cookies[COOKIE_NAME];
  const userId = sessionId ? await getSessionUserId(sessionId) : null;
  const { ipAddress, userAgent } = getClientInfo(req);

  // Allow unauthenticated users to register orgs - they'll be claimed after OAuth login
  const creatorId = userId || 'pending';

  const { orgName, environment, clientId, clientSecret, redirectUri } = req.body;

  try {
    const credentials = await registerOrgCredentials(
      orgName,
      (environment as SalesforceEnvironment) || 'production',
      clientId,
      clientSecret,
      redirectUri || 'http://localhost:3001/api/auth/callback',
      creatorId
    );

    // Log audit event
    await logOrgCreated(creatorId, sessionId, credentials.id, orgName, ipAddress, userAgent);

    res.status(201).json({
      id: credentials.id,
      orgName: credentials.orgName,
      environment: credentials.environment,
      clientId: credentials.clientId,
      redirectUri: credentials.redirectUri,
      createdAt: credentials.createdAt,
      shared: credentials.shared,
      isOwner: true,
    });
  } catch (err) {
    console.error('Failed to register org:', err);
    res.status(500).json({ error: 'Failed to register organization credentials' });
  }
});

// GET /api/orgs - List registered orgs (own + shared from same team)
router.get('/', async (req: Request, res: Response) => {
  const sessionId = req.cookies[COOKIE_NAME];
  const userId = sessionId ? await getSessionUserId(sessionId) : null;

  try {
    // For unauthenticated users, show pending/system orgs (pre-login registration flow)
    // For authenticated users, show their visible orgs (own + shared from team)
    let credentials;
    if (userId) {
      credentials = await listVisibleOrgCredentials(userId);
    } else {
      // Unauthenticated: show orgs created before login (pending) or legacy orgs (system)
      const pendingOrgs = await listVisibleOrgCredentials('pending');
      const systemOrgs = await listVisibleOrgCredentials('system');
      credentials = [...pendingOrgs, ...systemOrgs];
    }

    res.json(
      credentials.map((c) => ({
        id: c.id,
        orgId: c.orgId,
        orgName: c.orgName,
        environment: c.environment,
        clientId: c.clientId,
        redirectUri: c.redirectUri,
        createdAt: c.createdAt,
        shared: c.shared,
        isOwner: userId ? c.createdBy === userId : (c.createdBy === 'pending' || c.createdBy === 'system'),
      }))
    );
  } catch (err) {
    console.error('Failed to list orgs:', err);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

// GET /api/orgs/:id - Get a specific org
router.get('/:id', async (req: Request, res: Response) => {
  const sessionId = req.cookies[COOKIE_NAME];
  const userId = sessionId ? await getSessionUserId(sessionId) : null;

  try {
    const credentials = await getOrgCredentials(req.params.id);

    if (!credentials) {
      res.status(404).json({ error: 'Org credentials not found' });
      return;
    }

    res.json({
      id: credentials.id,
      orgId: credentials.orgId,
      orgName: credentials.orgName,
      environment: credentials.environment,
      clientId: credentials.clientId,
      redirectUri: credentials.redirectUri,
      createdAt: credentials.createdAt,
      shared: credentials.shared,
      isOwner: userId ? credentials.createdBy === userId : false,
    });
  } catch (err) {
    console.error('Failed to get org:', err);
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

// PATCH /api/orgs/:id/share - Toggle sharing for an org
router.patch('/:id/share', validateBody(orgSharingSchema), async (req: Request, res: Response) => {
  const sessionId = req.cookies[COOKIE_NAME];
  const userId = sessionId ? await getSessionUserId(sessionId) : null;
  const { ipAddress, userAgent } = getClientInfo(req);

  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const { shared } = req.body;

  try {
    // Only the owner can toggle sharing
    const owner = await getOrgOwner(req.params.id);
    if (!owner) {
      res.status(404).json({ error: 'Org credentials not found' });
      return;
    }

    if (owner !== userId) {
      res.status(403).json({ error: 'Only the owner can change sharing settings' });
      return;
    }

    const updated = await setOrgShared(req.params.id, shared);
    if (!updated) {
      res.status(500).json({ error: 'Failed to update sharing settings' });
      return;
    }

    // Log audit event
    await logOrgShared(userId, sessionId, req.params.id, shared, ipAddress, userAgent);

    res.json({ success: true, shared });
  } catch (err) {
    console.error('Failed to update sharing:', err);
    res.status(500).json({ error: 'Failed to update sharing settings' });
  }
});

// DELETE /api/orgs/:id - Remove an org's credentials
router.delete('/:id', async (req: Request, res: Response) => {
  const sessionId = req.cookies[COOKIE_NAME];
  const userId = sessionId ? await getSessionUserId(sessionId) : null;
  const { storedOrgId } = req.body || {};
  const { ipAddress, userAgent } = getClientInfo(req);

  try {
    // Check who owns this org
    const owner = await getOrgOwner(req.params.id);
    if (!owner) {
      res.status(404).json({ error: 'Org credentials not found' });
      return;
    }

    // Allow deletion if:
    // 1. User is authenticated and is the owner
    // 2. Org was created as 'pending' (pre-login registration)
    // 3. The request includes a storedOrgId that matches (proves local browser association)
    const isOwner = userId && owner === userId;
    const isPending = owner === 'pending' || owner === 'system';
    const hasLocalProof = storedOrgId && storedOrgId === req.params.id;

    const canDelete = isOwner || isPending || hasLocalProof;

    if (!canDelete) {
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
      } else {
        res.status(403).json({ error: 'Only the owner can delete org credentials' });
      }
      return;
    }

    const deleted = await deleteOrgCredentials(req.params.id);
    if (!deleted) {
      res.status(500).json({ error: 'Failed to delete org credentials' });
      return;
    }

    // Log audit event
    await logOrgDeleted(userId || 'anonymous', sessionId, req.params.id, ipAddress, userAgent);

    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete org:', err);
    res.status(500).json({ error: 'Failed to delete organization credentials' });
  }
});

export default router;
