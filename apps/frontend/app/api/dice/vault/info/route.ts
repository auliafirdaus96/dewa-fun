import { NextRequest, NextResponse } from 'next/server';
import { vaultService } from '@/services/VaultService';
import { requireAuth } from '@/lib/apiAuth';

/**
 * GET /api/dice/vault/info
 * Get obfuscated vault information (public)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mint = searchParams.get('mint');

    if (!mint) {
      return NextResponse.json({ error: 'Mint address required' }, { status: 400 });
    }

    const info = await vaultService.getPublicInfo(mint);
    
    if (!info) {
      return NextResponse.json({ error: 'Vault not found' }, { status: 404 });
    }

    // 🔒 SECURITY: Return only obfuscated data
    return NextResponse.json({
      success: true,
      data: info
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/dice/vault/validate-bet
 * Validate bet amount against vault limits
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { mint, amount } = await req.json();

    if (!mint || amount === undefined) {
      return NextResponse.json({ error: 'Mint and amount required' }, { status: 400 });
    }

    const validation = await vaultService.validateBetAmount(mint, amount);

    return NextResponse.json({
      success: true,
      valid: validation.valid,
      maxBet: validation.maxBet,
      message: validation.valid ? 'Bet amount is valid' : 'Bet amount exceeds vault limit'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
