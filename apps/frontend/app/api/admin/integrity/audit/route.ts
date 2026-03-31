import { NextRequest, NextResponse } from 'next/server';
import { integrityService } from '@/services/IntegrityService';
import { prisma as db } from '@/lib/prisma';
import { logger } from '@/services/LoggerService';

export async function POST(req: NextRequest) {
  try {
    // Security check: Admin only
    // ... auth check ...

    const { mint, action } = await req.json();

    if (mint) {
      const result = await integrityService.performVaultAudit(mint);
      return NextResponse.json(result);
    } else {
      // Audit ALL vaults
      const vaults = await db.vault.findMany({ select: { mint: true } });
      const results = [];
      for (const v of vaults) {
        results.push(await integrityService.performVaultAudit(v.mint));
      }
      return NextResponse.json({ total: results.length, results });
    }
  } catch (error) {
    logger.error('Integrity Audit API failed', 'IntegrityAPI', { error });
    return NextResponse.json({ error: 'Audit failed' }, { status: 500 });
  }
}
