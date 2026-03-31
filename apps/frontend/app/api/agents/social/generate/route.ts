import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/agents/social/generate
 * Generate social media content using AI
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { node_id, topic, tone, platform, include_hashtags, trending_topics, recent_mentions } = body;
    
    if (!node_id) {
      return NextResponse.json(
        { error: 'node_id is required' },
        { status: 400 }
      );
    }
    
    // Call agent backend
    const agentBackendUrl = process.env.AGENT_BACKEND_URL || 'http://localhost:8000';
    
    const response = await fetch(`${agentBackendUrl}/api/agents/social/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        node_id,
        topic: topic || '',
        tone: tone || 'witty',
        platform: platform || 'twitter',
        include_hashtags: include_hashtags !== false,
        trending_topics: trending_topics || [],
        recent_mentions: recent_mentions || []
      })
    });
    
    if (!response.ok) {
      throw new Error(`Agent backend returned ${response.status}`);
    }
    
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to generate social content:', error);
    return NextResponse.json(
      { error: 'Failed to generate social content' },
      { status: 500 }
    );
  }
}
