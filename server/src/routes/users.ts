import { Router, type Request, type Response } from 'express';
import { getSessionUserId } from '../services/tokenStore.js';
import db from '../services/database.js';

const router = Router();
const COOKIE_NAME = 'forceauth_session';

export interface ForceAuthUser {
  id: string;
  name: string | null;
  email: string | null;
}

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

// GET /api/users - List "teammates" (users who share org credentials with same client_id)
// This finds users who have access to the same Connected Apps as the current user
router.get('/', (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  try {
    // Find all users who share access to at least one org credential with the current user
    // This includes:
    // 1. Users who own orgs that the current user has access to
    // 2. Users who have access to orgs that the current user owns or has access to
    const stmt = db.prepare(`
      SELECT DISTINCT u.id, u.name, u.email
      FROM users u
      WHERE u.id != ?
        AND u.id NOT IN ('pending', 'system')
        AND (
          -- Users who own orgs that current user can access (shared orgs or same client_id)
          EXISTS (
            SELECT 1 FROM org_credentials oc1
            JOIN org_credentials oc2 ON oc1.client_id = oc2.client_id
            WHERE oc1.created_by_user_id = u.id
              AND (oc2.created_by_user_id = ? OR (oc2.shared = 1))
          )
          OR
          -- Users who have sessions (logged in) using same orgs as current user
          EXISTS (
            SELECT 1 FROM sessions s1
            JOIN sessions s2 ON s1.org_credentials_id = s2.org_credentials_id
            WHERE s1.user_id = u.id
              AND s2.user_id = ?
              AND s1.org_credentials_id IS NOT NULL
          )
          OR
          -- Fallback: any user who has ever logged in (for discoverability when no orgs registered yet)
          EXISTS (
            SELECT 1 FROM sessions WHERE user_id = u.id
          )
        )
      ORDER BY u.name, u.email
    `);

    const rows = stmt.all(userId, userId, userId) as ForceAuthUser[];

    res.json({ users: rows });
  } catch (err) {
    console.error('Failed to fetch users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/users/me - Get current user info
router.get('/me', (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  try {
    const stmt = db.prepare('SELECT id, name, email FROM users WHERE id = ?');
    const user = stmt.get(userId) as ForceAuthUser | undefined;

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (err) {
    console.error('Failed to fetch current user:', err);
    res.status(500).json({ error: 'Failed to fetch current user' });
  }
});

export default router;
