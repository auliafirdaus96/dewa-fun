/**
 * agents/dewaMaster.ts
 * PAO (Platform Autonomous Operator) Master Agent. Responsible for high-level coordination.
 * Migrated from Python: src/agents/dewa_master.py
 */

import { AgentState } from '../state/schemas.js';
import { createAgentGraph } from '../graphs/mainGraph.js';

export class DewaMaster {
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
