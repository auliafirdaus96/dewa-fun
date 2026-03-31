/**
 * routes/social.ts
 * Social Persona specific configurations and updates
 * Migrated from Python: src/main.py
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { getSupabaseAdminSafe } from '../core/supabase.js';
import { encryptKey } from '../core/encryption.js';
import { SocialPersonaUpdateSchema } from '@dewa/shared-types';

export const socialRoutes = new Hono();
const supabase = getSupabaseAdminSafe();

// ── Update Social Persona Configuration ───────────────────────────────────────
socialRoutes.post('/config/:nodeId', async (c) => {
  try {
    const nodeId = c.req.param('nodeId');
    const body = await c.req.json();
    const parsed = SocialPersonaUpdateSchema.parse(body);

    if (!supabase) {
      return c.json({ status: 'error', message: 'Database connection offline' }, 500);
    }

    const { error } = await supabase
      .from('agent_nodes')
      .update({
        social_persona_prompt: parsed.social_persona_prompt,
        social_tone: parsed.social_tone,
        social_posting_frequency: parsed.social_posting_frequency,
      })
      .eq('node_id', nodeId);

    if (error) throw new Error(error.message);

    return c.json({ status: 'success', message: 'Social profile updated successfully' });
  } catch (error: any) {
    if (error instanceof z.ZodError) return c.json({ status: 'error', message: 'Validation failed', details: error.errors }, 400);
    return c.json({ status: 'error', message: error.message }, 500);
  }
});

// ── Store BYOK (Bring Your Own Key) Securely ─────────────────────────────────
const ByokPayloadSchema = z.object({
  node_id: z.string(),
  api_key: z.string().min(10), // E.g., OpenAI 'sk-...'
  provider: z.enum(['OPENAI', 'ANTHROPIC', 'GROQ']).default('OPENAI'),
});

socialRoutes.post('/byok', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = ByokPayloadSchema.parse(body);

    if (!supabase) {
      return c.json({ status: 'error', message: 'Database offline' }, 500);
    }

    // Encrypt the API Key before ever saving it
    const encryptedKey = encryptKey(parsed.api_key);

    const { error } = await supabase
      .from('agent_nodes')
      .update({
        encrypted_api_key: encryptedKey,
        byok_provider: parsed.provider,
      })
      .eq('node_id', parsed.node_id);

    if (error) throw new Error(error.message);

    return c.json({ status: 'success', message: 'API key encrypted and stored securely.' });
  } catch (err: any) {
    return c.json({ status: 'error', message: err.message }, 500);
  }
});
