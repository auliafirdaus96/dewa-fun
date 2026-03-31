import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function GET(req: NextRequest) {
  const nodeId = req.nextUrl.searchParams.get('nodeId');
  if (!nodeId) {
    return NextResponse.json({ error: 'nodeId is required' }, { status: 400 });
  }

  try {
    // 1. Fetch Agent Node Config
    const { data: agentNode, error: nodeError } = await supabase
      .from('agent_nodes')
      .select('*')
      .eq('node_id', nodeId)
      .single();

    if (nodeError || !agentNode) {
      return NextResponse.json({ error: 'Agent node not found' }, { status: 404 });
    }

    // 2. Fetch Agent Memory (last_action, state)
    const { data: memory } = await supabase
      .from('agent_memory')
      .select('last_action, updated_at')
      .eq('node_id', nodeId)
      .single();

    // 3. Fetch Launched Tokens for this node
    const { data: tokens, error: tokensError } = await supabase
      .from('node_tokens')
      .select('*')
      .eq('node_id', nodeId)
      .order('created_at', { ascending: false });

    if (tokensError) {
      console.error('Error fetching tokens:', tokensError);
    }

    // 4. Fetch Bet Stats (aggregate from bets table if exists)
    const { data: bets } = await supabase
      .from('bets')
      .select('amount_wagered, amount_payout, fees_creator, fees_treasury, created_at')
      .in('token_address', (tokens || []).map((t: any) => t.token_address));

    // Calculate launch type breakdown
    const standardTokens = (tokens || []).filter((t: any) => t.launch_type === 'STANDARD');
    const agentTokens = (tokens || []).filter((t: any) => t.launch_type === 'AGENT_LAUNCH');
    
    // Calculate fees by launch type
    const totalWagered = bets?.reduce((sum: number, b: any) => sum + (b.amount_wagered || 0), 0) || 0;
    const totalPayout = bets?.reduce((sum: number, b: any) => sum + (b.amount_payout || 0), 0) || 0;
    const totalCreatorFees = bets?.reduce((sum: number, b: any) => sum + (b.fees_creator || 0), 0) || 0;
    
    // Estimate split based on launch type (simplified - in production use actual fee_split column)
    const standardFees = totalCreatorFees * (standardTokens.length / ((tokens || []).length || 1));
    const agentFees = totalCreatorFees * (agentTokens.length / ((tokens || []).length || 1));

    return NextResponse.json({
      node: {
        nodeId: agentNode.node_id,
        aiModel: agentNode.ai_model,
        isActive: agentNode.is_active,
        lastAction: memory?.last_action || 'IDLE',
        lastUpdated: memory?.updated_at,
        launchType: agentNode.launch_type || 'STANDARD', // NEW
      },
      stats: {
        totalVolume: totalWagered,
        totalPayout,
        creatorFeesEarned: totalCreatorFees,
        activeTokens: tokens?.length || 0,
        agentShare: 0.75, // percent
        // NEW: Launch type breakdown
        standardLaunches: standardTokens.length,
        agentLaunches: agentTokens.length,
        standardFees: parseFloat(standardFees.toFixed(6)),
        agentFees: parseFloat(agentFees.toFixed(6)),
      },
      tokens: (tokens || []).map((t: any) => ({
        ...t,
        launchType: t.launch_type || 'STANDARD', // Map snake_case to camelCase
        feeSplit: t.fee_split || { creator: 0.5, dewa: 0.5 }, // NEW
      })),
    });
  } catch (err: any) {
    console.error('[Dashboard API Error]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
