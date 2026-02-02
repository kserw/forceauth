import rateLimit from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';
import { query } from '../services/database.js';

// Get client IP, considering proxies (for non-rate-limit uses)
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',');
    return ips[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

// Global rate limiter: 100 requests/minute per IP
export const globalRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    error: 'Too many requests',
    message: 'You have exceeded the rate limit. Please try again later.',
    retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use default keyGenerator (handles IPv6 properly)
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health';
  },
});

// Auth rate limiter: 5 requests/minute per IP (stricter for login attempts)
export const authRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.authMaxRequests,
  message: {
    error: 'Too many authentication attempts',
    message: 'You have exceeded the authentication rate limit. Please try again later.',
    retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use default keyGenerator (handles IPv6 properly)
});

// API rate limiter: 30 requests/minute per user (or IP if not authenticated)
export const apiRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.apiMaxRequests,
  message: {
    error: 'Too many API requests',
    message: 'You have exceeded the API rate limit. Please try again later.',
    retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use session ID if available, otherwise use default IP handling
    const sessionId = req.cookies?.forceauth_session;
    if (sessionId) {
      return `session:${sessionId}`;
    }
    // Return IP - express-rate-limit handles IPv6 normalization internally
    return req.ip || 'unknown';
  },
  // Disable validation since we're using session IDs when available
  validate: false,
});

// Database-backed rate limiter for distributed deployments
export async function checkRateLimit(
  identifier: string,
  endpoint: string,
  maxRequests: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);

  try {
    // Upsert rate limit entry
    const result = await query<{ request_count: number }>(
      `INSERT INTO rate_limits (identifier, endpoint, window_start, request_count)
       VALUES ($1, $2, $3, 1)
       ON CONFLICT (identifier, endpoint, window_start)
       DO UPDATE SET request_count = rate_limits.request_count + 1
       RETURNING request_count`,
      [identifier, endpoint, windowStart]
    );

    const count = result.rows[0]?.request_count || 1;
    const remaining = Math.max(0, maxRequests - count);
    const resetAt = new Date(windowStart.getTime() + windowMs);

    return {
      allowed: count <= maxRequests,
      remaining,
      resetAt,
    };
  } catch (error) {
    console.error('[RateLimiter] Database error:', error);
    // Fail open if database is unavailable
    return { allowed: true, remaining: maxRequests, resetAt: new Date(Date.now() + windowMs) };
  }
}

// Middleware factory for database-backed rate limiting
export function createDbRateLimiter(options: {
  endpoint: string;
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (req: Request) => string;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const identifier = options.keyGenerator?.(req) || getClientIp(req);
    const { allowed, remaining, resetAt } = await checkRateLimit(
      identifier,
      options.endpoint,
      options.maxRequests,
      options.windowMs
    );

    res.setHeader('X-RateLimit-Limit', options.maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetAt.toISOString());

    if (!allowed) {
      res.status(429).json({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((resetAt.getTime() - Date.now()) / 1000),
      });
      return;
    }

    next();
  };
}
