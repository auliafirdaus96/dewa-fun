import { NextRequest, NextResponse } from 'next/server';
import { diceService } from '@/services/DiceService';
import { prisma } from '../../../../lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const wallet = req.nextUrl.searchParams.get('wallet');
    const mint = req.nextUrl.searchParams.get('mint') || undefined;
    const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20');

    if (!wallet) {
      return NextResponse.json({ error: 'wallet query param is required' }, { status: 400 });
    }

    // Resolve userId from wallet
    const user = await prisma.user.findUnique({ where: { walletAddress: wallet } });
    if (!user) return NextResponse.json({ bets: [], total: 0, page, limit, totalPages: 0 });

    const result = await diceService.getBetHistory(user.id, mint, page, limit);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
