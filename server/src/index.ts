import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { config } from './config/index.js';
import authRoutes from './routes/auth.js';
import orgsRoutes from './routes/orgs.js';
import salesforceRoutes from './routes/salesforce.js';
import trackedIntegrationsRoutes from './routes/trackedIntegrations.js';
import usersRoutes from './routes/users.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

// Middleware
const isProduction = process.env.NODE_ENV === 'production';
app.use(cors({
  origin: isProduction ? true : config.frontendUrl,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/orgs', orgsRoutes);
app.use('/api/salesforce', salesforceRoutes);
app.use('/api/tracked-integrations', trackedIntegrationsRoutes);
app.use('/api/users', usersRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files in production
const distPath = resolve(__dirname, '../../dist');
if (existsSync(distPath)) {
  console.log(`Serving static files from: ${distPath}`);
  app.use(express.static(distPath));

  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (_req, res) => {
    res.sendFile(resolve(distPath, 'index.html'));
  });
}

// Start server
app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
  console.log(`Frontend URL: ${config.frontendUrl}`);
});
