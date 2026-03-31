import { NextRequest, NextResponse } from 'next/server';
import { diceService } from '@/services/DiceService';
import { requireAuth } from '@/lib/apiAuth';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { sessionId, config } = await req.json();
    if (!sessionId || !config) {
      return NextResponse.json({ error: 'sessionId and config are required' }, { status: 400 });
    }
    const result = await diceService.runAutoBet(sessionId, config);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
