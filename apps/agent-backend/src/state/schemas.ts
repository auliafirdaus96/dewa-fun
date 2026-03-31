/**
 * state/schemas.ts
 * LangGraph agent state definitions using Zod + LangGraph annotations.
 * Migrated from Python: src/state/schemas.py
 */

import { z } from 'zod';
import { Annotation, messagesStateReducer } from '@langchain/langgraph';
import type { BaseMessage } from '@langchain/core/messages';

// ─── Graph Config Schema (Zod) ────────────────────────────────────────────────
/** Runtime config passed to graph.invoke() / graph.stream() */
export const GraphConfigSchema = z.object({
  thread_id: z.string().describe('Unique thread identifier for the conversation'),
  node_id: z.string().describe('The ID of the agent node'),
});
export type GraphConfig = z.infer<typeof GraphConfigSchema>;

// ─── DLMM Range & Metrics (Zod) ───────────────────────────────────────────────
export const DLMMRangeSchema = z.object({
  min: z.number(),
  max: z.number(),
  bins: z.number().int().optional(),
});

export const DLMMYieldMetricsSchema = z.object({
  fees_24h: z.number().default(0),
  apy: z.number().default(0),
  il_percentage: z.number().default(0),
});

export type DLMMRange = z.infer<typeof DLMMRangeSchema>;
export type DLMMYieldMetrics = z.infer<typeof DLMMYieldMetricsSchema>;

// ─── Agent State (LangGraph Annotation) ──────────────────────────────────────
/**
 * The full state object passed between LangGraph nodes.
 * Uses LangGraph's Annotation system for proper state merging.
 *
 * Python equivalent:
 *   class AgentState(TypedDict, total=False):
 *       messages: Annotated[Sequence[BaseMessage], merge_messages]
 *       ...
 */
export const AgentStateAnnotation = Annotation.Root({
  // Core conversation messages — uses LangGraph's built-in append reducer
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),

  // ── Agent Identity ───────────────────────────────────────────────
  node_id: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),

  persona: Annotation<string>({
    reducer: (_, next) => next,
    default: () => 'AI CEO',
  }),

  encrypted_api_key: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  // ── Action Tracking ──────────────────────────────────────────────
  last_action: Annotation<string>({
    reducer: (_, next) => next,
    default: () => 'IDLE',
  }),

  social_sentiment: Annotation<'POSITIVE' | 'NEUTRAL' | 'NEGATIVE'>({
    reducer: (_, next) => next,
    default: () => 'NEUTRAL',
  }),

  incoming_message: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),

  reply_text: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),

  // ── DLMM Specific State ──────────────────────────────────────────
  is_dlmm_active: Annotation<boolean>({
    reducer: (_, next) => next,
    default: () => false,
  }),

  pool_address: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),

  current_range: Annotation<DLMMRange | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  yield_metrics: Annotation<DLMMYieldMetrics | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  last_rebalanced_at: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 0,
  }),

  active_strategy: Annotation<'SPOT' | 'CURVE' | 'BID_ASK'>({
    reducer: (_, next) => next,
    default: () => 'SPOT',
  }),
});

/** TypeScript type inferred from the LangGraph annotation */
export type AgentState = typeof AgentStateAnnotation.State;
