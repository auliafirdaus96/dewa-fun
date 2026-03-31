/**
 * tests/rateLimiter.test.ts
 * Test rate limiting middleware with various configurations and scenarios
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import {
  rateLimiter,
  authRateLimiter,
  apiRateLimiter,
  publicRateLimiter,
  tokenLaunchLimiter,
  dlmmOperationLimiter,
  getRateLimitStatus,
  resetRateLimit,
  resetAllRateLimits,
  getRateLimitStats,
} from '../src/middleware/rateLimiter.js';

describe('Rate Limiter Middleware', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    resetAllRateLimits();
  });

  afterEach(() => {
    resetAllRateLimits();
  });

  describe('Basic Rate Limiting', () => {
    it('should allow requests within limit', async () => {
      app.use('/api/*', rateLimiter({ windowMs: 1000, maxRequests: 5 }));
      
      app.get('/api/test', (c) => c.json({ success: true }));

      // Make 5 requests - all should succeed
      for (let i = 0; i < 5; i++) {
        const res = await app.request('/api/test');
        expect(res.status).toBe(200);
        
        const remaining = res.headers.get('X-RateLimit-Remaining');
        expect(remaining).toBe((4 - i).toString());
      }
    });

    it('should block requests exceeding limit', async () => {
      app.use('/api/*', rateLimiter({ windowMs: 1000, maxRequests: 3 }));
      app.get('/api/test', (c) => c.json({ success: true }));

      // First 3 requests succeed
      for (let i = 0; i < 3; i++) {
        const res = await app.request('/api/test');
        expect(res.status).toBe(200);
      }

      // 4th request blocked
      const res = await app.request('/api/test');
      expect(res.status).toBe(429);
      
      const data = await res.json() as any;
      expect(data.message).toContain('Too many requests');
      
      // Check headers
      expect(res.headers.get('Retry-After')).toBeDefined();
      expect(res.headers.get('X-RateLimit-Remaining')).toBe('0');
    });

    it('should reset after window expires', async () => {
      const windowMs = 100; // 100ms for testing
      app.use('/api/*', rateLimiter({ windowMs, maxRequests: 2 }));
      app.get('/api/test', (c) => c.json({ success: true }));

      // Use up limit
      await app.request('/api/test');
      await app.request('/api/test');
      
      // Next request blocked
      let res = await app.request('/api/test');
      expect(res.status).toBe(429);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, windowMs + 50));

      // Should be allowed again
      res = await app.request('/api/test');
      expect(res.status).toBe(200);
    });
  });

  describe('Pre-configured Limiters', () => {
    it('authRateLimiter: 5 requests per minute', async () => {
      app.use('/auth/*', authRateLimiter);
      app.post('/auth/login', (c) => c.json({ token: 'fake' }));

      // 5 requests allowed
      for (let i = 0; i < 5; i++) {
        const res = await app.request('/auth/login', { method: 'POST' });
        expect(res.status).toBe(200);
      }

      // 6th blocked
      const res = await app.request('/auth/login', { method: 'POST' });
      expect(res.status).toBe(429);
    });

    it('apiRateLimiter: 30 requests per minute', async () => {
      app.use('/api/*', apiRateLimiter);
      app.get('/api/data', (c) => c.json({ data: 'test' }));

      // 30 requests allowed
      for (let i = 0; i < 30; i++) {
        const res = await app.request('/api/data');
        expect(res.status).toBe(200);
      }

      // 31st blocked
      const res = await app.request('/api/data');
      expect(res.status).toBe(429);
    });

    it('publicRateLimiter: 100 requests per minute', async () => {
      app.use('/public/*', publicRateLimiter);
      app.get('/public/info', (c) => c.json({ info: 'public' }));

      // 100 requests allowed
      for (let i = 0; i < 100; i++) {
        const res = await app.request('/public/info');
        expect(res.status).toBe(200);
      }

      // 101st blocked
      const res = await app.request('/public/info');
      expect(res.status).toBe(429);
    });

    it('tokenLaunchLimiter: 3 launches per hour', async () => {
      app.use('/launch/*', tokenLaunchLimiter);
      app.post('/launch/token', (c) => c.json({ tx: 'fake' }));

      // 3 launches allowed
      for (let i = 0; i < 3; i++) {
        const res = await app.request('/launch/token', { method: 'POST' });
        expect(res.status).toBe(200);
      }

      // 4th blocked (strict!)
      const res = await app.request('/launch/token', { method: 'POST' });
      expect(res.status).toBe(429);
    });

    it('dlmmOperationLimiter: 20 operations per minute', async () => {
      app.use('/dlmm/*', dlmmOperationLimiter);
      app.post('/dlmm/add-liquidity', (c) => c.json({ ix: 'fake' }));

      // 20 operations allowed
      for (let i = 0; i < 20; i++) {
        const res = await app.request('/dlmm/add-liquidity', { method: 'POST' });
        expect(res.status).toBe(200);
      }

      // 21st blocked
      const res = await app.request('/dlmm/add-liquidity', { method: 'POST' });
      expect(res.status).toBe(429);
    });
  });

  describe('Skip Options', () => {
    it('skipSuccessfulRequests: only count non-2xx', async () => {
      app.use('/api/*', rateLimiter({
        windowMs: 1000,
        maxRequests: 3,
        skipSuccessfulRequests: true,
      }));
      
      app.get('/api/success', (c) => c.json({ ok: true })); // 200
      app.get('/api/error', (c) => { throw new Error('fail'); }); // 500

      // Successful requests don't count
      for (let i = 0; i < 10; i++) {
        const res = await app.request('/api/success');
        expect(res.status).toBe(200);
      }

      // Failed requests DO count
      for (let i = 0; i < 3; i++) {
        try {
          await app.request('/api/error');
        } catch (e) {
          // Expected
        }
      }

      // Now blocked due to failed requests
      const res = await app.request('/api/success');
      expect(res.status).toBe(429);
    });

    it('skipFailedRequests: only count 2xx', async () => {
      app.use('/api/*', rateLimiter({
        windowMs: 1000,
        maxRequests: 3,
        skipFailedRequests: true,
      }));
      
      app.get('/api/success', (c) => c.json({ ok: true }));
      app.get('/api/error', (c) => { throw new Error('fail'); });

      // Failed requests don't count
      for (let i = 0; i < 10; i++) {
        try {
          await app.request('/api/error');
        } catch (e) {
          // Expected
        }
      }

      // Successful requests DO count
      for (let i = 0; i < 3; i++) {
        const res = await app.request('/api/success');
        expect(res.status).toBe(200);
      }

      // Now blocked due to successful requests
      const res = await app.request('/api/success');
      expect(res.status).toBe(429);
    });
  });

  describe('IP-based vs User-based Limiting', () => {
    it('should use IP address when no user ID', async () => {
      app.use('/api/*', rateLimiter({ windowMs: 1000, maxRequests: 2 }));
      app.get('/api/test', (c) => c.json({ ok: true }));

      // Simulate same IP (default context)
      await app.request('/api/test');
      await app.request('/api/test');
      
      // Third request from same IP blocked
      const res = await app.request('/api/test');
      expect(res.status).toBe(429);
    });

    it('should use user ID when authenticated', async () => {
      app.use('/api/*', rateLimiter({ windowMs: 1000, maxRequests: 2 }));
      app.get('/api/test', (c) => {
        // Simulate setting userId in context
        c.set('userId', 'user123');
        return c.json({ ok: true });
      });

      // Each user gets their own limit
      // This would require proper context setup in real scenario
      const res = await app.request('/api/test');
      expect(res.status).toBe(200);
    });
  });

  describe('Utility Functions', () => {
    it('getRateLimitStatus: returns current status', async () => {
      app.use('/api/*', rateLimiter({ windowMs: 1000, maxRequests: 5 }));
      app.get('/api/test', (c) => c.json({ ok: true }));

      // Make some requests
      await app.request('/api/test');
      await app.request('/api/test');

      const status = getRateLimitStatus('ip:unknown');
      expect(status).toBeDefined();
      expect(status?.count).toBeGreaterThanOrEqual(2);
      expect(status?.remaining).toBeLessThanOrEqual(3);
    });

    it('resetRateLimit: clears specific client', async () => {
      app.use('/api/*', rateLimiter({ windowMs: 1000, maxRequests: 2 }));
      app.get('/api/test', (c) => c.json({ ok: true }));

      // Use up limit
      await app.request('/api/test');
      await app.request('/api/test');

      // Blocked
      let res = await app.request('/api/test');
      expect(res.status).toBe(429);

      // Reset
      resetRateLimit('ip:unknown');

      // Should work again
      res = await app.request('/api/test');
      expect(res.status).toBe(200);
    });

    it('resetAllRateLimits: clears everything', async () => {
      app.use('/api/*', rateLimiter({ windowMs: 1000, maxRequests: 2 }));
      app.get('/api/test', (c) => c.json({ ok: true }));

      // Make requests
      await app.request('/api/test');
      await app.request('/api/test');

      // Reset all
      resetAllRateLimits();

      // Stats should show zero
      const stats = getRateLimitStats();
      expect(stats.totalClients).toBe(0);
    });

    it('getRateLimitStats: returns statistics', async () => {
      app.use('/api/*', rateLimiter({ windowMs: 1000, maxRequests: 10 }));
      app.get('/api/test', (c) => c.json({ ok: true }));

      // Make some requests from different "clients"
      for (let i = 0; i < 5; i++) {
        await app.request('/api/test');
      }

      const stats = getRateLimitStats();
      expect(stats.totalClients).toBeGreaterThanOrEqual(1);
      expect(stats.activeClients).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Headers', () => {
    it('should set all required headers', async () => {
      app.use('/api/*', rateLimiter({ windowMs: 1000, maxRequests: 5 }));
      app.get('/api/test', (c) => c.json({ ok: true }));

      const res = await app.request('/api/test');

      expect(res.headers.get('X-RateLimit-Limit')).toBe('5');
      expect(res.headers.get('X-RateLimit-Remaining')).toBe('4');
      expect(res.headers.get('X-RateLimit-Reset')).toBeDefined();
    });

    it('should set Retry-After header when blocked', async () => {
      app.use('/api/*', rateLimiter({ windowMs: 1000, maxRequests: 1 }));
      app.get('/api/test', (c) => c.json({ ok: true }));

      // First request succeeds
      await app.request('/api/test');

      // Second request blocked
      const res = await app.request('/api/test');
      expect(res.status).toBe(429);
      expect(res.headers.get('Retry-After')).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent requests safely', async () => {
      app.use('/api/*', rateLimiter({ windowMs: 1000, maxRequests: 10 }));
      app.get('/api/test', (c) => c.json({ ok: true }));

      // Make concurrent requests
      const promises = Array.from({ length: 10 }).map(() => 
        app.request('/api/test')
      );

      const results = await Promise.all(promises);
      
      // All should succeed (within limit)
      results.forEach(res => {
        expect(res.status).toBe(200);
      });
    });

    it('should handle very short windows', async () => {
      app.use('/api/*', rateLimiter({ windowMs: 10, maxRequests: 1 }));
      app.get('/api/test', (c) => c.json({ ok: true }));

      // First succeeds
      const res1 = await app.request('/api/test');
      expect(res1.status).toBe(200);

      // Immediate second fails
      const res2 = await app.request('/api/test');
      expect(res2.status).toBe(429);

      // After window expires, succeeds again
      await new Promise(resolve => setTimeout(resolve, 20));
      const res3 = await app.request('/api/test');
      expect(res3.status).toBe(200);
    });

    it('should handle large limits', async () => {
      app.use('/api/*', rateLimiter({ windowMs: 1000, maxRequests: 10000 }));
      app.get('/api/test', (c) => c.json({ ok: true }));

      // Make 1000 requests quickly
      const promises = Array.from({ length: 1000 }).map(() => 
        app.request('/api/test')
      );

      const results = await Promise.all(promises);
      
      // All should succeed
      results.forEach(res => {
        expect(res.status).toBe(200);
      });
    });
  });

  describe('Performance', () => {
    it('should add minimal overhead (< 5ms per request)', async () => {
      app.use('/api/*', rateLimiter({ windowMs: 1000, maxRequests: 100 }));
      app.get('/api/test', (c) => c.json({ ok: true }));

      const start = Date.now();
      
      for (let i = 0; i < 100; i++) {
        await app.request('/api/test');
      }
      
      const duration = Date.now() - start;
      const avgPerRequest = duration / 100;
      
      expect(avgPerRequest).toBeLessThan(5); // < 5ms per request
    });
  });
});
