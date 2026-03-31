/**
 * routes/agent.ts
 * Core agent execution endpoints.
 * Migrated from Python: src/main.py
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { createAgentGraph } from '../graphs/mainGraph.js';
import { HumanMessage } from '@langchain/core/messages';
import { AgentRequestSchema } from '@dewa/shared-types';

export const agentRoutes = new Hono();

// Single compilation of graph to reuse
const agentGraph = createAgentGraph();

// ── Execute Primary Agent Flow ───────────────────────────────────────────────
agentRoutes.post('/run', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = AgentRequestSchema.parse(body);

    const inputs = {
      node_id: parsed.node_id,
      persona: parsed.persona,
      // We start the conversation with the user's message, or a default observation
      messages: parsed.message
        ? [new HumanMessage(parsed.message)]
        : [new HumanMessage('Observe the current ecosystem and take appropriate action if necessary.')],
    };

    // LangGraph configurations (for persistence/tracing if set up)
    const config = {
      configurable: {
        thread_id: `frontend_req_${parsed.node_id}_${Date.now()}`,
      },
    };

    // Run the execution graph
    const result = await agentGraph.invoke(inputs, config);

    // The result object contains the final state. Extract last LLM message.
    const finalMessages = result.messages;
    const lastMessage = finalMessages[finalMessages.length - 1];

    return c.json({
      status: 'success',
      data: {
        response: lastMessage.content || '',
        action_taken: result.last_action,
      },
    });
  } catch (error: any) {
    console.error('[API] /run error:', error.message);
    if (error instanceof z.ZodError) {
      return c.json({ status: 'error', message: 'Validation failed', details: error.errors }, 400);
    }
    return c.json({ status: 'error', message: error.message || 'Internal Server Error' }, 500);
  }
});
