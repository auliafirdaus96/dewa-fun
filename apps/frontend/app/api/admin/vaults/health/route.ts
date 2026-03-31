import { NextRequest, NextResponse } from 'next/server';
import { vaultService } from '@/services/VaultService';
import { logger } from '@/services/LoggerService';

export async function GET(req: NextRequest) {
  try {
    // Security check: Ensure only dewa.fun admin can access this
    // const session = await getServerSession(authOptions);
    // if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const globalStats = await vaultService.getGlobalVaultHealthStats();
    
    logger.info('Global vault health stats retrieved by Admin', 'AdminVaultHealthAPI');
    
    return NextResponse.json(globalStats);
  } catch (error) {
    logger.error('Failed to fetch global vault health stats', 'AdminVaultHealthAPI', { error });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
