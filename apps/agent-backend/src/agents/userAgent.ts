/**
 * agents/userAgent.ts
 * Representing a single user's AI persona.
 * Migrated from Python: src/agents/user_agent.py
 */

import { AgentState } from '../state/schemas.js';
import { createAgentGraph } from '../graphs/mainGraph.js';

export class UserAgent {
  private nodeId: string;
  private graph: any;

  constructor(nodeId: string) {
    this.nodeId = nodeId;
    this.graph = createAgentGraph();
  }

  async run(persona: string, message?: string) {
    const inputs: Partial<AgentState> = {
      node_id: this.nodeId,
      persona: persona,
      messages: [],
    };
    return await this.graph.invoke(inputs);
  }
}
