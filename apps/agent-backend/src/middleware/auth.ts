/**
 * src/middleware/auth.ts
 * Authentication & Authorization Middleware for Dewa AI Agent Backend
 * Implements Solana wallet signature verification and JWT token management
 */

import { Context, Next } from 'hono';
import { jwt } from 'hono/jwt';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import { JWTPayload } from 'hono/utils/jwt/types';

// ─── Configuration ─────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRY = '24h';

// In-memory nonce store (should use Redis in production)
const challengeNonces = new Map<string, { nonce: string; expiresAt: number }>();
const NONCE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// ─── Types ──────────────────────────────────────────────────────────────────────
export interface AuthenticatedUser {
  walletAddress: string;
  nodeId?: string;
  issuedAt: number;
  expiresAt: number;
}

declare module 'hono' {
  interface ContextVariableMap {
    user?: AuthenticatedUser;
  }
}

// ─── Helper Functions ───────────────────────────────────────────────────────────

/**
 * Generates a random nonce for challenge-response authentication
 */
function generateNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('hex');
}

/**
 * Cleans up expired nonces to prevent memory leaks
 */
function cleanupExpiredNonces() {
  const now = Date.now();
  for (const [address, data] of challengeNonces.entries()) {
    if (data.expiresAt < now) {
      challengeNonces.delete(address);
    }
  }
}

// Run cleanup every minute
setInterval(cleanupExpiredNonces, 60 * 1000);

// ─── Challenge Endpoint ─────────────────────────────────────────────────────────

/**
 * GET /api/auth/challenge?wallet=<wallet_address>
 * Returns a nonce for the wallet to sign
 */
export async function getChallenge(c: Context) {
  try {
    const walletAddress = c.req.query('wallet');
    
    if (!walletAddress) {
      return c.json({ 
        status: 'error', 
        message: 'Wallet address required' 
      }, 400);
    }

    // Validate wallet address format
    let publicKey: PublicKey;
    try {
      publicKey = new PublicKey(walletAddress);
    } catch (e: any) {
      return c.json({ 
        status: 'error', 
        message: 'Invalid Solana wallet address' 
      }, 400);
    }

    // Generate and store nonce
    const nonce = generateNonce();
    const expiresAt = Date.now() + NONCE_EXPIRY_MS;
    
    challengeNonces.set(walletAddress, { nonce, expiresAt });

    return c.json({
      status: 'success',
      data: {
        nonce,
        expiresAt,
        message: `Sign this message to authenticate with Dewa.fun:\n\nNonce: ${nonce}\nExpires: ${new Date(expiresAt).toISOString()}`,
      },
    });
  } catch (error: any) {
    console.error('[Auth] getChallenge error:', error.message);
    return c.json({ 
      status: 'error', 
      message: 'Failed to generate challenge' 
    }, 500);
  }
}

// ─── Verification Endpoint ──────────────────────────────────────────────────────

/**
 * POST /api/auth/verify
 * Verifies wallet signature and returns JWT token
 */
export async function verifySignature(c: Context) {
  try {
    const body = await c.req.json();
    const { wallet, signature, message } = body;

    // Validate inputs
    if (!wallet || !signature || !message) {
      return c.json({ 
        status: 'error', 
        message: 'Wallet, signature, and message are required' 
      }, 400);
    }

    // Verify wallet address
    let publicKey: PublicKey;
    try {
      publicKey = new PublicKey(wallet);
    } catch (e: any) {
      return c.json({ 
        status: 'error', 
        message: 'Invalid wallet address' 
      }, 400);
    }

    // Get stored nonce
    const nonceData = challengeNonces.get(wallet);
    if (!nonceData) {
      return c.json({ 
        status: 'error', 
        message: 'Challenge expired or not found. Please request a new one.' 
      }, 401);
    }

    // Check if nonce expired
    if (nonceData.expiresAt < Date.now()) {
      challengeNonces.delete(wallet);
      return c.json({ 
        status: 'error', 
        message: 'Challenge expired. Please request a new one.' 
      }, 401);
    }

    // Verify signature
    const signatureBytes = Buffer.from(signature, 'base64');
    const messageBytes = Buffer.from(message, 'utf-8');
    
    const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKey.toBytes());
    
    if (!isValid) {
      return c.json({ 
        status: 'error', 
        message: 'Invalid signature' 
      }, 401);
    }

    // Signature valid - consume nonce and generate JWT
    challengeNonces.delete(wallet);

    const now = Math.floor(Date.now() / 1000);
    const expirySeconds = 24 * 60 * 60; // 24 hours
    
    const payload: JWTPayload = {
      sub: wallet,
      iat: now,
      exp: now + expirySeconds,
      walletAddress: wallet,
    };

    const token = await jwt.sign(payload, JWT_SECRET, 'HS256');

    return c.json({
      status: 'success',
      data: {
        token,
        expiresAt: new Date((now + expirySeconds) * 1000).toISOString(),
        walletAddress: wallet,
      },
    });
  } catch (error: any) {
    console.error('[Auth] verifySignature error:', error.message);
    return c.json({ 
      status: 'error', 
      message: 'Authentication failed' 
    }, 500);
  }
}

// ─── JWT Middleware ─────────────────────────────────────────────────────────────

/**
 * JWT verification middleware
 * Use this on routes that require authentication
 */
export const jwtMiddleware = (() => {
  return (c: Context, next: Next) => {
    // Skip auth for health checks and auth endpoints
    if (
      c.req.path === '/health' || 
      c.req.path === '/' ||
      c.req.path.startsWith('/api/auth/')
    ) {
      return next();
    }

    // For all other routes, require JWT
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({
        status: 'error',
        message: 'Missing or invalid authorization header. Use: Bearer <token>',
      }, 401);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      // Verify JWT manually to extract payload
      const payload = jwt.verify(token, JWT_SECRET);
      
      // Attach user to context
      c.set('user', {
        walletAddress: payload.walletAddress as string,
        nodeId: payload.nodeId as string | undefined,
        issuedAt: payload.iat as number,
        expiresAt: payload.exp as number,
      });

      return next();
    } catch (error: any) {
      console.error('[Auth] JWT verification failed:', error.message);
      return c.json({
        status: 'error',
        message: 'Invalid or expired token',
      }, 401);
    }
  };
})();

// ─── Ownership Verification Helper ──────────────────────────────────────────────

/**
 * Checks if authenticated user owns the specified node
 * To be used in route handlers after jwtMiddleware
 */
export async function verifyNodeOwnership(
  c: Context, 
  nodeId: string
): Promise<boolean> {
  const user = c.get('user');
  
  if (!user) {
    return false;
  }

  // Import Supabase client
  const { getSupabaseAdminSafe } = await import('../core/supabase.js');
  const supabase = getSupabaseAdminSafe();

  if (!supabase) {
    throw new Error('Database connection unavailable');
  }

  // Query agent_nodes to check ownership
  const { data, error } = await supabase
    .from('agent_nodes')
    .select('partner_wallet')
    .eq('node_id', nodeId)
    .single();

  if (error || !data) {
    return false;
  }

  // Check if wallet matches
  return data.partner_wallet.toLowerCase() === user.walletAddress.toLowerCase();
}

// ─── Optional Auth Middleware ───────────────────────────────────────────────────

/**
 * Middleware that optionally attaches user if token present
 * Use on public routes that want to personalize for logged-in users
 */
export const optionalAuth = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      c.set('user', {
        walletAddress: payload.walletAddress as string,
        nodeId: payload.nodeId as string | undefined,
        issuedAt: payload.iat as number,
        expiresAt: payload.exp as number,
      });
    } catch (e) {
      // Invalid token, but continue without auth
    }
  }
  
  return next();
};
