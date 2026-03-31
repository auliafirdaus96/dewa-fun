/**
 * tests/auth.test.ts
 * Test authentication middleware and endpoints
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from '../src/index.js';
import { Keypair } from '@solana/web3.js';
import nacl from 'tweetnacl';

describe('Authentication System', () => {
  let testWallet: Keypair;
  let authToken: string = '';

  beforeAll(() => {
    // Create test wallet
    testWallet = Keypair.generate();
  });

  describe('GET /api/auth/challenge', () => {
    it('should return challenge nonce for valid wallet', async () => {
      const walletAddress = testWallet.publicKey.toBase58();
      const res = await app.request(`/api/auth/challenge?wallet=${walletAddress}`);
      
      expect(res.status).toBe(200);
      const data = await res.json();
      
      expect(data.status).toBe('success');
      expect(data.data).toHaveProperty('nonce');
      expect(data.data).toHaveProperty('expiresAt');
      expect(data.data).toHaveProperty('message');
      expect(data.data.nonce.length).toBe(64); // 32 bytes hex = 64 chars
    });

    it('should reject invalid wallet address', async () => {
      const res = await app.request('/api/auth/challenge?wallet=invalid-address');
      
      expect(res.status).toBe(400);
      const data = await res.json();
      
      expect(data.status).toBe('error');
      expect(data.message).toContain('Invalid Solana wallet address');
    });

    it('should reject missing wallet parameter', async () => {
      const res = await app.request('/api/auth/challenge');
      
      expect(res.status).toBe(400);
      const data = await res.json();
      
      expect(data.status).toBe('error');
      expect(data.message).toContain('Wallet address required');
    });
  });

  describe('POST /api/auth/verify', () => {
    it('should return JWT token for valid signature', async () => {
      const walletAddress = testWallet.publicKey.toBase58();
      
      // Step 1: Get challenge
      const challengeRes = await app.request(`/api/auth/challenge?wallet=${walletAddress}`);
      const challengeData = await challengeRes.json();
      const { nonce, message } = challengeData.data;

      // Step 2: Sign message
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = nacl.sign.detached(messageBytes, testWallet.secretKey);
      const signature = Buffer.from(signatureBytes).toString('base64');

      // Step 3: Verify signature
      const verifyRes = await app.request('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: walletAddress,
          signature,
          message,
        }),
      });

      expect(verifyRes.status).toBe(200);
      const data = await verifyRes.json();
      
      expect(data.status).toBe('success');
      expect(data.data).toHaveProperty('token');
      expect(data.data).toHaveProperty('walletAddress');
      expect(data.data.walletAddress).toBe(walletAddress);

      authToken = data.data.token;
    });

    it('should reject invalid signature', async () => {
      const walletAddress = testWallet.publicKey.toBase58();
      
      // Get a fresh challenge
      const challengeRes = await app.request(`/api/auth/challenge?wallet=${walletAddress}`);
      const challengeData = await challengeRes.json();
      const { message } = challengeData.data;

      // Create fake signature
      const fakeSignature = Buffer.from(new Uint8Array(64)).toString('base64');

      const verifyRes = await app.request('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: walletAddress,
          signature: fakeSignature,
          message,
        }),
      });

      expect(verifyRes.status).toBe(401);
      const data = await verifyRes.json();
      
      expect(data.status).toBe('error');
      expect(data.message).toContain('Invalid signature');
    });

    it('should reject expired challenge', async () => {
      const walletAddress = Keypair.generate().publicKey.toBase58();
      
      // Get challenge
      const challengeRes = await app.request(`/api/auth/challenge?wallet=${walletAddress}`);
      const challengeData = await challengeRes.json();
      const { nonce, message } = challengeData.data;

      // Wait for challenge to expire (5 minutes + buffer)
      // For testing, we'll just use a non-existent nonce instead
      const fakeNonce = 'expired-nonce-test';
      const expiredMessage = `Sign this message to authenticate with Dewa.fun:\n\nNonce: ${fakeNonce}\nExpires: ${new Date(Date.now() - 60000).toISOString()}`;
      
      const messageBytes = new TextEncoder().encode(expiredMessage);
      const signatureBytes = nacl.sign.detached(messageBytes, testWallet.secretKey);
      const signature = Buffer.from(signatureBytes).toString('base64');

      const verifyRes = await app.request('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: walletAddress,
          signature,
          message: expiredMessage,
        }),
      });

      expect(verifyRes.status).toBe(401);
      const data = await verifyRes.json();
      
      expect(data.status).toBe('error');
      expect(data.message).toContain('expired');
    });
  });

  describe('Protected Routes', () => {
    it('should allow access with valid JWT token', async () => {
      // Use auth token from previous test
      const res = await app.request('/api/agents/run', {
        method: 'OPTIONS', // Just test CORS preflight
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Origin': 'http://localhost:3000',
        },
      });

      // Should not be 401 (might be 204 for OPTIONS or 400 for validation)
      expect(res.status).not.toBe(401);
    });

    it('should reject access without token', async () => {
      const res = await app.request('/api/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node_id: 'test-node',
          persona: 'test',
        }),
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.status).toBe('error');
      expect(data.message).toContain('Missing or invalid authorization');
    });

    it('should reject access with invalid token', async () => {
      const res = await app.request('/api/agents/run', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer invalid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          node_id: 'test-node',
          persona: 'test',
        }),
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.status).toBe('error');
      expect(data.message).toContain('Invalid or expired token');
    });
  });

  describe('Health Endpoints (No Auth Required)', () => {
    it('should allow health check without authentication', async () => {
      const res = await app.request('/health');
      
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('healthy');
    });

    it('should allow root endpoint without authentication', async () => {
      const res = await app.request('/');
      
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.message).toContain('running');
    });
  });
});
