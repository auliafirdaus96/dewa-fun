import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/agents/dlmm/position
 * Get user's current DLMM position with REAL data from Meteora API
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userWallet = searchParams.get('wallet');
    
    if (!userWallet) {
      return NextResponse.json(
        { error: 'User wallet address required' },
        { status: 400 }
      );
    }
    
    // Call agent backend for REAL position data
    const agentBackendUrl = process.env.AGENT_BACKEND_URL || 'http://localhost:8000';
    
    const response = await fetch(
      `${agentBackendUrl}/api/agents/dlmm/position?user_wallet=${encodeURIComponent(userWallet)}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Agent backend returned ${response.status}`);
    }
    
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch position:', error);
    return NextResponse.json(
      { error: 'Failed to fetch position' },
      { status: 500 }
    );
  }
}
