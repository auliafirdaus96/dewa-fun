import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/agents/dlmm/config
 * Configure DLMM strategy preferences for an agent
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { node_id, config } = body;
    
    if (!node_id || !config) {
      return NextResponse.json(
        { error: 'node_id and config are required' },
        { status: 400 }
      );
    }
    
    // Call agent backend
    const agentBackendUrl = process.env.AGENT_BACKEND_URL || 'http://localhost:8000';
    
    const response = await fetch(
      `${agentBackendUrl}/api/agents/${node_id}/dlmm-config`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      }
    );
    
    if (!response.ok) {
      throw new Error(`Agent backend returned ${response.status}`);
    }
    
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to configure DLMM strategy:', error);
    return NextResponse.json(
      { error: 'Failed to configure DLMM strategy' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agents/dlmm/config
 * Get current DLMM strategy configuration
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
      `${agentBackendUrl}/api/agents/${nodeId}/dlmm-config`,
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
    console.error('Failed to fetch DLMM config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch DLMM config' },
      { status: 500 }
    );
  }
}
