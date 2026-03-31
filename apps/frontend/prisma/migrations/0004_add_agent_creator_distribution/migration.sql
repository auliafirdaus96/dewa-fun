-- Migration: Add Agent/Creator house edge distribution tracking
-- Purpose: Support 25-25-30-20 distribution model (Creator-Agent-Dewa-Affiliate)
-- Date: March 27, 2026

-- Add agent columns to vaults table
ALTER TABLE vaults 
ADD COLUMN IF NOT EXISTS "agentId" TEXT REFERENCES users(id),
ADD COLUMN IF NOT EXISTS "creatorAddress" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "agentAddress" TEXT;

-- Add agent fees tracking column
ALTER TABLE vaults 
ADD COLUMN IF NOT EXISTS "totalAgentFees" DECIMAL(30,9) DEFAULT 0;

-- Add earnings tracking to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS "totalCreatorEarnings" DECIMAL(30,9) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "totalAgentEarnings" DECIMAL(30,9) DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vaults_agent_id ON vaults("agentId");
CREATE INDEX IF NOT EXISTS idx_vaults_creator_address ON vaults("creatorAddress");
CREATE INDEX IF NOT EXISTS idx_vaults_agent_address ON vaults("agentAddress");

-- Add comments for documentation
COMMENT ON COLUMN vaults."agentId" IS 'Agent/Platform (Dewi) who owns the platform where token was created';
COMMENT ON COLUMN vaults."creatorAddress" IS 'Creator wallet address (Level 2) - receives 25% of house edge';
COMMENT ON COLUMN vaults."agentAddress" IS 'Agent wallet address (Level 1) - receives 25% override commission';
COMMENT ON COLUMN vaults."totalAgentFees" IS 'Total 25% agent share earned from house edge';
COMMENT ON COLUMN users."totalCreatorEarnings" IS 'Lifetime earnings from creating tokens (25% of house edge)';
COMMENT ON COLUMN users."totalAgentEarnings" IS 'Lifetime earnings from Agent platform (25% override commission)';

-- Update existing vaults: set creatorAddress = creator's wallet
UPDATE vaults v
SET "creatorAddress" = u.walletAddress
FROM users u
WHERE v."creatorId" = u.id
AND v."creatorAddress" = '';

-- Log migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('20260327_add_agent_creator_distribution', 'Add Agent/Creator house edge distribution', NOW())
ON CONFLICT (version) DO NOTHING;
