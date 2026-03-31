/**
 * middleware/contentModerator.ts
 * AI-powered content moderation for Agent Social posts with toxicity, scam, and spam detection
 */

import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';

// ─── Types ──────────────────────────────────────────────────────────────────────

declare module 'hono' {
  interface ContextVariableMap {
    moderationResult?: ModerationResult;
  }
}

export interface ModerationResult {
  isSafe: boolean;
  confidence: number;
  categories: ModerationCategories;
  flaggedTerms: string[];
  recommendation: 'APPROVE' | 'REVIEW' | 'REJECT';
}

export interface ModerationCategories {
  toxic: boolean;
  hateSpeech: boolean;
  harassment: boolean;
  sexual: boolean;
  violence: boolean;
  selfHarm: boolean;
  scam: boolean;
  spam: boolean;
  adultContent: boolean;
  financialAdvice: boolean;
}

export interface ModerationConfig {
  strictMode?: boolean;
  autoRejectToxic?: boolean;
  autoRejectScam?: boolean;
  requireHumanReview?: boolean;
  customBlocklist?: string[];
  customPatterns?: RegExp[];
}

export interface ModerationCache {
  hash: string;
  result: ModerationResult;
  timestamp: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: Required<ModerationConfig> = {
  strictMode: false,
  autoRejectToxic: true,
  autoRejectScam: true,
  requireHumanReview: false,
  customBlocklist: [],
  customPatterns: [],
};

// Toxic/harmful keywords (Indonesian + English)
const TOXIC_KEYWORDS = [
  // Hate speech
  'benci', 'racist', 'racism', 'diskriminasi',
  'stupid', 'idiot', 'dumb', 'moron',
  
  // Harassment
  'ancaman', 'threat', 'kill', 'death',
  'bully', 'perundungan',
  
  // Sexual content
  'porn', 'xxx', 'nude', 'sex',
  'telanjang', 'bokep', 'mesum',
  
  // Violence
  'kill', 'murder', 'death threat',
  'kekerasan', 'pukulan', 'perkelahian',
];

// Scam indicators
const SCAM_INDICATORS = [
  // Guaranteed returns
  'guaranteed profit', 'pasti untung', '100% profit',
  'risk-free', 'tanpa risiko', 'jaminan profit',
  
  // Urgency tactics
  'act now', 'sekarang juga', 'limited time',
  'don\'t miss out', 'jangan sampai ketinggalan',
  
  // Too good to be true
  'get rich quick', 'cepat kaya',
  'double your money', 'lipat gandakan uang',
  'passive income', 'penghasilan pasif',
  
  // Impersonation
  'official support', 'team member', 'admin',
  'verified account', 'akun terverifikasi',
  
  // Financial promises
  'financial advice', 'investment tip', 'saran investasi',
  'trading signal', 'signal trading', 'pom-pom',
];

// Spam patterns
const SPAM_PATTERNS = [
  /(\w+)\s+\1\s+\1/i, // Repeated words (3+ times)
  /[!?]{5,}/, // Excessive punctuation
  /[A-Z]{20,}/, // ALL CAPS (20+ chars)
  /https?:\/\/\S+/g, // URLs (will be counted)
];

// Blocklist terms (crypto-specific)
const CRYPTO_BLOCKLIST = [
  'rug pull', 'exit scam', 'honeypot',
  'fake token', 'scam project',
  'giveaway', 'airdrop claim',
  'send ETH', 'send SOL', 'private key',
  'seed phrase', 'wallet connect',
];

// ─── Helper Functions ───────────────────────────────────────────────────────────

/**
 * Calculate text similarity (Levenshtein distance)
 */
function similarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  const longerLength = longer.length;
  
  if (longerLength === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longerLength - distance) / longerLength;
}

/**
 * Levenshtein distance algorithm
 */
function levenshteinDistance(str1: string, str2: string): number {
  const track = Array(str2.length + 1).fill(null).map(() =>
    Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i += 1) {
    track[0][i] = i;
  }
  
  for (let j = 0; j <= str2.length; j += 1) {
    track[j][0] = j;
  }
  
  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator,
      );
    }
  }
  
  return track[str2.length][str1.length];
}

/**
 * Generate content hash for caching
 */
function generateHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

/**
 * Count URL occurrences in text
 */
function countURLs(text: string): number {
  const urlPattern = /https?:\/\/\S+/g;
  const matches = text.match(urlPattern);
  return matches ? matches.length : 0;
}

/**
 * Check for keyword matches
 */
function checkKeywords(text: string, keywords: string[]): { found: boolean; matches: string[] } {
  const lowerText = text.toLowerCase();
  const matches: string[] = [];
  
  for (const keyword of keywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      matches.push(keyword);
    }
  }
  
  return {
    found: matches.length > 0,
    matches,
  };
}

/**
 * Detect scam patterns
 */
function detectScamPatterns(text: string): { score: number; indicators: string[] } {
  let score = 0;
  const indicators: string[] = [];
  const lowerText = text.toLowerCase();
  
  // Check for guaranteed returns
  if (/(guaranteed|jamin|pasti)\s*(profit|untung|return)/i.test(lowerText)) {
    score += 30;
    indicators.push('GUARANTEED_RETURNS');
  }
  
  // Check for urgency tactics
  if (/(act now|sekarang|limited|hurry|cepat)/i.test(lowerText)) {
    score += 20;
    indicators.push('URGENCY_TACTICS');
  }
  
  // Check for get-rich-quick
  if (/(get rich|cepat kaya|easy money|uang cepat)/i.test(lowerText)) {
    score += 30;
    indicators.push('GET_RICH_QUICK');
  }
  
  // Check for impersonation claims
  if (/(official|admin|support|verified|terverifikasi)/i.test(lowerText)) {
    score += 25;
    indicators.push('IMPERSONATION_CLAIM');
  }
  
  // Check for financial advice
  if (/(investment|trading|signal|advice|saran|rekomendasi)/i.test(lowerText)) {
    score += 20;
    indicators.push('FINANCIAL_ADVICE');
  }
  
  // Check crypto blocklist
  const cryptoMatches = checkKeywords(lowerText, CRYPTO_BLOCKLIST);
  if (cryptoMatches.found) {
    score += cryptoMatches.matches.length * 15;
    indicators.push(...cryptoMatches.matches.map(m => `BLOCKLIST_${m.toUpperCase()}`));
  }
  
  return {
    score: Math.min(100, score),
    indicators,
  };
}

/**
 * Detect spam characteristics
 */
function detectSpam(text: string): { score: number; characteristics: string[] } {
  let score = 0;
  const characteristics: string[] = [];
  
  // Check for repeated characters/words
  const repeatPattern = /(\w+)\s+\1\s+\1/i;
  if (repeatPattern.test(text)) {
    score += 30;
    characteristics.push('REPEATED_WORDS');
  }
  
  // Check for excessive punctuation
  const punctuationPattern = /[!?]{5,}/;
  if (punctuationPattern.test(text)) {
    score += 20;
    characteristics.push('EXCESSIVE_PUNCTUATION');
  }
  
  // Check for ALL CAPS
  const capsPattern = /[A-Z]{20,}/;
  if (capsPattern.test(text)) {
    score += 25;
    characteristics.push('ALL_CAPS');
  }
  
  // Count URLs (multiple URLs = likely spam)
  const urlCount = countURLs(text);
  if (urlCount > 2) {
    score += 40;
    characteristics.push('MULTIPLE_URLS');
  } else if (urlCount > 0) {
    score += 10;
    characteristics.push('CONTAINS_URL');
  }
  
  // Check length (very short or very long)
  if (text.length < 10 || text.length > 2000) {
    score += 15;
    characteristics.push('ABNORMAL_LENGTH');
  }
  
  return {
    score: Math.min(100, score),
    characteristics,
  };
}

/**
 * Detect toxic content
 */
function detectToxicity(text: string): { score: number; categories: string[] } {
  let score = 0;
  const categories: string[] = [];
  const lowerText = text.toLowerCase();
  
  // Check for hate speech
  const hateKeywords = ['benci', 'racist', 'racism', 'diskriminasi', 'stupid', 'idiot'];
  const hateMatches = checkKeywords(lowerText, hateKeywords);
  if (hateMatches.found) {
    score += hateMatches.matches.length * 20;
    categories.push('HATE_SPEECH');
  }
  
  // Check for harassment/threats
  const threatKeywords = ['ancaman', 'threat', 'kill', 'death', 'bully'];
  const threatMatches = checkKeywords(lowerText, threatKeywords);
  if (threatMatches.found) {
    score += threatMatches.matches.length * 25;
    categories.push('HARASSMENT_THREATS');
  }
  
  // Check for sexual content
  const sexualKeywords = ['porn', 'xxx', 'nude', 'sex', 'telanjang', 'bokep'];
  const sexualMatches = checkKeywords(lowerText, sexualKeywords);
  if (sexualMatches.found) {
    score += sexualMatches.matches.length * 30;
    categories.push('SEXUAL_CONTENT');
  }
  
  // Check for violence
  const violenceKeywords = ['kill', 'murder', 'kekerasan', 'pukulan'];
  const violenceMatches = checkKeywords(lowerText, violenceKeywords);
  if (violenceMatches.found) {
    score += violenceMatches.matches.length * 25;
    categories.push('VIOLENCE');
  }
  
  return {
    score: Math.min(100, score),
    categories,
  };
}

// ─── Cache System ───────────────────────────────────────────────────────────────

const moderationCache = new Map<string, ModerationCache>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedResult(content: string): ModerationResult | null {
  const hash = generateHash(content);
  const cached = moderationCache.get(hash);
  
  if (!cached) return null;
  
  // Check if cache expired
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    moderationCache.delete(hash);
    return null;
  }
  
  return cached.result;
}

function cacheResult(content: string, result: ModerationResult): void {
  const hash = generateHash(content);
  
  moderationCache.set(hash, {
    hash,
    result,
    timestamp: Date.now(),
  });
  
  // Cleanup old entries periodically
  if (moderationCache.size > 1000) {
    const now = Date.now();
    for (const [key, value] of moderationCache.entries()) {
      if (now - value.timestamp > CACHE_TTL) {
        moderationCache.delete(key);
      }
    }
  }
}

// ─── Main Moderation Function ───────────────────────────────────────────────────

/**
 * Moderate content using rule-based detection
 */
export function moderateContent(
  content: string,
  config: ModerationConfig = {}
): ModerationResult {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Check cache first
  const cached = getCachedResult(content);
  if (cached) {
    console.log('[ContentModerator] Cache hit');
    return cached;
  }
  
  const flaggedTerms: string[] = [];
  const categories: ModerationCategories = {
    toxic: false,
    hateSpeech: false,
    harassment: false,
    sexual: false,
    violence: false,
    selfHarm: false,
    scam: false,
    spam: false,
    adultContent: false,
    financialAdvice: false,
  };
  
  let overallScore = 0;
  
  // 1. Detect toxicity
  const toxicity = detectToxicity(content);
  if (toxicity.score >= 50) {
    categories.toxic = true;
    overallScore += toxicity.score * 0.4;
    
    if (toxicity.categories.includes('HATE_SPEECH')) {
      categories.hateSpeech = true;
    }
    if (toxicity.categories.includes('HARASSMENT_THREATS')) {
      categories.harassment = true;
    }
    if (toxicity.categories.includes('SEXUAL_CONTENT')) {
      categories.sexual = true;
      categories.adultContent = true;
    }
    if (toxicity.categories.includes('VIOLENCE')) {
      categories.violence = true;
    }
  }
  
  // 2. Detect scam attempts
  const scamDetection = detectScamPatterns(content);
  if (scamDetection.score >= 40) {
    categories.scam = true;
    overallScore += scamDetection.score * 0.4;
    
    if (scamDetection.indicators.includes('FINANCIAL_ADVICE')) {
      categories.financialAdvice = true;
    }
  }
  
  // 3. Detect spam
  const spamDetection = detectSpam(content);
  if (spamDetection.score >= 50) {
    categories.spam = true;
    overallScore += spamDetection.score * 0.2;
  }
  
  // 4. Check custom blocklist
  if (finalConfig.customBlocklist) {
    const customMatches = checkKeywords(content, finalConfig.customBlocklist);
    if (customMatches.found) {
      flaggedTerms.push(...customMatches.matches);
      overallScore += customMatches.matches.length * 10;
    }
  }
  
  // 5. Check custom patterns
  if (finalConfig.customPatterns) {
    for (const pattern of finalConfig.customPatterns) {
      if (pattern.test(content)) {
        flaggedTerms.push(pattern.toString());
        overallScore += 15;
      }
    }
  }
  
  // Determine recommendation
  let recommendation: 'APPROVE' | 'REVIEW' | 'REJECT' = 'APPROVE';
  
  if (overallScore >= 80 || (finalConfig.autoRejectToxic && categories.toxic) || 
      (finalConfig.autoRejectScam && categories.scam)) {
    recommendation = 'REJECT';
  } else if (overallScore >= 40 || finalConfig.requireHumanReview) {
    recommendation = 'REVIEW';
  }
  
  const result: ModerationResult = {
    isSafe: recommendation === 'APPROVE',
    confidence: Math.max(0, 100 - overallScore),
    categories,
    flaggedTerms,
    recommendation,
  };
  
  // Cache the result
  cacheResult(content, result);
  
  return result;
}

// ─── Middleware Factory ─────────────────────────────────────────────────────────

/**
 * Create content moderation middleware
 */
export function contentModerator(config: ModerationConfig = {}) {
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
      
      // Extract text content to moderate
      const contentToModerate = data.content || data.text || data.description || data.message;
      
      if (!contentToModerate || typeof contentToModerate !== 'string') {
        // No content to moderate, continue
        await next();
        return;
      }
      
      // Perform moderation
      const result = moderateContent(contentToModerate, config);
      
      // Attach result to context
      c.set('moderationResult', result);
      
      // Auto-reject if configured
      if (result.recommendation === 'REJECT') {
        console.log('[ContentModerator] Content rejected:', {
          path: c.req.path,
          categories: result.categories,
          confidence: result.confidence,
        });
        
        throw new HTTPException(400, {
          message: 'Content violates community guidelines',
          res: c.json({
            status: 'error',
            code: 'CONTENT_VIOLATION',
            moderation: {
              isSafe: result.isSafe,
              categories: result.categories,
              recommendation: result.recommendation,
            },
          }),
        });
      }
      
      // Continue to handler
      await next();
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      
      console.error('[ContentModerator] Unexpected error:', error);
      throw new HTTPException(500, {
        message: 'Internal server error during content moderation',
      });
    }
  };
}

// ─── Utility Functions ──────────────────────────────────────────────────────────

/**
 * Get moderation result from context
 */
export function getModerationResult(c: Context): ModerationResult | null {
  return c.get('moderationResult') as ModerationResult | null;
}

/**
 * Batch moderate multiple texts
 */
export function batchModerateContents(
  contents: string[],
  config: ModerationConfig = {}
): ModerationResult[] {
  return contents.map(content => moderateContent(content, config));
}

/**
 * Clear moderation cache
 */
export function clearModerationCache(): void {
  moderationCache.clear();
  console.log('[ContentModerator] Cache cleared');
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; ttl: number } {
  const now = Date.now();
  let validEntries = 0;
  
  for (const [, value] of moderationCache.entries()) {
    if (now - value.timestamp < CACHE_TTL) {
      validEntries++;
    }
  }
  
  return {
    size: validEntries,
    ttl: CACHE_TTL,
  };
}
