/**
 * utils/errorHandler.ts
 * Standardized error handling with retry mechanisms and circuit breaker pattern
 */

import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { logger } from './logger.js';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type ErrorType = 
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'NOT_FOUND_ERROR'
  | 'DATABASE_ERROR'
  | 'API_ERROR'
  | 'TIMEOUT_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE';

export interface AppError extends Error {
  type: ErrorType;
  code: string;
  status: number;
  isOperational: boolean;
  metadata?: Record<string, any>;
  cause?: Error;
}

export interface RetryConfig {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableStatusCodes?: number[];
  retryableErrors?: string[];
}

export interface CircuitBreakerConfig {
  failureThreshold?: number;
  successThreshold?: number;
  timeoutMs?: number;
  halfOpenMaxRequests?: number;
}

export interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failures: number;
  successes: number;
  lastFailureTime?: number;
  nextAttemptTime?: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  retryableErrors: ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED'],
};

const DEFAULT_CIRCUIT_BREAKER_CONFIG: Required<CircuitBreakerConfig> = {
  failureThreshold: 5,
  successThreshold: 3,
  timeoutMs: 60000,
  halfOpenMaxRequests: 3,
};

// Circuit breaker state storage
const circuitBreakerStates = new Map<string, CircuitBreakerState>();

// ─── Error Classes ──────────────────────────────────────────────────────────────

/**
 * Base application error
 */
export class ApplicationError extends Error implements AppError {
  type: ErrorType;
  code: string;
  status: number;
  isOperational: boolean;
  metadata?: Record<string, any>;
  cause?: Error;

  constructor(
    message: string,
    type: ErrorType,
    code: string,
    status: number,
    metadata?: Record<string, any>,
    cause?: Error
  ) {
    super(message);
    this.name = 'ApplicationError';
    this.type = type;
    this.code = code;
    this.status = status;
    this.isOperational = true;
    this.metadata = metadata;
    this.cause = cause;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends ApplicationError {
  constructor(message: string, metadata?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 'VALIDATION_FAILED', 400, metadata);
    this.name = 'ValidationError';
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends ApplicationError {
  constructor(message: string, metadata?: Record<string, any>) {
    super(message, 'AUTHENTICATION_ERROR', 'AUTH_FAILED', 401, metadata);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error (403)
 */
export class AuthorizationError extends ApplicationError {
  constructor(message: string, metadata?: Record<string, any>) {
    super(message, 'AUTHORIZATION_ERROR', 'FORBIDDEN', 403, metadata);
    this.name = 'AuthorizationError';
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends ApplicationError {
  constructor(resource: string, metadata?: Record<string, any>) {
    super(`${resource} not found`, 'NOT_FOUND_ERROR', 'NOT_FOUND', 404, metadata);
    this.name = 'NotFoundError';
  }
}

/**
 * Database error (500)
 */
export class DatabaseError extends ApplicationError {
  constructor(message: string, metadata?: Record<string, any>, cause?: Error) {
    super(message, 'DATABASE_ERROR', 'DB_ERROR', 500, metadata, cause);
    this.name = 'DatabaseError';
  }
}

/**
 * API error (502)
 */
export class ApiError extends ApplicationError {
  constructor(message: string, metadata?: Record<string, any>, cause?: Error) {
    super(message, 'API_ERROR', 'API_ERROR', 502, metadata, cause);
    this.name = 'ApiError';
  }
}

/**
 * Timeout error (504)
 */
export class TimeoutError extends ApplicationError {
  constructor(message: string, metadata?: Record<string, any>) {
    super(message, 'TIMEOUT_ERROR', 'TIMEOUT', 504, metadata);
    this.name = 'TimeoutError';
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends ApplicationError {
  constructor(message: string, metadata?: Record<string, any>) {
    super(message, 'RATE_LIMIT_ERROR', 'RATE_LIMITED', 429, metadata);
    this.name = 'RateLimitError';
  }
}

/**
 * Internal server error (500)
 */
export class InternalError extends ApplicationError {
  constructor(message: string, metadata?: Record<string, any>, cause?: Error) {
    super(message, 'INTERNAL_ERROR', 'INTERNAL_ERROR', 500, metadata, cause);
    this.name = 'InternalError';
  }
}

/**
 * Service unavailable error (503)
 */
export class ServiceUnavailableError extends ApplicationError {
  constructor(message: string, metadata?: Record<string, any>) {
    super(message, 'SERVICE_UNAVAILABLE', 'SERVICE_UNAVAILABLE', 503, metadata);
    this.name = 'ServiceUnavailableError';
  }
}

// ─── Error Handler Middleware ───────────────────────────────────────────────────

/**
 * Global error handler middleware for Hono
 */
export function errorHandler() {
  return async (c: Context, next: Next) => {
    try {
      await next();
    } catch (error) {
      // Handle known application errors
      if (error instanceof ApplicationError) {
        logger.warn('Application error occurred', {
          module: 'error-handler',
          action: 'handle_error',
          errorType: error.type,
          errorCode: error.code,
          status: error.status,
          message: error.message,
          metadata: error.metadata,
        });

        return c.json(
          {
            status: 'error',
            code: error.code,
            message: error.message,
            type: error.type,
            metadata: error.metadata,
          },
          error.status as any
        );
      }

      // Handle HTTP exceptions from Hono
      if (error instanceof HTTPException) {
        logger.warn('HTTP exception occurred', {
          module: 'error-handler',
          action: 'handle_http_exception',
          status: error.status,
          message: error.message,
        });

        return c.json(
          {
            status: 'error',
            code: `HTTP_${error.status}`,
            message: error.message,
          },
          error.status
        );
      }

      // Handle unknown errors (log full stack trace)
      logger.error('Unknown error occurred', {
        module: 'error-handler',
        action: 'handle_unknown_error',
        error: {
          message: (error as Error).message,
          stack: (error as Error).stack,
          name: (error as Error).name,
        },
      });

      // Return generic 500 error in production
      const isProduction = process.env.NODE_ENV === 'production';
      
      return c.json(
        {
          status: 'error',
          code: 'INTERNAL_ERROR',
          message: isProduction ? 'Internal server error' : (error as Error).message,
          type: 'INTERNAL_ERROR',
        },
        500
      );
    }
  };
}

// ─── Retry Mechanism ────────────────────────────────────────────────────────────

/**
 * Execute function with exponential backoff retry
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {},
  context: string = 'operation'
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      const result = await fn();
      
      if (attempt > 0) {
        logger.info(`Retry succeeded after ${attempt} attempts`, {
          module: 'retry',
          action: 'success',
          context,
          attempts: attempt,
        });
      }
      
      return result;
    } catch (error) {
      lastError = error as Error;
      
      const isErrorRetryable = isRetryableError(lastError, finalConfig);
      
      if (!isErrorRetryable || attempt === finalConfig.maxRetries) {
        logger.error(`${context} failed after ${attempt} attempts`, {
          module: 'retry',
          action: 'failed',
          context,
          attempts: attempt,
          error: {
            message: lastError.message,
            name: lastError.name,
          },
        });
        
        throw lastError;
      }
      
      // Calculate delay with exponential backoff
      const delay = calculateBackoffDelay(
        attempt,
        finalConfig.initialDelayMs,
        finalConfig.maxDelayMs,
        finalConfig.backoffMultiplier
      );
      
      logger.warn(`${context} failed, retrying in ${delay}ms (attempt ${attempt + 1}/${finalConfig.maxRetries})`, {
        module: 'retry',
        action: 'retrying',
        context,
        attempt: attempt + 1,
        maxRetries: finalConfig.maxRetries,
        delay,
        error: lastError.message,
      });
      
      await sleep(delay);
    }
  }
  
  throw lastError!;
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: Error, config: Required<RetryConfig>): boolean {
  // Check error codes
  if (config.retryableErrors.some(code => error.message.includes(code))) {
    return true;
  }
  
  // Check if it's an HTTP error with retryable status
  if (error instanceof HTTPException) {
    return config.retryableStatusCodes.includes(error.status);
  }
  
  // Check if it's an ApplicationError with retryable status
  if (error instanceof ApplicationError) {
    return config.retryableStatusCodes.includes(error.status);
  }
  
  return false;
}

/**
 * Calculate exponential backoff delay with jitter
 */
function calculateBackoffDelay(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number,
  multiplier: number
): number {
  const exponentialDelay = initialDelayMs * Math.pow(multiplier, attempt - 1);
  const jitter = Math.random() * 0.2 * exponentialDelay; // 20% jitter
  return Math.min(exponentialDelay + jitter, maxDelayMs);
}

// ─── Circuit Breaker Pattern ────────────────────────────────────────────────────

/**
 * Execute function with circuit breaker protection
 */
export async function withCircuitBreaker<T>(
  fn: () => Promise<T>,
  breakerId: string,
  config: CircuitBreakerConfig = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };
  
  // Get or create circuit breaker state
  let state = circuitBreakerStates.get(breakerId);
  if (!state) {
    state = {
      state: 'CLOSED',
      failures: 0,
      successes: 0,
    };
    circuitBreakerStates.set(breakerId, state);
  }
  
  // Check if circuit should transition from OPEN to HALF_OPEN
  if (state.state === 'OPEN') {
    if (state.nextAttemptTime && Date.now() >= state.nextAttemptTime) {
      state.state = 'HALF_OPEN';
      state.successes = 0;
      logger.warn(`Circuit breaker ${breakerId} transitioning to HALF_OPEN`, {
        module: 'circuit-breaker',
        action: 'state_change',
        breakerId,
        newState: 'HALF_OPEN',
      });
    } else {
      throw new ServiceUnavailableError(
        `Service temporarily unavailable (circuit breaker OPEN)`,
        {
          breakerId,
          retryAfter: state.nextAttemptTime,
        }
      );
    }
  }
  
  try {
    const result = await fn();
    
    // Success - update state
    handleCircuitSuccess(state, finalConfig);
    
    return result;
  } catch (error) {
    // Failure - update state
    handleCircuitFailure(state, finalConfig, breakerId);
    throw error;
  }
}

/**
 * Handle circuit breaker success
 */
function handleCircuitSuccess(
  state: CircuitBreakerState,
  config: Required<CircuitBreakerConfig>
): void {
  state.failures = 0;
  state.successes++;
  
  if (state.state === 'HALF_OPEN' && state.successes >= config.successThreshold) {
    state.state = 'CLOSED';
    logger.info('Circuit breaker CLOSED after successful requests', {
      module: 'circuit-breaker',
      action: 'state_change',
      newState: 'CLOSED',
    });
  }
}

/**
 * Handle circuit breaker failure
 */
function handleCircuitFailure(
  state: CircuitBreakerState,
  config: Required<CircuitBreakerConfig>,
  breakerId: string
): void {
  state.failures++;
  state.lastFailureTime = Date.now();
  
  if (state.state === 'HALF_OPEN') {
    state.state = 'OPEN';
    state.nextAttemptTime = Date.now() + config.timeoutMs;
    logger.error(`Circuit breaker ${breakerId} OPEN due to failure in HALF_OPEN`, {
      module: 'circuit-breaker',
      action: 'state_change',
      breakerId,
      newState: 'OPEN',
    });
  } else if (state.failures >= config.failureThreshold) {
    state.state = 'OPEN';
    state.nextAttemptTime = Date.now() + config.timeoutMs;
    logger.error(`Circuit breaker ${breakerId} OPEN due to threshold exceeded`, {
      module: 'circuit-breaker',
      action: 'state_change',
      breakerId,
      newState: 'OPEN',
      failures: state.failures,
    });
  }
}

/**
 * Reset circuit breaker state
 */
export function resetCircuitBreaker(breakerId: string): void {
  circuitBreakerStates.delete(breakerId);
  logger.info(`Circuit breaker ${breakerId} reset`, {
    module: 'circuit-breaker',
    action: 'reset',
    breakerId,
  });
}

/**
 * Get circuit breaker state
 */
export function getCircuitBreakerState(breakerId: string): CircuitBreakerState | null {
  return circuitBreakerStates.get(breakerId) || null;
}

// ─── Utility Functions ──────────────────────────────────────────────────────────

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wrap async operation with timeout
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  context: string = 'operation'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new TimeoutError(`${context} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  
  return Promise.race([fn(), timeoutPromise]);
}

/**
 * Safe execution wrapper (returns Result type)
 */
export async function safeExecute<T>(
  fn: () => Promise<T>
): Promise<{ success: true; data: T } | { success: false; error: Error }> {
  try {
    const result = await fn();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
