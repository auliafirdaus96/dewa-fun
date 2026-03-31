import { NextRequest, NextResponse } from 'next/server';
import { diceService } from '@/services/DiceService';
import { requireAuth } from '@/lib/apiAuth';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { sessionId, txSignature } = await req.json();
    if (!sessionId || !txSignature) {
      return NextResponse.json({ error: 'sessionId and txSignature are required' }, { status: 400 });
    }
    const result = await diceService.confirmSettlement(sessionId, txSignature);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
