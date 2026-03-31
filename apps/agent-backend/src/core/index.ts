/**
 * core/index.ts — Barrel export for all core modules
 */

export { getFeeConfig, FEE_SHARE_B2B, FEE_SHARE_B2C, HOUSE_EDGE_DISTRIBUTION } from './config.js';
export { ALLOWED_ORIGINS, PORT, SOLANA_RPC_URL, PROTOCOL_TREASURY_ADDRESS } from './config.js';
export { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } from './config.js';
export { OPENAI_API_KEY, ANTHROPIC_API_KEY, TWITTER_DRY_RUN } from './config.js';
export { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } from './config.js';
export { WORKER_INTERVAL_MS, WORKER_NODE_DELAY_MS } from './config.js';

export { getSupabaseAdmin, getSupabaseAdminSafe } from './supabase.js';
export { encryptKey, decryptKey, decryptKeySafe } from './encryption.js';
export { getLLM } from './llmWrapper.js';
