import { NextRequest, NextResponse } from 'next/server';
import { diceService } from '@/services/DiceService';
import { requireAuth } from '@/lib/apiAuth';

// Shared settle-tx endpoint used by both auto and flash sessions
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { sessionId } = await req.json();
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }
    const result = await diceService.buildSettleTx(sessionId);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
