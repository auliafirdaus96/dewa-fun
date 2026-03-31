/**
 * scripts/startBackend.ts
 * Simple script to launch the server environment.
 * Replaces start_backend.py
 */
import { serve } from '@hono/node-server';
import app from '../src/index.js';

const port = process.env.PORT ? parseInt(process.env.PORT) : 8000;

console.log(`=== Dewa AI Master API Backend starting on Port ${port} ===`);
serve({
  fetch: app.fetch,
  port
});
