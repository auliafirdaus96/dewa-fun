import { supabase } from '../supabase';

export interface AgentNode {
  id: string;
  partner_wallet: string;
  node_id: string;
  ai_model: string;
  personality_prompt: string;
  encrypted_api_key: string;
  is_active: boolean;
}

/**
 * Fetch an agent node configuration from Supabase
 */
export async function getAgentNode(nodeId: string): Promise<AgentNode | null> {
  const { data, error } = await supabase
    .from('agent_nodes')
    .select('*')
    .eq('node_id', nodeId)
    .single();

  if (error) {
    console.error(`Error fetching agent node ${nodeId}:`, error);
    return null;
  }

  return data;
}

/**
 * Get agent memory/state
 */
export async function getAgentMemory(nodeId: string) {
  const { data, error } = await supabase
    .from('agent_memory')
    .select('*')
    .eq('node_id', nodeId)
    .single();

  if (error && error.code !== 'PGRST116') { // Ignore row not found error
    console.error(`Error fetching agent memory for ${nodeId}:`, error);
  }

  return data;
}

/**
 * Save or update agent memory/state
 */
export async function updateAgentMemory(nodeId: string, state: any, history: any[]) {
  const { data, error } = await supabase
    .from('agent_memory')
    .upsert({
      node_id: nodeId,
      state: state,
      last_action: state.last_action || 'IDLE',
      history: history,
      updated_at: new Date().toISOString()
    }, { onConflict: 'node_id' });

  if (error) {
    console.error(`Error updating agent memory for ${nodeId}:`, error);
    throw error;
  }

  return data;
}
