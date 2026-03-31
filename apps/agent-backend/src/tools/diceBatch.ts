/**
 * tools/diceBatch.ts
 * AI Tool to simulate and manage dice rolls.
 * Migrated from Python: src/tools/dice_batch.py
 */

import { tool } from '@langchain/core/tools';
import { z } from 'zod';

export const simulateDiceGame = tool(
  async ({ bet_amount, chance }) => {
    try {
      // 1. Roll the dice (0-100)
      const roll = Math.random() * 100;
      const isWin = roll < chance;

      if (isWin) {
        // Multiplier calculation (1% house edge)
        const payout = (99 / chance) * bet_amount;
        return `Roll: ${roll.toFixed(2)} | Result: WIN! | Payout: ${payout.toFixed(4)} SOL`;
      } else {
        return `Roll: ${roll.toFixed(2)} | Result: LOSS. | Bet: ${bet_amount} SOL lost.`;
      }
    } catch (e: any) {
      return `Error in dice simulation: ${e.message}`;
    }
  },
  {
    name: 'simulate_dice_game',
    description: 'Simulate a dice roll based on bet amount and winning chance. Return result (WIN/LOSS) and the payout.',
    schema: z.object({
      bet_amount: z.number().describe('Amount of SOL to bet'),
      chance: z.number().min(0.01).max(99.99).describe('Win chance percentage (e.g., 49.5 for ~50%)'),
    }),
  }
);

export const getHouseStats = tool(
  async () => {
    // Placeholder for real on-chain bankroll audit via connection.getBalance(vaultPDA)
    return 'Casino Bankroll: Healthy | Total SOL in Vault: 124.5 SOL | 24h Volume: 450 SOL';
  },
  {
    name: 'get_house_stats',
    description: 'Get the overall health of the Casino Bankroll.',
    schema: z.object({}), // No parameters needed
  }
);
