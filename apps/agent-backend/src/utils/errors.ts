/**
 * src/utils/errors.ts
 * Custom error hierarchy for standardized error handling across all agents
 */

// ─── Base Error Class ───────────────────────────────────────────────────────────

export abstract class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    
    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      status: 'error',
      message: this.message,
      code: this.code,
      ...(process.env.NODE_ENV === 'development' && { stack: this.stack }),
    };
  }
}

// ─── Authentication Errors (4xx) ────────────────────────────────────────────────

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class InvalidSignatureError extends AppError {
  constructor(message: string = 'Invalid cryptographic signature') {
    super(message, 401, 'INVALID_SIGNATURE');
  }
}

export class TokenExpiredError extends AppError {
  constructor(message: string = 'Token has expired') {
    super(message, 401, 'TOKEN_EXPIRED');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 403, 'UNAUTHORIZED');
  }
}

// ─── Validation Errors (4xx) ────────────────────────────────────────────────────

export class ValidationError extends AppError {
  public readonly details?: any;

  constructor(message: string = 'Validation failed', details?: any) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      details: this.details,
    };
  }
}

export class InputSanitizationError extends AppError {
  constructor(message: string = 'Potentially malicious input detected') {
    super(message, 400, 'INPUT_SANITIZATION_FAILED');
  }
}

// ─── Database Errors (5xx) ──────────────────────────────────────────────────────

export class DatabaseError extends AppError {
  public readonly originalError?: Error;

  constructor(message: string, originalError?: Error) {
    super(message, 500, 'DATABASE_ERROR', false);
    this.originalError = originalError;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      originalError: process.env.NODE_ENV === 'development' 
        ? this.originalError?.message 
        : undefined,
    };
  }
}

export class DatabaseOperationError extends DatabaseError {
  public readonly operation: string;

  constructor(message: string, operation: string, originalError?: Error) {
    super(`${operation} failed: ${message}`, originalError);
    this.operation = operation;
    this.code = 'DATABASE_OPERATION_FAILED';
  }
}

export class RecordNotFoundError extends AppError {
  public readonly resourceType: string;
  public readonly resourceId?: string;

  constructor(
    resourceType: string, 
    resourceId?: string,
    message?: string
  ) {
    super(
      message || `${resourceType}${resourceId ? ` "${resourceId}"` : ''} not found`,
      404,
      'RECORD_NOT_FOUND'
    );
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }
}

// ─── External API Errors (5xx) ──────────────────────────────────────────────────

export class ExternalApiError extends AppError {
  public readonly apiName: string;
  public readonly statusCode?: number;

  constructor(
    message: string,
    apiName: string,
    statusCode?: number,
    isOperational: boolean = true
  ) {
    super(message, 502, 'EXTERNAL_API_ERROR', isOperational);
    this.apiName = apiName;
    this.statusCode = statusCode;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      apiName: this.apiName,
      externalStatusCode: this.statusCode,
    };
  }
}

export class BagsApiError extends ExternalApiError {
  constructor(message: string, statusCode?: number) {
    super(message, 'Bags.fm', statusCode);
    this.code = 'BAGS_API_ERROR';
  }
}

export class MeteoraApiError extends ExternalApiError {
  constructor(message: string, statusCode?: number) {
    super(message, 'Meteora', statusCode);
    this.code = 'METEORA_API_ERROR';
  }
}

export class OracleApiError extends ExternalApiError {
  constructor(message: string, statusCode?: number) {
    super(message, 'Oracle', statusCode);
    this.code = 'ORACLE_API_ERROR';
  }
}

// ─── Transaction Errors (5xx) ───────────────────────────────────────────────────

export class TransactionError extends AppError {
  public readonly transactionSignature?: string;

  constructor(
    message: string,
    transactionSignature?: string,
    isOperational: boolean = true
  ) {
    super(message, 500, 'TRANSACTION_ERROR', isOperational);
    this.transactionSignature = transactionSignature;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      transactionSignature: this.transactionSignature,
    };
  }
}

export class TransactionSimulationError extends TransactionError {
  constructor(message: string, transactionSignature?: string) {
    super(message, transactionSignature);
    this.code = 'TRANSACTION_SIMULATION_FAILED';
  }
}

export class InsufficientBalanceError extends AppError {
  constructor(message: string = 'Insufficient balance for transaction') {
    super(message, 400, 'INSUFFICIENT_BALANCE');
  }
}

export class SlippageError extends AppError {
  constructor(message: string = 'Transaction exceeded slippage tolerance') {
    super(message, 400, 'SLIPPAGE_EXCEEDED');
  }
}

// ─── Rate Limiting Errors (4xx) ─────────────────────────────────────────────────

export class RateLimitError extends AppError {
  public readonly retryAfter?: number;

  constructor(message: string = 'Too many requests', retryAfter?: number) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.retryAfter = retryAfter;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter,
    };
  }
}

// ─── Content Moderation Errors (4xx) ────────────────────────────────────────────

export class ContentModerationError extends AppError {
  public readonly reason: string;

  constructor(message: string, reason: string) {
    super(message, 400, 'CONTENT_MODERATION_FAILED');
    this.reason = reason;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      reason: this.reason,
    };
  }
}

export class ToxicContentError extends ContentModerationError {
  constructor(toxicityScore: number) {
    super(
      'Content contains toxic or harmful language',
      `toxicity_score: ${toxicityScore}`
    );
    this.code = 'TOXIC_CONTENT';
  }
}

export class ScamContentError extends ContentModerationError {
  constructor(detectedPatterns: string[]) {
    super(
      'Content contains potential scam or fraudulent claims',
      `patterns: ${detectedPatterns.join(', ')}`
    );
    this.code = 'SCAM_CONTENT';
  }
}

// ─── Global Error Handler Middleware ────────────────────────────────────────────

import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';

export const errorHandler = (err: Error, c: Context) => {
  console.error(`[ErrorHandler] ${new Date().toISOString()}:`, err);

  // Handle Hono HTTP exceptions
  if (err instanceof HTTPException) {
    return c.json({
      status: 'error',
      message: err.message,
      code: 'HTTP_EXCEPTION',
    }, err.status);
  }

  // Handle our custom AppErrors
  if (err instanceof AppError) {
    return c.json(err.toJSON(), err.statusCode);
  }

  // Handle unknown errors - don't leak internal details in production
  const isDev = process.env.NODE_ENV === 'development';
  
  return c.json({
    status: 'error',
    message: isDev ? err.message : 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
    ...(isDev && { stack: err.stack }),
  }, 500);
};
