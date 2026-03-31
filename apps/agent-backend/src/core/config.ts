/**
 * core/config.ts
 * Platform-wide constants and fee configurations.
 * Migrated from Python: src/core/config.py
 */

// ─── Fee Share Configurations ─────────────────────────────────────────────────
// All values in Basis Points (BPS): 10,000 = 100%
// Total target house edge: 1.0% (100 BPS)

/** B2C mode: 0.5% Creator / 0.5% Dewa Protocol */
export const FEE_SHARE_B2C = {
  creator_bps: 5000,   // 50% of 1% total fee
  protocol_bps: 5000,  // 50% of 1% total fee
} as const;

/** B2B Agent Launch mode: 0.75% Agent / 0.25% Dewa Protocol */
export const FEE_SHARE_B2B = {
  creator_bps: 7500,   // 75% of 1% total fee
  protocol_bps: 2500,  // 25% of 1% total fee
} as const;

/** Returns the correct fee config for the given launch type */
export function getFeeConfig(isB2B: boolean = false) {
  return isB2B ? FEE_SHARE_B2B : FEE_SHARE_B2C;
}

// ─── House Edge Distribution (Smart Contract Model) ───────────────────────────
// This mirrors the on-chain distribute_house_edge instruction (25-25-30-20)
export const HOUSE_EDGE_DISTRIBUTION = {
  creator_bps: 2500,    // 25% → Token Creator (Level 2)
  agent_bps: 2500,      // 25% → Agent/Platform Operator (Level 1)
  treasury_bps: 3000,   // 30% → Dewa Protocol Treasury
  affiliate_bps: 2000,  // 20% → Affiliate Network
} as const;

// ─── Supabase ─────────────────────────────────────────────────────────────────
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

// ─── Solana ───────────────────────────────────────────────────────────────────
export const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com';
export const PROTOCOL_TREASURY_ADDRESS = process.env.PROTOCOL_TREASURY_ADDRESS ?? '';

// ─── AI / LLM ─────────────────────────────────────────────────────────────────
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? '';
export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? '';

// ─── Social Media ─────────────────────────────────────────────────────────────
export const TWITTER_DRY_RUN = process.env.TWITTER_DRY_RUN?.toLowerCase() !== 'false';
export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? '';
export const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? '';

// ─── CORS ─────────────────────────────────────────────────────────────────────
export const ALLOWED_ORIGINS = (
  process.env.CORS_ALLOWED_ORIGINS ??
  'http://localhost:3000,http://127.0.0.1:3000,https://dewa.fun,https://www.dewa.fun'
)
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// SECURITY: Reject wildcard CORS at startup
if (ALLOWED_ORIGINS.includes('*')) {
  throw new Error(
    'SECURITY ERROR: CORS_ALLOWED_ORIGINS contains wildcard "*". ' +
    'Specify explicit origins in your .env file.'
  );
}

// ─── Worker ───────────────────────────────────────────────────────────────────
/** How often the autonomous worker loops (ms). Default: 30 minutes */
export const WORKER_INTERVAL_MS = parseInt(process.env.WORKER_INTERVAL_MS ?? '1800000', 10);

/** Delay between processing each agent node (ms). Default: 5 seconds */
export const WORKER_NODE_DELAY_MS = parseInt(process.env.WORKER_NODE_DELAY_MS ?? '5000', 10);

// ─── Server ───────────────────────────────────────────────────────────────────
export const PORT = parseInt(process.env.PORT ?? '8000', 10);
