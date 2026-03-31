/**
 * tests/contentModerator.test.ts
 * Test content moderation system for Agent Social
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import {
  moderateContent,
  contentModerator,
  getModerationResult,
  batchModerateContents,
  clearModerationCache,
  getCacheStats,
} from '../src/middleware/contentModerator.js';

describe('Content Moderation System', () => {
  beforeEach(() => {
    clearModerationCache();
  });

  describe('Toxicity Detection', () => {
    it('should detect hate speech', () => {
      const result = moderateContent('I hate all stupid people from that race');
      
      expect(result.isSafe).toBe(false);
      expect(result.categories.hateSpeech).toBe(true);
      expect(result.recommendation).toBe('REJECT');
    });

    it('should detect harassment and threats', () => {
      const result = moderateContent('I will kill you if you don\'t listen to me');
      
      expect(result.isSafe).toBe(false);
      expect(result.categories.harassment).toBe(true);
      expect(result.recommendation).toBe('REJECT');
    });

    it('should detect sexual content', () => {
      const result = moderateContent('Check out this porn video at my website');
      
      expect(result.isSafe).toBe(false);
      expect(result.categories.sexual).toBe(true);
      expect(result.categories.adultContent).toBe(true);
    });

    it('should detect violence', () => {
      const result = moderateContent('Let\'s have a fight and I will beat you up');
      
      expect(result.isSafe).toBe(false);
      expect(result.categories.violence).toBe(true);
    });

    it('should allow safe content', () => {
      const result = moderateContent('Hello everyone! This is a friendly post about crypto trading.');
      
      expect(result.isSafe).toBe(true);
      expect(result.categories.toxic).toBe(false);
      expect(result.recommendation).toBe('APPROVE');
    });

    it('should handle Indonesian toxic content', () => {
      const result = moderateContent('Saya benci orang bodoh itu, saya akan menghabisinya');
      
      expect(result.isSafe).toBe(false);
      expect(result.categories.hateSpeech).toBe(true);
      expect(result.categories.harassment).toBe(true);
    });
  });

  describe('Scam Detection', () => {
    it('should detect guaranteed returns scam', () => {
      const result = moderateContent('Invest now! Guaranteed profit 100% without any risk!');
      
      expect(result.isSafe).toBe(false);
      expect(result.categories.scam).toBe(true);
      expect(result.confidence).toBeLessThan(50);
    });

    it('should detect urgency tactics', () => {
      const result = moderateContent('ACT NOW! Limited time offer! Don\'t miss out!');
      
      expect(result.isSafe).toBe(false);
      expect(result.categories.scam).toBe(true);
    });

    it('should detect get-rich-quick schemes', () => {
      const result = moderateContent('Get rich quick with our passive income system. Double your money in 24 hours!');
      
      expect(result.isSafe).toBe(false);
      expect(result.categories.scam).toBe(true);
      expect(result.categories.financialAdvice).toBe(true);
    });

    it('should detect impersonation claims', () => {
      const result = moderateContent('I am official support team member. Send me your private key for verification.');
      
      expect(result.isSafe).toBe(false);
      expect(result.categories.scam).toBe(true);
    });

    it('should detect financial advice', () => {
      const result = moderateContent('Follow my trading signals for guaranteed profits. Investment tip: Buy this token now!');
      
      expect(result.isSafe).toBe(false);
      expect(result.categories.financialAdvice).toBe(true);
      expect(result.categories.scam).toBe(true);
    });

    it('should detect crypto blocklist terms', () => {
      const result = moderateContent('This is not a rug pull or exit scam. Trust me!');
      
      expect(result.isSafe).toBe(false);
      expect(result.categories.scam).toBe(true);
    });

    it('should allow legitimate business content', () => {
      const result = moderateContent('Our company provides blockchain consulting services. Contact us for more information.');
      
      expect(result.isSafe).toBe(true);
      expect(result.categories.scam).toBe(false);
    });
  });

  describe('Spam Detection', () => {
    it('should detect repeated words', () => {
      const result = moderateContent('BUY BUY BUY NOW NOW NOW!!!');
      
      expect(result.isSafe).toBe(false);
      expect(result.categories.spam).toBe(true);
    });

    it('should detect excessive punctuation', () => {
      const result = moderateContent('AMAZING DEAL!!!!!! DON\'T MISS OUT!!!!!!!!');
      
      expect(result.isSafe).toBe(false);
      expect(result.categories.spam).toBe(true);
    });

    it('should detect ALL CAPS spam', () => {
      const result = moderateContent('THIS IS THE BEST INVESTMENT OPPORTUNITY EVER CREATED IN THE HISTORY OF MANKIND');
      
      expect(result.isSafe).toBe(false);
      expect(result.categories.spam).toBe(true);
    });

    it('should detect multiple URLs', () => {
      const result = moderateContent('Check these links: https://site1.com https://site2.com https://site3.com');
      
      expect(result.isSafe).toBe(false);
      expect(result.categories.spam).toBe(true);
    });

    it('should allow single URL in context', () => {
      const result = moderateContent('Here\'s our official website: https://example.com');
      
      expect(result.isSafe).toBe(true);
      expect(result.categories.spam).toBe(false);
    });

    it('should detect abnormal length', () => {
      const short = moderateContent('Hi');
      expect(short.categories.spam).toBe(true);
      
      const long = moderateContent('a'.repeat(2500));
      expect(long.categories.spam).toBe(true);
    });
  });

  describe('Moderation Configurations', () => {
    it('should use strict mode', () => {
      const result = moderateContent('This investment has good potential', {
        strictMode: true,
      });
      
      // Strict mode may flag more content
      expect(result.confidence).toBeDefined();
    });

    it('should auto-reject toxic content when configured', () => {
      const result = moderateContent('You are an idiot', {
        autoRejectToxic: true,
      });
      
      expect(result.recommendation).toBe('REJECT');
      expect(result.categories.toxic).toBe(true);
    });

    it('should auto-reject scam content when configured', () => {
      const result = moderateContent('Guaranteed profit 100%', {
        autoRejectScam: true,
      });
      
      expect(result.recommendation).toBe('REJECT');
      expect(result.categories.scam).toBe(true);
    });

    it('should require human review when configured', () => {
      const result = moderateContent('Some questionable content here', {
        requireHumanReview: true,
      });
      
      expect(result.recommendation).toBe('REVIEW');
    });

    it('should use custom blocklist', () => {
      const result = moderateContent('This project uses banned technology XYZ', {
        customBlocklist: ['banned', 'XYZ'],
      });
      
      expect(result.flaggedTerms).toContain('XYZ');
    });

    it('should use custom patterns', () => {
      const customPattern = /\b(CUSTOM_SPAM)\b/i;
      const result = moderateContent('This is CUSTOM_SPAM content', {
        customPatterns: [customPattern],
      });
      
      expect(result.flaggedTerms).toContain(customPattern.toString());
    });
  });

  describe('Batch Moderation', () => {
    it('should moderate multiple contents at once', () => {
      const contents = [
        'Hello world!',
        'Guaranteed profit!',
        'You are stupid',
        'Nice project',
      ];
      
      const results = batchModerateContents(contents);
      
      expect(results).toHaveLength(4);
      expect(results[0].isSafe).toBe(true);
      expect(results[1].categories.scam).toBe(true);
      expect(results[2].categories.hateSpeech).toBe(true);
      expect(results[3].isSafe).toBe(true);
    });

    it('should apply same config to batch', () => {
      const contents = [
        'Safe content',
        'Scam: guaranteed profit',
      ];
      
      const results = batchModerateContents(contents, {
        autoRejectScam: true,
      });
      
      expect(results[0].recommendation).toBe('APPROVE');
      expect(results[1].recommendation).toBe('REJECT');
    });
  });

  describe('Middleware Integration', () => {
    it('should reject toxic content via middleware', async () => {
      const app = new Hono();
      
      app.use('/api/post/*', contentModerator({ autoRejectToxic: true }));
      app.post('/api/post/content', (c) => c.json({ success: true }));

      const res = await app.request('/api/post/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'This is toxic hate speech against stupid people',
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json() as any;
      expect(data.code).toBe('CONTENT_VIOLATION');
    });

    it('should approve safe content via middleware', async () => {
      const app = new Hono();
      
      app.use('/api/post/*', contentModerator());
      app.post('/api/post/content', (c) => {
        const modResult = getModerationResult(c);
        return c.json({ success: true, moderation: modResult });
      });

      const res = await app.request('/api/post/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'Hello everyone! Check out this amazing but legitimate project.',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.success).toBe(true);
      expect(data.moderation.isSafe).toBe(true);
    });

    it('should handle missing content gracefully', async () => {
      const app = new Hono();
      
      app.use('/api/post/*', contentModerator());
      app.post('/api/post/content', (c) => c.json({ success: true }));

      const res = await app.request('/api/post/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'No content field' }),
      });

      expect(res.status).toBe(200);
    });

    it('should attach moderation result to context', async () => {
      const app = new Hono();
      
      app.use('/api/post/*', contentModerator());
      app.post('/api/post/content', (c) => {
        const modResult = getModerationResult(c);
        return c.json({ moderation: modResult });
      });

      const res = await app.request('/api/post/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'Guaranteed profit here',
        }),
      });

      const data = await res.json() as any;
      expect(data.moderation).toBeDefined();
      expect(data.moderation.categories.scam).toBe(true);
    });
  });

  describe('Cache System', () => {
    it('should cache moderation results', () => {
      const content = 'Test content for caching';
      
      // First call - should process
      const result1 = moderateContent(content);
      const stats1 = getCacheStats();
      expect(stats1.size).toBeGreaterThanOrEqual(1);
      
      // Second call - should use cache
      const result2 = moderateContent(content);
      
      expect(result1.confidence).toBe(result2.confidence);
      expect(result1.isSafe).toBe(result2.isSafe);
    });

    it('should clear cache on demand', () => {
      moderateContent('Test content');
      
      expect(getCacheStats().size).toBeGreaterThan(0);
      
      clearModerationCache();
      
      expect(getCacheStats().size).toBe(0);
    });

    it('should handle cache size limits', () => {
      // Add many entries
      for (let i = 0; i < 100; i++) {
        moderateContent(`Test content ${i}`);
      }
      
      const stats = getCacheStats();
      expect(stats.size).toBeLessThanOrEqual(1000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content', () => {
      const result = moderateContent('');
      
      expect(result).toBeDefined();
      expect(result.confidence).toBeDefined();
    });

    it('should handle very long content', () => {
      const longContent = 'a'.repeat(10000);
      const result = moderateContent(longContent);
      
      expect(result).toBeDefined();
      expect(result.categories.spam).toBe(true);
    });

    it('should handle mixed languages', () => {
      const result = moderateContent('Hello大家好，this is 一个测试 content');
      
      expect(result).toBeDefined();
      expect(result.isSafe).toBe(true);
    });

    it('should handle special characters', () => {
      const result = moderateContent('!@#$%^&*()_+-=[]{}|;\':",./<>?');
      
      expect(result).toBeDefined();
    });

    it('should handle emojis', () => {
      const result = moderateContent('🚀🌙💎🙌 To the moon!');
      
      expect(result).toBeDefined();
      expect(result.isSafe).toBe(true);
    });
  });

  describe('Confidence Scoring', () => {
    it('should have high confidence for safe content', () => {
      const result = moderateContent('This is a completely normal and safe post');
      
      expect(result.confidence).toBeGreaterThan(70);
      expect(result.isSafe).toBe(true);
    });

    it('should have low confidence for violating content', () => {
      const result = moderateContent('Kill all idiots and steal their money guaranteed');
      
      expect(result.confidence).toBeLessThan(30);
      expect(result.isSafe).toBe(false);
    });

    it('should calculate confidence based on violations', () => {
      const mildViolation = moderateContent('Maybe some questionable content');
      const severeViolation = moderateContent('Definitely harmful scam content');
      
      expect(mildViolation.confidence).toBeGreaterThan(severeViolation.confidence);
    });
  });

  describe('Performance', () => {
    it('should moderate quickly (< 10ms per content)', () => {
      const content = 'Test content for performance measurement';
      const iterations = 100;
      
      const start = Date.now();
      for (let i = 0; i < iterations; i++) {
        moderateContent(content);
      }
      const duration = Date.now() - start;
      
      expect(duration / iterations).toBeLessThan(10);
    });

    it('should benefit from caching', () => {
      const content = 'Cached content test';
      
      // First call (no cache)
      moderateContent(content);
      
      // Second call (cached)
      const start = Date.now();
      for (let i = 0; i < 100; i++) {
        moderateContent(content);
      }
      const duration = Date.now() - start;
      
      expect(duration / 100).toBeLessThan(1); // < 1ms when cached
    });
  });

  describe('Real-world Scenarios', () => {
    it('should detect sophisticated scam', () => {
      const scamText = `
        🚀 EXCLUSIVE INVESTMENT OPPORTUNITY! 🚀
        
        Our AI-powered trading bot guarantees 5% daily returns!
        This is NOT a scam - we are verified and regulated.
        
        ⚠️ LIMITED SPOTS AVAILABLE! ⚠️
        
        Act now before it's too late! 
        Send 1 SOL to get started + receive 10% bonus!
        
        Official support: @fake_support_admin
      `;
      
      const result = moderateContent(scamText);
      
      expect(result.isSafe).toBe(false);
      expect(result.categories.scam).toBe(true);
      expect(result.categories.spam).toBe(true);
    });

    it('should allow legitimate announcement', () => {
      const announcement = `
        New Token Launch Announcement!
        
        We're excited to introduce our latest DeFi project.
        Tokenomics: 5% LP, 5% marketing, 90% liquidity.
        
        Contract address: 0x123...abc
        Website: https://example.com
        
        Not financial advice. DYOR!
      `;
      
      const result = moderateContent(announcement);
      
      expect(result.isSafe).toBe(true);
      expect(result.categories.scam).toBe(false);
    });

    it('should detect subtle toxicity', () => {
      const toxicText = 'Only morons would fall for this obvious scam. Admin team is incompetent.';
      
      const result = moderateContent(toxicText);
      
      expect(result.isSafe).toBe(false);
      expect(result.categories.toxic).toBe(true);
      expect(result.categories.hateSpeech).toBe(true);
    });
  });
});
