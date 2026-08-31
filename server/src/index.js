import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory as well as root
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });
dotenv.config();

// Avoid SSL certificate errors in corporate proxy environments on Windows
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === undefined) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

import apiRoutes from './routes/api.js';
import { initScheduler } from './services/schedulerService.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Trust the platform's reverse proxy (Render, Cloudflare, etc.) so req.protocol reflects the
// real external scheme (https) instead of the internal http the proxy connects over. Needed
// for the same-origin check below to compute the correct https:// self-origin.
app.set('trust proxy', 1);

// Middleware
// CORS allows: (1) the app's own origin — this app serves its own frontend build (see the
// static-serving block below), so a same-origin deployment must always work without extra
// config; (2) an explicit allowlist for cross-origin setups (defaults to APP_BASE_URL, e.g.
// the Vite dev server proxying to a separate backend port). Requests with no Origin header
// (curl, server-to-server) are always allowed since browsers don't send Origin for those.
const corsAllowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || process.env.APP_BASE_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const selfOrigin = `${req.protocol}://${req.get('host')}`;
  return cors({
    origin(origin, callback) {
      if (!origin || origin === selfOrigin || corsAllowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      console.warn(`[CORS] Blocked request from disallowed origin: ${origin} (self: ${selfOrigin})`);
      return callback(new Error('Not allowed by CORS'));
    }
  })(req, res, next);
});
app.use(express.json({ limit: '10mb' }));

// Healthcheck
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// API Routes
app.use('/api', apiRoutes);

// CORS rejection handler: avoid leaking a stack trace via Express's default error page
app.use((err, req, res, next) => {
  if (err && err.message === 'Not allowed by CORS') {
    return res.status(403).json({ success: false, error: 'Origin not allowed' });
  }
  next(err);
});

// Serve static frontend in production if built
const clientDistPath = path.resolve(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  console.log(`[Server] Serving static client build from ${clientDistPath}`);
  app.use(express.static(clientDistPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`[TED Procurement Monitor Server] Running on port ${PORT}`);
  
  // Initialize background scheduler
  initScheduler();
});
