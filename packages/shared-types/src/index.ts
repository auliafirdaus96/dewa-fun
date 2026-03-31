/**
 * @dewa/shared-types
 * Central repository of all shared TypeScript interfaces and Zod schemas
 * used across frontend AND agent-backend.
 *
 * Adding Zod here allows both apps to import validated schemas from one place.
 */

import { z } from 'zod';

// ─── Re-export Zod for convenience ────────────────────────────────────────────
export { z };

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GAME / DICE TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface VaultPublicInfo {
  mint: string;
  isPaused: boolean;
  maxBet: number;
  exists: boolean;
  createdAt: Date;
}

export interface VaultStats {
  currentBalance: number;
  initialDeposit: number;
  totalWagered: number;
  totalPaidOut: number;
  totalCreatorFees: number;
  totalTreasuryFees: number;
  totalAffiliateFees: number;
  isPaused: boolean;
  houseProfit: number;
}

export interface BetConfig {
  walletAddress: string;
  mint: string;
  amount: number;
  direction: 'UNDER' | 'OVER';
  threshold: number;
  clientSeed?: string;
}

export interface BetResult {
  betId: string;
  roll: number;
  won: boolean;
  wonAmount: number;
  multiplier: number;
  winChance: number;
  proof: {
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
    hmac: string;
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AUTH / USER TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface AuthPayload {
  userId: string;
  wallet: string;
  exp: number;
}

export interface UserProfile {
  id: string;
  wallet: string;
  username?: string;
  avatarUrl?: string;
  level: number;
  xp: number;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SOCIAL / FEED TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface FeedItem {
  id: string;
  type: 'BET' | 'LAUNCH' | 'MILESTONE';
  timestamp: Date;
  user: string;
  data: Record<string, unknown>;
}

export interface ChatMsg {
  id: string;
  room: string;
  user: string;
  content: string;
  timestamp: Date;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AI AGENT TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface AgentMetadata {
  name: string;
  description: string;
  byokProvider: 'GROQ' | 'OPENAI' | 'ANTHROPIC';
  dlmmPositions: string[];
  badges: string[];
}

/** Zod schema for validating /run-agent requests (used by both backend route + frontend) */
export const AgentRequestSchema = z.object({
  node_id: z.string().min(1, 'node_id is required'),
  persona: z.string().min(1, 'persona is required'),
  message: z.string().optional(),
});
export type AgentRequest = z.infer<typeof AgentRequestSchema>;

/** Zod schema for agent social persona configuration */
export const SocialPersonaUpdateSchema = z.object({
  social_persona_prompt: z.string().min(1),
  social_posting_frequency: z.number().int().min(1).max(10).default(3),
  social_tone: z.enum(['witty', 'professional', 'bullish', 'meme', 'educational']).default('witty'),
  social_platforms: z.array(z.enum(['twitter', 'telegram'])).default(['twitter']),
  social_enabled: z.boolean().default(true),
});
export type SocialPersonaUpdate = z.infer<typeof SocialPersonaUpdateSchema>;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DLMM TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Zod schema for DLMM chat requests */
export const DlmmChatRequestSchema = z.object({
  prompt: z.string().min(1),
  position: z.record(z.unknown()).optional().nullable(),
  node_id: z.string().default('default'),
});
export type DlmmChatRequest = z.infer<typeof DlmmChatRequestSchema>;

/** Zod schema for DLMM strategy config */
export const DlmmConfigSchema = z.object({
  risk_tolerance: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  rebalance_threshold: z.number().min(1).max(50).default(8.0),
  auto_compound: z.boolean().default(true),
  compound_frequency_hours: z.number().int().min(1).max(168).default(12),
  hedge_enabled: z.boolean().default(false),
  hedge_threshold: z.number().default(6.0),
  preferred_pairs: z.array(z.string()).default(['SOL-USDC']),
  max_il_risk: z.number().min(0).max(100).default(5.0),
  target_apy_min: z.number().default(20.0),
  target_apy_max: z.number().default(40.0),
});
export type DlmmConfig = z.infer<typeof DlmmConfigSchema>;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// API RESPONSE TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type ApiSuccess<T> = { status: 'success'; data: T };
export type ApiError = { status: 'error'; message: string };
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/** Helper to create a typed success response */
export function apiOk<T>(data: T): ApiSuccess<T> {
  return { status: 'success', data };
}

/** Helper to create a typed error response */
export function apiErr(message: string): ApiError {
  return { status: 'error', message };
}
