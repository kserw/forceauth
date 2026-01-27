import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

dotenvConfig({ path: resolve(import.meta.dirname, '../../.env') });

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

export const config = {
  port: parseInt(optionalEnv('PORT', '3001'), 10),
  frontendUrl: optionalEnv('FRONTEND_URL', 'http://localhost:5173'),
  sessionSecret: optionalEnv('SESSION_SECRET', 'dev-secret-change-in-production'),

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

export type Config = typeof config;
