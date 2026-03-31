import { NextRequest, NextResponse } from 'next/server';
import { diceService } from '@/services/DiceService';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ mint: string }> }
) {
  try {
    const { mint } = await params;
    if (!mint) return NextResponse.json({ error: 'mint is required' }, { status: 400 });

    const info = await diceService.getVaultPublicInfo(mint);
    if (!info) return NextResponse.json({ error: 'Vault not found' }, { status: 404 });

    return NextResponse.json(info);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
