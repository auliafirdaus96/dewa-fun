import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/apiAuth';

/**
 * GET /api/earnings/dashboard
 * Get comprehensive earnings dashboard for user
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const walletAddress = auth.wallet;

    // Get user with earnings data
    const user = await prisma.user.findUnique({
      where: { walletAddress },
      select: {
        id: true,
        walletAddress: true,
        displayName: true,
        avatarUrl: true,
        totalCreatorEarnings: true,
        totalAgentEarnings: true,
        
        // Vaults where user is creator
        vaultsAsCreator: {
          select: {
            mint: true,
            totalCreatorFees: true,
            totalWagered: true,
            createdAt: true,
          },
        },
        
        // Vaults where user is agent
        agentVaults: {
          select: {
            mint: true,
            totalAgentFees: true,
            totalWagered: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate totals
    const totalCreatorFeesFromVaults: number = user.vaultsAsCreator.reduce(
      (acc: number, vault: any) => acc + parseFloat(String(vault.totalCreatorFees)),
      0
    );

    const totalAgentFeesFromVaults: number = user.agentVaults.reduce(
      (acc: number, vault: any) => acc + parseFloat(String(vault.totalAgentFees)),
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          walletAddress: user.walletAddress,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        },
        earnings: {
          // Lifetime totals from database
          lifetimeCreatorEarnings: parseFloat(String(user.totalCreatorEarnings)),
          lifetimeAgentEarnings: parseFloat(String(user.totalAgentEarnings)),
          totalLifetimeEarnings: 
            parseFloat(String(user.totalCreatorEarnings)) + 
            parseFloat(String(user.totalAgentEarnings)),
          
          // Current vault earnings
          vaultsCount: user.vaultsAsCreator.length,
          agentVaultsCount: user.agentVaults.length,
          totalCreatorFeesFromVaults,
          totalAgentFeesFromVaults,
        },
        vaults: {
          asCreator: user.vaultsAsCreator.map((v: any) => ({
            mint: v.mint,
            creatorFees: parseFloat(String(v.totalCreatorFees)),
            wagered: parseFloat(String(v.totalWagered)),
            createdAt: v.createdAt,
          })),
          asAgent: user.agentVaults.map((v: any) => ({
            mint: v.mint,
            agentFees: parseFloat(String(v.totalAgentFees)),
            wagered: parseFloat(String(v.totalWagered)),
            createdAt: v.createdAt,
          })),
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
