/**
 * middleware/inputValidator.ts
 * Comprehensive input validation and sanitization with XSS, SQL injection protection
 */

import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';

// ─── Types ──────────────────────────────────────────────────────────────────────

declare module 'hono' {
  interface ContextVariableMap {
    sanitizedData?: any;
  }
}

export interface ValidationRule {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'email' | 'url' | 'solanaAddress';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  sanitizedData: any;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────────

// Dangerous patterns for security
const DANGEROUS_PATTERNS = {
  xss: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  xssEvent: /on\w+\s*=/gi,
  sqlInjection: /\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b/i,
  scriptInjection: /javascript:/i,
  dataUri: /data:/i,
};

// Allowed HTML tags (if HTML is permitted)
const ALLOWED_HTML_TAGS = ['b', 'i', 'em', 'strong', 'p', 'br'];

// Solana address pattern
const SOLANA_ADDRESS_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

// Email pattern
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// URL pattern
const URL_PATTERN = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;

// ─── Helper Functions ───────────────────────────────────────────────────────────

/**
 * Sanitize string by removing dangerous content
 */
export function sanitizeString(str: string): string {
  if (typeof str !== 'string') return str;
  
  let sanitized = str.trim();
  
  // Remove XSS scripts
  sanitized = sanitized.replace(DANGEROUS_PATTERNS.xss, '');
  
  // Remove event handlers
  sanitized = sanitized.replace(DANGEROUS_PATTERNS.xssEvent, '');
  
  // Remove javascript: protocol
  sanitized = sanitized.replace(DANGEROUS_PATTERNS.scriptInjection, '');
  
  // Remove data: URIs (potential XSS vector)
  sanitized = sanitized.replace(DANGEROUS_PATTERNS.dataUri, '');
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  // Remove control characters except newline and tab
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  return sanitized;
}

/**
 * Sanitize HTML (basic - consider using DOMPurify for production)
 */
export function sanitizeHTML(html: string): string {
  if (typeof html !== 'string') return html;
  
  // Remove all tags except allowed ones
  const allowedTagsRegex = new RegExp(`</?(?:${ALLOWED_HTML_TAGS.join('|')})\\b[^>]*>`, 'gi');
  const tempHtml = html.replace(/<[^>]*>/g, (match) => {
    if (allowedTagsRegex.test(match)) {
      return match;
    }
    return '';
  });
  
  // Then apply string sanitization
  return sanitizeString(tempHtml);
}

/**
 * Escape special HTML characters
 */
export function escapeHTML(str: string): string {
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return String(str).replace(/[&<>"'/]/g, (char) => escapeMap[char]);
}

/**
 * Validate Solana address
 */
export function isValidSolanaAddress(address: string): boolean {
  return typeof address === 'string' && SOLANA_ADDRESS_PATTERN.test(address);
}

/**
 * Validate email
 */
export function isValidEmail(email: string): boolean {
  return typeof email === 'string' && EMAIL_PATTERN.test(email);
}

/**
 * Validate URL
 */
export function isValidURL(url: string): boolean {
  return typeof url === 'string' && URL_PATTERN.test(url);
}

/**
 * Check for SQL injection attempts
 */
export function detectSQLInjection(str: string): boolean {
  if (typeof str !== 'string') return false;
  return DANGEROUS_PATTERNS.sqlInjection.test(str);
}

/**
 * Deep sanitize object
 */
export function deepSanitize(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepSanitize(item));
  }
  
  const sanitized: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = deepSanitize(value);
      } else {
        sanitized[key] = value;
      }
    }
  }
  
  return sanitized;
}

// ─── Validation Functions ───────────────────────────────────────────────────────

/**
 * Validate a single field
 */
function validateField(
  field: string,
  value: any,
  rule: ValidationRule
): ValidationError | null {
  // Check required
  if (rule.required && (value === undefined || value === null || value === '')) {
    return {
      field,
      message: `${field} is required`,
      code: 'REQUIRED',
    };
  }
  
  // Skip further validation if value is empty and not required
  if (value === undefined || value === null || value === '') {
    return null;
  }
  
  // Type checking
  switch (rule.type) {
    case 'string':
      if (typeof value !== 'string') {
        return {
          field,
          message: `${field} must be a string`,
          code: 'INVALID_TYPE',
        };
      }
      
      // Length checks
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        return {
          field,
          message: `${field} must be at least ${rule.minLength} characters`,
          code: 'MIN_LENGTH',
        };
      }
      
      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        return {
          field,
          message: `${field} must be at most ${rule.maxLength} characters`,
          code: 'MAX_LENGTH',
        };
      }
      
      // Pattern check
      if (rule.pattern && !rule.pattern.test(value)) {
        return {
          field,
          message: `${field} format is invalid`,
          code: 'INVALID_FORMAT',
        };
      }
      break;
      
    case 'number':
      if (typeof value !== 'number') {
        return {
          field,
          message: `${field} must be a number`,
          code: 'INVALID_TYPE',
        };
      }
      
      // Range checks
      if (rule.min !== undefined && value < rule.min) {
        return {
          field,
          message: `${field} must be at least ${rule.min}`,
          code: 'MIN_VALUE',
        };
      }
      
      if (rule.max !== undefined && value > rule.max) {
        return {
          field,
          message: `${field} must be at most ${rule.max}`,
          code: 'MAX_VALUE',
        };
      }
      break;
      
    case 'boolean':
      if (typeof value !== 'boolean') {
        return {
          field,
          message: `${field} must be a boolean`,
          code: 'INVALID_TYPE',
        };
      }
      break;
      
    case 'array':
      if (!Array.isArray(value)) {
        return {
          field,
          message: `${field} must be an array`,
          code: 'INVALID_TYPE',
        };
      }
      break;
      
    case 'object':
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return {
          field,
          message: `${field} must be an object`,
          code: 'INVALID_TYPE',
        };
      }
      break;
      
    case 'email':
      if (!isValidEmail(value)) {
        return {
          field,
          message: `${field} must be a valid email address`,
          code: 'INVALID_EMAIL',
        };
      }
      break;
      
    case 'url':
      if (!isValidURL(value)) {
        return {
          field,
          message: `${field} must be a valid URL`,
          code: 'INVALID_URL',
        };
      }
      break;
      
    case 'solanaAddress':
      if (!isValidSolanaAddress(value)) {
        return {
          field,
          message: `${field} must be a valid Solana address`,
          code: 'INVALID_SOLANA_ADDRESS',
        };
      }
      break;
  }
  
  // Custom validation
  if (rule.custom) {
    const result = rule.custom(value);
    if (result === false) {
      return {
        field,
        message: `${field} failed custom validation`,
        code: 'CUSTOM_VALIDATION_FAILED',
      };
    }
    if (typeof result === 'string') {
      return {
        field,
        message: result,
        code: 'CUSTOM_VALIDATION_FAILED',
      };
    }
  }
  
  return null;
}

/**
 * Validate input data against schema
 */
export function validateInput(
  data: any,
  schema: Record<string, ValidationRule>
): ValidationResult {
  const errors: ValidationError[] = [];
  const sanitizedData: any = {};
  
  // Validate each field in schema
  for (const [field, rule] of Object.entries(schema)) {
    const value = data?.[field];
    const error = validateField(field, value, rule);
    
    if (error) {
      errors.push(error);
    } else {
      // Sanitize the value
      if (typeof value === 'string') {
        sanitizedData[field] = sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitizedData[field] = deepSanitize(value);
      } else {
        sanitizedData[field] = value;
      }
    }
  }
  
  // Copy extra fields that aren't in schema (but sanitize them)
  if (data && typeof data === 'object') {
    for (const key in data) {
      if (!schema.hasOwnProperty(key) && Object.prototype.hasOwnProperty.call(data, key)) {
        const value = data[key];
        if (typeof value === 'string') {
          sanitizedData[key] = sanitizeString(value);
        } else if (typeof value === 'object' && value !== null) {
          sanitizedData[key] = deepSanitize(value);
        } else {
          sanitizedData[key] = value;
        }
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    sanitizedData,
  };
}

// ─── Middleware Factory ─────────────────────────────────────────────────────────

/**
 * Create input validation middleware
 */
export function validateInputMiddleware(schema: Record<string, ValidationRule>) {
  return async (c: Context, next: Next) => {
    try {
      // Get request body
      let data;
      try {
        data = await c.req.json();
      } catch (e) {
        throw new HTTPException(400, {
          message: 'Invalid JSON in request body',
        });
      }
      
      // Validate input
      const result = validateInput(data, schema);
      
      if (!result.valid) {
        // Log validation errors for monitoring
        console.log('[InputValidator] Validation failed:', {
          path: c.req.path,
          errors: result.errors,
        });
        
        throw new HTTPException(400, {
          message: 'Validation failed',
          res: c.json({
            status: 'error',
            errors: result.errors,
          }),
        });
      }
      
      // Replace request body with sanitized data
      c.set('sanitizedData', result.sanitizedData);
      
      // Continue to handler
      await next();
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      
      console.error('[InputValidator] Unexpected error:', error);
      throw new HTTPException(500, {
        message: 'Internal server error during validation',
      });
    }
  };
}

// ─── Pre-configured Validators ──────────────────────────────────────────────────

/**
 * Token launch validator
 */
export const tokenLaunchValidator = validateInputMiddleware({
  name: {
    type: 'string',
    required: true,
    minLength: 2,
    maxLength: 50,
  },
  ticker: {
    type: 'string',
    required: true,
    minLength: 2,
    maxLength: 10,
    pattern: /^[A-Z0-9]+$/,
  },
  description: {
    type: 'string',
    required: true,
    minLength: 10,
    maxLength: 1000,
  },
  agent_wallet: {
    type: 'solanaAddress',
    required: true,
  },
  website: {
    type: 'url',
    required: false,
  },
  twitter: {
    type: 'string',
    required: false,
    maxLength: 50,
  },
  telegram: {
    type: 'string',
    required: false,
    maxLength: 50,
  },
});

/**
 * Login validator
 */
export const loginValidator = validateInputMiddleware({
  email: {
    type: 'email',
    required: true,
  },
  password: {
    type: 'string',
    required: true,
    minLength: 8,
    maxLength: 128,
  },
});

/**
 * DLMM add liquidity validator
 */
export const dlmmAddLiquidityValidator = validateInputMiddleware({
  pool_address: {
    type: 'solanaAddress',
    required: true,
  },
  amount_a: {
    type: 'number',
    required: true,
    min: 0.0001,
  },
  amount_b: {
    type: 'number',
    required: true,
    min: 0.0001,
  },
  position_type: {
    type: 'string',
    required: false,
    pattern: /^(LB|UB|RANGE)$/,
  },
});

/**
 * Generic string sanitizer middleware
 */
export function sanitizeStringsMiddleware() {
  return async (c: Context, next: Next) => {
    try {
      const data = await c.req.json();
      
      if (data && typeof data === 'object') {
        const sanitized = deepSanitize(data);
        c.set('sanitizedData', sanitized);
      }
      
      await next();
    } catch (e) {
      // Continue even if parsing fails
      await next();
    }
  };
}

// ─── Utility Functions ──────────────────────────────────────────────────────────

/**
 * Get sanitized data from context
 */
export function getSanitizedData<T = any>(c: Context): T | null {
  return c.get('sanitizedData') as T | null;
}

/**
 * Quick validation helper (for use in handlers)
 */
export function quickValidate(
  data: any,
  schema: Record<string, ValidationRule>
): { valid: boolean; errors: ValidationError[] } {
  const result = validateInput(data, schema);
  return { valid: result.valid, errors: result.errors };
}

/**
 * Detect malicious input attempts
 */
export function detectMaliciousInput(input: string): {
  isMalicious: boolean;
  threats: string[];
} {
  const threats: string[] = [];
  
  if (DANGEROUS_PATTERNS.xss.test(input)) {
    threats.push('XSS_SCRIPT_DETECTED');
  }
  
  if (DANGEROUS_PATTERNS.xssEvent.test(input)) {
    threats.push('XSS_EVENT_HANDLER_DETECTED');
  }
  
  if (DANGEROUS_PATTERNS.sqlInjection.test(input)) {
    threats.push('SQL_INJECTION_DETECTED');
  }
  
  if (DANGEROUS_PATTERNS.scriptInjection.test(input)) {
    threats.push('JAVASCRIPT_PROTOCOL_DETECTED');
  }
  
  return {
    isMalicious: threats.length > 0,
    threats,
  };
}
