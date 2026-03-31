/**
 * tests/transactionValidator.test.ts
 * Test Bags.fm API transaction validation, signature verification, and circuit breaker
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  verifyBagsSignature,
  validateTransactionStructure,
  withTimeout,
  withCircuitBreaker,
  checkCircuitBreaker,
  recordFailure,
  recordSuccess,
  resetCircuitBreaker,
  getCircuitBreakerStatus,
} from '../src/utils/transactionValidator.js';
import { BagsApiError, ValidationError, TransactionError } from '../src/utils/errors.js';
import { Keypair } from '@solana/web3.js';
import nacl from 'tweetnacl';

describe('Transaction Validator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset circuit breaker state
    ['bags_fm_token_launch', 'test_endpoint'].forEach(endpoint => {
      resetCircuitBreaker(endpoint);
    });
  });

  describe('verifyBagsSignature', () => {
    it('should verify valid signature', () => {
      // Create test keypair
      const keypair = Keypair.generate();
      const publicKey = keypair.publicKey.toBase58();
      
      // Create message and sign it
      const data = { transaction: 'tx123', mint: 'mint456' };
      const messageBytes = new TextEncoder().encode(JSON.stringify(data));
      const signatureBytes = nacl.sign.detached(messageBytes, keypair.secretKey);
      const signature = Buffer.from(signatureBytes).toString('base64');
      
      // Set public key in env (simulate production)
      const originalEnv = process.env.BAGS_FM_PUBLIC_KEY;
      process.env.BAGS_FM_PUBLIC_KEY = publicKey;
      
      try {
        const result = verifyBagsSignature(data, signature);
        expect(result).toBe(true);
      } finally {
        process.env.BAGS_FM_PUBLIC_KEY = originalEnv;
      }
    });

    it('should reject invalid signature', () => {
      const keypair = Keypair.generate();
      const wrongKeypair = Keypair.generate();
      
      const data = { transaction: 'tx123' };
      const messageBytes = new TextEncoder().encode(JSON.stringify(data));
      const signatureBytes = nacl.sign.detached(messageBytes, wrongKeypair.secretKey);
      const signature = Buffer.from(signatureBytes).toString('base64');
      
      process.env.BAGS_FM_PUBLIC_KEY = keypair.publicKey.toBase58();
      
      expect(() => verifyBagsSignature(data, signature)).toThrow(BagsApiError);
      expect(() => verifyBagsSignature(data, signature)).toThrow('Signature verification failed');
    });

    it('should skip verification when no public key configured', () => {
      const originalEnv = process.env.BAGS_FM_PUBLIC_KEY;
      delete process.env.BAGS_FM_PUBLIC_KEY;
      
      const data = { transaction: 'tx123' };
      const signature = 'invalid-signature';
      
      try {
        const result = verifyBagsSignature(data, signature);
        expect(result).toBe(true); // Should return true (skip verification)
      } finally {
        process.env.BAGS_FM_PUBLIC_KEY = originalEnv;
      }
    });
  });

  describe('validateTransactionStructure', () => {
    it('should validate correct transaction structure', () => {
      const transaction = {
        transaction: 'tx_signature_here',
        mint: 'So11111111111111111111111111111111111111112',
        timestamp: Date.now(),
        feeConfig: {
          claimersArray: ['wallet1', 'wallet2'],
          basisPointsArray: [5000, 5000],
        },
      };
      
      const result = validateTransactionStructure(transaction);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject null/undefined transaction', () => {
      const result1 = validateTransactionStructure(null);
      const result2 = validateTransactionStructure(undefined);
      
      expect(result1.valid).toBe(false);
      expect(result2.valid).toBe(false);
      expect(result1.errors).toContain('Transaction data is missing or null');
    });

    it('should reject transaction without required fields', () => {
      const transaction = {
        mint: 'So11111111111111111111111111111111111111112',
        // Missing transaction AND signature
      };
      
      const result = validateTransactionStructure(transaction);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: transaction or signature');
    });

    it('should warn about missing optional fields', () => {
      const transaction = {
        transaction: 'tx123',
        // Missing mint (optional)
      };
      
      const result = validateTransactionStructure(transaction);
      
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Missing optional field: mint (token address)');
    });

    it('should detect invalid Solana address', () => {
      const transaction = {
        transaction: 'tx123',
        mint: 'invalid-address',
      };
      
      const result = validateTransactionStructure(transaction);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid Solana address'))).toBe(true);
    });

    it('should validate fee configuration', () => {
      const transaction = {
        transaction: 'tx123',
        feeConfig: {
          claimersArray: ['wallet1'],
          basisPointsArray: [15000], // > 100%
        },
      };
      
      const result = validateTransactionStructure(transaction);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('exceeds 100%'))).toBe(true);
    });

    it('should detect mismatched fee arrays', () => {
      const transaction = {
        transaction: 'tx123',
        feeConfig: {
          claimersArray: ['wallet1', 'wallet2'],
          basisPointsArray: [5000], // Different length
        },
      };
      
      const result = validateTransactionStructure(transaction);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('same length'))).toBe(true);
    });

    it('should warn about old timestamps', () => {
      const oldTimestamp = Date.now() - 600000; // 10 minutes ago
      
      const transaction = {
        transaction: 'tx123',
        timestamp: oldTimestamp,
      };
      
      const result = validateTransactionStructure(transaction);
      
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('old'))).toBe(true);
    });
  });

  describe('withTimeout', () => {
    it('should resolve before timeout', async () => {
      const promise = new Promise(resolve => {
        setTimeout(() => resolve('success'), 50);
      });
      
      const result = await withTimeout(promise, 1000, 'test operation');
      expect(result).toBe('success');
    });

    it('should reject on timeout', async () => {
      const promise = new Promise(resolve => {
        setTimeout(() => resolve('too late'), 200);
      });
      
      await expect(
        withTimeout(promise, 50, 'slow operation')
      ).rejects.toThrow(TransactionError);
      
      await expect(
        withTimeout(promise, 50, 'slow operation')
      ).rejects.toThrow('timed out after 50ms');
    });

    it('should handle immediate resolution', async () => {
      const promise = Promise.resolve('immediate');
      
      const result = await withTimeout(promise, 1000);
      expect(result).toBe('immediate');
    });
  });

  describe('Circuit Breaker', () => {
    const testEndpoint = 'test_endpoint';

    it('should start in CLOSED state', () => {
      resetCircuitBreaker(testEndpoint);
      const status = getCircuitBreakerStatus()[testEndpoint];
      expect(status.state).toBe('CLOSED');
      expect(status.failures).toBe(0);
    });

    it('should open circuit after threshold failures', () => {
      resetCircuitBreaker(testEndpoint);
      
      // Record 5 failures (threshold)
      for (let i = 0; i < 5; i++) {
        recordFailure(testEndpoint);
      }
      
      const status = getCircuitBreakerStatus()[testEndpoint];
      expect(status.state).toBe('OPEN');
      expect(status.failures).toBe(5);
    });

    it('should throw error when circuit is OPEN', () => {
      resetCircuitBreaker(testEndpoint);
      
      // Force circuit open
      for (let i = 0; i < 5; i++) {
        recordFailure(testEndpoint);
      }
      
      expect(() => checkCircuitBreaker(testEndpoint)).toThrow(BagsApiError);
      expect(() => checkCircuitBreaker(testEndpoint)).toThrow('Circuit breaker open');
    });

    it('should transition to HALF_OPEN after timeout', async () => {
      resetCircuitBreaker(testEndpoint);
      
      // Force circuit open
      for (let i = 0; i < 5; i++) {
        recordFailure(testEndpoint);
      }
      
      // Wait for timeout (60s in production, but we'll manually set lastFailureTime)
      const state = require('../src/utils/transactionValidator.js');
      // Access internal state to simulate timeout
      const states = state.getCircuitBreakerState ? 
        state.getCircuitBreakerState(testEndpoint) : null;
      
      if (states) {
        states.lastFailureTime = Date.now() - 120000; // 2 minutes ago
      }
      
      // Should allow request (transition to HALF_OPEN)
      expect(() => checkCircuitBreaker(testEndpoint)).not.toThrow();
    });

    it('should close circuit on success', async () => {
      resetCircuitBreaker(testEndpoint);
      
      // Simulate successful call
      const result = await withCircuitBreaker(
        testEndpoint,
        async () => 'success'
      );
      
      expect(result).toBe('success');
      
      const status = getCircuitBreakerStatus()[testEndpoint];
      expect(status.state).toBe('CLOSED');
      expect(status.failures).toBe(0);
    });

    it('should record failure on error', async () => {
      resetCircuitBreaker(testEndpoint);
      
      // Simulate failed call
      await expect(
        withCircuitBreaker(
          testEndpoint,
          async () => { throw new Error('API error'); }
        )
      ).rejects.toThrow();
      
      const status = getCircuitBreakerStatus()[testEndpoint];
      expect(status.failures).toBe(1);
    });

    it('should manually reset circuit', () => {
      resetCircuitBreaker(testEndpoint);
      
      // Force circuit open
      for (let i = 0; i < 5; i++) {
        recordFailure(testEndpoint);
      }
      
      // Manually reset
      resetCircuitBreaker(testEndpoint);
      
      const status = getCircuitBreakerStatus()[testEndpoint];
      expect(status.state).toBe('CLOSED');
      expect(status.failures).toBe(0);
    });
  });

  describe('Integration: Full Validation Flow', () => {
    it('should handle complete validation flow', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          transaction: 'tx123',
          mint: 'So11111111111111111111111111111111111111112',
        }),
      };
      
      const fetchMock = vi.fn().mockResolvedValue(mockResponse);
      
      // Simulate successful API call
      const result = await withCircuitBreaker('test_api', async () => {
        const response = await fetchMock('https://api.example.com/test');
        if (!response.ok) {
          throw new Error('Request failed');
        }
        return await response.json();
      });
      
      expect(result.transaction).toBe('tx123');
      expect(result.mint).toContain('So11');
      
      // Circuit should be closed after success
      const status = getCircuitBreakerStatus()['test_api'];
      expect(status.state).toBe('CLOSED');
    });
  });
});
