/**
 * utils/logger.ts
 * Production-grade structured logging with Winston
 */

import * as winston from 'winston';
const { format, transports } = winston;
import * as path from 'path';
import * as fs from 'fs';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'debug';

export interface LogContext {
  timestamp?: string;
  level?: string;
  message: string;
  service?: string;
  module?: string;
  action?: string;
  userId?: string;
  walletAddress?: string;
  requestId?: string;
  duration?: number;
  metadata?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  [key: string]: any;
}

export interface LoggerConfig {
  level?: LogLevel;
  serviceName?: string;
  enableFileLogging?: boolean;
  logDirectory?: string;
  enableConsoleLogging?: boolean;
  enableJsonFormat?: boolean;
  maxFileSize?: string;
  maxFiles?: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: Required<LoggerConfig> = {
  level: 'info',
  serviceName: 'agent-backend',
  enableFileLogging: true,
  logDirectory: path.join(process.cwd(), 'logs'),
  enableConsoleLogging: true,
  enableJsonFormat: true,
  maxFileSize: '10m',
  maxFiles: 5,
};

// ─── Custom Formats ─────────────────────────────────────────────────────────────

/**
 * Custom format for console output (human-readable)
 */
const consoleFormat = format.printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level.toUpperCase()}] ${message}`;
  
  // Add context if available
  const contextKeys = Object.keys(metadata);
  if (contextKeys.length > 0) {
    const contextStr = contextKeys
      .map(key => `${key}=${JSON.stringify(metadata[key])}`)
      .join(' ');
    msg += ` | ${contextStr}`;
  }
  
  return msg;
});

/**
 * Custom format for JSON logs (machine-readable)
 */
const jsonFormat = format.printf(({ level, message, timestamp, ...metadata }) => {
  const logEntry: any = {
    timestamp,
    level: level.toUpperCase(),
    message,
    ...metadata,
  };
  
  return JSON.stringify(logEntry);
});

// ─── Logger Creation ────────────────────────────────────────────────────────────

/**
 * Create a Winston logger instance
 */
export function createLogger(config: LoggerConfig = {}): winston.Logger {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Ensure log directory exists
  if (finalConfig.enableFileLogging && !fs.existsSync(finalConfig.logDirectory)) {
    fs.mkdirSync(finalConfig.logDirectory, { recursive: true });
  }
  
  // Configure transports
  const transportConfigs: winston.transport[] = [];
  
  // Console transport
  if (finalConfig.enableConsoleLogging) {
    transportConfigs.push(
      new transports.Console({
        format: format.combine(
          format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          format.colorize(),
          consoleFormat
        ),
      })
    );
  }
  
  // File transports
  if (finalConfig.enableFileLogging) {
    // Error log
    transportConfigs.push(
      new transports.File({
        filename: path.join(finalConfig.logDirectory, 'error.log'),
        level: 'error',
        format: format.combine(
          format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          format.errors({ stack: true }),
          jsonFormat
        ),
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: finalConfig.maxFiles,
      })
    );
    
    // Combined log
    transportConfigs.push(
      new transports.File({
        filename: path.join(finalConfig.logDirectory, 'combined.log'),
        format: format.combine(
          format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          format.errors({ stack: true }),
          jsonFormat
        ),
        maxsize: 10 * 1024 * 1024,
        maxFiles: finalConfig.maxFiles,
      })
    );
    
    // HTTP access log
    transportConfigs.push(
      new transports.File({
        filename: path.join(finalConfig.logDirectory, 'access.log'),
        level: 'http',
        format: format.combine(
          format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          jsonFormat
        ),
        maxsize: 10 * 1024 * 1024,
        maxFiles: finalConfig.maxFiles,
      })
    );
  }
  
  // Create logger instance
  const logger = winston.createLogger({
    level: finalConfig.level,
    defaultMeta: { service: finalConfig.serviceName },
    transports: transportConfigs,
    exitOnError: false,
  });
  
  return logger;
}

// ─── Default Logger Export ──────────────────────────────────────────────────────

export const logger = createLogger();

// ─── Logging Helper Functions ───────────────────────────────────────────────────

/**
 * Log HTTP request
 */
export function logHttpRequest(
  logger: winston.Logger,
  request: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: any;
    query?: any;
    params?: any;
  },
  response?: {
    statusCode: number;
    duration?: number;
  },
  additionalContext?: Partial<LogContext>
): void {
  logger.http('HTTP Request', {
    module: 'http',
    action: 'request',
    method: request.method,
    url: request.url,
    statusCode: response?.statusCode,
    duration: response?.duration,
    userAgent: request.headers['user-agent'],
    ip: request.headers['x-forwarded-for'] || request.headers['x-real-ip'],
    ...additionalContext,
  });
}

/**
 * Log database operation
 */
export function logDatabaseOperation(
  logger: winston.Logger,
  operation: {
    type: 'query' | 'insert' | 'update' | 'delete' | 'transaction';
    table?: string;
    query?: string;
    params?: any[];
    duration: number;
    rowsAffected?: number;
  },
  error?: Error
): void {
  if (error) {
    logger.error('Database operation failed', {
      module: 'database',
      action: operation.type,
      table: operation.table,
      query: operation.query,
      duration: operation.duration,
      error: {
        message: error.message,
        stack: error.stack,
      },
    });
  } else {
    logger.debug('Database operation completed', {
      module: 'database',
      action: operation.type,
      table: operation.table,
      query: operation.query,
      duration: operation.duration,
      rowsAffected: operation.rowsAffected,
    });
  }
}

/**
 * Log API call
 */
export function logApiCall(
  logger: winston.Logger,
  apiCall: {
    endpoint: string;
    method: string;
    status: number;
    duration: number;
    requestId?: string;
    userId?: string;
  },
  error?: Error
): void {
  if (error) {
    logger.error('API call failed', {
      module: 'api',
      action: 'call',
      endpoint: apiCall.endpoint,
      method: apiCall.method,
      status: apiCall.status,
      duration: apiCall.duration,
      requestId: apiCall.requestId,
      userId: apiCall.userId,
      error: {
        message: error.message,
        stack: error.stack,
      },
    });
  } else {
    logger.info('API call completed', {
      module: 'api',
      action: 'call',
      endpoint: apiCall.endpoint,
      method: apiCall.method,
      status: apiCall.status,
      duration: apiCall.duration,
      requestId: apiCall.requestId,
      userId: apiCall.userId,
    });
  }
}

/**
 * Log authentication event
 */
export function logAuthEvent(
  logger: winston.Logger,
  event: {
    type: 'login' | 'logout' | 'register' | 'password_reset' | 'wallet_verify';
    success: boolean;
    userId?: string;
    walletAddress?: string;
    reason?: string;
  }
): void {
  const level = event.success ? 'info' : 'warn';
  
  logger.log(level, `Auth event: ${event.type}`, {
    module: 'auth',
    action: event.type,
    success: event.success,
    userId: event.userId,
    walletAddress: event.walletAddress,
    reason: event.reason,
  });
}

/**
 * Log rate limiting event
 */
export function logRateLimitEvent(
  logger: winston.Logger,
  event: {
    clientKey: string;
    endpoint: string;
    limit: number;
    remaining: number;
    action: 'blocked' | 'throttled' | 'warning';
  }
): void {
  logger.warn('Rate limit event', {
    module: 'rate-limiter',
    action: event.action,
    clientKey: event.clientKey,
    endpoint: event.endpoint,
    limit: event.limit,
    remaining: event.remaining,
  });
}

/**
 * Log content moderation event
 */
export function logModerationEvent(
  logger: winston.Logger,
  event: {
    contentType: 'post' | 'comment' | 'agent';
    action: 'approved' | 'rejected' | 'flagged';
    categories?: Record<string, boolean>;
    confidence?: number;
    userId?: string;
  }
): void {
  const level = event.action === 'rejected' ? 'warn' : 'info';
  
  logger.log(level, `Content moderation: ${event.action}`, {
    module: 'moderation',
    action: event.action,
    contentType: event.contentType,
    categories: event.categories,
    confidence: event.confidence,
    userId: event.userId,
  });
}

/**
 * Log oracle price update
 */
export function logOracleUpdate(
  logger: winston.Logger,
  event: {
    symbol: string;
    price: number;
    source: 'pyth' | 'chainlink' | 'aggregated';
    deviation?: number;
    isReliable: boolean;
  }
): void {
  const level = event.isReliable ? 'debug' : 'warn';
  
  logger.log(level, 'Oracle price update', {
    module: 'oracle',
    action: 'price_update',
    symbol: event.symbol,
    price: event.price,
    source: event.source,
    deviation: event.deviation,
    isReliable: event.isReliable,
  });
}

/**
 * Log performance metrics
 */
export function logPerformance(
  logger: winston.Logger,
  metrics: {
    operation: string;
    duration: number;
    threshold: number;
    metadata?: Record<string, any>;
  }
): void {
  const level = metrics.duration > metrics.threshold ? 'warn' : 'debug';
  
  logger.log(level, 'Performance metric', {
    module: 'performance',
    action: 'metric',
    operation: metrics.operation,
    duration: metrics.duration,
    threshold: metrics.threshold,
    isSlow: metrics.duration > metrics.threshold,
    ...metrics.metadata,
  });
}

/**
 * Log error with context
 */
export function logError(
  logger: winston.Logger,
  error: Error,
  context: {
    module: string;
    action: string;
    userId?: string;
    metadata?: Record<string, any>;
  }
): void {
  logger.error('Error occurred', {
    module: context.module,
    action: context.action,
    userId: context.userId,
    metadata: context.metadata,
    error: {
      message: error.message,
      stack: error.stack,
      code: (error as any).code,
    },
  });
}

// ─── Middleware Integration ─────────────────────────────────────────────────────

/**
 * Create HTTP request logging middleware for Hono
 */
export function requestLogger() {
  return async (c: any, next: any) => {
    const start = Date.now();
    const requestId = c.req.header('X-Request-ID') || generateRequestId();
    
    // Add request ID to headers
    c.header('X-Request-ID', requestId);
    
    // Log request
    logger.http('Incoming request', {
      module: 'http',
      action: 'request',
      method: c.req.method,
      url: c.req.url,
      requestId,
      userAgent: c.req.header('User-Agent'),
      ip: c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP'),
    });
    
    await next();
    
    // Log response
    const duration = Date.now() - start;
    logger.http('Response sent', {
      module: 'http',
      action: 'response',
      method: c.req.method,
      url: c.req.url,
      status: c.res.status,
      duration,
      requestId,
    });
  };
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  const crypto = require('crypto');
  return crypto.randomBytes(16).toString('hex');
}

// ─── Utility Functions ──────────────────────────────────────────────────────────

/**
 * Set log level dynamically
 */
export function setLogLevel(level: LogLevel): void {
  logger.level = level;
  logger.info(`Log level changed to ${level}`);
}

/**
 * Get current log level
 */
export function getLogLevel(): LogLevel {
  return logger.level as LogLevel;
}

/**
 * Flush all transports (ensure all logs are written)
 */
export async function flushLogs(): Promise<void> {
  return new Promise((resolve) => {
    // @ts-ignore - Winston has flush method but not in types
    (logger as any).flush?.();
    setTimeout(resolve, 100);
  });
}

/**
 * Close logger and cleanup resources
 */
export async function closeLogger(): Promise<void> {
  await flushLogs();
  logger.close();
}
