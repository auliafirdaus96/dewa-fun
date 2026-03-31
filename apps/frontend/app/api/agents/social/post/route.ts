import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/agents/social/post
 * Post content to social media platforms
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { node_id, content, platforms, schedule_at, include_media } = body;
    
    if (!node_id || !content) {
      return NextResponse.json(
        { error: 'node_id and content are required' },
        { status: 400 }
      );
    }
    
    // Call agent backend
    const agentBackendUrl = process.env.AGENT_BACKEND_URL || 'http://localhost:8000';
    
    const response = await fetch(`${agentBackendUrl}/api/agents/social/post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        node_id,
        content,
        platforms: platforms || ['twitter'],
        schedule_at: schedule_at || null,
        include_media: include_media || false
      })
    });
    
    if (!response.ok) {
      throw new Error(`Agent backend returned ${response.status}`);
    }
    
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to post to social media:', error);
    return NextResponse.json(
      { error: 'Failed to post to social media' },
      { status: 500 }
    );
  }
}
