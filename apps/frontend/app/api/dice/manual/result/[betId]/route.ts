import { NextRequest, NextResponse } from 'next/server';
import { diceService } from '@/services/DiceService';

export async function GET(req: NextRequest, { params }: { params: Promise<{ betId: string }> }) {
  try {
    const { betId } = await params;
    const result = await diceService.getManualBetResult(betId);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }
}
