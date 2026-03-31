import { NextRequest, NextResponse } from 'next/server';
import { integrityService } from '@/services/IntegrityService';
import { vaultService } from '@/services/VaultService';
import { prisma as db } from '@/lib/prisma';
import { logger } from '@/services/LoggerService';

// Vercel Cron: Scheduled in vercel.json
export async function GET(request: NextRequest) {
  // Verifikasi cron secret
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  logger.info('Cron: Daily audit triggered', 'AuditCron');

  const vaults = await db.vault.findMany({ select: { mint: true } });
  const results = [];

  for (const v of vaults) {
    try {
      const audit = await integrityService.performVaultAudit(v.mint);
      results.push(audit);
    } catch (err) {
      logger.error('Cron: Vault audit failed', 'AuditCron', { mint: v.mint });
    }
  }

  return NextResponse.json({
    success: true,
    vaultsAudited: results.length,
    anomalies: results.filter(r => !r.isIntegral).length,
  });
}
