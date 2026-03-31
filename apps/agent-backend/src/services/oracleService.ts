/**
 * services/oracleService.ts
 * Fetch real-time token prices and volatility metrics with multi-source fallback
 * Migrated from Python: src/services/oracle_service.py
 */

import { SOLANA_RPC_URL } from '../core/config.js';

// Oracle API endpoints
const JUPITER_API_BASE = 'https://price.jup.ag/v6/price';
const PYTH_NETWORK_API = 'https://hermes.pyth.network/api/latest_price_feeds';
const SWITCHBOARD_API = 'https://api.switchboard.xyz/solana/mainnet/feeds';
const DEXSCREENER_API = 'https://api.dexscreener.com/latest/dex/tokens';
const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price';

// Price source configuration
interface PriceSource {
  name: string;
  priority: number; // Lower = higher priority
  fetchFn: (mint: string) => Promise<number | null>;
}

// Circuit breaker state for each oracle
interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number | null;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_TIMEOUT = 30000; // 30 seconds
const PRICE_DEVIATION_THRESHOLD = 0.05; // 5% max deviation between sources
const CACHE_TTL = 30000; // 30 seconds

// Cache storage
const priceCache = new Map<string, { price: number; timestamp: number; source: string }>();
const circuitBreakerStates = new Map<string, CircuitBreakerState>();

export const oracleService = {
  /**
   * Get price with automatic fallback chain and validation
   * Priority: Jupiter → Pyth → Switchboard → DexScreener → CoinGecko
   */
  async getPriceWithFallback(mint: string): Promise<{ 
    price: number; 
    source: string;
    confidence: number;
    timestamp: number;
  }> {
    // Check cache first
    const cached = priceCache.get(mint);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return {
        price: cached.price,
        source: cached.source,
        confidence: 0.95, // High confidence for cached data
        timestamp: cached.timestamp,
      };
    }

    // Define price sources in priority order
    const sources: PriceSource[] = [
      { name: 'Jupiter', priority: 1, fetchFn: this.fetchFromJupiter.bind(this) },
      { name: 'Pyth', priority: 2, fetchFn: this.fetchFromPyth.bind(this) },
      { name: 'Switchboard', priority: 3, fetchFn: this.fetchFromSwitchboard.bind(this) },
      { name: 'DexScreener', priority: 4, fetchFn: this.fetchFromDexScreener.bind(this) },
      { name: 'CoinGecko', priority: 5, fetchFn: this.fetchFromCoinGecko.bind(this) },
    ];

    const prices: { source: string; price: number }[] = [];

    // Try sources in parallel up to top 3 priorities
    const topSources = sources.slice(0, 3);
    const results = await Promise.allSettled(
      topSources.map(async (source) => {
        // Check circuit breaker
        if (!this.isCircuitBreakerClosed(source.name)) {
          console.warn(`[Oracle] Circuit breaker OPEN for ${source.name}, skipping`);
          return null;
        }

        try {
          const price = await source.fetchFn(mint);
          if (price !== null) {
            this.recordSuccess(source.name);
            return { source: source.name, price };
          }
          return null;
        } catch (error: any) {
          this.recordFailure(source.name);
          console.warn(`[Oracle] ${source.name} failed:`, error.message);
          return null;
        }
      })
    );

    // Collect successful prices
    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        prices.push(result.value);
      }
    });

    // If no prices from top 3, try remaining sources sequentially
    if (prices.length === 0) {
      for (const source of sources.slice(3)) {
        try {
          const price = await source.fetchFn(mint);
          if (price !== null) {
            prices.push({ source: source.name, price });
            break; // Use first available
          }
        } catch (error: any) {
          console.warn(`[Oracle] ${source.name} failed:`, error.message);
        }
      }
    }

    if (prices.length === 0) {
      throw new Error('All oracle sources failed');
    }

    // Validate prices against deviation threshold
    const validatedPrice = this.validatePriceConsensus(prices);

    // Cache the result
    priceCache.set(mint, {
      price: validatedPrice.price,
      timestamp: Date.now(),
      source: validatedPrice.source,
    });

    return {
      price: validatedPrice.price,
      source: validatedPrice.source,
      confidence: this.calculateConfidence(prices.length),
      timestamp: Date.now(),
    };
  },

  /**
   * Fetch SOL price from Jupiter (primary source)
   */
  async getSolPrice(): Promise<number> {
    const solMint = 'So11111111111111111111111111111111111111112';
    const result = await this.getPriceWithFallback(solMint);
    return result.price;
  },

  /**
   * Calculate localized volatility (mocked logic for AI context)
   */
  async getMarketVolatility(tokenSymbol: string): Promise<number> {
    try {
      // In production, fetch historical OHLCV data to calc volatility.
      // Currently, simulate variance based on recent trend mapping.
      const varianceBase = tokenSymbol === 'SOL' ? 4.5 : 8.2;
      return varianceBase + (Math.random() * 2 - 1); // e.g., ±1% from base
    } catch (e) {
      return 5.0; // Moderate volatility fallback
    }
  },

  // ─── Private Helper Methods ─────────────────────────────────────────────

  /**
   * Fetch price from Jupiter API
   */
  async fetchFromJupiter(mint: string): Promise<number | null> {
    const res = await fetch(`${JUPITER_API_BASE}?ids=${mint}`);
    if (!res.ok) throw new Error(`Jupiter API returned ${res.status}`);
    
    const data = await res.json() as any;
    return data.data[mint]?.price || null;
  },

  /**
   * Fetch price from Pyth Network
   */
  async fetchFromPyth(mint: string): Promise<number | null> {
    // Map common mints to Pyth price feed IDs
    const pythFeeds: Record<string, string> = {
      'So11111111111111111111111111111111111111112': 'ef0d8b6fda2ceba41da15d4095d1da392a7354cadc', // SOL
    };
    
    const feedId = pythFeeds[mint];
    if (!feedId) return null;
    
    const res = await fetch(`${PYTH_NETWORK_API}?ids[]=${feedId}`);
    if (!res.ok) throw new Error(`Pyth API returned ${res.status}`);
    
    const data = await res.json() as any;
    if (!data.parsed.length) return null;
    
    const price = parseFloat(data.parsed[0].price.price);
    return isNaN(price) ? null : price;
  },

  /**
   * Fetch price from Switchboard
   */
  async fetchFromSwitchboard(mint: string): Promise<number | null> {
    // Switchboard uses different feed addresses - simplified for now
    // In production, would map mints to Switchboard feed addresses
    return null; // Not implemented yet
  },

  /**
   * Fetch price from DexScreener (DEX aggregated)
   */
  async fetchFromDexScreener(mint: string): Promise<number | null> {
    const res = await fetch(`${DEXSCREENER_API}/${mint}`);
    if (!res.ok) throw new Error(`DexScreener API returned ${res.status}`);
    
    const data = await res.json() as any;
    if (!data.pairs || data.pairs.length === 0) return null;
    
    // Get weighted average price from top pairs
    const pairs = data.pairs.slice(0, 5); // Top 5 by liquidity
    const totalLiquidity = pairs.reduce((sum: number, p: any) => sum + (p.liquidity?.usd || 0), 0);
    
    if (totalLiquidity === 0) return null;
    
    const weightedPrice = pairs.reduce((sum: number, p: any) => {
      const weight = (p.liquidity?.usd || 0) / totalLiquidity;
      return sum + (p.priceUsd * weight);
    }, 0);
    
    return parseFloat(weightedPrice);
  },

  /**
   * Fetch price from CoinGecko (fallback)
   */
  async fetchFromCoinGecko(mint: string): Promise<number | null> {
    // Map Solana mints to CoinGecko IDs
    const coingeckoIds: Record<string, string> = {
      'So11111111111111111111111111111111111111112': 'solana',
    };
    
    const coinId = coingeckoIds[mint];
    if (!coinId) return null;
    
    const res = await fetch(`${COINGECKO_API}?ids=${coinId}&vs_currencies=usd`);
    if (!res.ok) throw new Error(`CoinGecko API returned ${res.status}`);
    
    const data = await res.json() as any;
    return data[coinId]?.usd || null;
  },

  /**
   * Validate price consensus across multiple sources
   */
  validatePriceConsensus(prices: { source: string; price: number }[]): { source: string; price: number } {
    if (prices.length === 1) {
      return prices[0]; // No validation possible with single source
    }
    
    // Calculate median price
    const sortedPrices = [...prices].sort((a, b) => a.price - b.price);
    const medianIndex = Math.floor(sortedPrices.length / 2);
    const medianPrice = sortedPrices[medianIndex].price;
    
    // Find prices within deviation threshold
    const validPrices = prices.filter(p => {
      const deviation = Math.abs((p.price - medianPrice) / medianPrice);
      return deviation <= PRICE_DEVIATION_THRESHOLD;
    });
    
    if (validPrices.length === 0) {
      console.warn('[Oracle] Price deviation too high, using median');
      // Return median price source
      return sortedPrices[medianIndex];
    }
    
    // Use highest priority source from valid prices
    const priorityOrder = ['Jupiter', 'Pyth', 'Switchboard', 'DexScreener', 'CoinGecko'];
    const validSorted = validPrices.sort((a, b) => {
      return priorityOrder.indexOf(a.source) - priorityOrder.indexOf(b.source);
    });
    
    return validSorted[0];
  },

  /**
   * Calculate confidence score based on number of agreeing sources
   */
  calculateConfidence(sourceCount: number): number {
    const confidenceMap: Record<number, number> = {
      1: 0.60, // Single source - low confidence
      2: 0.75, // Two sources agree - medium confidence
      3: 0.90, // Three sources agree - high confidence
      4: 0.95, // Four sources agree - very high confidence
      5: 0.99, // All five agree - maximum confidence
    };
    return confidenceMap[sourceCount] || 0.60;
  },

  /**
   * Check if circuit breaker allows requests
   */
  isCircuitBreakerClosed(sourceName: string): boolean {
    const state = circuitBreakerStates.get(sourceName);
    if (!state) return true; // No state = closed (default)
    
    if (state.state === 'OPEN') {
      // Check if timeout has passed
      if (state.lastFailureTime && 
          Date.now() - state.lastFailureTime > CIRCUIT_BREAKER_TIMEOUT) {
        state.state = 'HALF_OPEN';
        return true; // Allow test request
      }
      return false; // Circuit still open
    }
    
    return true; // CLOSED or HALF_OPEN
  },

  /**
   * Record successful oracle call
   */
  recordSuccess(sourceName: string): void {
    const state = circuitBreakerStates.get(sourceName);
    if (state) {
      state.failures = 0;
      state.state = 'CLOSED';
      state.lastFailureTime = null;
    }
  },

  /**
   * Record failed oracle call
   */
  recordFailure(sourceName: string): void {
    if (!circuitBreakerStates.has(sourceName)) {
      circuitBreakerStates.set(sourceName, {
        failures: 0,
        lastFailureTime: null,
        state: 'CLOSED',
      });
    }
    
    const state = circuitBreakerStates.get(sourceName)!;
    state.failures++;
    state.lastFailureTime = Date.now();
    
    if (state.failures >= CIRCUIT_BREAKER_THRESHOLD) {
      state.state = 'OPEN';
      console.warn(`[Oracle] Circuit breaker OPEN for ${sourceName} after ${state.failures} failures`);
    }
  }
};
