import { NextRequest, NextResponse } from 'next/server';
import { diceService } from '@/services/DiceService';
import { prisma } from '../../../../lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const wallet = req.nextUrl.searchParams.get('wallet');
    const mint = req.nextUrl.searchParams.get('mint') || undefined;

    if (!wallet) {
      return NextResponse.json({ error: 'wallet query param is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { walletAddress: wallet } });
    if (!user) {
      return NextResponse.json({ totalBets: 0, totalWins: 0, totalLosses: 0, winRate: '0', totalWagered: '0', totalPayout: '0', netProfit: '0', biggestWin: '0' });
    }

    const stats = await diceService.getUserStats(user.id, mint);
    return NextResponse.json(stats);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
