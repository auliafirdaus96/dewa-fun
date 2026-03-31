import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/agents/social/trending
 * Get trending topics for content planning
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get('node_id');
    
    if (!nodeId) {
      return NextResponse.json(
        { error: 'node_id is required' },
        { status: 400 }
      );
    }
    
    // Call agent backend
    const agentBackendUrl = process.env.AGENT_BACKEND_URL || 'http://localhost:8000';
    
    const response = await fetch(
      `${agentBackendUrl}/api/agents/social/trending?node_id=${encodeURIComponent(nodeId)}`,
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
    console.error('Failed to fetch trending topics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending topics' },
      { status: 500 }
    );
  }
}
