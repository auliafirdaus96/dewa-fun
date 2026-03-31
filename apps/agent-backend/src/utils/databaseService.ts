/**
 * src/utils/databaseService.ts
 * Database service with retry logic, transaction support, and proper error handling
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { DatabaseError, DatabaseOperationError, RecordNotFoundError } from './errors.js';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  factor?: number;
}

export interface TransactionStep<T = any> {
  name: string;
  execute: (client: SupabaseClient) => Promise<T>;
  rollback?: (result: T, client: SupabaseClient) => Promise<void>;
}

// ─── Retry Logic with Exponential Backoff ───────────────────────────────────────

/**
 * Executes a database operation with retry logic using exponential backoff
 * 
 * @param operation - The async database operation to execute
 * @param options - Retry configuration options
 * @returns The result of the operation
 * @throws DatabaseOperationError after all retries exhausted
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000, // 1 second
    maxDelay = 10000,    // 10 seconds
    factor = 2,          // Exponential factor
  } = options;

  let lastError: Error | null = null;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      attempt++;
      console.log(`[Database] Attempt ${attempt}/${maxRetries + 1}`);
      
      const result = await operation();
      
      if (attempt > 1) {
        console.log(`[Database] Operation succeeded after ${attempt} attempts`);
      }
      
      return result;
      
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on certain errors
      if (isNonRetryableError(error)) {
        console.error(`[Database] Non-retryable error: ${error.message}`);
        throw new DatabaseOperationError(
          error.message,
          'database_operation',
          error
        );
      }

      if (attempt <= maxRetries) {
        // Calculate delay with exponential backoff + jitter
        const delay = Math.min(initialDelay * Math.pow(factor, attempt - 1), maxDelay);
        const jitter = Math.random() * 0.3 * delay; // Add 0-30% jitter
        const totalDelay = delay + jitter;

        console.warn(
          `[Database] Attempt ${attempt} failed. Retrying in ${Math.round(totalDelay)}ms...`,
          error.message
        );

        await sleep(totalDelay);
      }
    }
  }

  // All retries exhausted
  throw new DatabaseOperationError(
    `Operation failed after ${maxRetries + 1} attempts: ${lastError?.message}`,
    'database_operation',
    lastError || undefined
  );
}

/**
 * Determines if an error is non-retryable
 */
function isNonRetryableError(error: any): boolean {
  // Check for specific error codes or types that shouldn't be retried
  const nonRetryableCodes = [
    '23505', // unique_violation
    '23503', // foreign_key_violation
    '42P01', // undefined_table
    'PGRST301', // Not found
  ];

  if (error.code && nonRetryableCodes.includes(error.code)) {
    return true;
  }

  // Validation errors, constraint violations
  if (error.message?.includes('violates') || 
      error.message?.includes('duplicate') ||
      error.message?.includes('not found')) {
    return true;
  }

  return false;
}

// ─── Transaction Pattern ────────────────────────────────────────────────────────

/**
 * Executes multiple database operations as a transaction with rollback support
 * 
 * @param supabase - Supabase client instance
 * @param steps - Array of transaction steps with execute and optional rollback
 * @returns Array of results from each step
 * @throws DatabaseError with rollback information if any step fails
 */
export async function executeTransaction<T>(
  supabase: SupabaseClient,
  steps: TransactionStep<T>[]
): Promise<T[]> {
  const results: T[] = [];
  const executedSteps: { name: string; result: T }[] = [];

  try {
    for (const step of steps) {
      console.log(`[Transaction] Executing step: ${step.name}`);
      
      const result = await step.execute(supabase);
      results.push(result);
      executedSteps.push({ name: step.name, result });
      
      console.log(`[Transaction] Step completed: ${step.name}`);
    }

    console.log(`[Transaction] All ${steps.length} steps completed successfully`);
    return results;

  } catch (error: any) {
    console.error(`[Transaction] Transaction failed at step: ${executedSteps[executedSteps.length - 1]?.name || 'unknown'}`);
    console.error(`[Transaction] Error: ${error.message}`);

    // Execute rollbacks in reverse order
    if (executedSteps.length > 0) {
      console.log(`[Transaction] Initiating rollback for ${executedSteps.length} steps...`);
      
      const rollbackErrors: Error[] = [];

      for (let i = executedSteps.length - 1; i >= 0; i--) {
        const { name, result } = executedSteps[i];
        const step = steps[i];

        if (step.rollback) {
          try {
            console.log(`[Transaction] Rolling back step: ${name}`);
            await step.rollback(result, supabase);
            console.log(`[Transaction] Rollback successful for: ${name}`);
          } catch (rollbackError: any) {
            console.error(`[Transaction] Rollback failed for ${name}: ${rollbackError.message}`);
            rollbackErrors.push(rollbackError);
          }
        } else {
          console.warn(`[Transaction] No rollback defined for step: ${name}`);
        }
      }

      if (rollbackErrors.length > 0) {
        console.error(`[Transaction] ${rollbackErrors.length} rollback(s) failed!`);
        throw new DatabaseError(
          `Transaction failed and ${rollbackErrors.length} rollback(s) also failed. Original error: ${error.message}`,
          error
        );
      }
    }

    throw new DatabaseError(
      `Transaction failed: ${error.message}`,
      error
    );
  }
}

// ─── Helper Functions ───────────────────────────────────────────────────────────

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Validates that required fields exist in data
 */
export function validateRequiredFields<T extends Record<string, any>>(
  data: T,
  fields: (keyof T)[],
  tableName: string
): void {
  const missingFields = fields.filter(field => {
    const value = data[field];
    return value === undefined || value === null || value === '';
  });

  if (missingFields.length > 0) {
    throw new DatabaseError(
      `Missing required fields for ${tableName}: ${missingFields.join(', ')}`
    );
  }
}

/**
 * Sanitizes data before database insertion
 */
export function sanitizeData<T extends Record<string, any>>(data: T): T {
  const result: any = { ...data };

  // Remove undefined values and trim strings
  for (const key in result) {
    if (result[key] === undefined) {
      delete result[key];
    } else if (typeof result[key] === 'string') {
      result[key] = result[key].trim();
    }
  }

  return result as T;
}

// ─── Database Health Check ──────────────────────────────────────────────────────

/**
 * Checks database connection health
 */
export async function checkDatabaseHealth(supabase: SupabaseClient): Promise<{
  healthy: boolean;
  latency?: number;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    // Simple query to test connection
    const { error } = await supabase.from('agent_nodes').select('count', { count: 'exact', head: true });

    const latency = Date.now() - startTime;

    if (error) {
      return {
        healthy: false,
        latency,
        error: error.message,
      };
    }

    return {
      healthy: true,
      latency,
    };

  } catch (err: any) {
    return {
      healthy: false,
      error: err.message,
    };
  }
}
