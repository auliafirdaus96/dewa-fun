/**
 * middleware/walletVerifier.ts
 * Wallet ownership verification using challenge-response signature protocol
 */

import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { PublicKey, type TransactionSignature } from '@solana/web3.js';

// ─── Types ──────────────────────────────────────────────────────────────────────

declare module 'hono' {
  interface ContextVariableMap {
    walletVerified?: boolean;
    walletAddress?: string;
  }
}

export interface VerificationChallenge {
  challenge: string;
  message: string;
  expiresAt: number;
  walletAddress: string;
  nonce: string;
}

export interface VerificationResult {
  verified: boolean;
  walletAddress: string;
  verifiedAt: number;
  signature?: string;
  error?: string;
}

export interface VerificationConfig {
  challengeExpiryMs?: number;
  requireRecentSignature?: boolean;
  signatureMaxAgeMs?: number;
  allowedAddressTypes?: ('wallet' | 'agent')[];
}

export interface VerificationCache {
  challenges: Map<string, VerificationChallenge>;
  verifications: Map<string, VerificationResult>;
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: Required<VerificationConfig> = {
  challengeExpiryMs: 5 * 60 * 1000, // 5 minutes
  requireRecentSignature: true,
  signatureMaxAgeMs: 10 * 60 * 1000, // 10 minutes
  allowedAddressTypes: ['wallet', 'agent'],
};

const CHALLENGE_PREFIX = 'DEWA_FUN_VERIFICATION:';
const NONCE_LENGTH = 32;

// ─── Cache System ───────────────────────────────────────────────────────────────

const cache: VerificationCache = {
  challenges: new Map(),
  verifications: new Map(),
};

const CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Start automatic cache cleanup
 */
function startCleanup(): void {
  if (cleanupInterval) return;
  
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    
    // Cleanup expired challenges
    for (const [key, challenge] of cache.challenges.entries()) {
      if (now > challenge.expiresAt) {
        cache.challenges.delete(key);
      }
    }
    
    // Cleanup old verifications (older than 1 hour)
    const verificationMaxAge = 60 * 60 * 1000;
    for (const [key, verification] of cache.verifications.entries()) {
      if (now - verification.verifiedAt > verificationMaxAge) {
        cache.verifications.delete(key);
      }
    }
  }, CACHE_CLEANUP_INTERVAL);
  
  // Cleanup on process exit
  process.on('exit', () => {
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
    }
  });
}

// ─── Helper Functions ───────────────────────────────────────────────────────────

/**
 * Generate cryptographically secure random nonce
 */
function generateNonce(): string {
  const crypto = require('crypto');
  return crypto.randomBytes(NONCE_LENGTH).toString('hex');
}

/**
 * Generate challenge message for signing
 */
function generateChallengeMessage(walletAddress: string, nonce: string): string {
  const timestamp = Date.now();
  const challenge = `${CHALLENGE_PREFIX}${walletAddress}:${nonce}:${timestamp}`;
  
  return `Welcome to Dewa.fun!

Please sign this message to verify your wallet ownership.

Wallet: ${walletAddress}
Challenge: ${challenge}
Timestamp: ${new Date(timestamp).toISOString()}

⚠️ DO NOT sign this message if you didn't request it.
⚠️ This signature will not trigger any blockchain transaction.

By signing, you confirm that you own this wallet address.`;
}

/**
 * Generate unique challenge key
 */
function generateChallengeKey(walletAddress: string, nonce: string): string {
  const crypto = require('crypto');
  return crypto
    .createHash('sha256')
    .update(`${walletAddress}:${nonce}`)
    .digest('hex');
}

/**
 * Validate Solana address format
 */
function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Verify Ed25519 signature (Solana signature format)
 */
async function verifySignature(
  message: string,
  signature: string,
  publicKey: string
): Promise<boolean> {
  try {
    const { verify } = await import('@noble/ed25519');
    
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = Buffer.from(signature, 'base64');
    const publicKeyBytes = new PublicKey(publicKey).toBytes();
    
    const isValid = await verify(signatureBytes, messageBytes, publicKeyBytes);
    
    return isValid;
  } catch (error) {
    console.error('[WalletVerifier] Signature verification error:', error);
    return false;
  }
}

/**
 * Check if signature is recent enough
 */
function isSignatureRecent(verifiedAt: number, maxAgeMs: number): boolean {
  return Date.now() - verifiedAt < maxAgeMs;
}

// ─── Core Verification Functions ────────────────────────────────────────────────

/**
 * Create a new verification challenge
 */
export function createChallenge(walletAddress: string): VerificationChallenge {
  if (!isValidSolanaAddress(walletAddress)) {
    throw new Error('Invalid Solana wallet address');
  }
  
  const nonce = generateNonce();
  const challengeKey = generateChallengeKey(walletAddress, nonce);
  const message = generateChallengeMessage(walletAddress, nonce);
  const expiresAt = Date.now() + DEFAULT_CONFIG.challengeExpiryMs;
  
  const challenge: VerificationChallenge = {
    challenge: challengeKey,
    message,
    expiresAt,
    walletAddress,
    nonce,
  };
  
  // Store challenge
  cache.challenges.set(challengeKey, challenge);
  
  // Ensure cleanup is running
  startCleanup();
  
  return challenge;
}

/**
 * Verify challenge response (signature)
 */
export async function verifyChallengeResponse(
  challengeKey: string,
  signature: string
): Promise<VerificationResult> {
  // Get challenge
  const challenge = cache.challenges.get(challengeKey);
  
  if (!challenge) {
    return {
      verified: false,
      walletAddress: '',
      verifiedAt: Date.now(),
      error: 'Challenge not found or expired',
    };
  }
  
  // Check expiry
  if (Date.now() > challenge.expiresAt) {
    cache.challenges.delete(challengeKey);
    
    return {
      verified: false,
      walletAddress: challenge.walletAddress,
      verifiedAt: Date.now(),
      error: 'Challenge has expired',
    };
  }
  
  // Verify signature
  const isValid = await verifySignature(
    challenge.message,
    signature,
    challenge.walletAddress
  );
  
  if (!isValid) {
    return {
      verified: false,
      walletAddress: challenge.walletAddress,
      verifiedAt: Date.now(),
      signature,
      error: 'Invalid signature',
    };
  }
  
  // Create verification result
  const result: VerificationResult = {
    verified: true,
    walletAddress: challenge.walletAddress,
    verifiedAt: Date.now(),
    signature,
  };
  
  // Cache the successful verification
  const verificationCacheKey = `${challenge.walletAddress}:verified`;
  cache.verifications.set(verificationCacheKey, result);
  
  // Remove used challenge
  cache.challenges.delete(challengeKey);
  
  return result;
}

/**
 * Check if wallet is already verified
 */
export function isWalletVerified(walletAddress: string): boolean {
  const verificationCacheKey = `${walletAddress}:verified`;
  const verification = cache.verifications.get(verificationCacheKey);
  
  if (!verification) {
    return false;
  }
  
  // Check if still recent
  if (DEFAULT_CONFIG.requireRecentSignature) {
    return isSignatureRecent(
      verification.verifiedAt,
      DEFAULT_CONFIG.signatureMaxAgeMs
    );
  }
  
  return true;
}

/**
 * Get verification status
 */
export function getVerificationStatus(walletAddress: string): {
  isVerified: boolean;
  verifiedAt?: number;
  expiresAt?: number;
} {
  const verificationCacheKey = `${walletAddress}:verified`;
  const verification = cache.verifications.get(verificationCacheKey);
  
  if (!verification) {
    return { isVerified: false };
  }
  
  const age = Date.now() - verification.verifiedAt;
  const remaining = DEFAULT_CONFIG.signatureMaxAgeMs - age;
  
  return {
    isVerified: true,
    verifiedAt: verification.verifiedAt,
    expiresAt: verification.verifiedAt + DEFAULT_CONFIG.signatureMaxAgeMs,
  };
}

// ─── Middleware Factory ─────────────────────────────────────────────────────────

/**
 * Create wallet verification middleware
 */
export function requireWalletVerification(config: VerificationConfig = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  return async (c: Context, next: Next) => {
    try {
      // Get wallet address from request
      const walletAddress = c.req.header('X-Wallet-Address');
      
      if (!walletAddress) {
        throw new HTTPException(401, {
          message: 'Wallet address required',
          res: c.json({
            status: 'error',
            code: 'WALLET_ADDRESS_REQUIRED',
            message: 'Please provide X-Wallet-Address header',
          }),
        });
      }
      
      // Validate address format
      if (!isValidSolanaAddress(walletAddress)) {
        throw new HTTPException(400, {
          message: 'Invalid wallet address format',
          res: c.json({
            status: 'error',
            code: 'INVALID_WALLET_FORMAT',
            message: 'Please provide a valid Solana wallet address',
          }),
        });
      }
      
      // Check if already verified in this request (from auth middleware)
      const existingVerification = c.get('walletVerified');
      if (existingVerification) {
        await next();
        return;
      }
      
      // Check cache for recent verification
      if (isWalletVerified(walletAddress)) {
        c.set('walletVerified', true);
        c.set('walletAddress', walletAddress);
        await next();
        return;
      }
      
      // Require verification
      throw new HTTPException(401, {
        message: 'Wallet verification required',
        res: c.json({
          status: 'error',
          code: 'VERIFICATION_REQUIRED',
          message: 'Please verify wallet ownership by signing a challenge',
          walletAddress,
          action: 'SIGN_CHALLENGE',
        }),
      });
      
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      
      console.error('[WalletVerifier] Middleware error:', error);
      throw new HTTPException(500, {
        message: 'Internal server error during wallet verification',
      });
    }
  };
}

/**
 * Challenge generation endpoint handler
 */
export async function handleGenerateChallenge(c: Context): Promise<Response> {
  try {
    const { walletAddress } = await c.req.json();
    
    if (!walletAddress) {
      return c.json({
        status: 'error',
        code: 'MISSING_WALLET_ADDRESS',
        message: 'Wallet address is required',
      }, 400);
    }
    
    if (!isValidSolanaAddress(walletAddress)) {
      return c.json({
        status: 'error',
        code: 'INVALID_WALLET_FORMAT',
        message: 'Invalid Solana wallet address',
      }, 400);
    }
    
    // Create challenge
    const challenge = createChallenge(walletAddress);
    
    return c.json({
      status: 'success',
      challenge: {
        message: challenge.message,
        expiresAt: challenge.expiresAt,
        walletAddress: challenge.walletAddress,
      },
    });
    
  } catch (error) {
    console.error('[WalletVerifier] Challenge generation error:', error);
    return c.json({
      status: 'error',
      code: 'CHALLENGE_GENERATION_FAILED',
      message: 'Failed to generate challenge',
    }, 500);
  }
}

/**
 * Challenge verification endpoint handler
 */
export async function handleVerifyChallenge(c: Context): Promise<Response> {
  try {
    const { challengeKey, signature } = await c.req.json();
    
    if (!challengeKey || !signature) {
      return c.json({
        status: 'error',
        code: 'MISSING_PARAMETERS',
        message: 'Challenge key and signature are required',
      }, 400);
    }
    
    // Verify the challenge response
    const result = await verifyChallengeResponse(challengeKey, signature);
    
    if (!result.verified) {
      return c.json({
        status: 'error',
        code: 'VERIFICATION_FAILED',
        message: result.error,
        walletAddress: result.walletAddress,
      }, 401);
    }
    
    return c.json({
      status: 'success',
      verified: true,
      walletAddress: result.walletAddress,
      verifiedAt: result.verifiedAt,
      expiresIn: DEFAULT_CONFIG.signatureMaxAgeMs,
    });
    
  } catch (error) {
    console.error('[WalletVerifier] Challenge verification error:', error);
    return c.json({
      status: 'error',
      code: 'VERIFICATION_ERROR',
      message: 'Failed to verify challenge',
    }, 500);
  }
}

// ─── Utility Functions ──────────────────────────────────────────────────────────

/**
 * Clear all cached data
 */
export function clearVerificationCache(): void {
  cache.challenges.clear();
  cache.verifications.clear();
  console.log('[WalletVerifier] Cache cleared');
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  activeChallenges: number;
  activeVerifications: number;
} {
  const now = Date.now();
  
  let validChallenges = 0;
  for (const [, challenge] of cache.challenges.entries()) {
    if (now < challenge.expiresAt) {
      validChallenges++;
    }
  }
  
  let validVerifications = 0;
  for (const [, verification] of cache.verifications.entries()) {
    if (isSignatureRecent(verification.verifiedAt, DEFAULT_CONFIG.signatureMaxAgeMs)) {
      validVerifications++;
    }
  }
  
  return {
    activeChallenges: validChallenges,
    activeVerifications: validVerifications,
  };
}

/**
 * Manually mark wallet as verified (for admin/testing purposes)
 */
export function manualVerify(walletAddress: string): VerificationResult {
  if (!isValidSolanaAddress(walletAddress)) {
    throw new Error('Invalid wallet address');
  }
  
  const result: VerificationResult = {
    verified: true,
    walletAddress,
    verifiedAt: Date.now(),
  };
  
  const verificationCacheKey = `${walletAddress}:verified`;
  cache.verifications.set(verificationCacheKey, result);
  
  return result;
}
