import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { nodeId, messages, persona } = await req.json();
    
    console.log('[Heartbeat] Triggering Python AI Backend for', nodeId);
    
    const backendUrl = process.env.AGENT_BACKEND_URL || "http://localhost:8000";
    
    const aiResponse = await fetch(`${backendUrl}/run-agent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        node_id: nodeId,
        persona: persona || "You are an AI CEO.",
        message: messages && messages.length > 0 ? messages[messages.length - 1].content : "Perform a routine heartbeat check."
      })
    });

    if (!aiResponse.ok) {
      throw new Error(`AI Backend error: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();

    return NextResponse.json({ 
      success: true, 
      agentResponse: aiResult.response,
      actionStatus: aiResult.last_action
    });
  } catch (err: any) {
    console.error('[Heartbeat Error]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
