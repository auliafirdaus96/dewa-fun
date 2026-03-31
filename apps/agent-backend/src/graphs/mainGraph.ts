/**
 * graphs/mainGraph.ts
 * Core LangGraph DAG mapping for AI Agent workflows.
 * Migrated from Python: src/graphs/main_graph.py
 */

import { StateGraph, START, END } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { AgentStateAnnotation, AgentState } from '../state/schemas.js';
import { thinkingNode, dlmmStrategyNode, ALL_TOOLS } from './nodes.js';
import type { BaseMessage } from '@langchain/core/messages';

// ─── Conditional Routing Logic ────────────────────────────────────────────────

/**
 * Determines which agent node should process the task next based on Persona string.
 */
function router(state: AgentState): 'think' | 'dlmm' {
  const profile = state.persona?.toUpperCase() || '';
  if (profile.includes('DLMM') || profile.includes('LIQUIDITY') || profile.includes('QUANT')) {
    return 'dlmm';
  }
  return 'think';
}

/**
 * Checks if the last message from the LLM contains a tool call request.
 * - If yes → Route to the Tool execution node.
 * - If no → Conversation or action is finished, route to END.
 */
function shouldContinue(state: AgentState): 'tools' | typeof END {
  const messages = state.messages;
  if (messages.length === 0) return END;

  // Typecast or duck-type the last message to check for tool calls
  const lastMessage = messages[messages.length - 1] as any;

  if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    return 'tools';
  }

  return END;
}

// ─── Graph Compilation ────────────────────────────────────────────────────────

/**
 * Assembles and compiles the StateGraph workflow.
 * This is identical to the setup in main_graph.py.
 */
export function createAgentGraph() {
  const workflow = new StateGraph(AgentStateAnnotation);

  // 1. Add functional nodes
  workflow.addNode('think', thinkingNode);
  workflow.addNode('dlmm', dlmmStrategyNode);
  workflow.addNode('tools', new ToolNode(ALL_TOOLS));

  // 2. Add dynamic routing from START
  // @ts-ignore: LangGraph dynamic generic routing
  workflow.addConditionalEdges(START, router);

  const sourceNodes = ['think', 'dlmm'] as const;
  for (const node of sourceNodes) {
    // @ts-ignore: LangGraph dynamic generic routing
    workflow.addConditionalEdges(node, shouldContinue);
  }

  // 4. After tools finish executing, send tool results back to the original strategist to evaluate or continue
  // @ts-ignore
  workflow.addEdge('tools', 'think');

  // Compile graph into executable chain
  return workflow.compile();
}
