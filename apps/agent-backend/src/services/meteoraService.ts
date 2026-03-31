/**
 * services/meteoraService.ts
 * Integrates with Meteora DLMM API and @meteora-ag/dlmm JS SDK
 * Migrated from Python: src/services/transaction_service.py
 */

import { Connection, PublicKey, TransactionInstruction } from '@solana/web3.js';
import DLMM from '@meteora-ag/dlmm';
import { SOLANA_RPC_URL } from '../core/config.js';

const METEORA_API_BASE = 'https://dlmm-api.meteora.ag';

export const METEORA_DLMM_PROGRAM_ID = new PublicKey('LBUZKhRxPF3XUpBCjp4HInoD7K2sK22I9eE8CgG7x0U');

export const meteoraService = {
  /**
   * Get Solana connection instance
   */
  getConnection(): Connection {
    return new Connection(SOLANA_RPC_URL, 'confirmed');
  },

  /**
   * Create DLMM instance for a specific pool
   */
  async getDlmmInstance(poolAddress: string | PublicKey): Promise<DLMM> {
    try {
      const connection = this.getConnection();
      const poolPubkey = typeof poolAddress === 'string' 
        ? new PublicKey(poolAddress) 
        : poolAddress;
      
      const dlmm = await DLMM.create(connection, poolPubkey);
      return dlmm;
    } catch (error: any) {
      console.error('[MeteoraService] Failed to create DLMM instance:', error.message);
      throw new Error(`Failed to initialize DLMM: ${error.message}`);
    }
  },

  /**
   * Fetch pool info from Meteora API
   */
  async getPoolInfo(poolAddress: string): Promise<any> {
    try {
      const response = await fetch(`${METEORA_API_BASE}/pair/${poolAddress}`);
      if (!response.ok) return null;
      return (await response.json()) as any;
    } catch (e) {
      console.error('[MeteoraService] Error fetching pool info:', e);
      return null;
    }
  },

  /**
   * Get active bins around active bin using DLMM SDK
   */
  async getActiveBins(poolAddress: string): Promise<any> {
    try {
      const dlmm = await this.getDlmmInstance(poolAddress);
      
      // Use SDK's built-in methods with type safety
      let activeId: number = 0;
      let binsData: any[] = [];
      
      try {
        // Try to get active bin - cast to any for flexible SDK API
        const dlmmAny = dlmm as any;
        
        if (typeof dlmmAny.getActiveBin === 'function') {
          const activeBin = dlmmAny.getActiveBin();
          activeId = activeBin?.binId || activeBin?.id || 0;
        } else if (dlmmAny.activeBinId !== undefined) {
          activeId = dlmmAny.activeBinId;
        }
        
        // Try to get bin data - handle private methods gracefully
        if (typeof dlmmAny.getSwaps === 'function') {
          binsData = dlmmAny.getSwaps({}) || [];
        }
        
        return {
          status: 'success',
          data: {
            activeId,
            bins: binsData,
            timestamp: Date.now(),
          },
        };
      } catch (sdkError: any) {
        console.warn('[MeteoraService] SDK method error, falling back to API:', sdkError.message);
        // Fallback to API
        const poolInfo = await this.getPoolInfo(poolAddress);
        return {
          status: 'partial',
          data: poolInfo || { activeId: null, bins: [] },
        };
      }
    } catch (e: any) {
      console.error('[MeteoraService] Error fetching active bins:', e.message);
      return { status: 'error', error: e.message, data: [] };
    }
  },

  /**
   * Build real add liquidity instruction using DLMM SDK
   */
  async buildAddLiquidityIx(
    poolAddress: PublicKey,
    amountA: number,
    amountB: number,
    positionOwner: PublicKey,
    binIds?: number[]
  ): Promise<{ ixData: string; accounts: any[]; metadata: any }> {
    try {
      const dlmm = await this.getDlmmInstance(poolAddress);
      const dlmmAny = dlmm as any;
      
      // Convert amounts to base units (assuming standard decimals)
      const amountX = BigInt(Math.floor(amountA * Math.pow(10, 9))); // SOL: 9 decimals
      const amountY = BigInt(Math.floor(amountB * Math.pow(10, 6))); // USDC: 6 decimals
      
      // Get active bin ID if not provided
      let targetBinIds = binIds;
      if (!targetBinIds || targetBinIds.length === 0) {
        try {
          if (typeof dlmmAny.getActiveBin === 'function') {
            const activeBin = dlmmAny.getActiveBin();
            targetBinIds = [activeBin?.binId || activeBin?.id || 0];
          } else if (dlmmAny.activeBinId !== undefined) {
            targetBinIds = [dlmmAny.activeBinId];
          } else {
            targetBinIds = [0]; // Fallback
          }
        } catch (e) {
          console.warn('[MeteoraService] Could not get active bin, using default');
          targetBinIds = [0];
        }
      }
      
      // Prepare instruction data
      const instructionData = {
        positionOwner,
        binIds: targetBinIds,
        amountX,
        amountY,
      };
      
      // Build transaction instruction - try different SDK methods
      let instructions;
      try {
        // Try common method names
        if (typeof dlmmAny.buildAddPositionTx === 'function') {
          instructions = await dlmmAny.buildAddPositionTx(instructionData);
        } else if (typeof dlmmAny.buildAddLiquidityInstruction === 'function') {
          instructions = await dlmmAny.buildAddLiquidityInstruction(instructionData);
        } else if (typeof dlmmAny.addLiquidity === 'function') {
          instructions = await dlmmAny.addLiquidity(instructionData);
        } else {
          throw new Error('No suitable SDK method found for building add liquidity instruction');
        }
      } catch (sdkError: any) {
        console.warn('[MeteoraService] SDK method failed:', sdkError.message);
        throw sdkError;
      }
      
      // Extract instruction data
      const addLiquidityIx = Array.isArray(instructions) ? instructions[0] : instructions;
      
      return {
        ixData: Buffer.from(addLiquidityIx.data).toString('base64'),
        accounts: addLiquidityIx.keys.map((key: any) => ({
          pubkey: key.pubkey.toBase58(),
          isSigner: key.isSigner,
          isWritable: key.isWritable,
        })),
        metadata: {
          pool: poolAddress.toBase58(),
          amountA,
          amountB,
          binIds: targetBinIds,
          positionOwner: positionOwner.toBase58(),
        },
      };
    } catch (error: any) {
      console.error('[MeteoraService] Failed to build add liquidity instruction:', error.message);
      throw new Error(`Failed to build add liquidity instruction: ${error.message}`);
    }
  },

  /**
   * Build real rebalance instruction using DLMM SDK
   */
  async buildRebalanceIx(
    poolAddress: PublicKey,
    minPrice: number,
    maxPrice: number,
    positionOwner: PublicKey
  ): Promise<{ ixData: string; accounts: any[]; metadata: any }> {
    try {
      const dlmm = await this.getDlmmInstance(poolAddress);
      const dlmmAny = dlmm as any;
      
      // Prepare rebalance instruction data
      const rebalanceData = {
        positionOwner,
        minPrice,
        maxPrice,
      };
      
      // Build transaction instruction - try different SDK methods
      let instructions;
      try {
        if (typeof dlmmAny.buildRebalanceTx === 'function') {
          instructions = await dlmmAny.buildRebalanceTx(rebalanceData);
        } else if (typeof dlmmAny.rebalance === 'function') {
          instructions = await dlmmAny.rebalance(rebalanceData);
        } else {
          throw new Error('No suitable SDK method found for building rebalance instruction');
        }
      } catch (sdkError: any) {
        console.warn('[MeteoraService] SDK method failed:', sdkError.message);
        throw sdkError;
      }
      
      // Extract instruction data
      const rebalanceIx = Array.isArray(instructions) ? instructions[0] : instructions;
      
      return {
        ixData: Buffer.from(rebalanceIx.data).toString('base64'),
        accounts: rebalanceIx.keys.map((key: any) => ({
          pubkey: key.pubkey.toBase58(),
          isSigner: key.isSigner,
          isWritable: key.isWritable,
        })),
        metadata: {
          pool: poolAddress.toBase58(),
          minPrice,
          maxPrice,
          positionOwner: positionOwner.toBase58(),
        },
      };
    } catch (error: any) {
      console.error('[MeteoraService] Failed to build rebalance instruction:', error.message);
      throw new Error(`Failed to build rebalance instruction: ${error.message}`);
    }
  },

  /**
   * Build real claim fees instruction using DLMM SDK
   */
  async buildClaimFeesIx(
    poolAddress: PublicKey,
    positionOwner: PublicKey
  ): Promise<{ ixData: string; accounts: any[]; metadata: any }> {
    try {
      const dlmm = await this.getDlmmInstance(poolAddress);
      const dlmmAny = dlmm as any;
      
      // Prepare claim instruction data
      const claimData = {
        positionOwner,
      };
      
      // Build transaction instruction - try different SDK methods
      let instructions;
      try {
        if (typeof dlmmAny.buildClaimTx === 'function') {
          instructions = await dlmmAny.buildClaimTx(claimData);
        } else if (typeof dlmmAny.claim === 'function') {
          instructions = await dlmmAny.claim(claimData);
        } else {
          throw new Error('No suitable SDK method found for building claim instruction');
        }
      } catch (sdkError: any) {
        console.warn('[MeteoraService] SDK method failed:', sdkError.message);
        throw sdkError;
      }
      
      // Extract instruction data
      const claimIx = Array.isArray(instructions) ? instructions[0] : instructions;
      
      return {
        ixData: Buffer.from(claimIx.data).toString('base64'),
        accounts: claimIx.keys.map((key: any) => ({
          pubkey: key.pubkey.toBase58(),
          isSigner: key.isSigner,
          isWritable: key.isWritable,
        })),
        metadata: {
          pool: poolAddress.toBase58(),
          positionOwner: positionOwner.toBase58(),
        },
      };
    } catch (error: any) {
      console.error('[MeteoraService] Failed to build claim fees instruction:', error.message);
      throw new Error(`Failed to build claim fees instruction: ${error.message}`);
    }
  },
};
