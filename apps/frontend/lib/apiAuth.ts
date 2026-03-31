import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './auth';

export interface AuthenticatedRequest {
  userId: string;
  wallet: string;
}

/**
 * Middleware guard: verifies JWT and returns user identity.
 * Usage in API route:
 *   const auth = await requireAuth(request)
 *   if (auth instanceof NextResponse) return auth  // 401
 *   // auth.userId, auth.wallet tersedia
 */
export async function requireAuth(
  request: NextRequest
): Promise<AuthenticatedRequest | NextResponse> {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  const token = authHeader.slice(7);

  try {
    const payload = await verifyToken(token);
    return { userId: payload.userId, wallet: payload.wallet };
  } catch {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }
}
