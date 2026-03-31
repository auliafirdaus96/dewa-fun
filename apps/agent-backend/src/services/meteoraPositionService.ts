/**
 * services/meteoraPositionService.ts
 * Fetches real-time DLMM position data from Meteora API and calculates metrics
 * Migrated from Python: src/services/meteora_position_service.py
 */

const METEORA_API_BASE = 'https://dlmm-api.meteora.ag';

export class MeteoraPositionService {
  async getUserPositions(userWallet: string): Promise<any[]> {
    try {
      const response = await fetch(`${METEORA_API_BASE}/positions?user=${userWallet}`);
      if (!response.ok) return [];

      const positionsData = await response.json() as any[];
      return Promise.all(positionsData.map((pos: any) => this.transformPosition(pos)));
    } catch (e: any) {
      console.error(`Error fetching user positions: ${e.message}`);
      return [];
    }
  }

  async getPositionDetails(positionAddress: string): Promise<any | null> {
    try {
      const response = await fetch(`${METEORA_API_BASE}/position/${positionAddress}`);
      if (!response.ok) return null;

      const posData = await response.json();
      return this.transformPosition(posData);
    } catch (e: any) {
      console.error(`Error fetching position details: ${e.message}`);
      return null;
    }
  }

  async getPoolInfo(poolAddress: string): Promise<any | null> {
    try {
      const response = await fetch(`${METEORA_API_BASE}/pool/${poolAddress}`);
      if (!response.ok) return null;

      return await response.json();
    } catch (e: any) {
      console.error(`Error fetching pool info: ${e.message}`);
      return null;
    }
  }

  async calculatePnl(position: Record<string, any>): Promise<Record<string, number>> {
    try {
      const currentValue = position.currentValue || 0;
      const initialInvestment = position.initialValue || currentValue;
      const feesEarned = position.feesEarned || 0;
      const ilPercentage = position.impermanentLoss || 0;

      const priceChange = currentValue - initialInvestment;
      const totalPnl = priceChange + feesEarned;
      const roi = initialInvestment > 0 ? (totalPnl / initialInvestment) * 100 : 0;

      return {
        current_value: currentValue,
        initial_value: initialInvestment,
        price_change_pnl: priceChange,
        fees_earned: feesEarned,
        impermanent_loss_pct: ilPercentage,
        total_pnl: totalPnl,
        roi_percentage: roi,
      };
    } catch (e: any) {
      return {
        current_value: 0,
        initial_value: 0,
        price_change_pnl: 0,
        fees_earned: 0,
        impermanent_loss_pct: 0,
        total_pnl: 0,
        roi_percentage: 0,
      };
    }
  }

  private async transformPosition(positionData: any): Promise<any> {
    try {
      const poolInfo = positionData.pool || {};
      const tokenA = poolInfo.token_a || {};
      const tokenB = poolInfo.token_b || {};

      const amountA = parseFloat(positionData.amount_a || 0);
      const amountB = parseFloat(positionData.amount_b || 0);
      const priceA = parseFloat(tokenA.price_usd || 0);
      const priceB = parseFloat(tokenB.price_usd || 0);

      const currentValue = amountA * priceA + amountB * priceB;

      return {
        address: positionData.address || '',
        pool_address: poolInfo.address || '',
        pool_name: `${tokenA.symbol || 'TOKEN_A'}-${tokenB.symbol || 'TOKEN_B'}`,
        token_a: {
          symbol: tokenA.symbol || 'UNKNOWN',
          mint: tokenA.mint || '',
          amount: amountA,
          value_usd: amountA * priceA,
        },
        token_b: {
          symbol: tokenB.symbol || 'UNKNOWN',
          mint: tokenB.mint || '',
          amount: amountB,
          value_usd: amountB * priceB,
        },
        min_price: parseFloat(positionData.bin_min || 0),
        max_price: parseFloat(positionData.bin_max || 0),
        current_value: currentValue,
        initial_value: parseFloat(positionData.initial_value || currentValue),
        fees_earned: parseFloat(positionData.fees_claimed || 0),
        apy: parseFloat(positionData.apy || 0),
        impermanent_loss: parseFloat(positionData.il_percentage || 0),
        in_range: positionData.in_range !== false,
        created_at: positionData.created_at || '',
        updated_at: positionData.updated_at || '',
      };
    } catch (e: any) {
      console.error(`Error transforming position: ${e.message}`);
      return {};
    }
  }
}

export const meteoraPositionService = new MeteoraPositionService();

export async function getRealPosition(userWallet: string): Promise<any | null> {
  const service = new MeteoraPositionService();
  const positions = await service.getUserPositions(userWallet);
  
  if (!positions || positions.length === 0) return null;
  // Pick the largest position
  return positions.reduce((max, p) => (p.current_value > (max.current_value || 0) ? p : max), positions[0]);
}
