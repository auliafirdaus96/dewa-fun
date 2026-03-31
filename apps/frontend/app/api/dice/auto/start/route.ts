import { NextRequest, NextResponse } from 'next/server';
import { diceService } from '@/services/DiceService';
import { requireAuth } from '@/lib/apiAuth';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { mint, clientSeed } = await req.json();
    const walletAddress = auth.wallet;
    
    if (!walletAddress || !mint) {
      return NextResponse.json({ error: 'walletAddress and mint are required' }, { status: 400 });
    }
    const result = await diceService.startAutoSession(walletAddress, mint, clientSeed);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
