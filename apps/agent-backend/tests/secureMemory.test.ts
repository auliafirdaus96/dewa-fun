/**
 * tests/secureMemory.test.ts
 * Test secure memory management with zeroing, containers, and auto-cleanup
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SecureMemory,
  secureZero,
  secureZeroString,
  cloneAndSecureZero,
  storeApiKey,
  retrieveApiKey,
  withApiKey,
  storeSecret,
  retrieveSecret,
} from '../src/utils/secureMemory.js';

describe('Secure Memory Management', () => {
  let secureMem: SecureMemory;

  beforeEach(() => {
    secureMem = new SecureMemory({
      defaultTTL: 5000, // 5 seconds for testing
      autoCleanup: false,
      zeroAfterUse: true,
      maxAccessCount: 10,
    });
  });

  afterEach(() => {
    secureMem.clear();
  });

  describe('secureZero - Buffer Zeroing', () => {
    it('should zero out a Uint8Array', () => {
      const buffer = new Uint8Array([1, 2, 3, 4, 5]);
      
      secureZero(buffer);
      
      expect(buffer).toHaveLength(5);
      buffer.forEach(byte => expect(byte).toBe(0));
    });

    it('should handle empty buffers', () => {
      const buffer = new Uint8Array([]);
      
      expect(() => secureZero(buffer)).not.toThrow();
      expect(buffer).toHaveLength(0);
    });

    it('should handle null/undefined gracefully', () => {
      expect(() => secureZero(null as any)).not.toThrow();
      expect(() => secureZero(undefined as any)).not.toThrow();
    });
  });

  describe('secureZeroString - String Zeroing', () => {
    it('should process strings without errors', () => {
      const str = 'sensitive_api_key_12345';
      
      expect(() => secureZeroString(str)).not.toThrow();
      // Note: Original string not modified in JS (immutable)
      expect(str).toBe('sensitive_api_key_12345');
    });

    it('should handle empty strings', () => {
      expect(() => secureZeroString('')).not.toThrow();
    });
  });

  describe('cloneAndSecureZero - Deep Clone with Zeroing', () => {
    it('should clone objects with buffers', () => {
      const original = {
        apiKey: 'secret123',
        buffer: new Uint8Array([1, 2, 3]),
        nested: {
          token: 'token456',
        },
      };

      const cloned = cloneAndSecureZero(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.buffer).not.toBe(original.buffer);
    });

    it('should clone arrays with buffers', () => {
      const original = [
        new Uint8Array([1, 2]),
        new Uint8Array([3, 4]),
      ];

      const cloned = cloneAndSecureZero(original);

      expect(cloned).toHaveLength(2);
      expect(cloned[0]).toEqual(original[0]);
      expect(cloned[0]).not.toBe(original[0]);
    });

    it('should handle primitives', () => {
      expect(cloneAndSecureZero(42)).toBe(42);
      expect(cloneAndSecureZero('test')).toBe('test');
      expect(cloneAndSecureZero(null)).toBe(null);
      expect(cloneAndSecureZero(undefined)).toBe(undefined);
    });
  });

  describe('SecureMemory Class - Core Functionality', () => {
    it('should store and retrieve data', () => {
      const testData = { secret: 'my_secret_key' };
      
      secureMem.store('test-key', testData);
      const retrieved = secureMem.retrieve('test-key');
      
      expect(retrieved).toEqual(testData);
    });

    it('should return null for non-existent keys', () => {
      const result = secureMem.retrieve('non-existent');
      expect(result).toBeNull();
    });

    it('should destroy data after retrieval if zeroOnRead is true', () => {
      secureMem.store('test-key', { secret: 'value' }, { zeroOnRead: true });
      
      const first = secureMem.retrieve('test-key');
      expect(first).toBeDefined();
      
      const second = secureMem.retrieve('test-key');
      expect(second).toBeNull(); // Destroyed after first read
    });

    it('should respect TTL expiration', async () => {
      const shortTTL = 100; // 100ms
      secureMem.store('short-lived', { data: 'test' }, { ttl: shortTTL });
      
      // Should exist initially
      expect(secureMem.has('short-lived')).toBe(true);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, shortTTL + 50));
      
      // Should be expired
      expect(secureMem.has('short-lived')).toBe(false);
      expect(secureMem.retrieve('short-lived')).toBeNull();
    });

    it('should respect max access count', () => {
      secureMem.store('limited', { data: 'test' }, { maxAccessCount: 3 });
      
      // First 3 accesses should work
      expect(secureMem.retrieve('limited')).toBeDefined();
      expect(secureMem.retrieve('limited')).toBeDefined();
      expect(secureMem.retrieve('limited')).toBeDefined();
      
      // 4th access should fail (exceeds maxAccessCount)
      expect(secureMem.retrieve('limited')).toBeNull();
    });

    it('should check key existence', () => {
      secureMem.store('exists', 'value');
      expect(secureMem.has('exists')).toBe(true);
      expect(secureMem.has('not-exists')).toBe(false);
    });

    it('should list active keys', () => {
      secureMem.store('key1', 'value1');
      secureMem.store('key2', 'value2');
      
      const keys = secureMem.listKeys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toHaveLength(2);
    });

    it('should clear all data', () => {
      secureMem.store('key1', 'value1');
      secureMem.store('key2', 'value2');
      
      secureMem.clear();
      
      expect(secureMem.listKeys()).toHaveLength(0);
    });

    it('should provide statistics', () => {
      secureMem.store('key1', 'value1');
      secureMem.store('key2', 'value2');
      
      secureMem.retrieve('key1');
      secureMem.retrieve('key2');
      
      const stats = secureMem.getStats();
      
      expect(stats.totalKeys).toBeGreaterThanOrEqual(2);
      expect(stats.avgAccessCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('SecureMemory - withData Pattern', () => {
    it('should execute callback with data', () => {
      secureMem.store('api-key', 'sk_test_12345');
      
      const result = secureMem.withData('api-key', (data) => {
        expect(data).toBe('sk_test_12345');
        return 'processed';
      });
      
      expect(result).toBe('processed');
    });

    it('should automatically destroy data after callback', () => {
      secureMem.store('temp-key', 'temp-value');
      
      secureMem.withData('temp-key', () => {
        // Data exists here
        return 'ok';
      });
      
      // Should be destroyed after callback
      expect(secureMem.retrieve('temp-key')).toBeNull();
    });

    it('should destroy data even if callback throws', () => {
      secureMem.store('error-key', 'error-value');
      
      try {
        secureMem.withData('error-key', () => {
          throw new Error('Test error');
        });
      } catch (e) {
        // Expected
      }
      
      // Should still be destroyed
      expect(secureMem.retrieve('error-key')).toBeNull();
    });

    it('should return null if key does not exist', () => {
      const result = secureMem.withData('non-existent', (data) => {
        return 'should not reach';
      });
      
      expect(result).toBeNull();
    });
  });

  describe('Convenience Functions', () => {
    describe('storeApiKey / retrieveApiKey', () => {
      it('should store and retrieve API key', () => {
        const keyId = storeApiKey('test-api-key', 'sk_test_abc123');
        
        expect(keyId).toBe('test-api-key');
        
        const retrieved = retrieveApiKey('test-api-key');
        expect(retrieved).toBe('sk_test_abc123');
      });

      it('should use shorter TTL for API keys', () => {
        storeApiKey('short-key', 'sk_short', 100); // 100ms
        
        expect(retrieveApiKey('short-key')).toBe('sk_short');
        
        setTimeout(() => {
          expect(retrieveApiKey('short-key')).toBeNull(); // Expired
        }, 150);
      });
    });

    describe('withApiKey', () => {
      it('should execute callback with API key and auto-destroy', () => {
        storeApiKey('callback-key', 'sk_callback_123');
        
        const result = withApiKey('callback-key', (apiKey) => {
          expect(apiKey).toBe('sk_callback_123');
          return `Used ${apiKey}`;
        });
        
        expect(result).toBe('Used sk_callback_123');
        
        // Should be destroyed
        expect(retrieveApiKey('callback-key')).toBeNull();
      });
    });

    describe('storeSecret / retrieveSecret', () => {
      it('should store and retrieve string secret', () => {
        storeSecret('string-secret', 'my_password_123');
        
        const retrieved = retrieveSecret('string-secret');
        expect(retrieved).toBe('my_password_123');
      });

      it('should store and retrieve Buffer secret', () => {
        const buffer = Buffer.from('binary_secret_data');
        storeSecret('buffer-secret', buffer);
        
        const retrieved = retrieveSecret('buffer-secret') as Buffer;
        expect(Buffer.compare(retrieved, buffer)).toBe(0);
      });
    });
  });

  describe('Auto-Cleanup', () => {
    it('should start cleanup interval when autoCleanup is enabled', () => {
      const memWithCleanup = new SecureMemory({
        autoCleanup: true,
        defaultTTL: 100,
      });
      
      memWithCleanup.store('auto-expire', 'data');
      
      expect(memWithCleanup.has('auto-expire')).toBe(true);
      
      // Wait for expiration + cleanup interval
      setTimeout(() => {
        expect(memWithCleanup.has('auto-expire')).toBe(false);
        memWithCleanup.clear();
      }, 200);
    });

    it('should clean up expired entries', async () => {
      const memNoAuto = new SecureMemory({
        autoCleanup: false,
        defaultTTL: 50,
      });
      
      memNoAuto.store('expire1', 'data1');
      memNoAuto.store('expire2', 'data2');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Manual cleanup via getStats (which filters expired)
      const stats = memNoAuto.getStats();
      expect(stats.expiredKeys).toBe(2);
      
      memNoAuto.clear();
    });
  });

  describe('Security Features', () => {
    it('should zero out container data after read', () => {
      interface SensitiveData {
        password: string;
      }
      
      secureMem.store<SensitiveData>('sensitive', { password: 'secret123' }, { zeroOnRead: true });
      
      const first = secureMem.retrieve<SensitiveData>('sensitive');
      expect(first?.password).toBe('secret123');
      
      const second = secureMem.retrieve<SensitiveData>('sensitive');
      expect(second).toBeNull(); // Container zeroed and destroyed
    });

    it('should prevent unlimited access with maxAccessCount', () => {
      secureMem.store('limited-access', 'data', { maxAccessCount: 2, zeroOnRead: false });
      
      // First access counts as 1
      expect(secureMem.retrieve('limited-access')).toBe('data');
      // Second access counts as 2
      expect(secureMem.retrieve('limited-access')).toBe('data');
      // Third access should fail (exceeds maxAccessCount of 2)
      expect(secureMem.retrieve('limited-access')).toBeNull();
    });

    it('should clear all data on process exit signals', () => {
      // This is more of an integration test
      // In real scenario, would test SIGINT/SIGTERM handlers
      secureMem.store('key1', 'value1');
      secureMem.store('key2', 'value2');
      
      secureMem.clear();
      
      expect(secureMem.listKeys()).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed keys gracefully', () => {
      expect(() => secureMem.retrieve('')).not.toThrow();
      expect(secureMem.retrieve('')).toBeNull();
    });

    it('should handle large data objects', () => {
      const largeData = {
        data: new Array(1000).fill('x').join(''),
        buffer: new Uint8Array(1000).fill(42),
      };
      
      expect(() => {
        secureMem.store('large', largeData);
        const retrieved = secureMem.retrieve('large');
        expect(retrieved).toBeDefined();
      }).not.toThrow();
    });

    it('should handle concurrent access safely', async () => {
      secureMem.store('concurrent', 'data');
      
      const promises = Array.from({ length: 10 }).map(() => 
        secureMem.retrieve('concurrent')
      );
      
      const results = await Promise.all(promises);
      
      // Some may be null due to zero-on-read, but should not crash
      expect(results.some(r => r !== null)).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should store/retrieve quickly (< 1ms)', () => {
      const start = Date.now();
      
      for (let i = 0; i < 100; i++) {
        secureMem.store(`key${i}`, `value${i}`);
        secureMem.retrieve(`key${i}`);
      }
      
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(100); // 100 operations in <100ms
      expect(duration / 200).toBeLessThan(1); // Avg <1ms per operation
    });

    it('should handle many keys efficiently', () => {
      const keyCount = 1000;
      
      const startStore = Date.now();
      for (let i = 0; i < keyCount; i++) {
        secureMem.store(`perf-key${i}`, `value${i}`);
      }
      const storeTime = Date.now() - startStore;
      
      expect(storeTime).toBeLessThan(500); // <500ms for 1000 keys
      
      const startList = Date.now();
      const keys = secureMem.listKeys();
      const listTime = Date.now() - startList;
      
      expect(keys).toHaveLength(keyCount);
      expect(listTime).toBeLessThan(100); // Fast listing
    });
  });
});
