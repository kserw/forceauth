import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import crypto from 'crypto';

dotenvConfig({ path: resolve(import.meta.dirname, '../../.env') });

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

function requiredEnvInProduction(name: string, defaultValue: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === 'production') {
    console.warn(`Warning: ${name} not set in production environment. Using generated value.`);
    return crypto.randomBytes(32).toString('hex');
  }
  return value || defaultValue;
}

export const config = {
  port: parseInt(optionalEnv('PORT', '3001'), 10),
  frontendUrl: optionalEnv('FRONTEND_URL', 'http://localhost:5173'),
  sessionSecret: requiredEnvInProduction('SESSION_SECRET', 'dev-secret-change-in-production'),

  // Database
  databaseUrl: optionalEnv('DATABASE_URL', 'postgresql://localhost:5432/forceauth'),

  // Security secrets
  csrfSecret: requiredEnvInProduction('CSRF_SECRET', crypto.randomBytes(32).toString('hex')),
  cookieSecret: requiredEnvInProduction('COOKIE_SECRET', crypto.randomBytes(32).toString('hex')),

  // Rate limiting
  rateLimit: {
    windowMs: parseInt(optionalEnv('RATE_LIMIT_WINDOW_MS', '60000'), 10), // 1 minute
    maxRequests: parseInt(optionalEnv('RATE_LIMIT_MAX_REQUESTS', '100'), 10),
    authMaxRequests: parseInt(optionalEnv('RATE_LIMIT_AUTH_MAX', '5'), 10), // Auth endpoints
    apiMaxRequests: parseInt(optionalEnv('RATE_LIMIT_API_MAX', '30'), 10), // API endpoints per user
  },

  // Session settings
  session: {
    maxAge: parseInt(optionalEnv('SESSION_MAX_AGE_MS', String(4 * 60 * 60 * 1000)), 10), // 4 hours
    cleanupInterval: parseInt(optionalEnv('SESSION_CLEANUP_INTERVAL_MS', String(15 * 60 * 1000)), 10), // 15 min
  },

  // OAuth state settings
  oauth: {
    stateExpiry: parseInt(optionalEnv('OAUTH_STATE_EXPIRY_MS', String(10 * 60 * 1000)), 10), // 10 minutes
  },

  // Allowed return URLs (for OAuth redirects)
  allowedReturnUrls: [
    '/',
    '/dashboard',
    '/orgs',
    '/integrations',
    '/settings',
  ],

  // Salesforce OAuth config
  salesforce: {
    production: {
      clientId: process.env.SF_PROD_CLIENT_ID || '',
      clientSecret: process.env.SF_PROD_CLIENT_SECRET || '',
      redirectUri: optionalEnv('SF_PROD_REDIRECT_URI', 'http://localhost:3001/api/auth/callback'),
      authUrl: 'https://login.salesforce.com',
    },
    sandbox: {
      clientId: process.env.SF_SANDBOX_CLIENT_ID || '',
      clientSecret: process.env.SF_SANDBOX_CLIENT_SECRET || '',
      redirectUri: optionalEnv('SF_SANDBOX_REDIRECT_URI', 'http://localhost:3001/api/auth/callback'),
      authUrl: 'https://test.salesforce.com',
    },
  },
};

export function validateSalesforceConfig(environment: 'production' | 'sandbox'): void {
  const envConfig = environment === 'production'
    ? config.salesforce.production
    : config.salesforce.sandbox;

  if (!envConfig.clientId || !envConfig.clientSecret) {
    const prefix = environment === 'production' ? 'SF_PROD' : 'SF_SANDBOX';
    throw new Error(
      `Salesforce ${environment} credentials not configured. ` +
      `Please set ${prefix}_CLIENT_ID and ${prefix}_CLIENT_SECRET in server/.env`
    );
  }
}

// Validate return URL against whitelist
export function isValidReturnUrl(url: string): boolean {
  // Allow relative paths that start with /
  if (!url.startsWith('/')) return false;

  // Check against allowed list
  const normalized = url.split('?')[0]; // Remove query params for comparison
  return config.allowedReturnUrls.some(allowed =>
    normalized === allowed || normalized.startsWith(allowed + '/')
  );
}

export type Config = typeof config;
