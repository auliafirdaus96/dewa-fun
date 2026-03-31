/**
 * LoggerService provides structured logging for dewa.fun.
 * Logs are formatted as JSON objects for better compatibility with log management systems.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  context?: any;
}

export class LoggerService {
  private static instance: LoggerService;
  private readonly defaultService = 'dewa-core';

  private constructor() {}

  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  private log(level: LogLevel, message: string, service?: string, context?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: service || this.defaultService,
      message,
    };

    if (context) {
      entry.context = this.sanitizeContext(context);
    }

    // In a real production environment, this would use process.stdout.write
    // or pino.info() for performance. For now, we use a structured console output.
    console.log(JSON.stringify(entry));
  }

  /**
   * Sanitizes context to ensure no sensitive fields (like keys) are logged.
   */
  private sanitizeContext(context: any): any {
    if (!context || typeof context !== 'object') return context;

    const sensitiveFields = ['apiKey', 'secret', 'password', 'encrypted_api_key', 'privateKey'];
    const sanitized = { ...context };

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = 'REDACTED';
      }
    }

    return sanitized;
  }

  public info(message: string, service?: string, context?: any) {
    this.log('info', message, service, context);
  }

  public warn(message: string, service?: string, context?: any) {
    this.log('warn', message, service, context);
  }

  public error(message: string, service?: string, context?: any) {
    this.log('error', message, service, context);
  }

  public debug(message: string, service?: string, context?: any) {
    this.log('debug', message, service, context);
  }
}

export const logger = LoggerService.getInstance();
