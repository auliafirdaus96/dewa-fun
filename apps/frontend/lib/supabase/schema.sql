-- Table for Partner Nodes / AI Agent Launchpads
CREATE TABLE IF NOT EXISTS agent_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_wallet TEXT UNIQUE NOT NULL,
    node_id TEXT UNIQUE NOT NULL,
    ai_model TEXT DEFAULT 'gpt-4o',
    personality_prompt TEXT,
    is_active BOOLEAN DEFAULT true,
    is_social_active BOOLEAN DEFAULT false,
    is_dlmm_active BOOLEAN DEFAULT false,
    encrypted_api_key TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for AI Agent Memory / State
CREATE TABLE IF NOT EXISTS agent_memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_id TEXT REFERENCES agent_nodes(node_id) ON DELETE CASCADE,
    state JSONB DEFAULT '{}',
    history JSONB DEFAULT '[]',
    last_action TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for Launched Tokens via Node
CREATE TABLE IF NOT EXISTS node_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_id TEXT REFERENCES agent_nodes(node_id) ON DELETE CASCADE,
    token_address TEXT UNIQUE NOT NULL,
    token_name TEXT,
    token_ticker TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for Dice Bets (for analytics aggregation)
CREATE TABLE IF NOT EXISTS bets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_address TEXT NOT NULL,
    player_wallet TEXT NOT NULL,
    amount_wagered DECIMAL(18,9) DEFAULT 0,
    amount_payout DECIMAL(18,9) DEFAULT 0,
    fees_creator DECIMAL(18,9) DEFAULT 0,
    fees_treasury DECIMAL(18,9) DEFAULT 0,
    fees_partner DECIMAL(18,9) DEFAULT 0,
    is_win BOOLEAN,
    tx_signature TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast per-node analytics
CREATE INDEX IF NOT EXISTS idx_bets_token_address ON bets(token_address);
CREATE INDEX IF NOT EXISTS idx_node_tokens_node_id ON node_tokens(node_id);

-- Enable Supabase Realtime (run this in Supabase SQL editor)
-- This broadcasts new INSERTs on the bets table to all WebSocket subscribers
ALTER PUBLICATION supabase_realtime ADD TABLE bets;

