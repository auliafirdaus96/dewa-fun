import { NextRequest, NextResponse } from 'next/server';
import { diceService } from '@/services/DiceService';

import { requireAuth } from '@/lib/apiAuth';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { mint, amount, direction, threshold } = await req.json();
    const walletAddress = auth.wallet;

    if (!mint || !amount || !direction || !threshold) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const result = await diceService.prepareManualBet({ walletAddress, mint, amount, direction, threshold });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: err.code === 'VAULT_NOT_FOUND' ? 404 : 400 });
  }
}
