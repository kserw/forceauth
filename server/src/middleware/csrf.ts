import type { Request, Response, NextFunction } from 'express';
import { getSessionCsrfToken } from '../services/tokenStore.js';

const COOKIE_NAME = 'forceauth_session';
const CSRF_HEADER = 'x-csrf-token';

// Methods that require CSRF validation
const STATE_CHANGING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

// Paths exempt from CSRF validation
const CSRF_EXEMPT_PATHS = [
  '/api/auth/callback', // OAuth callback comes from Salesforce
  '/api/health',
];

/**
 * CSRF Protection Middleware
 *
 * Validates CSRF token on state-changing requests (POST, PUT, PATCH, DELETE).
 * The token is stored in the session and must be provided in the X-CSRF-Token header.
 */
export async function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Skip for non-state-changing methods
  if (!STATE_CHANGING_METHODS.includes(req.method)) {
    return next();
  }

  // Skip for exempt paths
  if (CSRF_EXEMPT_PATHS.some(path => req.path.startsWith(path))) {
    return next();
  }

  const sessionId = req.cookies[COOKIE_NAME];
  if (!sessionId) {
    // No session means no CSRF token to validate
    // Auth will fail anyway, so pass through
    return next();
  }

  const expectedToken = await getSessionCsrfToken(sessionId);
  if (!expectedToken) {
    // Session doesn't exist or has no CSRF token
    return next();
  }

  const providedToken = req.headers[CSRF_HEADER];
  if (!providedToken || providedToken !== expectedToken) {
    res.status(403).json({
      error: 'CSRF validation failed',
      message: 'Invalid or missing CSRF token. Please refresh the page and try again.',
    });
    return;
  }

  next();
}

/**
 * Middleware to attach CSRF token to response for authenticated requests
 * The frontend can read this from the response header
 */
export async function attachCsrfToken(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.cookies[COOKIE_NAME];
  if (sessionId) {
    const csrfToken = await getSessionCsrfToken(sessionId);
    if (csrfToken) {
      res.setHeader('X-CSRF-Token', csrfToken);
    }
  }
  next();
}

/**
 * Helper to get CSRF token for a session (for including in responses)
 */
export async function getCsrfTokenForSession(sessionId: string): Promise<string | undefined> {
  return getSessionCsrfToken(sessionId);
}
