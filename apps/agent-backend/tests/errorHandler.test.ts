/**
 * tests/errorHandler.test.ts
 * Test standardized error handling with retry and circuit breaker
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import {
  ApplicationError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  DatabaseError,
  ApiError,
  TimeoutError,
  RateLimitError,
  InternalError,
  ServiceUnavailableError,
  errorHandler,
  withRetry,
  withCircuitBreaker,
  withTimeout,
  safeExecute,
  resetCircuitBreaker,
  getCircuitBreakerState,
} from '../src/utils/errorHandler.js';

describe('Error Handling System', () => {
  beforeEach(() => {
    // Reset all circuit breakers before each test
    ['test-breaker', 'api-breaker', 'db-breaker'].forEach(id => {
      resetCircuitBreaker(id);
    });
  });

  describe('Error Classes', () => {
    it('should create ValidationError with correct properties', () => {
      const error = new ValidationError('Invalid email format', { field: 'email' });
      
      expect(error.name).toBe('ValidationError');
      expect(error.type).toBe('VALIDATION_ERROR');
      expect(error.code).toBe('VALIDATION_FAILED');
      expect(error.status).toBe(400);
      expect(error.isOperational).toBe(true);
      expect(error.metadata).toEqual({ field: 'email' });
    });

    it('should create AuthenticationError with correct properties', () => {
      const error = new AuthenticationError('Invalid credentials');
      
      expect(error.name).toBe('AuthenticationError');
      expect(error.type).toBe('AUTHENTICATION_ERROR');
      expect(error.code).toBe('AUTH_FAILED');
      expect(error.status).toBe(401);
    });

    it('should create AuthorizationError with correct properties', () => {
      const error = new AuthorizationError('Access denied', { resource: 'admin' });
      
      expect(error.type).toBe('AUTHORIZATION_ERROR');
      expect(error.code).toBe('FORBIDDEN');
      expect(error.status).toBe(403);
    });

    it('should create NotFoundError with correct properties', () => {
      const error = new NotFoundError('User', { userId: '123' });
      
      expect(error.message).toBe('User not found');
      expect(error.type).toBe('NOT_FOUND_ERROR');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.status).toBe(404);
    });

    it('should create DatabaseError with cause', () => {
      const cause = new Error('Connection refused');
      const error = new DatabaseError('Query failed', { query: 'SELECT *' }, cause);
      
      expect(error.type).toBe('DATABASE_ERROR');
      expect(error.cause).toBe(cause);
    });

    it('should create ApiError with correct properties', () => {
      const error = new ApiError('External API down');
      
      expect(error.type).toBe('API_ERROR');
      expect(error.code).toBe('API_ERROR');
      expect(error.status).toBe(502);
    });

    it('should create TimeoutError with correct properties', () => {
      const error = new TimeoutError('Request timed out');
      
      expect(error.type).toBe('TIMEOUT_ERROR');
      expect(error.code).toBe('TIMEOUT');
      expect(error.status).toBe(504);
    });

    it('should create RateLimitError with correct properties', () => {
      const error = new RateLimitError('Too many requests', { limit: 100 });
      
      expect(error.type).toBe('RATE_LIMIT_ERROR');
      expect(error.code).toBe('RATE_LIMITED');
      expect(error.status).toBe(429);
    });

    it('should create InternalError with correct properties', () => {
      const error = new InternalError('Something went wrong');
      
      expect(error.type).toBe('INTERNAL_ERROR');
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.status).toBe(500);
    });

    it('should create ServiceUnavailableError with correct properties', () => {
      const error = new ServiceUnavailableError('Service maintenance');
      
      expect(error.type).toBe('SERVICE_UNAVAILABLE');
      expect(error.code).toBe('SERVICE_UNAVAILABLE');
      expect(error.status).toBe(503);
    });
  });

  describe('Error Handler Middleware', () => {
    it('should handle ApplicationError correctly', async () => {
      const app = new Hono();
      app.use('*', errorHandler());
      
      app.get('/error', () => {
        throw new ValidationError('Test validation error');
      });

      const res = await app.request('http://localhost/error');
      const data = await res.json() as any;

      expect(res.status).toBe(400);
      expect(data.status).toBe('error');
      expect(data.code).toBe('VALIDATION_FAILED');
      expect(data.message).toBe('Test validation error');
      expect(data.type).toBe('VALIDATION_ERROR');
    });

    it('should handle AuthenticationError correctly', async () => {
      const app = new Hono();
      app.use('*', errorHandler());
      
      app.get('/auth-error', () => {
        throw new AuthenticationError('Invalid token');
      });

      const res = await app.request('http://localhost/auth-error');
      const data = await res.json() as any;

      expect(res.status).toBe(401);
      expect(data.code).toBe('AUTH_FAILED');
    });

    it('should handle unknown errors gracefully', async () => {
      const app = new Hono();
      app.use('*', errorHandler());
      
      app.get('/unknown-error', () => {
        throw new Error('Unexpected error');
      });

      const res = await app.request('http://localhost/unknown-error');
      const data = await res.json() as any;

      expect(res.status).toBe(500);
      expect(data.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('Retry Mechanism', () => {
    it('should succeed without retry on first success', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        return 'success';
      };

      const result = await withRetry(fn, {}, 'test');
      
      expect(result).toBe('success');
      expect(callCount).toBe(1);
    });

    it('should retry on failure and succeed', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        if (callCount < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      };

      const result = await withRetry(fn, { maxRetries: 3, initialDelayMs: 10 }, 'test');
      
      expect(result).toBe('success');
      expect(callCount).toBe(3);
    });

    it('should fail after max retries exceeded', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        throw new Error('Permanent failure');
      };

      await expect(withRetry(fn, { maxRetries: 2, initialDelayMs: 10 }, 'test'))
        .rejects.toThrow('Permanent failure');
      
      expect(callCount).toBe(3); // Initial + 2 retries
    });

    it('should only retry retryable errors', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        throw new Error('Non-retryable error');
      };

      await expect(withRetry(fn, { maxRetries: 3 }, 'test'))
        .rejects.toThrow('Non-retryable error');
      
      expect(callCount).toBe(1); // No retries
    });

    it('should use exponential backoff', async () => {
      let callCount = 0;
      const delays: number[] = [];
      let lastTime = Date.now();
      
      const fn = async () => {
        const now = Date.now();
        if (callCount > 0) {
          delays.push(now - lastTime);
        }
        lastTime = now;
        callCount++;
        throw new Error('ETIMEDOUT');
      };

      await expect(withRetry(fn, { 
        maxRetries: 2, 
        initialDelayMs: 100,
        backoffMultiplier: 2,
      }, 'test')).rejects.toThrow();
      
      expect(delays.length).toBe(2);
      expect(delays[1]).toBeGreaterThan(delays[0]); // Exponential increase
    });
  });

  describe('Circuit Breaker', () => {
    it('should start in CLOSED state', () => {
      const state = getCircuitBreakerState('test-breaker');
      expect(state?.state).toBe('CLOSED');
    });

    it('should remain CLOSED on success', async () => {
      const fn = async () => 'success';
      
      await withCircuitBreaker(fn, 'test-breaker');
      
      const state = getCircuitBreakerState('test-breaker');
      expect(state?.state).toBe('CLOSED');
    });

    it('should OPEN after threshold failures', async () => {
      const fn = async () => {
        throw new Error('Service down');
      };

      for (let i = 0; i < 5; i++) {
        await withCircuitBreaker(fn, 'test-breaker').catch(() => {});
      }

      const state = getCircuitBreakerState('test-breaker');
      expect(state?.state).toBe('OPEN');
    });

    it('should reject requests when OPEN', async () => {
      // Open the circuit
      const failingFn = async () => { throw new Error('Down'); };
      for (let i = 0; i < 5; i++) {
        await withCircuitBreaker(failingFn, 'test-breaker').catch(() => {});
      }

      // Try to call when OPEN
      const successFn = async () => 'success';
      await expect(withCircuitBreaker(successFn, 'test-breaker'))
        .rejects.toThrow('Service temporarily unavailable');
    });

    it('should transition to HALF_OPEN after timeout', async () => {
      const fn = async () => { throw new Error('Down'); };
      
      // Open circuit
      for (let i = 0; i < 5; i++) {
        await withCircuitBreaker(fn, 'test-breaker').catch(() => {});
      }

      // Wait for timeout (use short timeout for testing)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Manually set next attempt time to past
      const state = getCircuitBreakerState('test-breaker');
      if (state) {
        state.nextAttemptTime = Date.now() - 1000;
      }

      // Should allow request in HALF_OPEN
      const successFn = async () => 'success';
      await expect(withCircuitBreaker(successFn, 'test-breaker', { timeoutMs: 50 }))
        .resolves.toBe('success');
    });

    it('should CLOSE after successful requests in HALF_OPEN', async () => {
      resetCircuitBreaker('test-breaker');
      
      const fn = async () => { throw new Error('Down'); };
      
      // Open circuit
      for (let i = 0; i < 5; i++) {
        await withCircuitBreaker(fn, 'test-breaker').catch(() => {});
      }

      // Transition to HALF_OPEN
      const state = getCircuitBreakerState('test-breaker');
      if (state) {
        state.state = 'HALF_OPEN';
        state.nextAttemptTime = Date.now() - 1000;
      }

      // Successful requests
      const successFn = async () => 'success';
      for (let i = 0; i < 3; i++) {
        await withCircuitBreaker(successFn, 'test-breaker', { successThreshold: 3 });
      }

      const finalState = getCircuitBreakerState('test-breaker');
      expect(finalState?.state).toBe('CLOSED');
    });
  });

  describe('Timeout Wrapper', () => {
    it('should complete within timeout', async () => {
      const fn = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'done';
      };

      const result = await withTimeout(fn, 100, 'test');
      expect(result).toBe('done');
    });

    it('should timeout on slow operation', async () => {
      const fn = async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return 'done';
      };

      await expect(withTimeout(fn, 50, 'test'))
        .rejects.toThrow('timed out');
    });
  });

  describe('Safe Execute', () => {
    it('should return success on successful execution', async () => {
      const fn = async () => 'result';
      
      const result = await safeExecute(fn);
      
      expect(result.success).toBe(true);
      expect((result as any).data).toBe('result');
    });

    it('should return error on failure', async () => {
      const fn = async () => {
        throw new Error('Failed');
      };

      const result = await safeExecute(fn);
      
      expect(result.success).toBe(false);
      expect((result as any).error).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle nested errors', async () => {
      try {
        try {
          throw new ValidationError('Inner error');
        } catch (inner) {
          throw new DatabaseError('Outer error', {}, inner as Error);
        }
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseError);
        expect((error as DatabaseError).cause).toBeInstanceOf(ValidationError);
      }
    });

    it('should preserve error stack traces', () => {
      const error = new InternalError('Test error');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('errorHandler.test.ts');
    });
  });

  describe('Performance', () => {
    it('should have minimal overhead for successful operations', async () => {
      const iterations = 1000;
      const fn = async () => 'fast';
      
      const start = Date.now();
      for (let i = 0; i < iterations; i++) {
        await withRetry(fn, {}, 'perf-test');
      }
      const duration = Date.now() - start;
      
      expect(duration / iterations).toBeLessThan(5); // < 5ms per operation
    });

    it('should fail fast when circuit is OPEN', async () => {
      // Open circuit
      const failingFn = async () => { throw new Error('Down'); };
      for (let i = 0; i < 5; i++) {
        await withCircuitBreaker(failingFn, 'perf-breaker').catch(() => {});
      }

      const start = Date.now();
      await expect(withCircuitBreaker(async () => 'test', 'perf-breaker'))
        .rejects.toThrow();
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(10); // Instant rejection
    });
  });
});
