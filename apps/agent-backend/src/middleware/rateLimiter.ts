/**
 * middleware/rateLimiter.ts
 * Production-grade rate limiting with sliding window, IP-based + user-based limiting
 */

import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';

// ─── Types ──────────────────────────────────────────────────────────────────────

declare module 'hono' {
  interface ContextVariableMap {
    userId?: string;
  }
}

export interface RateLimitConfig {
  windowMs?: number;          // Time window in milliseconds
  maxRequests?: number;       // Max requests per window
  skipSuccessfulRequests?: boolean;  // Only count non-2xx requests
  skipFailedRequests?: boolean;      // Only count 2xx requests
}

export interface RateLimitInfo {
  count: number;
  resetTime: number;
  remaining: number;
}

export interface RateLimitStore {
  get(key: string): RateLimitInfo | null;
  set(key: string, info: RateLimitInfo): void;
  delete(key: string): void;
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const DEFAULT_WINDOW_MS = 60 * 1000;      // 1 minute
const DEFAULT_MAX_REQUESTS = 10;          // 10 requests per minute
const CLEANUP_INTERVAL = 5 * 60 * 1000;   // 5 minutes

// In-memory store (replace with Redis for production)
const store = new Map<string, RateLimitInfo & { lastAccess: number }>();
let cleanupInterval: NodeJS.Timeout | null = null;

// ─── Helper Functions ───────────────────────────────────────────────────────────

/**
 * Get client identifier (IP address or user ID)
 */
function getClientIdentifier(c: Context): string {
  // Try to get authenticated user first
  const userId = c.get('userId');
  if (userId) {
    return `user:${userId}`;
  }
  
  // Fallback to IP address
  const ip = c.req.header('X-Forwarded-For') || 
             c.req.header('X-Real-IP') || 
             'unknown';
  
  return `ip:${ip.split(',')[0].trim()}`;
}

/**
 * Clean up expired entries periodically
 */
function startCleanup(): void {
  if (cleanupInterval) return;
  
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, value] of store.entries()) {
      if (now > value.lastAccess + CLEANUP_INTERVAL) {
        store.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`[RateLimiter] Cleaned up ${cleanedCount} expired entries`);
    }
  }, CLEANUP_INTERVAL);
  
  console.log('[RateLimiter] Auto-cleanup started (interval: 5 minutes)');
}

/**
 * Stop cleanup interval
 */
function stopCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

// ─── Rate Limiter Middleware ────────────────────────────────────────────────────

/**
 * Create rate limiting middleware
 */
export function rateLimiter(config: RateLimitConfig = {}) {
  const {
    windowMs = DEFAULT_WINDOW_MS,
    maxRequests = DEFAULT_MAX_REQUESTS,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = config;
  
  // Start cleanup on first use
  startCleanup();
  
  return async (c: Context, next: Next) => {
    const clientKey = getClientIdentifier(c);
    const now = Date.now();
    
    // Get current rate limit info
    let info = store.get(clientKey);
    
    // Initialize or reset if window expired
    if (!info || now > info.resetTime) {
      info = {
        count: 0,
        resetTime: now + windowMs,
        remaining: maxRequests,
        lastAccess: now,
      };
    }
    
    // Check if rate limit exceeded
    if (info.count >= maxRequests) {
      const retryAfter = Math.ceil((info.resetTime - now) / 1000);
      
      // Set rate limit headers
      c.header('X-RateLimit-Limit', maxRequests.toString());
      c.header('X-RateLimit-Remaining', '0');
      c.header('X-RateLimit-Reset', info.resetTime.toString());
      c.header('Retry-After', retryAfter.toString());
      
      throw new HTTPException(429, {
        message: `Too many requests. Please try again in ${retryAfter} seconds.`,
      });
    }
    
    // Increment request count
    info.count++;
    info.remaining = Math.max(0, maxRequests - info.count);
    info.lastAccess = now;
    
    // Store updated info
    store.set(clientKey, info);
    
    // Set response headers
    c.header('X-RateLimit-Limit', maxRequests.toString());
    c.header('X-RateLimit-Remaining', info.remaining.toString());
    c.header('X-RateLimit-Reset', info.resetTime.toString());
    
    // Continue to next middleware/handler
    await next();
    
    // Optionally skip counting based on response status
    if (skipSuccessfulRequests && c.res.status >= 200 && c.res.status < 300) {
      info.count--;
      info.remaining++;
      store.set(clientKey, info);
    } else if (skipFailedRequests && (c.res.status < 200 || c.res.status >= 300)) {
      info.count--;
      info.remaining++;
      store.set(clientKey, info);
    }
  };
}

// ─── Pre-configured Rate Limiters ───────────────────────────────────────────────

/**
 * Strict rate limiter for authentication endpoints
 * 5 requests per minute (prevent brute force)
 */
export const authRateLimiter = rateLimiter({
  windowMs: 60 * 1000,      // 1 minute
  maxRequests: 5,           // 5 attempts
  skipSuccessfulRequests: true,
});

/**
 * Moderate rate limiter for API endpoints
 * 30 requests per minute
 */
export const apiRateLimiter = rateLimiter({
  windowMs: 60 * 1000,      // 1 minute
  maxRequests: 30,          // 30 requests
});

/**
 * Lenient rate limiter for public endpoints
 * 100 requests per minute
 */
export const publicRateLimiter = rateLimiter({
  windowMs: 60 * 1000,      // 1 minute
  maxRequests: 100,         // 100 requests
});

/**
 * Token launch endpoint limiter
 * 3 launches per hour (prevent spam)
 */
export const tokenLaunchLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3,           // 3 launches
  skipSuccessfulRequests: false,
});

/**
 * DLMM operations limiter
 * 20 operations per minute
 */
export const dlmmOperationLimiter = rateLimiter({
  windowMs: 60 * 1000,      // 1 minute
  maxRequests: 20,          // 20 operations
});

// ─── Utility Functions ──────────────────────────────────────────────────────────

/**
 * Get current rate limit status for a client
 */
export function getRateLimitStatus(clientKey?: string): RateLimitInfo | null {
  const key = clientKey || 'unknown';
  const info = store.get(key);
  
  if (!info) {
    return null;
  }
  
  return {
    count: info.count,
    resetTime: info.resetTime,
    remaining: info.remaining,
  };
}

/**
 * Reset rate limit for a specific client
 */
export function resetRateLimit(clientKey: string): void {
  store.delete(clientKey);
  console.log(`[RateLimiter] Reset rate limit for: ${clientKey}`);
}

/**
 * Reset all rate limits (use with caution)
 */
export function resetAllRateLimits(): void {
  store.clear();
  console.log('[RateLimiter] All rate limits reset');
}

/**
 * Get global rate limit statistics
 */
export function getRateLimitStats(): {
  totalClients: number;
  activeClients: number;
  blockedClients: number;
} {
  const now = Date.now();
  let activeClients = 0;
  let blockedClients = 0;
  
  for (const [, info] of store.entries()) {
    if (now <= info.resetTime) {
      activeClients++;
      if (info.count >= 10) { // Assuming default max
        blockedClients++;
      }
    }
  }
  
  return {
    totalClients: store.size,
    activeClients,
    blockedClients,
  };
}

// ─── Process Cleanup ────────────────────────────────────────────────────────────

// Stop cleanup interval on process exit
process.on('exit', stopCleanup);
process.on('SIGINT', () => {
  stopCleanup();
  resetAllRateLimits();
});
process.on('SIGTERM', () => {
  stopCleanup();
  resetAllRateLimits();
});
