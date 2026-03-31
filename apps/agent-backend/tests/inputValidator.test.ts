/**
 * tests/inputValidator.test.ts
 * Test input validation and sanitization middleware
 */

import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import {
  validateInputMiddleware,
  validateInput,
  sanitizeString,
  sanitizeHTML,
  escapeHTML,
  deepSanitize,
  isValidSolanaAddress,
  isValidEmail,
  isValidURL,
  detectSQLInjection,
  detectMaliciousInput,
  tokenLaunchValidator,
  loginValidator,
  getSanitizedData,
} from '../src/middleware/inputValidator.js';

describe('Input Validation & Sanitization', () => {
  describe('sanitizeString - XSS Prevention', () => {
    it('should remove script tags', () => {
      const malicious = '<script>alert("XSS")</script>Hello';
      const sanitized = sanitizeString(malicious);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('Hello');
    });

    it('should remove event handlers', () => {
      const malicious = '<img src="x" onerror="alert(1)">';
      const sanitized = sanitizeString(malicious);
      
      expect(sanitized).not.toContain('onerror');
      expect(sanitized).not.toContain('onclick');
    });

    it('should remove javascript: protocol', () => {
      const malicious = 'javascript:alert("XSS")';
      const sanitized = sanitizeString(malicious);
      
      expect(sanitized).not.toContain('javascript:');
    });

    it('should remove data: URIs', () => {
      const malicious = 'data:text/html,<script>alert(1)</script>';
      const sanitized = sanitizeString(malicious);
      
      expect(sanitized).not.toContain('data:');
    });

    it('should remove null bytes', () => {
      const malicious = 'hello\0world';
      const sanitized = sanitizeString(malicious);
      
      expect(sanitized).toBe('helloworld');
    });

    it('should remove control characters', () => {
      const malicious = 'hello\x01\x02\x03world';
      const sanitized = sanitizeString(malicious);
      
      expect(sanitized).toBe('helloworld');
    });

    it('should preserve normal strings', () => {
      const normal = 'Hello World! This is a normal string.';
      const sanitized = sanitizeString(normal);
      
      expect(sanitized).toBe(normal);
    });

    it('should trim whitespace', () => {
      const str = '   hello world   ';
      const sanitized = sanitizeString(str);
      
      expect(sanitized).toBe('hello world');
    });
  });

  describe('sanitizeHTML - HTML Sanitization', () => {
    it('should allow safe tags', () => {
      const html = '<p>Hello <strong>World</strong></p>';
      const sanitized = sanitizeHTML(html);
      
      expect(sanitized).toContain('<p>');
      expect(sanitized).toContain('<strong>');
    });

    it('should remove dangerous tags', () => {
      const html = '<p>Safe</p><script>alert(1)</script>';
      const sanitized = sanitizeHTML(html);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('<p>');
    });

    it('should handle mixed content', () => {
      const html = '<b>Bold</b><iframe src="evil.com"></iframe>';
      const sanitized = sanitizeHTML(html);
      
      expect(sanitized).toContain('<b>');
      expect(sanitized).not.toContain('<iframe>');
    });
  });

  describe('escapeHTML - HTML Escaping', () => {
    it('should escape special characters', () => {
      const str = '<script>&"</script>';
      const escaped = escapeHTML(str);
      
      expect(escaped).toContain('&lt;');
      expect(escaped).toContain('&gt;');
      expect(escaped).toContain('&amp;');
      expect(escaped).toContain('&quot;');
    });

    it('should prevent XSS via escaping', () => {
      const malicious = '<script>alert("XSS")</script>';
      const escaped = escapeHTML(malicious);
      
      expect(escaped).not.toContain('<script>');
      expect(escaped).toContain('&lt;script&gt;');
    });
  });

  describe('deepSanitize - Object Sanitization', () => {
    it('should sanitize nested objects', () => {
      const obj = {
        name: '  John  ',
        bio: '<script>alert(1)</script>Developer',
        address: {
          street: '  Main St  ',
          city: '<b>Boston</b>',
        },
      };
      
      const sanitized = deepSanitize(obj);
      
      expect(sanitized.name).toBe('John');
      expect(sanitized.bio).not.toContain('<script>');
      expect(sanitized.address.street).toBe('Main St');
    });

    it('should sanitize arrays', () => {
      const arr = [
        '  item1  ',
        '<script>alert(1)</script>',
        { name: '  John  ' },
      ];
      
      const sanitized = deepSanitize(arr);
      
      expect(sanitized[0]).toBe('item1');
      expect(sanitized[1]).not.toContain('<script>');
      expect(sanitized[2].name).toBe('John');
    });

    it('should preserve non-string values', () => {
      const obj = {
        number: 42,
        boolean: true,
        null: null,
        undefined: undefined,
      };
      
      const sanitized = deepSanitize(obj);
      
      expect(sanitized.number).toBe(42);
      expect(sanitized.boolean).toBe(true);
      expect(sanitized.null).toBe(null);
    });
  });

  describe('Validation Functions', () => {
    describe('isValidSolanaAddress', () => {
      it('should accept valid Solana addresses', () => {
        expect(isValidSolanaAddress('So11111111111111111111111111111111111111112')).toBe(true);
        expect(isValidSolanaAddress('11111111111111111111111111111111')).toBe(true);
      });

      it('should reject invalid addresses', () => {
        expect(isValidSolanaAddress('invalid_address')).toBe(false);
        expect(isValidSolanaAddress('')).toBe(false);
        expect(isValidSolanaAddress('too_short')).toBe(false);
      });
    });

    describe('isValidEmail', () => {
      it('should accept valid emails', () => {
        expect(isValidEmail('user@example.com')).toBe(true);
        expect(isValidEmail('test.user@domain.co.uk')).toBe(true);
      });

      it('should reject invalid emails', () => {
        expect(isValidEmail('invalid')).toBe(false);
        expect(isValidEmail('@example.com')).toBe(false);
        expect(isValidEmail('user@')).toBe(false);
      });
    });

    describe('isValidURL', () => {
      it('should accept valid URLs', () => {
        expect(isValidURL('https://example.com')).toBe(true);
        expect(isValidURL('http://test.com/path?query=1')).toBe(true);
      });

      it('should reject invalid URLs', () => {
        expect(isValidURL('not_a_url')).toBe(false);
        expect(isValidURL('ftp://invalid.com')).toBe(false);
      });
    });

    describe('detectSQLInjection', () => {
      it('should detect SQL injection attempts', () => {
        expect(detectSQLInjection("SELECT * FROM users")).toBe(true);
        expect(detectSQLInjection("DROP TABLE users")).toBe(true);
        expect(detectSQLInjection("1' OR '1'='1")).toBe(false); // Simple pattern
      });

      it('should not flag normal text', () => {
        expect(detectSQLInjection('Hello World')).toBe(false);
        expect(detectSQLInjection('I love SELECTING food')).toBe(false);
      });
    });
  });

  describe('validateInput - Schema Validation', () => {
    it('should validate required fields', () => {
      const schema = {
        name: { type: 'string' as const, required: true },
      };
      
      const result = validateInput({}, schema);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'REQUIRED')).toBe(true);
    });

    it('should validate types', () => {
      const schema = {
        age: { type: 'number' as const, required: true },
      };
      
      const result = validateInput({ age: 'not_a_number' }, schema);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_TYPE')).toBe(true);
    });

    it('should validate string length', () => {
      const schema = {
        username: { type: 'string' as const, minLength: 3, maxLength: 10 },
      };
      
      const tooShort = validateInput({ username: 'ab' }, schema);
      expect(tooShort.valid).toBe(false);
      
      const tooLong = validateInput({ username: 'verylongusername' }, schema);
      expect(tooLong.valid).toBe(false);
      
      const justRight = validateInput({ username: 'john' }, schema);
      expect(justRight.valid).toBe(true);
    });

    it('should validate number range', () => {
      const schema = {
        age: { type: 'number' as const, min: 18, max: 100 },
      };
      
      const tooYoung = validateInput({ age: 15 }, schema);
      expect(tooYoung.valid).toBe(false);
      
      const tooOld = validateInput({ age: 120 }, schema);
      expect(tooOld.valid).toBe(false);
      
      const valid = validateInput({ age: 25 }, schema);
      expect(valid.valid).toBe(true);
    });

    it('should validate patterns', () => {
      const schema = {
        ticker: { type: 'string' as const, pattern: /^[A-Z]+$/ },
      };
      
      const invalid = validateInput({ ticker: 'abc123' }, schema);
      expect(invalid.valid).toBe(false);
      
      const valid = validateInput({ ticker: 'ABC' }, schema);
      expect(valid.valid).toBe(true);
    });

    it('should sanitize valid data', () => {
      const schema = {
        name: { type: 'string' as const, required: true },
      };
      
      const result = validateInput({ name: '  John  ' }, schema);
      
      expect(result.valid).toBe(true);
      expect(result.sanitizedData.name).toBe('John');
    });
  });

  describe('Pre-configured Validators', () => {
    describe('tokenLaunchValidator', () => {
      it('should accept valid token launch data', async () => {
        const app = new Hono();
        
        app.use('/launch/*', tokenLaunchValidator);
        app.post('/launch/token', (c) => {
          const data = getSanitizedData(c);
          return c.json({ success: true, data });
        });

        const res = await app.request('/launch/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Test Token',
            ticker: 'TEST',
            description: 'This is a test token for demonstration purposes',
            agent_wallet: 'So11111111111111111111111111111111111111112',
            website: 'https://example.com',
          }),
        });

        expect(res.status).toBe(200);
      });

      it('should reject invalid token data', async () => {
        const app = new Hono();
        
        app.use('/launch/*', tokenLaunchValidator);
        app.post('/launch/token', (c) => c.json({ ok: true }));

        const res = await app.request('/launch/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'X', // Too short
            ticker: 'invalid!', // Invalid chars
            description: 'Short', // Too short
          }),
        });

        expect(res.status).toBe(400);
      });
    });

    describe('loginValidator', () => {
      it('should accept valid credentials', async () => {
        const app = new Hono();
        
        app.use('/auth/*', loginValidator);
        app.post('/auth/login', (c) => {
          const data = getSanitizedData(c);
          return c.json({ success: true, data });
        });

        const res = await app.request('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'user@example.com',
            password: 'SecurePassword123!',
          }),
        });

        expect(res.status).toBe(200);
      });

      it('should reject invalid credentials', async () => {
        const app = new Hono();
        
        app.use('/auth/*', loginValidator);
        app.post('/auth/login', (c) => c.json({ ok: true }));

        const res = await app.request('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'invalid_email',
            password: 'short', // Too short
          }),
        });

        expect(res.status).toBe(400);
      });
    });
  });

  describe('Malicious Input Detection', () => {
    it('should detect XSS attempts', () => {
      const result = detectMaliciousInput('<script>alert("XSS")</script>');
      
      expect(result.isMalicious).toBe(true);
      expect(result.threats).toContain('XSS_SCRIPT_DETECTED');
    });

    it('should detect multiple threats', () => {
      const input = '<script>alert(1)</script>; DROP TABLE users;';
      const result = detectMaliciousInput(input);
      
      expect(result.isMalicious).toBe(true);
      expect(result.threats.length).toBeGreaterThanOrEqual(1);
    });

    it('should allow safe input', () => {
      const result = detectMaliciousInput('Hello World! This is safe.');
      
      expect(result.isMalicious).toBe(false);
      expect(result.threats).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty input', () => {
      expect(sanitizeString('')).toBe('');
      expect(deepSanitize(null)).toBe(null);
      expect(deepSanitize(undefined)).toBe(undefined);
    });

    it('should handle unicode characters', () => {
      const str = '你好世界 🌍';
      const sanitized = sanitizeString(str);
      
      expect(sanitized).toBe(str);
    });

    it('should handle very long strings', () => {
      const longStr = 'a'.repeat(10000);
      const sanitized = sanitizeString(longStr);
      
      expect(sanitized).toBe(longStr);
    });

    it('should handle special but safe characters', () => {
      const str = 'Price: $100 > £50 < €60';
      const sanitized = sanitizeString(str);
      
      expect(sanitized).toBe(str);
    });
  });

  describe('Performance', () => {
    it('should sanitize quickly (< 1ms per string)', () => {
      const str = 'Hello World! This is a test string for performance.';
      const iterations = 1000;
      
      const start = Date.now();
      for (let i = 0; i < iterations; i++) {
        sanitizeString(str);
      }
      const duration = Date.now() - start;
      
      expect(duration / iterations).toBeLessThan(1); // < 1ms per operation
    });

    it('should validate objects efficiently', () => {
      const obj = {
        name: 'Test',
        email: 'test@example.com',
        age: 25,
      };
      
      const schema = {
        name: { type: 'string' as const },
        email: { type: 'email' as const },
        age: { type: 'number' as const },
      };
      
      const iterations = 1000;
      const start = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        validateInput(obj, schema);
      }
      const duration = Date.now() - start;
      
      expect(duration / iterations).toBeLessThan(2); // < 2ms per validation
    });
  });
});
