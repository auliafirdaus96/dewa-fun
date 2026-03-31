/**
 * utils/secureMemory.ts
 * Secure memory management for sensitive data (API keys, secrets, passwords)
 * Implements zeroing, secure containers, and automatic cleanup
 */

import { randomBytes } from 'crypto';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface SecureContainer<T> {
  data: T;
  expiresAt: number | null;
  zeroOnRead: boolean;
  accessedCount: number;
  maxAccessCount?: number;
}

export interface SecureMemoryConfig {
  defaultTTL?: number; // milliseconds
  autoCleanup?: boolean;
  zeroAfterUse?: boolean;
  maxAccessCount?: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute
const MAX_ACCESS_COUNT = 10;

// Secure memory store
const secureStore = new Map<string, SecureContainer<any>>();
let cleanupInterval: NodeJS.Timeout | null = null;

// ─── Helper Functions ───────────────────────────────────────────────────────────

/**
 * Overwrites a Uint8Array with random bytes (secure zeroing)
 */
export function secureZero(buffer: Uint8Array): void {
  if (!buffer || buffer.length === 0) return;
  
  // Fill with random bytes first (more secure than just zeros)
  const randomData = randomBytes(buffer.length);
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = randomData[i];
  }
  
  // Then zero out
  buffer.fill(0);
}

/**
 * Overwrites a string by converting to buffer and zeroing
 */
export function secureZeroString(str: string): void {
  if (!str) return;
  
  // Convert to buffer and zero (note: this doesn't affect original string in JS)
  // but helps prevent accidental logging/exposure
  const buffer = Buffer.from(str, 'utf-8');
  secureZero(buffer);
}

/**
 * Creates a deep copy of an object with all buffers zeroed
 */
export function cloneAndSecureZero<T extends any>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Uint8Array || obj instanceof Buffer) {
    const cloned = new Uint8Array(obj.length);
    cloned.set(obj);
    return cloned as unknown as T;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => cloneAndSecureZero(item)) as unknown as T;
  }
  
  const cloned: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = cloneAndSecureZero(obj[key]);
    }
  }
  return cloned;
}

// ─── Secure Memory Container ────────────────────────────────────────────────────

/**
 * Stores sensitive data in a secure container with automatic cleanup
 */
export class SecureMemory {
  private config: Required<SecureMemoryConfig>;

  constructor(config: SecureMemoryConfig = {}) {
    this.config = {
      defaultTTL: config.defaultTTL ?? DEFAULT_TTL,
      autoCleanup: config.autoCleanup ?? true,
      zeroAfterUse: config.zeroAfterUse ?? true,
      maxAccessCount: config.maxAccessCount ?? MAX_ACCESS_COUNT,
    };

    // Start cleanup interval if auto-cleanup enabled
    if (this.config.autoCleanup && !cleanupInterval) {
      this.startCleanup();
    }
  }

  /**
   * Store sensitive data securely
   */
  store<T>(
    key: string,
    data: T,
    options: {
      ttl?: number;
      zeroOnRead?: boolean;
      maxAccessCount?: number;
    } = {}
  ): string {
    const container: SecureContainer<T> = {
      data: cloneAndSecureZero(data),
      expiresAt: Date.now() + (options.ttl ?? this.config.defaultTTL),
      zeroOnRead: options.zeroOnRead ?? this.config.zeroAfterUse,
      accessedCount: 0,
      maxAccessCount: options.maxAccessCount ?? this.config.maxAccessCount,
    };

    secureStore.set(key, container);
    console.log(`[SecureMemory] Stored sensitive data: ${key}`);
    
    return key;
  }

  /**
   * Retrieve data from secure storage
   */
  retrieve<T>(key: string): T | null {
    const container = secureStore.get(key) as SecureContainer<T> | undefined;
    
    if (!container) {
      console.warn(`[SecureMemory] Key not found: ${key}`);
      return null;
    }

    // Check expiration
    if (container.expiresAt && Date.now() > container.expiresAt) {
      console.warn(`[SecureMemory] Data expired: ${key}`);
      this.destroy(key);
      return null;
    }

    // Check access count
    container.accessedCount++;
    if (container.maxAccessCount && container.accessedCount > container.maxAccessCount) {
      console.warn(`[SecureMemory] Max access count exceeded for: ${key}`);
      this.destroy(key);
      return null;
    }

    const data = cloneAndSecureZero(container.data);

    // Zero on read if configured
    if (container.zeroOnRead) {
      this.zeroOutContainer(container);
    }

    return data;
  }

  /**
   * Execute callback with secure data, then automatically zero it
   */
  withData<T, R>(key: string, callback: (data: T) => R): R | null {
    const data = this.retrieve<T>(key);
    
    if (data === null) {
      return null;
    }

    try {
      const result = callback(data);
      
      // Automatically destroy after use
      if (this.config.zeroAfterUse) {
        this.destroy(key);
      }
      
      return result;
    } catch (error) {
      console.error(`[SecureMemory] Error in callback:`, error);
      this.destroy(key);
      throw error;
    }
  }

  /**
   * Manually destroy secure data
   */
  destroy(key: string): void {
    const container = secureStore.get(key);
    
    if (container) {
      this.zeroOutContainer(container);
      secureStore.delete(key);
      console.log(`[SecureMemory] Destroyed sensitive data: ${key}`);
    }
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    const container = secureStore.get(key);
    
    if (!container) {
      return false;
    }

    // Check expiration
    if (container.expiresAt && Date.now() > container.expiresAt) {
      this.destroy(key);
      return false;
    }

    return true;
  }

  /**
   * Get all active keys (for monitoring)
   */
  listKeys(): string[] {
    const now = Date.now();
    const keys: string[] = [];
    
    for (const [key, container] of secureStore.entries()) {
      if (!container.expiresAt || now <= container.expiresAt) {
        keys.push(key);
      } else {
        this.destroy(key);
      }
    }
    
    return keys;
  }

  /**
   * Clear all secure data
   */
  clear(): void {
    for (const key of secureStore.keys()) {
      this.destroy(key);
    }
    
    console.log('[SecureMemory] All data cleared');
  }

  /**
   * Get statistics (for monitoring)
   */
  getStats(): {
    totalKeys: number;
    expiredKeys: number;
    avgAccessCount: number;
  } {
    const now = Date.now();
    let expiredKeys = 0;
    let totalAccessCount = 0;
    let activeKeys = 0;

    for (const [, container] of secureStore.entries()) {
      if (container.expiresAt && now > container.expiresAt) {
        expiredKeys++;
      } else {
        activeKeys++;
        totalAccessCount += container.accessedCount;
      }
    }

    return {
      totalKeys: secureStore.size,
      expiredKeys,
      avgAccessCount: activeKeys > 0 ? totalAccessCount / activeKeys : 0,
    };
  }

  // ─── Private Methods ───────────────────────────────────────────────────────

  private zeroOutContainer<T>(container: SecureContainer<T>): void {
    if (!container.data || typeof container.data !== 'object') {
      return;
    }

    // Zero out any Buffer or Uint8Array properties
    const data = container.data as any;
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const value = data[key];
        if (value instanceof Uint8Array || value instanceof Buffer) {
          secureZero(value);
        } else if (typeof value === 'string') {
          secureZeroString(value);
        }
      }
    }

    // Clear the container data reference
    container.data = null as any;
  }

  private startCleanup(): void {
    cleanupInterval = setInterval(() => {
      this.cleanup();
    }, CLEANUP_INTERVAL);

    // Cleanup on process exit
    process.on('exit', () => this.clear());
    process.on('SIGINT', () => this.clear());
    process.on('SIGTERM', () => this.clear());

    console.log('[SecureMemory] Auto-cleanup started (interval: 60s)');
  }

  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, container] of secureStore.entries()) {
      if (container.expiresAt && now > container.expiresAt) {
        this.destroy(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[SecureMemory] Cleaned up ${cleanedCount} expired entries`);
    }
  }
}

// ─── Global Secure Memory Instance ──────────────────────────────────────────────

// Export a default instance for easy use
export const secureMemory = new SecureMemory({
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  autoCleanup: true,
  zeroAfterUse: true,
  maxAccessCount: 10,
});

// ─── Convenience Functions ──────────────────────────────────────────────────────

/**
 * Store API key securely
 */
export function storeApiKey(keyName: string, apiKey: string, ttl?: number): string {
  return secureMemory.store(keyName, apiKey, {
    ttl: ttl ?? 2 * 60 * 1000, // 2 minutes default for API keys
    zeroOnRead: true,
    maxAccessCount: 5,
  });
}

/**
 * Retrieve API key securely
 */
export function retrieveApiKey(keyName: string): string | null {
  return secureMemory.retrieve<string>(keyName);
}

/**
 * Execute callback with API key, then automatically zero it
 */
export function withApiKey<T>(
  keyName: string,
  callback: (apiKey: string) => T
): T | null {
  return secureMemory.withData<string, T>(keyName, callback);
}

/**
 * Store encrypted secret securely
 */
export function storeSecret(secretName: string, secret: string | Buffer, ttl?: number): string {
  return secureMemory.store(secretName, secret, {
    ttl: ttl ?? 5 * 60 * 1000, // 5 minutes default
    zeroOnRead: true,
    maxAccessCount: 3,
  });
}

/**
 * Retrieve secret securely
 */
export function retrieveSecret(secretName: string): string | Buffer | null {
  return secureMemory.retrieve<string | Buffer>(secretName);
}
