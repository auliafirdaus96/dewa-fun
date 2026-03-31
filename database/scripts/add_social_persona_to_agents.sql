-- ============================================================================
-- Migration: Add social media persona configuration for AI agents
-- ============================================================================
-- Date: 2026-03-27
-- Version: 1.0.0
-- Description: Allow partners to customize their AI agent's social media behavior
--              by adding custom persona prompt and configuration fields
-- ============================================================================

BEGIN;

-- Add new columns to agent_nodes table for social persona configuration
-- Using IF NOT EXISTS for idempotency (safe to run multiple times)

DO $$
BEGIN
    -- Add social_persona_prompt column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'agent_nodes' 
                   AND column_name = 'social_persona_prompt') THEN
        ALTER TABLE agent_nodes ADD COLUMN social_persona_prompt TEXT;
        RAISE NOTICE 'Column social_persona_prompt added successfully';
    ELSE
        RAISE NOTICE 'Column social_persona_prompt already exists, skipping';
    END IF;

    -- Add social_posting_frequency column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'agent_nodes' 
                   AND column_name = 'social_posting_frequency') THEN
        ALTER TABLE agent_nodes ADD COLUMN social_posting_frequency INTEGER DEFAULT 3;
        RAISE NOTICE 'Column social_posting_frequency added successfully';
    ELSE
        RAISE NOTICE 'Column social_posting_frequency already exists, skipping';
    END IF;

    -- Add social_tone column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'agent_nodes' 
                   AND column_name = 'social_tone') THEN
        ALTER TABLE agent_nodes ADD COLUMN social_tone VARCHAR(50) DEFAULT 'witty';
        RAISE NOTICE 'Column social_tone added successfully';
    ELSE
        RAISE NOTICE 'Column social_tone already exists, skipping';
    END IF;

    -- Add social_platforms column (array type)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'agent_nodes' 
                   AND column_name = 'social_platforms') THEN
        ALTER TABLE agent_nodes ADD COLUMN social_platforms TEXT[] DEFAULT ARRAY['twitter'];
        RAISE NOTICE 'Column social_platforms added successfully';
    ELSE
        RAISE NOTICE 'Column social_platforms already exists, skipping';
    END IF;

    -- Add social_enabled column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'agent_nodes' 
                   AND column_name = 'social_enabled') THEN
        ALTER TABLE agent_nodes ADD COLUMN social_enabled BOOLEAN DEFAULT true;
        RAISE NOTICE 'Column social_enabled added successfully';
    ELSE
        RAISE NOTICE 'Column social_enabled already exists, skipping';
    END IF;

    -- Add last_social_post_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'agent_nodes' 
                   AND column_name = 'last_social_post_at') THEN
        ALTER TABLE agent_nodes ADD COLUMN last_social_post_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Column last_social_post_at added successfully';
    ELSE
        RAISE NOTICE 'Column last_social_post_at already exists, skipping';
    END IF;

    -- Add total_social_posts column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'agent_nodes' 
                   AND column_name = 'total_social_posts') THEN
        ALTER TABLE agent_nodes ADD COLUMN total_social_posts INTEGER DEFAULT 0;
        RAISE NOTICE 'Column total_social_posts added successfully';
    ELSE
        RAISE NOTICE 'Column total_social_posts already exists, skipping';
    END IF;
END $$;

-- Add comments to document the purpose (safe to run multiple times)
COMMENT ON COLUMN agent_nodes.social_persona_prompt IS 'Custom prompt that defines the AI persona for social media activities';
COMMENT ON COLUMN agent_nodes.social_posting_frequency IS 'Number of posts per day (1-10 recommended)';
COMMENT ON COLUMN agent_nodes.social_tone IS 'Communication tone: witty, professional, bullish, meme, educational';
COMMENT ON COLUMN agent_nodes.social_platforms IS 'Array of platforms to post on: twitter, telegram';
COMMENT ON COLUMN agent_nodes.social_enabled IS 'Whether autonomous social posting is enabled for this agent';
COMMENT ON COLUMN agent_nodes.last_social_post_at IS 'Timestamp of the last social media post made by this agent';
COMMENT ON COLUMN agent_nodes.total_social_posts IS 'Total number of social media posts made by this agent';

-- Create index for querying active social agents (performance optimization)
CREATE INDEX IF NOT EXISTS idx_agent_nodes_social_active 
ON agent_nodes(social_enabled, is_active) 
WHERE social_enabled = true AND is_active = true;

-- Create additional useful indexes
CREATE INDEX IF NOT EXISTS idx_agent_nodes_social_tone 
ON agent_nodes(social_tone);

CREATE INDEX IF NOT EXISTS idx_agent_nodes_social_posts_count 
ON agent_nodes(total_social_posts DESC);

COMMIT;

-- Display success message
SELECT 'Migration completed successfully! ✅' as status,
       COUNT(*) as columns_added
FROM information_schema.columns 
WHERE table_name = 'agent_nodes' 
AND column_name IN (
    'social_persona_prompt',
    'social_posting_frequency',
    'social_tone',
    'social_platforms',
    'social_enabled',
    'last_social_post_at',
    'total_social_posts'
);
