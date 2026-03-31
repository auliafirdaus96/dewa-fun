-- =====================================================
-- DEWA.FUN - Partner Node Launch Type Tracking
-- Migration Script for Supabase
-- =====================================================
-- Date: March 27, 2026
-- Purpose: Add support for tracking Standard vs Agent Launches
-- Impact: Non-breaking (adds new columns with defaults)
-- =====================================================

-- STEP 1: Add launch_type column to tokens table
-- =====================================================
ALTER TABLE tokens 
ADD COLUMN IF NOT EXISTS launch_type VARCHAR(20) DEFAULT 'STANDARD',
ADD COLUMN IF NOT EXISTS fee_split JSONB DEFAULT '{"creator": 0.5, "dewa": 0.5}';

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_tokens_launch_type 
ON tokens(launch_type);

-- Add comment for documentation
COMMENT ON COLUMN tokens.launch_type IS 'Launch type: STANDARD (B2C 0.5%/0.5%) or AGENT_LAUNCH (B2B 0.75%/0.25%)';
COMMENT ON COLUMN tokens.fee_split IS 'Fee distribution: {creator: number, dewa: number}';


-- STEP 2: Add stats columns to agent_nodes table
-- =====================================================
ALTER TABLE agent_nodes
ADD COLUMN IF NOT EXISTS standard_launches INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS agent_launches INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_fees_earned DECIMAL(30, 9) DEFAULT 0;

-- Add indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_agent_nodes_stats 
ON agent_nodes(total_fees_earned, standard_launches, agent_launches);

-- Add comments
COMMENT ON COLUMN agent_nodes.standard_launches IS 'Count of Standard Launch (B2C) tokens';
COMMENT ON COLUMN agent_nodes.agent_launches IS 'Count of Agent Launch (B2B) tokens';
COMMENT ON COLUMN agent_nodes.total_fees_earned IS 'Total trading fees earned across all launches';


-- STEP 3: Create view for dashboard analytics
-- =====================================================
CREATE OR REPLACE VIEW partner_dashboard_stats AS
SELECT 
  an.node_id,
  an.wallet_address,
  an.brand_name,
  
  -- Launch counts
  COUNT(t.id) FILTER (WHERE t.launch_type = 'STANDARD') as standard_launches,
  COUNT(t.id) FILTER (WHERE t.launch_type = 'AGENT_LAUNCH') as agent_launches,
  COUNT(t.id) as total_launches,
  
  -- Fee tracking (assuming tokens table has trading_fees column)
  COALESCE(SUM(t.trading_fees) FILTER (WHERE t.launch_type = 'STANDARD'), 0) as standard_fees,
  COALESCE(SUM(t.trading_fees) FILTER (WHERE t.launch_type = 'AGENT_LAUNCH'), 0) as agent_fees,
  COALESCE(SUM(t.trading_fees), 0) as total_fees,
  
  -- Volume tracking
  COALESCE(SUM(t.trading_volume), 0) as total_volume,
  
  -- Active tokens (launched in last 30 days)
  COUNT(t.id) FILTER (WHERE t.created_at > NOW() - INTERVAL '30 days') as active_tokens
  
FROM agent_nodes an
LEFT JOIN tokens t ON t.node_id = an.node_id
GROUP BY an.node_id, an.wallet_address, an.brand_name;


-- STEP 4: Create function to update stats automatically
-- =====================================================
CREATE OR REPLACE FUNCTION update_partner_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update agent_nodes stats when token is inserted/updated
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE agent_nodes
    SET 
      standard_launches = (
        SELECT COUNT(*) FROM tokens WHERE node_id = NEW.node_id AND launch_type = 'STANDARD'
      ),
      agent_launches = (
        SELECT COUNT(*) FROM tokens WHERE node_id = NEW.node_id AND launch_type = 'AGENT_LAUNCH'
      ),
      total_fees_earned = (
        SELECT COALESCE(SUM(trading_fees), 0) FROM tokens WHERE node_id = NEW.node_id
      )
    WHERE node_id = NEW.node_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- STEP 5: Create trigger for auto-updating stats
-- =====================================================
DROP TRIGGER IF EXISTS trigger_update_partner_stats ON tokens;
CREATE TRIGGER trigger_update_partner_stats
AFTER INSERT OR UPDATE ON tokens
FOR EACH ROW
EXECUTE FUNCTION update_partner_stats();


-- STEP 6: Migrate existing data (optional)
-- =====================================================
-- Set existing tokens to STANDARD by default
UPDATE tokens 
SET launch_type = 'STANDARD',
    fee_split = '{"creator": 0.5, "dewa": 0.5}'::jsonb
WHERE launch_type IS NULL;

-- Recalculate initial stats for existing agent_nodes
UPDATE agent_nodes an
SET 
  standard_launches = (
    SELECT COUNT(*) FROM tokens t 
    WHERE t.node_id = an.node_id AND t.launch_type = 'STANDARD'
  ),
  agent_launches = (
    SELECT COUNT(*) FROM tokens t 
    WHERE t.node_id = an.node_id AND t.launch_type = 'AGENT_LAUNCH'
  ),
  total_fees_earned = (
    SELECT COALESCE(SUM(trading_fees), 0) FROM tokens t 
    WHERE t.node_id = an.node_id
  );


-- STEP 7: Grant permissions (adjust as needed)
-- =====================================================
GRANT SELECT ON partner_dashboard_stats TO authenticated;
GRANT EXECUTE ON FUNCTION update_partner_stats TO authenticated;


-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify migration success:

-- Check column additions:
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'tokens' AND column_name IN ('launch_type', 'fee_split');

-- Check view creation:
-- SELECT * FROM partner_dashboard_stats LIMIT 5;

-- Check trigger:
-- SELECT tgname, tgtype FROM pg_trigger WHERE tgname = 'trigger_update_partner_stats';

-- =====================================================
-- ROLLBACK (if needed)
-- =====================================================
-- DROP TRIGGER IF EXISTS trigger_update_partner_stats ON tokens;
-- DROP FUNCTION IF EXISTS update_partner_stats();
-- DROP VIEW IF EXISTS partner_dashboard_stats;
-- ALTER TABLE tokens DROP COLUMN IF EXISTS launch_type, DROP COLUMN IF EXISTS fee_split;
-- ALTER TABLE agent_nodes DROP COLUMN IF EXISTS standard_launches, 
--                        DROP COLUMN IF EXISTS agent_launches, 
--                        DROP COLUMN IF EXISTS total_fees_earned;
