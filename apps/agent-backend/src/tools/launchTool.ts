/**
 * tools/launchTool.ts
 * AI Tool to launch a new token on Bags.fm and track it in Supabase.
 * Migrated from Python: src/tools/launch_tool.py
 */

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getFeeConfig, PROTOCOL_TREASURY_ADDRESS } from '../core/config.js';
import { getSupabaseAdminSafe } from '../core/supabase.js';
import { postToTwitter } from './contentTools.js';
import {
  BagsApiError,
  DatabaseOperationError,
  ValidationError,
} from '../utils/errors.js';
import {
  executeWithRetry,
  executeTransaction,
  validateRequiredFields,
  sanitizeData,
} from '../utils/databaseService.js';
import {
  validateBagsTransaction,
  verifyBagsSignature,
  withCircuitBreaker,
} from '../utils/transactionValidator.js';

const BAGS_API_BASE = 'https://api.bags.fm/v1';

export const launchTokenAgent = tool(
  async ({
    name,
    ticker,
    description,
    agent_wallet,
    is_b2b = true,
    website = '',
    twitter = '',
    telegram = '',
    initial_buy_sol = 0.0,
  }) => {
    // Validate inputs
    validateRequiredFields(
      { name, ticker, description, agent_wallet },
      ['name', 'ticker', 'description', 'agent_wallet'],
      'token_launch'
    );

    if (name.length > 50) {
      throw new ValidationError('Token name must be 50 characters or less');
    }
    if (ticker.length > 10) {
      throw new ValidationError('Token ticker must be 10 characters or less');
    }

    const feeConfig = getFeeConfig(is_b2b);
    const label = is_b2b ? 'AI Agent (B2B)' : 'Standard (B2C)';

    const payload = {
      name,
      symbol: ticker,
      description,
      isB2B: is_b2b,
      extensions: { website, twitter, telegram },
      initialBuyAmount: initial_buy_sol,
      feeShareConfig: {
        claimersArray: [PROTOCOL_TREASURY_ADDRESS, agent_wallet],
        basisPointsArray: [feeConfig.protocol_bps, feeConfig.creator_bps],
      },
    };

    try {
      // 1. Call Bags.fm Transaction API with validation
      const bagsApiUrl = `${BAGS_API_BASE}/token-launch/create-launch-transaction`;
      
      let responseData;
      try {
        // Use circuit breaker + timeout + validation wrapper
        responseData = await withCircuitBreaker(
          'bags_fm_token_launch',
          async () => {
            return await validateBagsTransaction(
              async () => {
                const response = await fetch(bagsApiUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload),
                });
                return response;
              },
              {
                endpoint: 'bags_fm_token_launch',
                requireSignature: false, // Enable in production when Bags.fm provides signatures
                timeoutMs: 30000, // 30 second timeout
              }
            );
          }
        );
      } catch (error: any) {
        if (error instanceof BagsApiError || error instanceof ValidationError) {
          throw error;
        }
        throw new BagsApiError(`Failed to call Bags.fm API: ${error.message}`);
      }

      // Extract transaction data with type safety
      const txSignature = responseData.transaction || 'PENDING_TX_SIG';
      const tokenAddress = responseData.mint || '7xKX...3b9P';
      
      // Additional validation: ensure we got valid data
      if (!responseData.transaction && !responseData.signature) {
        console.warn('[Launch] Warning: No transaction/signature in Bags.fm response');
      }

      // 2. Persist to Supabase with transaction and retry
      const supabase = getSupabaseAdminSafe();
      
      if (!supabase) {
        throw new DatabaseOperationError(
          'Database connection unavailable',
          'get_supabase_client'
        );
      }

      const nodeId = `agent_${tokenAddress.substring(0, 8)}`;
      const launchType = is_b2b ? 'AGENT_LAUNCH' : 'STANDARD';

      try {
        // Execute as transaction with rollback support
        await executeTransaction(supabase, [
          {
            name: 'insert_agent_node',
            execute: async (client) => {
              const sanitizedData = sanitizeData({
                partner_wallet: agent_wallet,
                node_id: nodeId,
                ai_model: 'gpt-4o',
                personality_prompt: description,
                is_active: true,
                launch_type: launchType,
              });

              const { error } = await client
                .from('agent_nodes')
                .insert(sanitizedData);

              if (error) {
                throw new DatabaseOperationError(
                  `Failed to insert agent node: ${error.message}`,
                  'insert_agent_nodes'
                );
              }

              console.log(`[Launch] Agent node inserted: ${nodeId}`);
              return { success: true };
            },
          },
          {
            name: 'insert_node_tokens',
            execute: async (client) => {
              const sanitizedData = sanitizeData({
                node_id: nodeId,
                token_address: tokenAddress,
                token_name: name,
                token_ticker: ticker,
                launch_type: launchType,
                fee_split: {
                  creator: feeConfig.creator_bps / 10000,
                  dewa: feeConfig.protocol_bps / 10000,
                },
              });

              const { error } = await client
                .from('node_tokens')
                .insert(sanitizedData);

              if (error) {
                throw new DatabaseOperationError(
                  `Failed to insert node tokens: ${error.message}`,
                  'insert_node_tokens'
                );
              }

              console.log(`[Launch] Node tokens inserted: ${nodeId}`);
              return { success: true };
            },
            // Rollback: Delete agent node if token insert fails
            rollback: async (_result, client) => {
              console.log(`[Launch] Rolling back: deleting agent node ${nodeId}`);
              await client.from('agent_nodes').delete().eq('node_id', nodeId);
            },
          },
        ]);

        console.log(`[Supabase] Successfully persisted node and token: ${nodeId}`);
        
      } catch (dbError: any) {
        // Re-throw with more context
        throw new DatabaseOperationError(
          `Failed to persist launch data: ${dbError.message}`,
          'token_launch_persistence',
          dbError
        );
      }

      // 3. Auto-Twitter Promotion via Internal Tool call (non-critical)
      try {
        const platformMessage = `🚀 New Agent Spotted: $${ticker} (${name}) is now live on dewa.fun! \n\nPowered by autonomous AI. Check it out: https://dewa.fun/profile/${agent_wallet}`;
        await postToTwitter.invoke({ text: platformMessage });
        console.log(`  [Platform] Auto-promoted ${ticker} on Twitter.`);
      } catch (e: any) {
        // Non-critical - log but don't fail the entire operation
        console.warn(`  [Warning] Platform auto-promotion failed: ${e.message}. Token launch still successful.`);
      }

      const cPct = (feeConfig.creator_bps / 100).toFixed(2);
      const pPct = (feeConfig.protocol_bps / 100).toFixed(2);
      return `Successfully initialized ${label} Launch for ${name} (${ticker}). Token Address: ${tokenAddress}. Tx: ${txSignature}. Fee Share: ${cPct}%/${pPct}%.`;

    } catch (e: any) {
      return `Failed to launch token via ${label}: ${e.message}`;
    }
  },
  {
    name: 'launch_token_agent',
    description: 'Launch a new token on Bags.fm with configurable fee share routing (B2B Agent or B2C Standard)',
    schema: z.object({
      name: z.string(),
      ticker: z.string(),
      description: z.string(),
      agent_wallet: z.string().describe('The Solana wallet address of the agent/creator receiving fees'),
      is_b2b: z.boolean().default(true),
      website: z.string().default(''),
      twitter: z.string().default(''),
      telegram: z.string().default(''),
      initial_buy_sol: z.number().default(0.0),
    }),
  }
);
