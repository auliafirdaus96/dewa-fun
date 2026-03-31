/**
 * tests/integration.test.ts
 * Comprehensive integration tests for agent backend
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';

// Import all middleware and routes
import { requestLogger } from '../src/utils/logger.js';
import { rateLimiter, authRateLimiter, apiRateLimiter } from '../src/middleware/rateLimiter.js';
import { validateInputMiddleware } from '../src/middleware/inputValidator.js';
import { contentModerator } from '../src/middleware/contentModerator.js';
import { requireWalletVerification } from '../src/middleware/walletVerifier.js';

describe('Integration Tests', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.use('*', requestLogger());
  });

  describe('Middleware Stack Integration', () => {
    it('should process requests through multiple middleware layers', async () => {
      // Setup middleware stack
      app.use('/api/*', rateLimiter({ windowMs: 1000, maxRequests: 10 }));
      app.use('/api/protected/*', (c: any, next: any) => {
        c.set('userId', 'test-user-123');
        return next();
      });

      app.get('/api/test', (c) => c.json({ success: true }));
      app.get('/api/protected/data', (c: any) => {
        const userId = c.get('userId');
        return c.json({ success: true, userId });
      });

      // Test public endpoint
      const res1 = await app.request('http://localhost/api/test');
      expect(res1.status).toBe(200);
      const data1 = await res1.json() as any;
      expect(data1.success).toBe(true);

      // Test protected endpoint
      const res2 = await app.request('http://localhost/api/protected/data');
      expect(res2.status).toBe(200);
      const data2 = await res2.json() as any;
      expect(data2.userId).toBe('test-user-123');
    });

    it('should handle middleware errors gracefully', async () => {
      app.use('/api/*', (c, next) => {
        throw new Error('Middleware error');
      });

      app.get('/api/test', (c) => c.json({ success: true }));

      const res = await app.request('http://localhost/api/test');
      expect(res.status).toBe(500);
    });
  });

  describe('Rate Limiting + Input Validation', () => {
    it('should apply both rate limiting and validation', async () => {
      app.use('/api/*', rateLimiter({ windowMs: 1000, maxRequests: 5 }));
      app.use('/api/submit/*', validateInputMiddleware({
        name: { type: 'string', required: true, minLength: 2 },
      }));

      app.post('/api/submit/data', async (c) => {
        const data = await c.req.json();
        return c.json({ success: true, received: data });
      });

      // Valid request within limit
      const res1 = await app.request('http://localhost/api/submit/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Valid Name' }),
      });
      expect(res1.status).toBe(200);

      // Invalid data (validation fails)
      const res2 = await app.request('http://localhost/api/submit/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'X' }), // Too short
      });
      expect(res2.status).toBe(400);

      // Rate limit exceeded
      for (let i = 0; i < 5; i++) {
        await app.request('http://localhost/api/submit/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Test' }),
        });
      }

      const resLimit = await app.request('http://localhost/api/submit/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test' }),
      });
      expect(resLimit.status).toBe(429);
    });
  });

  describe('Content Moderation + Wallet Verification', () => {
    it('should require wallet verification and moderate content', async () => {
      app.use('/api/post/*', requireWalletVerification());
      app.use('/api/post/*', contentModerator({ autoRejectToxic: true }));

      app.post('/api/post/create', async (c) => {
        const body = await c.req.json();
        return c.json({ success: true, content: body.content });
      });

      // Missing wallet address
      const res1 = await app.request('http://localhost/api/post/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Hello World' }),
      });
      expect(res1.status).toBe(401);

      // Toxic content with wallet
      const res2 = await app.request('http://localhost/api/post/create', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Wallet-Address': 'So11111111111111111111111111111111111111112',
        },
        body: JSON.stringify({ content: 'Stupid idiots everywhere' }),
      });
      expect(res2.status).toBe(400); // Rejected by moderation
    });
  });

  describe('Complete Agent Creation Flow', () => {
    it('should handle complete agent creation with all validations', async () => {
      // Simulate full stack
      app.use('/api/agent/*', authRateLimiter);
      app.use('/api/agent/*', requireWalletVerification());
      app.use('/api/agent/*', validateInputMiddleware({
        name: { type: 'string', required: true, minLength: 2, maxLength: 50 },
        description: { type: 'string', required: true, minLength: 10 },
        agent_wallet: { type: 'solanaAddress', required: true },
      }));

      app.post('/api/agent/create', async (c) => {
        const body = await c.req.json();
        
        // Simulate agent creation
        const agent = {
          id: 'agent-' + Date.now(),
          ...body,
          createdAt: new Date().toISOString(),
        };

        return c.json({ success: true, agent });
      });

      // Missing wallet
      const res1 = await app.request('http://localhost/api/agent/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Agent',
          description: 'This is a test agent description',
          agent_wallet: 'So11111111111111111111111111111111111111112',
        }),
      });
      expect(res1.status).toBe(401);

      // Invalid wallet format
      const res2 = await app.request('http://localhost/api/agent/create', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Wallet-Address': 'invalid_wallet',
        },
        body: JSON.stringify({
          name: 'Test Agent',
          description: 'This is a test agent description',
          agent_wallet: 'invalid_wallet',
        }),
      });
      expect(res2.status).toBe(400);

      // Valid request
      const res3 = await app.request('http://localhost/api/agent/create', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Wallet-Address': 'So11111111111111111111111111111111111111112',
        },
        body: JSON.stringify({
          name: 'Test Agent',
          description: 'This is a test agent description',
          agent_wallet: 'So11111111111111111111111111111111111111112',
        }),
      });
      expect(res3.status).toBe(200);
      const data = await res3.json() as any;
      expect(data.success).toBe(true);
      expect(data.agent.name).toBe('Test Agent');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle errors across multiple layers', async () => {
      app.use('/api/*', rateLimiter({ windowMs: 1000, maxRequests: 10 }));
      
      app.get('/api/error', () => {
        throw new Error('Unexpected error');
      });

      app.get('/api/validation-error', async (c) => {
        const data = await c.req.json().catch(() => ({}));
        if (!data.required) {
          throw new Error('Required field missing');
        }
        return c.json({ success: true });
      });

      // Unexpected error
      const res1 = await app.request('http://localhost/api/error');
      expect(res1.status).toBe(500);

      // Validation error
      const res2 = await app.request('http://localhost/api/validation-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res2.status).toBe(500);
    });
  });

  describe('Performance Under Load', () => {
    it('should handle concurrent requests efficiently', async () => {
      app.use('/api/*', rateLimiter({ windowMs: 1000, maxRequests: 100 }));
      
      app.get('/api/fast', (c) => c.json({ time: Date.now() }));
      app.get('/api/slow', async (c) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return c.json({ time: Date.now() });
      });

      // Concurrent fast requests
      const fastPromises = Array(10).fill(null).map(() =>
        app.request('http://localhost/api/fast')
      );

      const fastResults = await Promise.all(fastPromises);
      fastResults.forEach(res => expect(res.status).toBe(200));

      // Concurrent slow requests
      const slowPromises = Array(5).fill(null).map(() =>
        app.request('http://localhost/api/slow')
      );

      const slowResults = await Promise.all(slowPromises);
      slowResults.forEach(res => expect(res.status).toBe(200));
    });
  });

  describe('Security Headers Integration', () => {
    it('should include security headers in responses', async () => {
      app.use('/api/*', rateLimiter({ windowMs: 1000, maxRequests: 10 }));
      app.get('/api/test', (c) => c.json({ success: true }));

      const res = await app.request('http://localhost/api/test');
      
      expect(res.headers.get('X-RateLimit-Limit')).toBeDefined();
      expect(res.headers.get('X-RateLimit-Remaining')).toBeDefined();
      expect(res.headers.get('X-RateLimit-Reset')).toBeDefined();
    });
  });

  describe('Cache Integration', () => {
    it('should use cached verifications', async () => {
      app.use('/api/protected/*', requireWalletVerification());
      app.get('/api/protected/data', (c) => c.json({ data: 'test' }));

      const walletAddress = 'So11111111111111111111111111111111111111112';

      // First request - should fail (not verified)
      const res1 = await app.request('http://localhost/api/protected/data', {
        headers: { 'X-Wallet-Address': walletAddress },
      });
      expect(res1.status).toBe(401);

      // After manual verification (simulating successful challenge)
      const { manualVerify } = await import('../src/middleware/walletVerifier.js');
      manualVerify(walletAddress);

      // Second request - should succeed (cached verification)
      const res2 = await app.request('http://localhost/api/protected/data', {
        headers: { 'X-Wallet-Address': walletAddress },
      });
      expect(res2.status).toBe(200);
    });
  });
});
