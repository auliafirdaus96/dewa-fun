import { NextResponse } from 'next/server';
import { vaultService } from '@/services/VaultService';

export async function GET(req: Request, { params }: { params: Promise<{ mint: string }> }) {
  // const vault = await vaultService.getPublicInfo(params.mint);
  // if (!vault) return NextResponse.json({ error: 'Vault not found' }, { status: 404 });
  // return NextResponse.json({ data: vault });
  return NextResponse.json({ success: true, message: 'Vault Info GET endpoint (Migrated)' });
}
