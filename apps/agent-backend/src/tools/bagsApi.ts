/**
 * tools/bagsApi.ts
 * Integrates with Bags.fm generic points and stats APIs.
 * Migrated from Python: src/tools/bags_api.py
 */

import { tool } from '@langchain/core/tools';
import { z } from 'zod';

const BAGS_API_KEY = process.env.BAGS_API_KEY;
const BAGS_API_BASE = 'https://api.bags.fm/v1';

export const getBagsStats = tool(
  async ({ wallet_address }) => {
    if (!BAGS_API_KEY) {
      return 'Bags API Key not configured.';
    }

    try {
      const response = await fetch(`${BAGS_API_BASE}/user/${wallet_address}/stats`, {
        headers: {
          Authorization: `Bearer ${BAGS_API_KEY}`,
        },
      });

      if (!response.ok) {
        return `Failed to fetch Bags stats: ${response.status}`;
      }

      const data = await response.json();
      const points = data.points || 0;
      const rank = data.rank || 'N/A';

      return `Bags.fm Stats for ${wallet_address}: Points: ${points}, Rank: ${rank}`;
    } catch (e: any) {
      return `Error calling Bags API: ${e.message}`;
    }
  },
  {
    name: 'get_bags_stats',
    description: 'Get Bags.fm points and social stats for a user wallet.',
    schema: z.object({
      wallet_address: z.string().describe('The Solana wallet address to check on Bags.fm'),
    }),
  }
);
