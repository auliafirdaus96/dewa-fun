import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { getAgentNode, getAgentMemory, updateAgentMemory } from '../../../../lib/supabase/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nodeId, tokenAddress, tokenName, tokenTicker } = body;

    if (!nodeId || !tokenAddress) {
      return NextResponse.json({ error: "Missing required fields (nodeId, tokenAddress)" }, { status: 400 });
    }

    // 1. Log token to node_tokens
    const { error: dbError } = await supabase
      .from('node_tokens')
      .upsert({
        node_id: nodeId,
        token_address: tokenAddress,
        token_name: tokenName || 'Unknown',
        token_ticker: tokenTicker || 'UNK'
      }, { onConflict: 'token_address' });

    if (dbError) {
      console.error("Error saving token to db:", dbError);
      // We continue to trigger the agent anyway
    }

    // 2. Fetch Agent Config
    const agentNode = await getAgentNode(nodeId);
    if (!agentNode || !agentNode.is_active) {
      return NextResponse.json({ error: "Agent node not found or inactive" }, { status: 404 });
    }

    // 3. Fetch past memory (optional for this context, but good practice)
    const memory = await getAgentMemory(nodeId);

    const promptText = `URGENT EVENT: A new token has just been launched on your platform!
Token Name: ${tokenName || "Unknown"}
Ticker: $${tokenTicker || "UNK"}
Contract Address: ${tokenAddress}

You are the AI Social Strategist of this launchpad.
1. Use 'generate_social_content' to create a high-impact promotional tweet.
2. Post it using 'post_to_twitter' to generate immediate hype.
Your current mindset: Hyper-BULLISH.`;
    
    // 4. API Call to Python Backend
    const backendUrl = process.env.AGENT_BACKEND_URL || "http://localhost:8000";
    console.log(`[Webhook] Triggering AI Backend at ${backendUrl}/run-agent`);
    
    const aiResponse = await fetch(`${backendUrl}/run-agent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        node_id: nodeId,
        persona: agentNode.personality_prompt || "You are an AI CEO.",
        message: promptText
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`AI Backend error (${aiResponse.status}): ${errorText}`);
    }

    const aiResult = await aiResponse.json();
    
    // 5. Update Memory
    let newHistory = memory?.history || [];
    newHistory.push({ role: 'human', content: promptText });
    
    if (aiResult.response) {
      newHistory.push({ role: 'ai', content: aiResult.response });
    }

    await updateAgentMemory(nodeId, aiResult, newHistory);

    return NextResponse.json({ 
      success: true, 
      actionTaken: aiResult.last_action,
      message: "Agent triggered successfully" 
    });

  } catch (error: any) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
