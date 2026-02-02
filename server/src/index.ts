import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { config } from './config/index.js';
import { ensureInitialized } from './services/database.js';
import { cleanupExpiredSessions } from './services/tokenStore.js';
import { cleanupExpiredStates } from './services/oauthStateStore.js';
import { cleanupOldRateLimits, healthCheck as dbHealthCheck } from './services/postgres.js';
import { globalRateLimiter } from './middleware/rateLimiter.js';
import { csrfProtection, attachCsrfToken } from './middleware/csrf.js';
import authRoutes from './routes/auth.js';
import orgsRoutes from './routes/orgs.js';
import salesforceRoutes from './routes/salesforce.js';
import trackedIntegrationsRoutes from './routes/trackedIntegrations.js';
import usersRoutes from './routes/users.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const isProduction = process.env.NODE_ENV === 'production';

// =============================================================================
// SECURITY MIDDLEWARE
// =============================================================================

// Helmet.js security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Required for OAuth popup callback
      styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
      fontSrc: ["'self'", 'fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", config.frontendUrl],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disabled for OAuth flows
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }, // Allow OAuth popups
}));

// Trust proxy for rate limiting (when behind reverse proxy)
if (isProduction) {
  app.set('trust proxy', 1);
}

// Global rate limiting
app.use(globalRateLimiter);

// CORS configuration
app.use(cors({
  origin: isProduction ? config.frontendUrl : [config.frontendUrl, 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'Authorization'],
  exposedHeaders: ['X-CSRF-Token'],
}));

// Cookie parser with signed cookies
app.use(cookieParser(config.cookieSecret));

// Request body limits
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// CSRF token attachment (for reading by frontend)
app.use(attachCsrfToken);

// CSRF protection (validates on state-changing requests)
app.use(csrfProtection);

// =============================================================================
// ROUTES
// =============================================================================

app.use('/api/auth', authRoutes);
app.use('/api/orgs', orgsRoutes);
app.use('/api/salesforce', salesforceRoutes);
app.use('/api/tracked-integrations', trackedIntegrationsRoutes);
app.use('/api/users', usersRoutes);

// Health check endpoint
app.get('/api/health', async (_req, res) => {
  const dbHealthy = await dbHealthCheck();
  res.json({
    status: dbHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    database: dbHealthy ? 'connected' : 'disconnected',
  });
});

// =============================================================================
// STATIC FILES (Production)
// =============================================================================

const distPath = resolve(__dirname, '../../dist');
if (existsSync(distPath)) {
  console.log(`Serving static files from: ${distPath}`);
  app.use(express.static(distPath));

  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (_req, res) => {
    res.sendFile(resolve(distPath, 'index.html'));
  });
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err);
  res.status(500).json({
    error: 'Internal server error',
    message: isProduction ? 'An unexpected error occurred' : err.message,
  });
});

// =============================================================================
// STARTUP & CLEANUP SCHEDULER
// =============================================================================

async function startServer() {
  try {
    // Initialize database
    console.log('[Server] Initializing database...');
    await ensureInitialized();
    console.log('[Server] Database initialized');

    // Start the server
    app.listen(config.port, () => {
      console.log(`[Server] Running on http://localhost:${config.port}`);
      console.log(`[Server] Frontend URL: ${config.frontendUrl}`);
      console.log(`[Server] Environment: ${isProduction ? 'production' : 'development'}`);
    });

    // Schedule cleanup tasks
    scheduleCleanupTasks();

  } catch (error) {
    console.error('[Server] Failed to start:', error);
    process.exit(1);
  }
}

function scheduleCleanupTasks() {
  // Session cleanup - every 15 minutes
  setInterval(async () => {
    try {
      const expiredSessions = await cleanupExpiredSessions(config.session.maxAge);
      if (expiredSessions > 0) {
        console.log(`[Cleanup] Expired ${expiredSessions} sessions`);
      }
    } catch (error) {
      console.error('[Cleanup] Session cleanup failed:', error);
    }
  }, config.session.cleanupInterval);

  // OAuth state cleanup - every 5 minutes
  setInterval(async () => {
    try {
      await cleanupExpiredStates();
    } catch (error) {
      console.error('[Cleanup] OAuth state cleanup failed:', error);
    }
  }, 5 * 60 * 1000);

  // Rate limit cleanup - every hour
  setInterval(async () => {
    try {
      const cleaned = await cleanupOldRateLimits();
      if (cleaned > 0) {
        console.log(`[Cleanup] Cleaned ${cleaned} old rate limit entries`);
      }
    } catch (error) {
      console.error('[Cleanup] Rate limit cleanup failed:', error);
    }
  }, 60 * 60 * 1000);

  console.log('[Server] Cleanup tasks scheduled');
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Server] SIGTERM received, shutting down...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Server] SIGINT received, shutting down...');
  process.exit(0);
});

// Start the server
startServer();
