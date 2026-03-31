import { NextRequest, NextResponse } from 'next/server';
import { vaultService } from '@/services/VaultService';
import { logger } from '@/services/LoggerService';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ mint: string }> }
) {
  const { mint } = await params;

  try {
    // In a real app, we would verify the user's wallet session matches the vault creator
    // const session = await getServerSession(authOptions);
    // if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const stats = await vaultService.getVaultHealthStats(mint);
    
    if (!stats) {
      return NextResponse.json({ error: 'Vault not found' }, { status: 404 });
    }

    logger.info('Vault health stats retrieved', 'VaultHealthAPI', { mint });
    
    return NextResponse.json(stats);
  } catch (error) {
    logger.error('Failed to fetch vault health stats', 'VaultHealthAPI', { mint, error });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
