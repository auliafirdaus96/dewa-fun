/**
 * tests/database.test.ts
 * Test database service, retry logic, and transaction handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  executeWithRetry,
  executeTransaction,
  sanitizeData,
  validateRequiredFields,
} from '../src/utils/databaseService.js';
import { DatabaseOperationError, ValidationError, DatabaseError } from '../src/utils/errors.js';

// Mock Supabase client
const createMockSupabase = () => {
  const mockClient = {
    from: vi.fn((table: string) => ({
      insert: vi.fn(async (data: any) => {
        if (table === 'agent_nodes' && data.node_id === 'fail-insert') {
          return { error: { message: 'Insert failed' } };
        }
        if (table === 'node_tokens' && data.node_id?.includes('fail-second')) {
          return { error: { message: 'Second insert failed' } };
        }
        return { error: null };
      }),
      delete: vi.fn(() => ({
        eq: vi.fn(async () => ({ error: null })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(async () => ({
          single: vi.fn(async () => ({ data: null, error: null })),
        })),
      })),
    })),
  };
  return mockClient as any;
};

describe('Database Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn(async () => 'success');
      
      const result = await executeWithRetry(operation, { maxRetries: 3 });
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      let attempts = 0;
      const operation = vi.fn(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success after retries';
      });

      const result = await executeWithRetry(operation, { 
        maxRetries: 3, 
        initialDelay: 10 // Fast retry for testing
      });

      expect(result).toBe('success after retries');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should fail after all retries exhausted', async () => {
      const operation = vi.fn(async () => {
        throw new Error('Permanent failure');
      });

      await expect(
        executeWithRetry(operation, { maxRetries: 2, initialDelay: 10 })
      ).rejects.toThrow(DatabaseOperationError);

      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should not retry on non-retryable errors', async () => {
      const operation = vi.fn(async () => {
        const error = new Error('Duplicate key violation');
        (error as any).code = '23505'; // unique_violation
        throw error;
      });

      await expect(
        executeWithRetry(operation, { maxRetries: 3 })
      ).rejects.toThrow(DatabaseOperationError);

      expect(operation).toHaveBeenCalledTimes(1); // No retries
    });

    it('should handle exponential backoff', async () => {
      const sleepSpy = vi.spyOn(global, 'setTimeout').mockImplementation((cb) => {
        cb();
        return {} as any;
      });

      const operation = vi.fn(async () => {
        throw new Error('Retryable error');
      });

      try {
        await executeWithRetry(operation, { 
          maxRetries: 2, 
          initialDelay: 100,
          factor: 2
        });
      } catch (e) {
        // Expected to fail
      }

      // Should have delays: ~100ms, ~200ms
      expect(sleepSpy).toHaveBeenCalledTimes(2);
      sleepSpy.mockRestore();
    });
  });

  describe('executeTransaction', () => {
    it('should execute all steps successfully', async () => {
      const supabase = createMockSupabase();
      const steps = [
        {
          name: 'step1',
          execute: vi.fn(async () => ({ id: 1 })),
        },
        {
          name: 'step2',
          execute: vi.fn(async () => ({ id: 2 })),
        },
      ];

      const results = await executeTransaction(supabase, steps);

      expect(results).toHaveLength(2);
      expect(steps[0].execute).toHaveBeenCalled();
      expect(steps[1].execute).toHaveBeenCalled();
    });

    it('should rollback on step failure', async () => {
      const supabase = createMockSupabase();
      const rollbackSpy = vi.fn();
      
      const steps = [
        {
          name: 'insert_agent_node',
          execute: vi.fn(async () => ({ success: true })),
          rollback: rollbackSpy,
        },
        {
          name: 'insert_node_tokens',
          execute: vi.fn(async () => {
            throw new Error('Second insert failed');
          }),
        },
      ];

      await expect(
        executeTransaction(supabase, steps)
      ).rejects.toThrow();

      // Rollback should be called for the first step
      expect(rollbackSpy).toHaveBeenCalled();
    });

    it('should continue even if rollback fails', async () => {
      const supabase = createMockSupabase();
      const rollbackSpy = vi.fn().mockRejectedValue(new Error('Rollback failed'));
      
      const steps = [
        {
          name: 'step1',
          execute: vi.fn(async () => ({ success: true })),
          rollback: rollbackSpy,
        },
        {
          name: 'step2',
          execute: vi.fn(async () => {
            throw new Error('Step 2 failed');
          }),
        },
      ];

      await expect(
        executeTransaction(supabase, steps)
      ).rejects.toThrow('Transaction failed and 1 rollback(s) also failed');
    });

    it('should handle multiple rollbacks in reverse order', async () => {
      const supabase = createMockSupabase();
      const rollbackCalls: string[] = [];
      
      const steps = [
        {
          name: 'step1',
          execute: vi.fn(async () => ({ id: 1 })),
          rollback: vi.fn(async (): Promise<void> => {
            rollbackCalls.push('step1');
          }),
        },
        {
          name: 'step2',
          execute: vi.fn(async () => ({ id: 2 })),
          rollback: vi.fn(async (): Promise<void> => {
            rollbackCalls.push('step2');
          }),
        },
        {
          name: 'step3',
          execute: vi.fn(async () => {
            throw new Error('Step 3 failed');
          }),
        },
      ];

      await expect(
        executeTransaction(supabase, steps)
      ).rejects.toThrow();

      // Rollbacks should happen in reverse order: step2, then step1
      expect(rollbackCalls).toEqual(['step2', 'step1']);
    });
  });

  describe('sanitizeData', () => {
    it('should remove undefined values', () => {
      const input = { a: 1, b: undefined, c: 'test' };
      const result = sanitizeData(input);

      expect(result).toEqual({ a: 1, c: 'test' });
      expect(result).not.toHaveProperty('b');
    });

    it('should trim string values', () => {
      const input = { name: '  test  ', ticker: 'ABC   ', value: 123 };
      const result = sanitizeData(input);

      expect(result).toEqual({ name: 'test', ticker: 'ABC', value: 123 });
    });

    it('should preserve null values', () => {
      const input = { a: null, b: 'test' };
      const result = sanitizeData(input);

      expect(result).toEqual({ a: null, b: 'test' });
    });

    it('should handle empty object', () => {
      const input = {};
      const result = sanitizeData(input);

      expect(result).toEqual({});
    });
  });

  describe('validateRequiredFields', () => {
    it('should pass when all required fields present', () => {
      const data = { name: 'Test', ticker: 'TST', value: 100 };
      
      expect(() => {
        validateRequiredFields(data, ['name', 'ticker'], 'test_table');
      }).not.toThrow();
    });

    it('should throw when required field is missing', () => {
      const data = { name: 'Test', ticker: undefined as any, value: 100 };
      
      expect(() => {
        validateRequiredFields(data, ['name', 'ticker'], 'test_table');
      }).toThrow(DatabaseError);
    });

    it('should throw when required field is empty string', () => {
      const data = { name: '', ticker: 'TST', value: 100 };
      
      expect(() => {
        validateRequiredFields(data, ['name', 'ticker'], 'test_table');
      }).toThrow(DatabaseError);
    });

    it('should throw when required field is null', () => {
      const data = { name: null, ticker: 'TST', value: 100 };
      
      expect(() => {
        validateRequiredFields(data, ['name', 'ticker'], 'test_table');
      }).toThrow(DatabaseError);
    });

    it('should list all missing fields in error message', () => {
      const data = { name: 'Test', ticker: undefined as any, description: undefined as any };
      
      try {
        validateRequiredFields(data, ['name', 'ticker', 'description'], 'test_table');
      } catch (error: any) {
        expect(error.message).toContain('ticker');
        expect(error.message).toContain('description');
      }
    });
  });
});
