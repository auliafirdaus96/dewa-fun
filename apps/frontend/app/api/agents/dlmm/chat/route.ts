import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/agents/dlmm/chat
 * Process user chat message through DLMM AI agent
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, position } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Call agent backend
    const agentBackendUrl = process.env.AGENT_BACKEND_URL || 'http://localhost:8000';
    
    const response = await fetch(`${agentBackendUrl}/api/agents/dlmm/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        position,
        node_id: 'user_' + Date.now() // Could be actual user ID
      })
    });

    if (!response.ok) {
      throw new Error(`Agent backend returned ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('DLMM chat error:', error);
    
    // Fallback response if backend unavailable
    return NextResponse.json({
      response: "I'm currently unavailable, but I'll be back soon! In the meantime, you can check your LP position directly on Meteora or wait for me to return.",
      actions: []
    });
  }
}
