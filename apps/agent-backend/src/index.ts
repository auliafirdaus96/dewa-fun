/**
 * src/index.ts — Agent Backend Entry Point
 * Hono web server. Migrated from Python FastAPI (src/main.py).
 *
 * Start: pnpm dev  (tsx watch src/index.ts)
 */

import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { ALLOWED_ORIGINS, PORT } from './core/config.js';
import { errorHandler } from './utils/errors.js';
import { jwtMiddleware, getChallenge, verifySignature } from './middleware/auth.js';

// ── Route modules (will be filled in Phase 4) ──────────────────────────────
import { agentRoutes } from './routes/agent.js';
import { dlmmRoutes } from './routes/dlmm.js';
import { socialRoutes } from './routes/social.js';

const app = new Hono();

// ── CORS Middleware ───────────────────────────────────────────────────────────
app.use('*', cors({
  origin: (origin) => (ALLOWED_ORIGINS.includes(origin) ? origin : null),
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ── Global Error Handler ───────────────────────────────────────────────────────
app.onError(errorHandler);

// ── Health Endpoints ───────────────────────────────────────────────────────────
app.get('/', (c) => c.json({ message: 'Dewa AI Agent Backend is running 🚀' }));
app.get('/health', (c) => c.json({ status: 'healthy', version: '2.0.0-ts', timestamp: new Date().toISOString() }));

// ── Authentication Routes ──────────────────────────────────────────────────────
app.get('/api/auth/challenge', getChallenge);
app.post('/api/auth/verify', verifySignature);

// ── Mount Routes (Phase 4) ────────────────────────────────────────────────────
// Apply JWT middleware to all agent routes
app.use('/api/agents/*', jwtMiddleware);
app.route('/api/agents', agentRoutes);
app.route('/api/agents/dlmm', dlmmRoutes);
app.route('/api/agents/social', socialRoutes);

// ── Start Server ──────────────────────────────────────────────────────────────
console.log(`[Server] Starting on port ${PORT}...`);
console.log(`[Server] Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`[Server] ✅ Listening on http://localhost:${info.port}`);
});

export default app;
