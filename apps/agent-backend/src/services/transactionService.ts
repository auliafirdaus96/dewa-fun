/**
 * services/transactionService.ts
 * Builds and executes Solana transactions for DLMM and Agent operations.
 * Ported from Python: src/services/transaction_service.py
 */

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  AccountMeta,
  Keypair,
} from '@solana/web3.js';
import { METEORA_DLMM_PROGRAM_ID } from './meteoraService.js';
import { SOLANA_RPC_URL } from '../core/config.js';

export class TransactionService {
  private connection: Connection;
  private meteoraApi: string;

  constructor(rpcUrl: string = SOLANA_RPC_URL) {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.meteoraApi = 'https://dlmm-api.meteora.ag';
  }

  async getPoolInfo(poolAddress: string): Promise<Record<string, any>> {
    try {
      const response = await fetch(`${this.meteoraApi}/pool/${poolAddress}`);
      if (!response.ok) return {};
      return await response.json();
    } catch (e: any) {
      console.error(`[TX] Error fetching pool info: ${e.message}`);
      return {};
    }
  }

  /**
   * Builds instruction for adding liquidity to a DLMM pool.
   * Based on Meteora DLMM API contract signature format.
   */
  async buildAddLiquidityIx(
    userWallet: PublicKey,
    poolAddress: PublicKey,
    amountA: number,
    amountB: number,
    tokenAMint: PublicKey,
    tokenBMint: PublicKey
  ): Promise<{ ix: TransactionInstruction; metadata: any }> {
    
    // Derived Vault PDAs
    const [vaultA] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), poolAddress.toBuffer(), Buffer.from('a')],
      METEORA_DLMM_PROGRAM_ID
    );
    const [vaultB] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), poolAddress.toBuffer(), Buffer.from('b')],
      METEORA_DLMM_PROGRAM_ID
    );

    const keys: AccountMeta[] = [
      { pubkey: userWallet, isSigner: true, isWritable: true },
      { pubkey: poolAddress, isSigner: false, isWritable: true },
      { pubkey: vaultA, isSigner: false, isWritable: true },
      { pubkey: vaultB, isSigner: false, isWritable: true },
      { pubkey: tokenAMint, isSigner: false, isWritable: false },
      { pubkey: tokenBMint, isSigner: false, isWritable: false },
    ];

    // Build ix data buffer (pseudo-layout)
    const dataLayout = Buffer.alloc(1 + 8 + 8 + 8);
    dataLayout.writeUInt8(0x01, 0);                 // discriminator
    dataLayout.writeBigUInt64LE(BigInt(amountA), 1); // amount_a
    dataLayout.writeBigUInt64LE(BigInt(amountB), 9); // amount_b
    dataLayout.writeBigUInt64LE(BigInt(0), 17);      // min_shares
    
    const ix = new TransactionInstruction({
      programId: METEORA_DLMM_PROGRAM_ID,
      keys,
      data: dataLayout,
    });

    const metadata = {
      instruction_type: 'ADD_LIQUIDITY',
      pool: poolAddress.toBase58(),
      amount_a: amountA,
      amount_b: amountB,
      estimated_gas: 500_000,
    };

    return { ix, metadata };
  }

  /**
   * Build instruction for rebalancing DLMM position.
   */
  async buildRebalanceIx(
    userWallet: PublicKey,
    poolAddress: PublicKey,
    positionPubkey: PublicKey,
    newMinPrice: number,
    newMaxPrice: number
  ): Promise<{ ix: TransactionInstruction; metadata: any }> {

    const [vaultA] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), poolAddress.toBuffer(), Buffer.from('a')],
      METEORA_DLMM_PROGRAM_ID
    );
    
    const [vaultB] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), poolAddress.toBuffer(), Buffer.from('b')],
      METEORA_DLMM_PROGRAM_ID
    );

    const keys: AccountMeta[] = [
      { pubkey: userWallet, isSigner: true, isWritable: true },
      { pubkey: poolAddress, isSigner: false, isWritable: true },
      { pubkey: positionPubkey, isSigner: false, isWritable: true },
      { pubkey: vaultA, isSigner: false, isWritable: true },
      { pubkey: vaultB, isSigner: false, isWritable: true },
    ];

    const dataLayout = Buffer.alloc(1 + 8 + 8);
    dataLayout.writeUInt8(0x03, 0); // discriminator for rebalance 
    dataLayout.writeBigUInt64LE(BigInt(Math.floor(newMinPrice * 1e6)), 1);
    dataLayout.writeBigUInt64LE(BigInt(Math.floor(newMaxPrice * 1e6)), 9);

    const ix = new TransactionInstruction({
      programId: METEORA_DLMM_PROGRAM_ID,
      keys,
      data: dataLayout,
    });

    const metadata = {
      instruction_type: 'REBALANCE_POSITION',
      pool: poolAddress.toBase58(),
      new_range: `$${newMinPrice} - $${newMaxPrice}`,
      estimated_gas: 750_000,
    };

    return { ix, metadata };
  }

  /**
   * Build instruction for claiming fees
   */
  async buildClaimFeesIx(
    userWallet: PublicKey,
    poolAddress: PublicKey,
    positionPubkey: PublicKey
  ): Promise<{ ix: TransactionInstruction; metadata: any }> {
    const keys: AccountMeta[] = [
      { pubkey: userWallet, isSigner: true, isWritable: true },
      { pubkey: poolAddress, isSigner: false, isWritable: true },
      { pubkey: positionPubkey, isSigner: false, isWritable: true },
    ];

    const dataLayout = Buffer.alloc(1);
    dataLayout.writeUInt8(0x04, 0); // discriminator

    const ix = new TransactionInstruction({
      programId: METEORA_DLMM_PROGRAM_ID,
      keys,
      data: dataLayout,
    });

    const metadata = {
      instruction_type: 'CLAIM_FEES',
      pool: poolAddress.toBase58(),
      estimated_gas: 300_000,
    };

    return { ix, metadata };
  }

  /**
   * Submits the transaction via Jito Bundle API for MEV protection.
   * Essential for agent transactions that might be front-run.
   */
  async submitWithJito(txBase64: string): Promise<string> {
    try {
      const response = await fetch('https://mainnet.block-engine.jito.wtf/api/v1/bundles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'sendBundle',
          params: [[txBase64]],
        }),
      });

      if (!response.ok) {
        throw new Error(`Jito submission failed: ${response.status}`);
      }

      const result = await response.json();
      return result.result || '';
    } catch (e: any) {
      console.warn(`[TX] Jito submission failed (${e.message}), falling back to direct RPC.`);
      return this.submitRegular(txBase64);
    }
  }

  /**
   * Standard fallback submission
   */
  private async submitRegular(txBase64: string): Promise<string> {
    const txBuf = Buffer.from(txBase64, 'base64');
    const tx = Transaction.from(txBuf);
    return await this.connection.sendRawTransaction(tx.serialize());
  }
}

// Singleton Instance
export const transactionService = new TransactionService();
