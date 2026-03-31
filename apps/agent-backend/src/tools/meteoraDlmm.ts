/**
 * tools/meteoraDlmm.ts
 * Get dynamic fee and liquidity info for a Meteora DLMM pool.
 * Migrated from Python: src/tools/meteora_dlmm.py
 */

import { tool } from '@langchain/core/tools';
import { z } from 'zod';

const METEORA_API_BASE = 'https://dlmm-api.meteora.ag';

export const getMeteoraPoolInfo = tool(
  async ({ pool_address }) => {
    try {
      const response = await fetch(`${METEORA_API_BASE}/pair/${pool_address}`);
      
      if (!response.ok) {
        return `Failed to fetch Meteora pool info: ${response.status}`;
      }
        
      const data = await response.json();
      const name = data.name || 'Unknown';
      const fee = (data.fee_pips || 0) / 10000; // in percent
      const liquidity = data.liquidity || '0';
      
      return `Meteora Pool ${name}: Fee: ${fee.toFixed(2)}%, Liquidity: $${liquidity}`;
    } catch (e: any) {
      return `Error fetching Meteora info: ${e.message}`;
    }
  },
  {
    name: 'get_meteora_pool_info',
    description: 'Get dynamic fee and liquidity info for a Meteora DLMM pool.',
    schema: z.object({
      pool_address: z.string().describe('The on-chain address of the Meteora DLMM pool'),
    }),
  }
);
