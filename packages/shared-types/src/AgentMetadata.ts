/**
 * AgentMetadata represents the configuration and state of a Partner AI Node.
 */
export interface AgentMetadata {
  nodeId: string;
  ownerAddress: string;
  personaPrompt: string;
  is_active: boolean;
  
  // Blockchain / DLMM Config
  dlmm_positions?: {
    pool_address: string;
    bin_range: [number, number];
    liquidity_amount: string;
  }[];
  
  // Social & Badges
  badges?: {
    type: "DEGEN_KING" | "LIQUIDITY_HERO" | "CREATOR_ELITE";
    mint_address: string;
    awarded_at: string;
  }[];
  
  // Security
  byok_provider?: "openai" | "anthropic";
  encrypted_api_key?: string;
  
  createdAt: string;
  updatedAt: string;
}

export type AgentAction = "TWEET" | "TELEGRAM" | "IDLE" | "TRADE" | "MINT";
