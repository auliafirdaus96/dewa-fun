/**
 * Crypto Utils Tests
 * 
 * Tests untuk fungsi-fungsi kriptografi di utils/crypto.ts
 * Menguji enkripsi, dekripsi, dan masking key
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Set required env var for crypto module
process.env.ENCRYPTION_KEY = 'test-encryption-key-that-is-at-least-32-chars-long'

describe('Crypto Utils', () => {
  let encrypt: any
  let decrypt: any
  let maskKey: any

  beforeEach(async () => {
    // Clear module cache to ensure fresh import with env var set
    vi.resetModules()
    
    const cryptoUtils = await import('../../utils/crypto')
    encrypt = cryptoUtils.encrypt
    decrypt = cryptoUtils.decrypt
    maskKey = cryptoUtils.maskKey
  })

  describe('encrypt', () => {
    it('should encrypt a string successfully', () => {
      const text = 'Hello, World!'
      const encrypted = encrypt(text)
      
      expect(encrypted).toBeDefined()
      expect(typeof encrypted).toBe('string')
      expect(encrypted).toContain(':') // Should have format iv:authTag:data
    })

    it('should return empty string for empty input', () => {
      const result = encrypt('')
      expect(result).toBe('')
    })

    it('should return empty string for null input', () => {
      const result = encrypt(null as any)
      expect(result).toBe('')
    })

    it('should return empty string for undefined input', () => {
      const result = encrypt(undefined as any)
      expect(result).toBe('')
    })

    it('should produce different encrypted output for same input (due to random IV)', () => {
      const text = 'Test data'
      const encrypted1 = encrypt(text)
      const encrypted2 = encrypt(text)
      
      expect(encrypted1).not.toBe(encrypted2)
    })

    it('should include IV, auth tag, and encrypted data in correct format', () => {
      const text = 'Test message'
      const encrypted = encrypt(text)
      
      const parts = encrypted.split(':')
      expect(parts).toHaveLength(3)
      
      const [ivHex, authTagHex, dataHex] = parts
      
      // IV should be 12 bytes = 24 hex characters
      expect(ivHex).toHaveLength(24)
      
      // Auth tag should be 16 bytes = 32 hex characters
      expect(authTagHex).toHaveLength(32)
      
      // Encrypted data should be present
      expect(dataHex).toBeDefined()
      expect(dataHex.length).toBeGreaterThan(0)
    })

    it('should handle special characters', () => {
      const text = 'Special chars: @#$%^&*()_+-=[]{}|;:,.<>?!🔐'
      const encrypted = encrypt(text)
      
      expect(encrypted).toBeDefined()
      expect(encrypted).toContain(':')
    })

    it('should handle unicode characters', () => {
      const text = 'Unicode: 你好世界 مرحبا بالعالم'
      const encrypted = encrypt(text)
      
      expect(encrypted).toBeDefined()
    })

    it('should handle long strings', () => {
      const text = 'A'.repeat(1000)
      const encrypted = encrypt(text)
      
      expect(encrypted).toBeDefined()
      expect(encrypted).toContain(':')
    })

    it('should handle JSON strings', () => {
      const json = JSON.stringify({ name: 'Test', value: 123 })
      const encrypted = encrypt(json)
      
      expect(encrypted).toBeDefined()
    })
  })

  describe('decrypt', () => {
    it('should decrypt encrypted text back to original', () => {
      const originalText = 'Secret message'
      const encrypted = encrypt(originalText)
      const decrypted = decrypt(encrypted)
      
      expect(decrypted).toBe(originalText)
    })

    it('should return empty string for empty input', () => {
      const result = decrypt('')
      expect(result).toBe('')
    })

    it('should return DECRYPTION_ERROR for invalid format', () => {
      const invalidData = 'not-valid-encrypted-data'
      const result = decrypt(invalidData)
      expect(result).toBe('DECRYPTION_ERROR')
    })

    it('should return DECRYPTION_ERROR for missing parts', () => {
      const incompleteData = 'iv:authTag' // Missing encrypted data
      const result = decrypt(incompleteData)
      expect(result).toBe('DECRYPTION_ERROR')
    })

    it('should handle decryption of special characters correctly', () => {
      const originalText = 'Special: @#$%^&*()'
      const encrypted = encrypt(originalText)
      const decrypted = decrypt(encrypted)
      
      expect(decrypted).toBe(originalText)
    })

    it('should handle decryption of unicode correctly', () => {
      const originalText = 'Unicode: 你好世界'
      const encrypted = encrypt(originalText)
      const decrypted = decrypt(encrypted)
      
      expect(decrypted).toBe(originalText)
    })

    it('should handle decryption of long strings correctly', () => {
      const originalText = 'B'.repeat(500)
      const encrypted = encrypt(originalText)
      const decrypted = decrypt(encrypted)
      
      expect(decrypted).toBe(originalText)
    })

    it('should handle decryption of JSON correctly', () => {
      const originalJson = JSON.stringify({ test: 'data', num: 456 })
      const encrypted = encrypt(originalJson)
      const decrypted = decrypt(encrypted)
      
      expect(JSON.parse(decrypted)).toEqual({ test: 'data', num: 456 })
    })

    it('should throw error when auth tag is tampered', () => {
      const originalText = 'Tamper test'
      const encrypted = encrypt(originalText)
      
      // Tamper with the encrypted data
      const parts = encrypted.split(':')
      const tamperedData = `${parts[0]}:${parts[1]}:tampered_data_here`
      
      const result = decrypt(tamperedData)
      expect(result).toBe('DECRYPTION_ERROR')
    })

    it('should fail when IV is modified', () => {
      const originalText = 'IV modification test'
      const encrypted = encrypt(originalText)
      
      // Modify IV
      const parts = encrypted.split(':')
      const modifiedIv = '000000000000000000000000' // All zeros
      const tamperedData = `${modifiedIv}:${parts[1]}:${parts[2]}`
      
      const result = decrypt(tamperedData)
      expect(result).toBe('DECRYPTION_ERROR')
    })
  })

  describe('encrypt + decrypt round trip', () => {
    it('should successfully encrypt and decrypt various texts', () => {
      const testCases = [
        'Simple text',
        '12345',
        'Special chars: !@#$%',
        'Unicode: こんにちは',
        'Mixed: Hello 世界 123!',
        JSON.stringify({ key: 'value', nested: { a: 1 } }),
        '',
      ]

      testCases.forEach((testCase) => {
        const encrypted = encrypt(testCase)
        const decrypted = decrypt(encrypted)
        
        if (testCase === '') {
          expect(decrypted).toBe('')
        } else {
          expect(decrypted).toBe(testCase)
        }
      })
    })
  })

  describe('maskKey', () => {
    it('should mask API key showing only first and last 4 characters', () => {
      const key = 'sk_test_1234567890abcdef'
      const masked = maskKey(key)
      
      expect(masked).toBe('sk_t••••••••cdef')
    })

    it('should return empty string for empty input', () => {
      const result = maskKey('')
      expect(result).toBe('')
    })

    it('should return all bullets for short keys (<= 8 chars)', () => {
      expect(maskKey('short')).toBe('••••••••')
      expect(maskKey('12345678')).toBe('••••••••')
    })

    it('should mask exactly 8 character key with bullets', () => {
      const result = maskKey('12345678')
      expect(result).toBe('••••••••')
    })

    it('should mask 9 character key (first edge case)', () => {
      const result = maskKey('123456789')
      // Implementation shows first 4 and last 4 chars with 8 bullets in middle
      expect(result).toBe('1234••••••••6789')
    })

    it('should mask long keys correctly', () => {
      const key = 'very_long_api_key_1234567890'
      const masked = maskKey(key)
      
      expect(masked).toBe('very••••••••7890')
    })

    it('should handle keys with special characters', () => {
      const key = 'api-key_with-special@chars1234'
      const masked = maskKey(key)
      
      // Shows first 4 and last 4 chars
      expect(masked).toBe('api-••••••••1234')
    })

    it('should preserve case sensitivity in visible parts', () => {
      const key = 'AbCdEfGhIjKlMnOpQrStUvWxYz1234'
      const masked = maskKey(key)
      
      expect(masked).toBe('AbCd••••••••1234')
    })
  })

  describe('security properties', () => {
    it('should use random IV for each encryption', () => {
      const text = 'Same text for testing'
      const encryptions = Array(10).fill(null).map(() => encrypt(text))
      
      // All IVs should be unique (first part before :)
      const ivs = encryptions.map(e => e.split(':')[0])
      const uniqueIvs = new Set(ivs)
      
      expect(uniqueIvs.size).toBe(encryptions.length)
    })

    it('should produce different auth tags for same input', () => {
      const text = 'Auth tag test'
      const encryptions = Array(5).fill(null).map(() => encrypt(text))
      
      // All auth tags should be unique (second part)
      const authTags = encryptions.map(e => e.split(':')[1])
      const uniqueTags = new Set(authTags)
      
      expect(uniqueTags.size).toBe(encryptions.length)
    })
  })

  describe('error handling', () => {
    it('should handle malformed encrypted data gracefully', () => {
      const malformedData = 'invalid::format'
      const result = decrypt(malformedData)
      expect(result).toBe('DECRYPTION_ERROR')
    })

    it('should handle completely random string as encrypted data', () => {
      const randomString = Math.random().toString(36).substring(7)
      const result = decrypt(randomString)
      expect(result).toBe('DECRYPTION_ERROR')
    })

    it('should not crash on extremely long invalid input', () => {
      const longInvalid = 'x'.repeat(10000)
      const result = decrypt(longInvalid)
      expect(result).toBe('DECRYPTION_ERROR')
    })
  })

  describe('performance characteristics', () => {
    it('should encrypt small text quickly (< 100ms)', () => {
      const start = Date.now()
      encrypt('Quick test')
      const duration = Date.now() - start
      
      expect(duration).toBeLessThan(100)
    })

    it('should decrypt small text quickly (< 100ms)', () => {
      const encrypted = encrypt('Quick test')
      const start = Date.now()
      decrypt(encrypted)
      const duration = Date.now() - start
      
      expect(duration).toBeLessThan(100)
    })
  })
})
