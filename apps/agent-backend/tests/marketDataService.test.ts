/**
 * tests/marketDataService.test.ts
 * Test real-time market data integration with Chainlink and Pyth
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Connection, PublicKey } from '@solana/web3.js';
import {
  fetchPythPrice,
  fetchChainlinkPrice,
  getAggregatedPrice,
  getMarketPrice,
  getBatchPrices,
  startPriceMonitoring,
  stopPriceMonitoring,
  clearPriceCache,
  getPriceCacheStats,
  checkOracleHealth,
} from '../src/services/marketDataService.js';

// Mock fetch for Pyth API
global.fetch = vi.fn();

describe('Market Data Service', () => {
  beforeEach(() => {
    clearPriceCache();
    vi.clearAllMocks();
  });

  const mockConnection = new Connection('https://api.devnet.solana.com');

  describe('Pyth Network Integration', () => {
    it('should fetch SOL price from Pyth', async () => {
      // Mock Pyth API response
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          parsed: [
            {
              price: {
                price: '10000000000', // 100 in 8 decimals
                conf: '100000000',
                expo: -8,
                publish_time: Math.floor(Date.now() / 1000),
              },
            },
          ],
        }),
      } as any);

      const result = await fetchPythPrice('SOL/USD');

      expect(result).toBeDefined();
      expect(result?.symbol).toBe('SOL/USD');
      expect(result?.source).toBe('pyth');
      expect(result?.price).toBeGreaterThan(0);
      expect(result?.confidence).toBeGreaterThanOrEqual(0);
      expect(result?.confidence).toBeLessThanOrEqual(1);
    });

    it('should handle Pyth API errors gracefully', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'));

      const result = await fetchPythPrice('SOL/USD');

      expect(result).toBeNull();
    });

    it('should return null for unknown symbol', async () => {
      const result = await fetchPythPrice('UNKNOWN_SYMBOL');

      expect(result).toBeNull();
    });

    it('should cache Pyth prices', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          parsed: [{
            price: {
              price: '10000000000',
              conf: '100000000',
              expo: -8,
              publish_time: Math.floor(Date.now() / 1000),
            },
          }],
        }),
      } as any);

      await fetchPythPrice('SOL/USD');
      const stats = getPriceCacheStats();

      expect(stats.size).toBeGreaterThanOrEqual(1);
    });

    it('should validate price data', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          parsed: [{
            price: {
              price: '-100', // Invalid negative price
              conf: '100',
              expo: -8,
              publish_time: Math.floor(Date.now() / 1000),
            },
          }],
        }),
      } as any);

      const result = await fetchPythPrice('SOL/USD');

      expect(result).toBeNull();
    });
  });

  describe('Chainlink Integration', () => {
    it('should fetch price from Chainlink (with connection)', async () => {
      // Mock account info
      vi.spyOn(mockConnection, 'getAccountInfo').mockResolvedValueOnce({
        data: Buffer.from([0x00, 0x94, 0x35, 0x77, 0x00, 0x00, 0x00, 0x00]), // Mock price data
        owner: new PublicKey('ChainlinkOwner'),
        executable: false,
        lamports: 1000000,
      } as any);

      const result = await fetchChainlinkPrice('SOL/USD', mockConnection);

      expect(result).toBeDefined();
      expect(result?.symbol).toBe('SOL/USD');
      expect(result?.source).toBe('chainlink');
    });

    it('should use cached price when no connection provided', async () => {
      // First, cache a price
      clearPriceCache();
      
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          parsed: [{
            price: {
              price: '10000000000',
              conf: '100000000',
              expo: -8,
              publish_time: Math.floor(Date.now() / 1000),
            },
          }],
        }),
      } as any);

      await fetchPythPrice('SOL/USD');

      // Then try Chainlink without connection
      const result = await fetchChainlinkPrice('SOL/USD');

      expect(result).toBeDefined();
      expect(result?.source).toBe('chainlink');
    });

    it('should return null for unknown symbol', async () => {
      const result = await fetchChainlinkPrice('UNKNOWN_SYMBOL', mockConnection);

      expect(result).toBeNull();
    });

    it('should handle missing account info', async () => {
      vi.spyOn(mockConnection, 'getAccountInfo').mockResolvedValueOnce(null);

      const result = await fetchChainlinkPrice('SOL/USD', mockConnection);

      expect(result).toBeNull();
    });
  });

  describe('Price Aggregation', () => {
    it('should aggregate prices from both oracles', async () => {
      // Mock both oracles
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          parsed: [{
            price: {
              price: '10000000000', // $100
              conf: '100000000',
              expo: -8,
              publish_time: Math.floor(Date.now() / 1000),
            },
          }],
        }),
      } as any);

      vi.spyOn(mockConnection, 'getAccountInfo').mockResolvedValueOnce({
        data: Buffer.from([0x00, 0x94, 0x35, 0x77, 0x00, 0x00, 0x00, 0x00]),
        owner: new PublicKey('ChainlinkOwner'),
        executable: false,
        lamports: 1000000,
      } as any);

      const result = await getAggregatedPrice('SOL/USD', mockConnection);

      expect(result).toBeDefined();
      expect(result?.symbol).toBe('SOL/USD');
      expect(result?.price).toBeGreaterThan(0);
      expect(result?.chainlinkPrice).toBeDefined();
      expect(result?.pythPrice).toBeDefined();
      expect(result?.deviation).toBeDefined();
      expect(result?.isReliable).toBeDefined();
    });

    it('should detect high deviation between oracles', async () => {
      // Mock Pyth with $100
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          parsed: [{
            price: {
              price: '10000000000',
              conf: '100000000',
              expo: -8,
              publish_time: Math.floor(Date.now() / 1000),
            },
          }],
        }),
      } as any);

      // Mock Chainlink with $120 (20% deviation)
      vi.spyOn(mockConnection, 'getAccountInfo').mockResolvedValueOnce({
        data: Buffer.from([0x00, 0xb2, 0xe6, 0xed, 0x0b, 0x00, 0x00, 0x00]),
        owner: new PublicKey('ChainlinkOwner'),
        executable: false,
        lamports: 1000000,
      } as any);

      const result = await getAggregatedPrice('SOL/USD', mockConnection);

      expect(result?.deviation).toBeGreaterThan(5); // Should detect >5% deviation
    });

    it('should fallback to single oracle if one fails', async () => {
      // Mock Pyth failure
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Pyth down'));

      // Mock Chainlink success
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          parsed: [{
            price: {
              price: '10000000000',
              conf: '100000000',
              expo: -8,
              publish_time: Math.floor(Date.now() / 1000),
            },
          }],
        }),
      } as any);

      const result = await getAggregatedPrice('SOL/USD', mockConnection);

      expect(result).toBeDefined();
      expect(result?.pythPrice).toBeUndefined();
      expect(result?.chainlinkPrice).toBeDefined();
      expect(result?.isReliable).toBe(true);
    });

    it('should use cache when both oracles fail', async () => {
      // Pre-populate cache
      clearPriceCache();
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          parsed: [{
            price: {
              price: '10000000000',
              conf: '100000000',
              expo: -8,
              publish_time: Math.floor(Date.now() / 1000),
            },
          }],
        }),
      } as any);

      await fetchPythPrice('SOL/USD');

      // Now make both oracles fail
      vi.mocked(global.fetch).mockRejectedValue(new Error('Both down'));
      vi.spyOn(mockConnection, 'getAccountInfo').mockRejectedValue(new Error('Down'));

      const result = await getAggregatedPrice('SOL/USD', mockConnection);

      expect(result).toBeDefined();
      expect(result?.isReliable).toBe(false); // Cached data is less reliable
    });

    it('should throw error when no data available', async () => {
      clearPriceCache();
      vi.mocked(global.fetch).mockRejectedValue(new Error('All down'));
      vi.spyOn(mockConnection, 'getAccountInfo').mockRejectedValue(new Error('Down'));

      await expect(getAggregatedPrice('UNKNOWN_SYMBOL', mockConnection))
        .rejects.toThrow('No price data available');
    });
  });

  describe('Market Price API', () => {
    it('should get market price with automatic fallback', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          parsed: [{
            price: {
              price: '10000000000',
              conf: '100000000',
              expo: -8,
              publish_time: Math.floor(Date.now() / 1000),
            },
          }],
        }),
      } as any);

      const price = await getMarketPrice('SOL/USD', mockConnection);

      expect(price).toBeGreaterThan(0);
    });

    it('should use cached price when available', async () => {
      // First call - fetches from oracle
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          parsed: [{
            price: {
              price: '10000000000',
              conf: '100000000',
              expo: -8,
              publish_time: Math.floor(Date.now() / 1000),
            },
          }],
        }),
      } as any);

      await getMarketPrice('SOL/USD');

      // Second call - should use cache (no network call)
      vi.mocked(global.fetch).mockClear();

      const price = await getMarketPrice('SOL/USD');

      expect(price).toBeGreaterThan(0);
      expect(vi.mocked(global.fetch)).not.toHaveBeenCalled();
    });

    it('should throw error when all sources fail', async () => {
      clearPriceCache();
      vi.mocked(global.fetch).mockRejectedValue(new Error('All down'));
      vi.spyOn(mockConnection, 'getAccountInfo').mockRejectedValue(new Error('Down'));

      await expect(getMarketPrice('UNKNOWN_SYMBOL', mockConnection))
        .rejects.toThrow('Unable to fetch price');
    });
  });

  describe('Batch Operations', () => {
    it('should fetch multiple prices at once', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          parsed: [{
            price: {
              price: '10000000000',
              conf: '100000000',
              expo: -8,
              publish_time: Math.floor(Date.now() / 1000),
            },
          }],
        }),
      } as any);

      const symbols = ['SOL/USD', 'ETH/USD', 'BTC/USD'];
      const results = await getBatchPrices(symbols, mockConnection);

      expect(results.size).toBeGreaterThan(0);
      expect(results.has('SOL/USD')).toBe(true);
    });

    it('should handle partial failures in batch', async () => {
      vi.mocked(global.fetch).mockImplementation((input: string | URL | Request) => {
        const url = input.toString();
        if (url.includes('SOL')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              parsed: [{
                price: {
                  price: '10000000000',
                  conf: '100000000',
                  expo: -8,
                  publish_time: Math.floor(Date.now() / 1000),
                },
              }],
            }),
          } as any);
        }
        return Promise.reject(new Error('Failed'));
      });

      const symbols = ['SOL/USD', 'INVALID_SYMBOL'];
      const results = await getBatchPrices(symbols, mockConnection);

      expect(results.size).toBe(1);
      expect(results.has('SOL/USD')).toBe(true);
    });
  });

  describe('Price Monitoring', () => {
    it('should start and stop monitoring', async () => {
      const callback = vi.fn();
      
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          parsed: [{
            price: {
              price: '10000000000',
              conf: '100000000',
              expo: -8,
              publish_time: Math.floor(Date.now() / 1000),
            },
          }],
        }),
      } as any);

      const interval = startPriceMonitoring(
        ['SOL/USD'],
        callback,
        mockConnection,
        { updateIntervalMs: 100 }
      );

      // Wait for at least one update
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(callback).toHaveBeenCalled();

      stopPriceMonitoring(interval);
    });
  });

  describe('Cache System', () => {
    it('should track cache size', async () => {
      clearPriceCache();
      expect(getPriceCacheStats().size).toBe(0);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          parsed: [{
            price: {
              price: '10000000000',
              conf: '100000000',
              expo: -8,
              publish_time: Math.floor(Date.now() / 1000),
            },
          }],
        }),
      } as any);

      await fetchPythPrice('SOL/USD');
      await fetchPythPrice('ETH/USD');

      expect(getPriceCacheStats().size).toBe(2);
    });

    it('should respect max age', () => {
      const stats = getPriceCacheStats();
      expect(stats.maxAgeMs).toBe(60 * 1000); // 1 minute default
    });

    it('should clear cache on demand', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          parsed: [{
            price: {
              price: '10000000000',
              conf: '100000000',
              expo: -8,
              publish_time: Math.floor(Date.now() / 1000),
            },
          }],
        }),
      } as any);

      await fetchPythPrice('SOL/USD');
      expect(getPriceCacheStats().size).toBeGreaterThan(0);

      clearPriceCache();
      expect(getPriceCacheStats().size).toBe(0);
    });
  });

  describe('Oracle Health Check', () => {
    it('should check oracle health status', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          parsed: [{
            price: {
              price: '10000000000',
              conf: '100000000',
              expo: -8,
              publish_time: Math.floor(Date.now() / 1000),
            },
          }],
        }),
      } as any);

      const health = await checkOracleHealth(['SOL/USD']);

      expect(health.pythHealthy).toBe(true);
      expect(health.details).toBeDefined();
    });

    it('should detect unhealthy oracle', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Pyth down'));

      const health = await checkOracleHealth(['SOL/USD']);

      expect(health.pythHealthy).toBe(false);
      expect(health.details['SOL/USD_pyth']).toContain('ERROR');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small prices', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          parsed: [{
            price: {
              price: '1', // Very small
              conf: '1',
              expo: -8,
              publish_time: Math.floor(Date.now() / 1000),
            },
          }],
        }),
      } as any);

      const result = await fetchPythPrice('SOL/USD');

      expect(result).toBeDefined();
      expect(result?.price).toBeGreaterThan(0);
    });

    it('should handle very large prices', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          parsed: [{
            price: {
              price: '999999999999',
              conf: '999999999',
              expo: -8,
              publish_time: Math.floor(Date.now() / 1000),
            },
          }],
        }),
      } as any);

      const result = await fetchPythPrice('BTC/USD');

      expect(result).toBeDefined();
      expect(result?.price).toBeGreaterThan(0);
    });

    it('should handle zero confidence', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          parsed: [{
            price: {
              price: '10000000000',
              conf: '0',
              expo: -8,
              publish_time: Math.floor(Date.now() / 1000),
            },
          }],
        }),
      } as any);

      const result = await fetchPythPrice('SOL/USD');

      expect(result).toBeDefined();
      expect(result?.confidence).toBe(0);
    });
  });

  describe('Performance', () => {
    it('should fetch prices quickly (< 100ms)', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          parsed: [{
            price: {
              price: '10000000000',
              conf: '100000000',
              expo: -8,
              publish_time: Math.floor(Date.now() / 1000),
            },
          }],
        }),
      } as any);

      const start = Date.now();
      await getMarketPrice('SOL/USD');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it('should batch fetch efficiently', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          parsed: [{
            price: {
              price: '10000000000',
              conf: '100000000',
              expo: -8,
              publish_time: Math.floor(Date.now() / 1000),
            },
          }],
        }),
      } as any);

      const symbols = ['SOL/USD', 'ETH/USD', 'BTC/USD', 'USDC/USD'];
      
      const start = Date.now();
      await getBatchPrices(symbols);
      const duration = Date.now() - start;

      // Should fetch in parallel, so time should be similar to single fetch
      expect(duration).toBeLessThan(200);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle oracle failover', async () => {
      // Scenario: Pyth is down, Chainlink works
      vi.mocked(global.fetch)
        .mockRejectedValueOnce(new Error('Pyth down')) // First Pyth call fails
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            parsed: [{
              price: {
                price: '10000000000',
                conf: '100000000',
                expo: -8,
                publish_time: Math.floor(Date.now() / 1000),
              },
            }],
          }),
        } as any);

      vi.spyOn(mockConnection, 'getAccountInfo').mockResolvedValueOnce({
        data: Buffer.from([0x00, 0x94, 0x35, 0x77, 0x00, 0x00, 0x00, 0x00]),
        owner: new PublicKey('ChainlinkOwner'),
        executable: false,
        lamports: 1000000,
      } as any);

      const price = await getMarketPrice('SOL/USD', mockConnection);

      expect(price).toBeGreaterThan(0);
      // Should have failed over to Chainlink successfully
    });

    it('should provide reliable aggregated price', async () => {
      // Both oracles working normally
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          parsed: [{
            price: {
              price: '10000000000', // $100
              conf: '100000000',
              expo: -8,
              publish_time: Math.floor(Date.now() / 1000),
            },
          }],
        }),
      } as any);

      vi.spyOn(mockConnection, 'getAccountInfo').mockResolvedValue({
        data: Buffer.from([0x00, 0x94, 0x35, 0x77, 0x00, 0x00, 0x00, 0x00]), // Also ~$100
        owner: new PublicKey('ChainlinkOwner'),
        executable: false,
        lamports: 1000000,
      } as any);

      const result = await getAggregatedPrice('SOL/USD', mockConnection);

      expect(result?.isReliable).toBe(true);
      expect(result?.deviation).toBeLessThan(5); // Low deviation = reliable
    });
  });
});
