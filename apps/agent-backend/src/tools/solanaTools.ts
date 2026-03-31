/**
 * tools/solanaTools.ts
 * Blockchain readout tools for the AI agent
 * Migrated from Python: src/tools/solana_tools.py
 */

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { Connection, PublicKey } from '@solana/web3.js';
import { SOLANA_RPC_URL } from '../core/config.js';

// Cache connection globally
let _connection: Connection | null = null;
function getConnection() {
  if (!_connection) {
    _connection = new Connection(SOLANA_RPC_URL, 'confirmed');
  }
  return _connection;
}

export const getSolanaBalance = tool(
  async ({ address }) => {
    try {
      const pubkey = new PublicKey(address);
      const conn = getConnection();
      const lamports = await conn.getBalance(pubkey);
      const sol = lamports / 1e9;
      return `Balance for ${address}: ${sol.toFixed(4)} SOL`;
    } catch (e: any) {
      return `Error fetching balance: ${e.message}`;
    }
  },
  {
    name: 'get_balance',
    description: 'Get the native SOL balance for any Solana wallet or contract address.',
    schema: z.object({
      address: z.string().describe('The public key (base58 format) of the account'),
    }),
  }
);

export const getTokenBalance = tool(
  async ({ wallet_address, token_mint }) => {
    try {
      const walletPubkey = new PublicKey(wallet_address);
      const mintPubkey = new PublicKey(token_mint);
      const conn = getConnection();

      // Get parsed token accounts by owner
      const response = await conn.getParsedTokenAccountsByOwner(walletPubkey, {
        mint: mintPubkey,
      });

      if (response.value.length === 0) {
        return `No token account found for mint ${token_mint} on wallet ${wallet_address}`;
      }

      // Sum all token accounts for this mint (usually just 1, but technically can be multiple)
      let totalUiAmount = 0;
      for (const tokenData of response.value) {
        totalUiAmount += tokenData.account.data.parsed.info.tokenAmount.uiAmount || 0;
      }

      return `Token balance for ${token_mint} on ${wallet_address}: ${totalUiAmount}`;
    } catch (e: any) {
      return `Error fetching token balance: ${e.message}`;
    }
  },
  {
    name: 'get_token_balance',
    description: 'Get the balance of a specific SPL token for a given wallet address.',
    schema: z.object({
      wallet_address: z.string().describe('The user wallet address'),
      token_mint: z.string().describe('The SPL token mint address (e.g., USDC or a memecoin)'),
    }),
  }
);
