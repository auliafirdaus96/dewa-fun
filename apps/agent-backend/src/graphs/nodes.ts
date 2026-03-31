/**
 * graphs/nodes.ts
 * Definitons of LangGraph state nodes (agent workflow steps).
 * Migrated from Python: src/graphs/nodes.py
 */

import { getLLM } from '../core/llmWrapper.js';
import { AgentState } from '../state/schemas.js';

import { postToTwitter, sendTelegramMsg } from '../tools/contentTools.js';
import { generateSocialContent } from '../tools/socialService.js';
import { getSolanaBalance, getTokenBalance } from '../tools/solanaTools.js';
import {
  initializeDlmmPool,
  addLiquidityDlmm,
  rebalanceLiquidityDlmm,
  claimDlmmFees,
} from '../tools/meteoraManager.js';

import { launchTokenAgent } from '../tools/launchTool.js';
import { simulateDiceGame, getHouseStats } from '../tools/diceBatch.js';
import { executePlatformAction } from '../tools/governanceTools.js';
import { getBagsStats } from '../tools/bagsApi.js';
import { mintBadgeNft } from '../tools/metaplexBadges.js';
import { getMeteoraPoolInfo } from '../tools/meteoraDlmm.js';

// ─── Shared Tools Export ──────────────────────────────────────────────────────
export const ALL_TOOLS = [
  postToTwitter,
  sendTelegramMsg,
  generateSocialContent,
  getSolanaBalance,
  getTokenBalance,
  initializeDlmmPool,
  addLiquidityDlmm,
  rebalanceLiquidityDlmm,
  claimDlmmFees,
  launchTokenAgent,
  simulateDiceGame,
  getHouseStats,
  executePlatformAction,
  getBagsStats,
  mintBadgeNft,
  getMeteoraPoolInfo,
];

// ─── Thinking Node (Social Strategist) ─────────────────────────────────────────
export async function thinkingNode(state: AgentState): Promise<Partial<AgentState>> {
  console.log(`[LangGraph] Executing thinkingNode (Persona: ${state.persona})`);
  
  // Create an LLM instance binding the tools so it "knows" it can use them
  const llm = getLLM('gpt-4o', { encryptedApiKey: state.encrypted_api_key }).bindTools(ALL_TOOLS);

  const systemMessage = {
    role: 'system',
    content: `You are an AI Social Strategist for Dewa.fun.
Persona: ${state.persona}

You have tools available to generate viral content and post it automatically to Twitter or Telegram.
First, check your ecosystem data or generate some social content, then use the posting tool to broadcast it.`,
  };

  // Prepend system message to existing messages
  const response = await llm.invoke([systemMessage, ...state.messages]);

  return {
    messages: [response],
    last_action: 'THINK_SOCIAL_STRATEGY',
  };
}

// ─── DLMM Strategy Node (Liquidity Specialist) ──────────────────────────────────
export async function dlmmStrategyNode(state: AgentState): Promise<Partial<AgentState>> {
  console.log(`[LangGraph] Executing dlmmStrategyNode (Persona: ${state.persona})`);

  const llm = getLLM('gpt-4o', { encryptedApiKey: state.encrypted_api_key }).bindTools(ALL_TOOLS);

  const systemMessage = {
    role: 'system',
    content: `You are an AI DLMM Liquidity Manager.
Persona: ${state.persona}

Your task is to protect capital from impermanent loss and optimize fee capture using Meteora's Dynamic Liquidity Market Maker.
Analyze current market state. If action is required, use the DLMM tools (e.g., rebalance, compound).`,
  };

  const response = await llm.invoke([systemMessage, ...state.messages]);

  return {
    messages: [response],
    last_action: 'EVALUATE_DLMM_POSITION',
  };
}
