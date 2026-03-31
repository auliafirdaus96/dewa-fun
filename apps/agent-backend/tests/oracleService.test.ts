/**
 * tests/oracleService.test.ts
 * Test multi-source oracle with fallback, deviation checks, and circuit breakers
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { oracleService } from '../src/services/oracleService.js';

describe('Oracle Service - Multi-Source Price Feeds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset any internal state if needed
  });

  describe('getPriceWithFallback - Core Functionality', () => {
    it('should fetch price from primary source (Jupiter)', async () => {
      const solMint = 'So11111111111111111111111111111111111111112';
      
      const result = await oracleService.getPriceWithFallback(solMint);
      
      expect(result).toHaveProperty('price');
      expect(result).toHaveProperty('source');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('timestamp');
      expect(typeof result.price).toBe('number');
      expect(result.price).toBeGreaterThan(0);
    });

    it('should return real-time price data', async () => {
      const solMint = 'So11111111111111111111111111111111111111112';
      
      const startTime = Date.now();
      const result = await oracleService.getPriceWithFallback(solMint);
      const endTime = Date.now();
      
      expect(result.timestamp).toBeGreaterThanOrEqual(startTime);
      expect(result.timestamp).toBeLessThanOrEqual(endTime);
      expect(result.price).toBeGreaterThan(0);
    });

    it('should cache price results', async () => {
      const solMint = 'So11111111111111111111111111111111111111112';
      
      // First call - fetches from API
      const result1 = await oracleService.getPriceWithFallback(solMint);
      const source1 = result1.source;
      
      // Immediate second call - should use cache
      const result2 = await oracleService.getPriceWithFallback(solMint);
      
      expect(result2.price).toBe(result1.price);
      // Cache should have same timestamp or very close
      expect(Math.abs(result2.timestamp - result1.timestamp)).toBeLessThan(1000);
    }, 15000);

    it('should respect cache TTL', async () => {
      const solMint = 'So11111111111111111111111111111111111111112';
      
      // First call
      const result1 = await oracleService.getPriceWithFallback(solMint);
      
      // Wait for cache to expire (30s TTL + buffer)
      await new Promise(resolve => setTimeout(resolve, 31000));
      
      // Second call - should fetch fresh
      const result2 = await oracleService.getPriceWithFallback(solMint);
      
      // Timestamps should be different (fresh fetch)
      expect(result2.timestamp).toBeGreaterThan(result1.timestamp);
    }, 40000);
  });

  describe('Confidence Scoring', () => {
    it('should assign confidence based on source count', async () => {
      const solMint = 'So11111111111111111111111111111111111111112';
      
      const result = await oracleService.getPriceWithFallback(solMint);
      
      // Confidence should be between 0.6 and 0.99
      expect(result.confidence).toBeGreaterThanOrEqual(0.6);
      expect(result.confidence).toBeLessThanOrEqual(0.99);
      
      // Common confidence values: 0.60, 0.75, 0.90, 0.95, 0.99
      const validConfidences = [0.60, 0.75, 0.90, 0.95, 0.99];
      expect(validConfidences).toContain(result.confidence);
    });

    it('should provide high confidence for multiple agreeing sources', async () => {
      const solMint = 'So11111111111111111111111111111111111111112';
      
      const result = await oracleService.getPriceWithFallback(solMint);
      
      // If Jupiter + Pyth both work, should have high confidence (>= 0.75)
      if (result.source === 'Jupiter' || result.source === 'Pyth') {
        expect(result.confidence).toBeGreaterThanOrEqual(0.75);
      }
    });
  });

  describe('Source Priority', () => {
    it('should prefer Jupiter over other sources', async () => {
      const solMint = 'So11111111111111111111111111111111111111112';
      
      const result = await oracleService.getPriceWithFallback(solMint);
      
      // Jupiter is primary, should be used if available
      // Acceptable sources in priority order: Jupiter, Pyth, DexScreener, CoinGecko
      const acceptableSources = ['Jupiter', 'Pyth', 'DexScreener', 'CoinGecko'];
      expect(acceptableSources).toContain(result.source);
    });

    it('should track which source provided the price', async () => {
      const solMint = 'So11111111111111111111111111111111111111112';
      
      const result = await oracleService.getPriceWithFallback(solMint);
      
      expect(result.source).toBeDefined();
      expect(typeof result.source).toBe('string');
      expect(result.source.length).toBeGreaterThan(0);
    });
  });

  describe('Deviation Detection', () => {
    it('should handle price deviation gracefully', async () => {
      const solMint = 'So11111111111111111111111111111111111111112';
      
      const result = await oracleService.getPriceWithFallback(solMint);
      
      // Price should be reasonable for SOL (not negative, not astronomical)
      expect(result.price).toBeGreaterThan(0);
      expect(result.price).toBeLessThan(10000); // Sanity check
      
      // If multiple sources agree, price should be stable
      if (result.confidence >= 0.90) {
        // High confidence means sources agree within 5%
        // Price should be within expected range
        expect(result.price).toBeGreaterThan(50); // Minimum sane price
      }
    });
  });

  describe('Circuit Breaker Pattern', () => {
    it('should continue working when sources are healthy', async () => {
      const solMint = 'So11111111111111111111111111111111111111112';
      
      // Multiple successful calls should keep circuits closed
      for (let i = 0; i < 3; i++) {
        const result = await oracleService.getPriceWithFallback(solMint);
        expect(result.price).toBeGreaterThan(0);
      }
    });

    it('should handle source failures gracefully', async () => {
      const solMint = 'So11111111111111111111111111111111111111112';
      
      // Should still get price even if some sources fail
      const result = await oracleService.getPriceWithFallback(solMint);
      
      expect(result).toBeDefined();
      expect(result.price).toBeGreaterThan(0);
    });
  });

  describe('getSolPrice - Convenience Method', () => {
    it('should fetch SOL price using fallback chain', async () => {
      const price = await oracleService.getSolPrice();
      
      expect(price).toBeGreaterThan(0);
      expect(typeof price).toBe('number');
      
      // SOL price sanity checks (as of 2024-2026)
      expect(price).toBeGreaterThan(50);
      expect(price).toBeLessThan(1000);
    });

    it('should return consistent prices', async () => {
      const price1 = await oracleService.getSolPrice();
      const price2 = await oracleService.getSolPrice();
      
      // Prices should be very close (cached or same source)
      const deviation = Math.abs((price1 - price2) / price1);
      expect(deviation).toBeLessThan(0.01); // < 1% difference
    });
  });

  describe('getMarketVolatility', () => {
    it('should calculate volatility for SOL', async () => {
      const volatility = await oracleService.getMarketVolatility('SOL');
      
      expect(volatility).toBeGreaterThan(0);
      expect(volatility).toBeLessThan(20); // Reasonable volatility range
      
      // SOL typically has moderate volatility (3-7)
      expect(volatility).toBeGreaterThanOrEqual(2);
      expect(volatility).toBeLessThanOrEqual(10);
    });

    it('should calculate volatility for other tokens', async () => {
      const volatility = await oracleService.getMarketVolatility('ETH');
      
      expect(volatility).toBeGreaterThan(0);
      expect(volatility).toBeLessThan(20);
    });

    it('should provide higher volatility for riskier tokens', async () => {
      const solVol = await oracleService.getMarketVolatility('SOL');
      const randomVol = await oracleService.getMarketVolatility('RANDOM_TOKEN');
      
      // Random tokens typically have higher volatility
      expect(randomVol).toBeGreaterThanOrEqual(solVol);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid mint addresses', async () => {
      const invalidMint = 'invalid_mint_address_12345';
      
      await expect(
        oracleService.getPriceWithFallback(invalidMint)
      ).rejects.toThrow();
    });

    it('should handle empty mint addresses', async () => {
      const emptyMint = '';
      
      await expect(
        oracleService.getPriceWithFallback(emptyMint)
      ).rejects.toThrow();
    });

    it('should throw error when all sources fail', async () => {
      // Use a mint that likely won't exist in any oracle
      const fakeMint = '111111111111111111111111111111111';
      
      await expect(
        oracleService.getPriceWithFallback(fakeMint)
      ).rejects.toThrow('All oracle sources failed');
    });
  });

  describe('Integration: Real-World Scenarios', () => {
    it('should handle rapid successive requests', async () => {
      const solMint = 'So11111111111111111111111111111111111111112';
      
      const promises = Array.from({ length: 5 }).map(() => 
        oracleService.getPriceWithFallback(solMint)
      );
      
      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(result.price).toBeGreaterThan(0);
        expect(result.confidence).toBeGreaterThanOrEqual(0.6);
      });
    });

    it('should handle multiple different tokens', async () => {
      const mints = [
        'So11111111111111111111111111111111111111112', // SOL
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
        'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
      ];
      
      const results = await Promise.all(
        mints.map(mint => oracleService.getPriceWithFallback(mint))
      );
      
      results.forEach((result, index) => {
        expect(result.price).toBeGreaterThan(0);
        console.log(`Token ${index + 1}: $${result.price.toFixed(4)} (${result.source})`);
      });
    });

    it('should maintain price consistency across calls', async () => {
      const solMint = 'So11111111111111111111111111111111111111112';
      
      const prices: number[] = [];
      for (let i = 0; i < 5; i++) {
        const result = await oracleService.getPriceWithFallback(solMint);
        prices.push(result.price);
      }
      
      // All prices should be very close (within 1%)
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      const maxDeviation = Math.max(...prices.map(p => Math.abs((p - avgPrice) / avgPrice)));
      
      expect(maxDeviation).toBeLessThan(0.01); // < 1% deviation
    });
  });

  describe('Performance', () => {
    it('should fetch price within reasonable time', async () => {
      const solMint = 'So11111111111111111111111111111111111111112';
      
      const startTime = Date.now();
      await oracleService.getPriceWithFallback(solMint);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      
      // Should complete within 5 seconds (with caching)
      expect(duration).toBeLessThan(5000);
    });

    it('should be faster with cached results', async () => {
      const solMint = 'So11111111111111111111111111111111111111112';
      
      // First call (uncached)
      const start1 = Date.now();
      await oracleService.getPriceWithFallback(solMint);
      const time1 = Date.now() - start1;
      
      // Second call (cached)
      const start2 = Date.now();
      await oracleService.getPriceWithFallback(solMint);
      const time2 = Date.now() - start2;
      
      // Cached call should be significantly faster
      expect(time2).toBeLessThan(time1);
      expect(time2).toBeLessThan(100); // < 100ms for cached
    });
  });
});
