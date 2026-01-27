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
import type { SalesforceEnvironment } from '../types/index.js';

const COOKIE_NAME = 'forceauth_session';

const router = Router();

// POST /api/orgs - Register a new org's External Client App credentials
router.post('/', (req: Request, res: Response) => {
  const sessionId = req.cookies[COOKIE_NAME];
  const userId = sessionId ? getSessionUserId(sessionId) : null;

  // Allow unauthenticated users to register orgs - they'll be claimed after OAuth login
  const creatorId = userId || 'pending';

  const { orgName, environment, clientId, clientSecret, redirectUri } = req.body;

  // Validation
  if (!orgName || !clientId || !clientSecret) {
    res.status(400).json({
      error: 'Missing required fields: orgName, clientId, clientSecret',
    });
    return;
  }

  if (environment && environment !== 'production' && environment !== 'sandbox') {
    res.status(400).json({
      error: 'Invalid environment. Must be "production" or "sandbox".',
    });
    return;
  }

  const credentials = registerOrgCredentials(
    orgName,
    (environment as SalesforceEnvironment) || 'production',
    clientId,
    clientSecret,
    redirectUri || 'http://localhost:3001/api/auth/callback',
    creatorId
  );

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
});

// GET /api/orgs - List registered orgs (own + shared from same team)
router.get('/', (req: Request, res: Response) => {
  const sessionId = req.cookies[COOKIE_NAME];
  const userId = sessionId ? getSessionUserId(sessionId) : null;

  // For unauthenticated users, show pending/system orgs (pre-login registration flow)
  // For authenticated users, show their visible orgs (own + shared from team)
  let credentials;
  if (userId) {
    credentials = listVisibleOrgCredentials(userId);
  } else {
    // Unauthenticated: show orgs created before login (pending) or legacy orgs (system)
    const pendingOrgs = listVisibleOrgCredentials('pending');
    const systemOrgs = listVisibleOrgCredentials('system');
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
});

// GET /api/orgs/:id - Get a specific org
router.get('/:id', (req: Request, res: Response) => {
  const sessionId = req.cookies[COOKIE_NAME];
  const userId = sessionId ? getSessionUserId(sessionId) : null;

  const credentials = getOrgCredentials(req.params.id);

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
});

// PATCH /api/orgs/:id/share - Toggle sharing for an org
router.patch('/:id/share', (req: Request, res: Response) => {
  const sessionId = req.cookies[COOKIE_NAME];
  const userId = sessionId ? getSessionUserId(sessionId) : null;

  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const { shared } = req.body;
  if (typeof shared !== 'boolean') {
    res.status(400).json({ error: 'Missing required field: shared (boolean)' });
    return;
  }

  // Only the owner can toggle sharing
  const owner = getOrgOwner(req.params.id);
  if (!owner) {
    res.status(404).json({ error: 'Org credentials not found' });
    return;
  }

  if (owner !== userId) {
    res.status(403).json({ error: 'Only the owner can change sharing settings' });
    return;
  }

  const updated = setOrgShared(req.params.id, shared);
  if (!updated) {
    res.status(500).json({ error: 'Failed to update sharing settings' });
    return;
  }

  res.json({ success: true, shared });
});

// DELETE /api/orgs/:id - Remove an org's credentials
router.delete('/:id', (req: Request, res: Response) => {
  const sessionId = req.cookies[COOKIE_NAME];
  const userId = sessionId ? getSessionUserId(sessionId) : null;

  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  // Only the owner can delete credentials
  const owner = getOrgOwner(req.params.id);
  if (!owner) {
    res.status(404).json({ error: 'Org credentials not found' });
    return;
  }

  if (owner !== userId) {
    res.status(403).json({ error: 'Only the owner can delete org credentials' });
    return;
  }

  const deleted = deleteOrgCredentials(req.params.id);
  if (!deleted) {
    res.status(500).json({ error: 'Failed to delete org credentials' });
    return;
  }

  res.json({ success: true });
});

export default router;
