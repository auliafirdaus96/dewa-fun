
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from 'redis';

// Config: Max 10 requests per 60 seconds
const LIMIT = 10;
const WINDOW = 60; // seconds

// Redis client singleton
let redisClient: any = null;
let redisAvailable = false;
let initializationAttempted = false;

// Initialize Redis connection
async function getRedisClient(): Promise<any> {
  if (!process.env.REDIS_URL) {
    console.warn('[RateLimiter] REDIS_URL not configured, using fail-close mode');
    return null;
  }

  if (initializationAttempted) {
    return redisClient;
  }

  initializationAttempted = true;

  try {
    const client = createClient({
      url: process.env.REDIS_URL,
    });

    client.on('error', (err) => {
      console.error('[RateLimiter] Redis error:', err.message);
      redisAvailable = false;
    });

    client.on('connect', () => {
      console.log('[RateLimiter] Redis connected');
      redisAvailable = true;
    });

    await client.connect();
    redisClient = client;
    return client;
  } catch (error) {
    console.error('[RateLimiter] Failed to connect to Redis:', error);
    redisAvailable = false;
    return null;
  }
}

// In-memory fallback store (used when Redis is unavailable)
const memoryStore = new Map<string, { count: number; expires: number }>();
const MEMORY_CLEANUP_INTERVAL = 60_000;

// Cleanup expired entries every 60s
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of memoryStore.entries()) {
      if (val.expires < now) memoryStore.delete(key);
    }
  }, MEMORY_CLEANUP_INTERVAL);
}

/**
 * Rate limiter with fail-CLOSE strategy
 * If Redis is down, we BLOCK requests instead of allowing them
 */
async function checkRateLimit(
  key: string
): Promise<{ allowed: boolean; remaining?: number }> {
  const now = Date.now();
  const windowMs = WINDOW * 1000;

  // Try Redis first
  if (redisAvailable && redisClient) {
    try {
      const current = await redisClient.get(key);
      const ttl = await redisClient.pTTL(key);

      if (current && ttl > 0) {
        const count = parseInt(current, 10);
        if (count >= LIMIT) {
          return { allowed: false }; // Rate limit exceeded
        }
        await redisClient.incr(key);
        return { allowed: true, remaining: LIMIT - count - 1 };
      } else {
        // First request or expired key
        await redisClient.setEx(key, WINDOW, '1');
        return { allowed: true, remaining: LIMIT - 1 };
      }
    } catch (error) {
      console.error('[RateLimiter] Redis operation failed:', error);
      redisAvailable = false;
      // Fall through to memory store with fail-close
    }
  }

  // Fallback to in-memory store (FAIL-CLOSE: block if Redis unavailable)
  // Only allow if we're sure Redis will never be available (no REDIS_URL)
  if (!process.env.REDIS_URL) {
    // No Redis configured - use memory store but still enforce limits
    const entry = memoryStore.get(key);
    
    if (entry && entry.expires > now) {
      entry.count++;
      if (entry.count > LIMIT) {
        return { allowed: false };
      }
    } else {
      memoryStore.set(key, { count: 1, expires: now + windowMs });
    }
    return { allowed: true };
  } else {
    // Redis IS configured but unavailable - FAIL CLOSE
    console.warn('[RateLimiter] Redis unavailable - blocking request (fail-close)');
    return { allowed: false };
  }
}

export async function middleware(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
  const pathname = request.nextUrl.pathname;

  // Apply rate limiting to dice and vault APIs
  if (pathname.startsWith('/api/dice') || pathname.startsWith('/api/vault')) {
    const key = `ratelimit:${ip}:${pathname.replace(/\//g, ':')}`;
    
    // Initialize Redis on first request (lazy loading)
    if (!initializationAttempted) {
      await getRedisClient();
    }

    const result = await checkRateLimit(key);
    
    if (!result.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429 }
      );
    }

    // Add rate limit headers
    const response = NextResponse.next();
    if (result.remaining !== undefined) {
      response.headers.set('X-RateLimit-Limit', LIMIT.toString());
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/dice/:path*', '/api/vault/:path*'],
};
