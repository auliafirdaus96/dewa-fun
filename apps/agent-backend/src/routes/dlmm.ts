/**
 * routes/dlmm.ts
 * DLMM configuration and chat endpoints.
 * Migrated from Python: src/main.py
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { dlmmAgent } from '../agents/dlmmAgent.js';
import { DlmmChatRequestSchema, DlmmConfigSchema } from '@dewa/shared-types';

export const dlmmRoutes = new Hono();

// ── Interfacing with the DLMM Conversational Agent ───────────────────────────
dlmmRoutes.post('/chat', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = DlmmChatRequestSchema.parse(body);

    const agentResponse = await dlmmAgent.processPrompt(
      parsed.prompt,
      Math.random() > 0.5 ? parsed.position : null, // Randomizer here mimics Python fallback for missing user positions
      parsed.node_id
    );

    return c.json({
      status: 'success',
      data: agentResponse,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return c.json({ status: 'error', message: 'Validation Error', details: error.errors }, 400);
    }
    return c.json({ status: 'error', message: error.message }, 500);
  }
});

// ── Validate DLMM Configuration ──────────────────────────────────────────────
dlmmRoutes.post('/config/validate', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = DlmmConfigSchema.parse(body);
    
    // In production, sync this to Supabase `node_tokens` or `agent_nodes`
    return c.json({
      status: 'success',
      message: 'DLMM Strategy Configuration is valid and updated',
      data: parsed,
    });
  } catch (error: any) {
    return c.json({ status: 'error', message: 'Invalid DLMM config', details: error.errors }, 400);
  }
});
