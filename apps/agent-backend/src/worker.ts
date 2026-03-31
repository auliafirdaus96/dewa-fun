/**
 * worker.ts
 * Autonomous background agent loop. Periodically checks database for active agents
 * and triggers proactive actions based on their configured persona.
 * Migrated from Python: src/worker.py
 *
 * Command: pnpm start:worker
 */

import 'dotenv/config';
import { getSupabaseAdminSafe } from './core/supabase.js';
import { createAgentGraph } from './graphs/mainGraph.js';
import { HumanMessage } from '@langchain/core/messages';
import { WORKER_INTERVAL_MS, WORKER_NODE_DELAY_MS } from './core/config.js';

// Setup Supabase Service Client
const supabase = getSupabaseAdminSafe();

// Utility explicit sleep function
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function runAutonomousLoop() {
  console.log(`\n🤖 [Worker] Starting Autonomous Background Loop`);
  console.log(`🤖 [Worker] Cycle Interval: ${WORKER_INTERVAL_MS / 1000}s`);

  if (!supabase) {
    console.error('❌ [Worker] Fatally missing Supabase admin client. Exiting...');
    process.exit(1);
  }

  // Compile full LangGraph execution path once
  const agentGraph = createAgentGraph();

  while (true) {
    try {
      console.log(`\n⏳ [Worker] ${new Date().toISOString()} Starting autonomous checking cycle...`);

      // 1. Fetch all active agent nodes from Supabase
      const { data: activeNodes, error } = await supabase
        .from('agent_nodes')
        .select('*')
        .eq('is_active', true);

      if (error) {
        throw new Error(`Supabase query failed: ${error.message}`);
      }

      if (!activeNodes || activeNodes.length === 0) {
        console.log(`💤 [Worker] No active agent nodes found. Sleeping for ${WORKER_INTERVAL_MS / 60000} mins...`);
        await sleep(WORKER_INTERVAL_MS);
        continue;
      }

      console.log(`📈 [Worker] Found ${activeNodes.length} active autonomous nodes to process.`);

      // 2. Iterate and trigger LangGraph proactively for each node
      for (const node of activeNodes) {
        const { node_id, personality_prompt, social_persona_prompt, encrypted_api_key } = node;

        console.log(`   ► Processing Node ID: ${node_id.substring(0, 8)}... (${node.name || 'Unnamed'})`);

        // Assemble instruction prompt for proactive action
        const actionPrompt = social_persona_prompt
          ? `You are an autonomous AI Agent named ${node.name || 'Dewa Agent'}.
Role details: ${social_persona_prompt}.
Your goal right now: Observe the ecosystem, check data if necessary using your tools, and make an engaging public post to build community. Act on your own.`
          : 'Observe the market trends and automatically issue a tweet based on your core persona without being asked.';

        const inputs = {
          node_id: node_id,
          persona: personality_prompt || social_persona_prompt || 'AI CEO',
          encrypted_api_key: encrypted_api_key || null,
          messages: [new HumanMessage(actionPrompt)],
        };

        // Fire & Wait configuration
        const config = {
          configurable: {
            thread_id: `autonomous_worker_${node_id}`,
          },
        };

        try {
          const result = await agentGraph.invoke(inputs, config);
          const finalMessageContent = result.messages[result.messages.length - 1].content;
          console.log(`   ✅ Success. Last Action Output:\n      ${finalMessageContent}`);
        } catch (nodeError: any) {
          console.error(`   ❌ Node ${node_id} execution failed: ${nodeError.message}`);
        }

        // Slight delay to prevent rate-limiting the LLM / RPC / API
        await sleep(WORKER_NODE_DELAY_MS);
      }

      console.log(`✅ [Worker] Cycle complete. Sleeping for ${WORKER_INTERVAL_MS / 60000} mins.`);
      await sleep(WORKER_INTERVAL_MS);
    } catch (err: any) {
      console.error(`❌ [Worker] Global execution error: ${err.message}`);
      // Sleep a bit on crash before trying again (exponential backoff ideally)
      console.log('Retrying in 60s...');
      await sleep(60000);
    }
  }
}

// ── Start Execution ───────────────────────────────────────────────────────────
runAutonomousLoop().catch((err) => {
  console.error('Fatal crash in autonomous loop:', err);
  process.exit(1);
});
