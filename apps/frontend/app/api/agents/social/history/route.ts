import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/agents/social/history
 * Get social media posting history
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get('node_id');
    const limit = searchParams.get('limit') || '50';
    const platform = searchParams.get('platform');
    
    if (!nodeId) {
      return NextResponse.json(
        { error: 'node_id is required' },
        { status: 400 }
      );
    }
    
    // Call agent backend
    const agentBackendUrl = process.env.AGENT_BACKEND_URL || 'http://localhost:8000';
    
    let url = `${agentBackendUrl}/api/agents/social/history?node_id=${encodeURIComponent(nodeId)}&limit=${limit}`;
    if (platform) {
      url += `&platform=${encodeURIComponent(platform)}`;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`Agent backend returned ${response.status}`);
    }
    
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch social history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch social history' },
      { status: 500 }
    );
  }
}
