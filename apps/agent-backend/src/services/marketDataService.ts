/**
 * services/marketDataService.ts
 * Real-time market data integration with Chainlink and Pyth Network oracles
 */

import { Connection, PublicKey } from '@solana/web3.js';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface PriceFeed {
  feedId: string;
  symbol: string;
  price: number;
  confidence: number;
  timestamp: number;
  source: 'chainlink' | 'pyth' | 'aggregated';
  exponent: number;
}

export interface OracleConfig {
  chainlinkFeeds?: Map<string, PublicKey>;
  pythPriceFeedIds?: Map<string, string>;
  pythEndpoint?: string;
  chainlinkEndpoint?: string;
  updateIntervalMs?: number;
  deviationThreshold?: number; // Percentage
  maxAgeMs?: number;
}

export interface CachedPrice {
  price: number;
  timestamp: number;
  confidence: number;
  source: 'chainlink' | 'pyth';
}

export interface AggregatedPrice {
  symbol: string;
  price: number;
  confidence: number;
  chainlinkPrice?: number;
  pythPrice?: number;
  deviation: number;
  timestamp: number;
  isReliable: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: Required<OracleConfig> = {
  chainlinkFeeds: new Map(),
  pythPriceFeedIds: new Map(),
  pythEndpoint: 'https://hermes.pyth.network',
  chainlinkEndpoint: 'https://data.stream.chain.link/',
  updateIntervalMs: 1000, // 1 second
  deviationThreshold: 5, // 5% deviation alert
  maxAgeMs: 60 * 1000, // 1 minute
};

// Common price feeds
const COMMON_PYTH_FEEDS: Map<string, string> = new Map([
  ['SOL/USD', 'ef0d8b6fda2ceba41da15a436db0530027ad76f9'],
  ['ETH/USD', 'ff61491a931112ddf1bd8147cd1b641375f79f58'],
  ['BTC/USD', 'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43'],
  ['USDC/USD', '82685cada8a4306a916f83c07f07091eb7ba7880'],
]);

const COMMON_CHAINLINK_FEEDS: Map<string, PublicKey> = new Map([
  // Example Chainlink feed addresses on Solana
  ['SOL/USD', new PublicKey('J83w4HKfqxwcq3BEMMkMFSppQ3oqXyWiVe')],
  ['ETH/USD', new PublicKey('EdVCmQ9FSPC1nftUUWWLJCmZfWxxQNxU')],
  ['BTC/USD', new PublicKey('HovQMDrbAgAYPCmHVSrezcSmkMtXSSUs')],
]);

// ─── Cache System ───────────────────────────────────────────────────────────────

class PriceCache {
  private cache: Map<string, CachedPrice> = new Map();
  private readonly maxAgeMs: number;

  constructor(maxAgeMs: number = DEFAULT_CONFIG.maxAgeMs) {
    this.maxAgeMs = maxAgeMs;
  }

  set(symbol: string, price: CachedPrice): void {
    this.cache.set(symbol, price);
  }

  get(symbol: string): CachedPrice | null {
    const cached = this.cache.get(symbol);
    
    if (!cached) return null;
    
    // Check if expired
    if (Date.now() - cached.timestamp > this.maxAgeMs) {
      this.cache.delete(symbol);
      return null;
    }
    
    return cached;
  }

  clear(): void {
    this.cache.clear();
  }

  getSize(): number {
    return this.cache.size;
  }
}

const priceCache = new PriceCache();

// ─── Helper Functions ───────────────────────────────────────────────────────────

/**
 * Calculate percentage deviation between two prices
 */
function calculateDeviation(price1: number, price2: number): number {
  const avg = (price1 + price2) / 2;
  if (avg === 0) return 0;
  return Math.abs((price1 - price2) / avg) * 100;
}

/**
 * Validate price data
 */
function isValidPrice(price: number, confidence: number): boolean {
  return (
    typeof price === 'number' &&
    !isNaN(price) &&
    price > 0 &&
    typeof confidence === 'number' &&
    confidence >= 0 &&
    confidence <= 1
  );
}

// ─── Pyth Network Integration ───────────────────────────────────────────────────

/**
 * Fetch price from Pyth Network
 */
export async function fetchPythPrice(
  symbol: string,
  config: OracleConfig = {}
): Promise<PriceFeed | null> {
  try {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    const feedId = finalConfig.pythPriceFeedIds?.get(symbol) || 
                   COMMON_PYTH_FEEDS.get(symbol);
    
    if (!feedId) {
      console.warn(`[Pyth] No feed ID found for ${symbol}`);
      return null;
    }
    
    // Fetch from Pyth Hermes
    const url = `${finalConfig.pythEndpoint}/api/latest_price_feeds?ids[]=${feedId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    
    if (!response.ok) {
      throw new Error(`Pyth API error: ${response.status}`);
    }
    
    const data = await response.json() as any;
    
    if (!data.parsed || data.parsed.length === 0) {
      throw new Error('No price data from Pyth');
    }
    
    const priceData = data.parsed[0];
    const price = parseFloat(priceData.price.price);
    const confidence = parseFloat(priceData.price.conf);
    const exponent = priceData.price.expo;
    const timestamp = priceData.price.publish_time * 1000; // Convert to ms
    
    // Adjust by exponent
    const adjustedPrice = price * Math.pow(10, exponent);
    const adjustedConfidence = confidence * Math.pow(10, exponent);
    
    if (!isValidPrice(adjustedPrice, adjustedConfidence)) {
      throw new Error('Invalid price data from Pyth');
    }
    
    const result: PriceFeed = {
      feedId,
      symbol,
      price: adjustedPrice,
      confidence: adjustedConfidence / adjustedPrice, // Relative confidence
      timestamp,
      source: 'pyth',
      exponent,
    };
    
    // Cache the result
    priceCache.set(symbol, {
      price: adjustedPrice,
      timestamp: Date.now(),
      confidence: result.confidence,
      source: 'pyth',
    });
    
    console.log(`[Pyth] ${symbol}: $${adjustedPrice.toFixed(2)} (conf: ${(result.confidence * 100).toFixed(2)}%)`);
    
    return result;
    
  } catch (error) {
    console.error('[Pyth] Error fetching price:', error);
    return null;
  }
}

// ─── Chainlink Integration ──────────────────────────────────────────────────────

/**
 * Fetch price from Chainlink (simulated - requires on-chain interaction)
 */
export async function fetchChainlinkPrice(
  symbol: string,
  connection?: Connection,
  config: OracleConfig = {}
): Promise<PriceFeed | null> {
  try {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    const feedAddress = finalConfig.chainlinkFeeds?.get(symbol) || 
                       COMMON_CHAINLINK_FEEDS.get(symbol);
    
    if (!feedAddress) {
      console.warn(`[Chainlink] No feed address found for ${symbol}`);
      return null;
    }
    
    // Note: Actual Chainlink integration requires:
    // 1. On-chain program interaction
    // 2. Account info parsing
    // 3. Round data decoding
    
    // For this implementation, we'll simulate with a fallback
    // In production, replace with actual on-chain calls
    
    if (connection) {
      // Simulated on-chain fetch
      const accountInfo = await connection.getAccountInfo(feedAddress);
      
      if (!accountInfo) {
        throw new Error('Chainlink feed account not found');
      }
      
      // Parse account data (implementation depends on Chainlink's data structure)
      // This is a simplified example
      const price = parseChainlinkData(accountInfo.data);
      
      const result: PriceFeed = {
        feedId: feedAddress.toBase58(),
        symbol,
        price,
        confidence: 0.95, // Chainlink typically has high confidence
        timestamp: Date.now(),
        source: 'chainlink',
        exponent: -8, // Common for Chainlink
      };
      
      // Cache the result
      priceCache.set(symbol, {
        price,
        timestamp: Date.now(),
        confidence: result.confidence,
        source: 'chainlink',
      });
      
      console.log(`[Chainlink] ${symbol}: $${price.toFixed(2)}`);
      
      return result;
    } else {
      // Fallback: Use cached price or return null
      const cached = priceCache.get(symbol);
      if (cached && cached.source === 'chainlink') {
        return {
          feedId: feedAddress.toBase58(),
          symbol,
          price: cached.price,
          confidence: cached.confidence,
          timestamp: cached.timestamp,
          source: 'chainlink',
          exponent: -8,
        };
      }
      
      throw new Error('No connection provided for Chainlink');
    }
    
  } catch (error) {
    console.error('[Chainlink] Error fetching price:', error);
    return null;
  }
}

/**
 * Parse Chainlink account data (simplified)
 */
function parseChainlinkData(data: Buffer): number {
  // Actual implementation would parse Chainlink's specific data format
  // This is a placeholder
  const price = data.readBigInt64LE(0) / BigInt(10 ** 8);
  return Number(price);
}

// ─── Price Aggregation ──────────────────────────────────────────────────────────

/**
 * Get aggregated price from multiple oracles
 */
export async function getAggregatedPrice(
  symbol: string,
  connection?: Connection,
  config: OracleConfig = {}
): Promise<AggregatedPrice | null> {
  try {
    // Fetch from both oracles in parallel
    const [pythPrice, chainlinkPrice] = await Promise.all([
      fetchPythPrice(symbol, config),
      fetchChainlinkPrice(symbol, connection, config),
    ]);
    
    const now = Date.now();
    
    // Handle cases where one oracle fails
    if (!pythPrice && !chainlinkPrice) {
      // Try cache as last resort
      const cached = priceCache.get(symbol);
      if (cached) {
        return {
          symbol,
          price: cached.price,
          confidence: cached.confidence,
          deviation: 0,
          timestamp: cached.timestamp,
          isReliable: false,
        };
      }
      
      throw new Error(`No price data available for ${symbol}`);
    }
    
    // If only one oracle works, use it
    if (!pythPrice && chainlinkPrice) {
      return {
        symbol,
        price: chainlinkPrice.price,
        confidence: chainlinkPrice.confidence,
        chainlinkPrice: chainlinkPrice.price,
        pythPrice: undefined,
        deviation: 0,
        timestamp: now,
        isReliable: true,
      };
    }
    
    if (!chainlinkPrice && pythPrice) {
      return {
        symbol,
        price: pythPrice.price,
        confidence: pythPrice.confidence,
        chainlinkPrice: undefined,
        pythPrice: pythPrice.price,
        deviation: 0,
        timestamp: now,
        isReliable: true,
      };
    }
    
    // Both oracles working - aggregate
    if (pythPrice && chainlinkPrice) {
      const deviation = calculateDeviation(pythPrice.price, chainlinkPrice.price);
      
      // Check for significant deviation
      if (deviation > (config.deviationThreshold || DEFAULT_CONFIG.deviationThreshold)) {
        console.warn(`[Oracle] High deviation detected for ${symbol}: ${deviation.toFixed(2)}%`);
      }
      
      // Use weighted average (prefer Chainlink slightly)
      const weights = {
        pyth: 0.45,
        chainlink: 0.55,
      };
      
      const aggregatedPrice = 
        pythPrice.price * weights.pyth + 
        chainlinkPrice.price * weights.chainlink;
      
      const aggregatedConfidence = 
        pythPrice.confidence * weights.pyth + 
        chainlinkPrice.confidence * weights.chainlink;
      
      return {
        symbol,
        price: aggregatedPrice,
        confidence: aggregatedConfidence,
        chainlinkPrice: chainlinkPrice.price,
        pythPrice: pythPrice.price,
        deviation,
        timestamp: now,
        isReliable: deviation < (config.deviationThreshold || DEFAULT_CONFIG.deviationThreshold),
      };
    }
    
    return null;
    
  } catch (error) {
    console.error('[Oracle] Aggregation error:', error);
    return null;
  }
}

// ─── Market Data Service ────────────────────────────────────────────────────────

/**
 * Get current market price (with automatic fallback)
 */
export async function getMarketPrice(
  symbol: string,
  connection?: Connection,
  config: OracleConfig = {}
): Promise<number> {
  // Try cache first
  const cached = priceCache.get(symbol);
  if (cached) {
    return cached.price;
  }
  
  // Try aggregated price
  const aggregated = await getAggregatedPrice(symbol, connection, config);
  
  if (aggregated && aggregated.isReliable) {
    return aggregated.price;
  }
  
  // Fallback to Pyth (more reliable for most assets)
  const pythPrice = await fetchPythPrice(symbol, config);
  if (pythPrice) {
    return pythPrice.price;
  }
  
  // Last resort: try Chainlink
  const chainlinkPrice = await fetchChainlinkPrice(symbol, connection, config);
  if (chainlinkPrice) {
    return chainlinkPrice.price;
  }
  
  throw new Error(`Unable to fetch price for ${symbol}`);
}

/**
 * Get prices for multiple symbols
 */
export async function getBatchPrices(
  symbols: string[],
  connection?: Connection,
  config: OracleConfig = {}
): Promise<Map<string, AggregatedPrice>> {
  const results = new Map<string, AggregatedPrice>();
  
  await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const price = await getAggregatedPrice(symbol, connection, config);
        if (price) {
          results.set(symbol, price);
        }
      } catch (error) {
        console.error(`[Oracle] Error fetching ${symbol}:`, error);
      }
    })
  );
  
  return results;
}

/**
 * Start continuous price monitoring
 */
export function startPriceMonitoring(
  symbols: string[],
  callback: (prices: Map<string, AggregatedPrice>) => void,
  connection?: Connection,
  config: OracleConfig = {}
): NodeJS.Timeout {
  const intervalMs = config.updateIntervalMs || DEFAULT_CONFIG.updateIntervalMs;
  
  const monitor = async () => {
    try {
      const prices = await getBatchPrices(symbols, connection, config);
      callback(prices);
    } catch (error) {
      console.error('[Oracle] Monitoring error:', error);
    }
  };
  
  // Run immediately
  monitor();
  
  // Then run at intervals
  return setInterval(monitor, intervalMs);
}

/**
 * Stop price monitoring
 */
export function stopPriceMonitoring(interval: NodeJS.Timeout): void {
  clearInterval(interval);
}

// ─── Utility Functions ──────────────────────────────────────────────────────────

/**
 * Clear price cache
 */
export function clearPriceCache(): void {
  priceCache.clear();
  console.log('[Oracle] Price cache cleared');
}

/**
 * Get cache statistics
 */
export function getPriceCacheStats(): { size: number; maxAgeMs: number } {
  return {
    size: priceCache.getSize(),
    maxAgeMs: DEFAULT_CONFIG.maxAgeMs,
  };
}

/**
 * Check oracle health
 */
export async function checkOracleHealth(
  symbols: string[] = ['SOL/USD', 'ETH/USD'],
  config: OracleConfig = {}
): Promise<{
  pythHealthy: boolean;
  chainlinkHealthy: boolean;
  details: Record<string, any>;
}> {
  const details: Record<string, any> = {};
  
  let pythHealthy = true;
  let chainlinkHealthy = true;
  
  for (const symbol of symbols) {
    try {
      const pythResult = await fetchPythPrice(symbol, config);
      details[`${symbol}_pyth`] = pythResult ? 'OK' : 'FAILED';
      
      if (!pythResult) {
        pythHealthy = false;
      }
    } catch (error) {
      details[`${symbol}_pyth`] = `ERROR: ${error}`;
      pythHealthy = false;
    }
    
    try {
      const chainlinkResult = await fetchChainlinkPrice(symbol, undefined, config);
      details[`${symbol}_chainlink`] = chainlinkResult ? 'OK' : 'FAILED';
      
      if (!chainlinkResult) {
        chainlinkHealthy = false;
      }
    } catch (error) {
      details[`${symbol}_chainlink`] = `ERROR: ${error}`;
      chainlinkHealthy = false;
    }
  }
  
  return {
    pythHealthy,
    chainlinkHealthy,
    details,
  };
}
