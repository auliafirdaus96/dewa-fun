-- =====================================================
-- DEWA.FUN - House Edge Distribution Migration
-- =====================================================
-- Purpose: Add Agent/Creator tracking for 25-25-30-20 model
-- Date: March 27, 2026
-- Run in: Supabase Dashboard → SQL Editor
-- =====================================================

BEGIN;

-- ─────────────────────────────────────────────────────
-- 1. ADD AGENT/PARTNER TRACKING TO VAULTS
-- ─────────────────────────────────────────────────────
ALTER TABLE vaults 
ADD COLUMN IF NOT EXISTS agentid TEXT REFERENCES users(id),
ADD COLUMN IF NOT EXISTS creatoraddress TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS agentaddress TEXT;

-- ─────────────────────────────────────────────────────
-- 2. ADD FEE TRACKING COLUMNS
-- ─────────────────────────────────────────────────────
ALTER TABLE vaults 
ADD COLUMN IF NOT EXISTS totalagentfees DECIMAL(30,9) DEFAULT 0;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS totalcreatorearnings DECIMAL(30,9) DEFAULT 0,
ADD COLUMN IF NOT EXISTS totalagentearnings DECIMAL(30,9) DEFAULT 0;

-- ─────────────────────────────────────────────────────
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_vaults_agent_id ON vaults(agentid);
CREATE INDEX IF NOT EXISTS idx_vaults_creator_address ON vaults(creatoraddress);
CREATE INDEX IF NOT EXISTS idx_vaults_agent_address ON vaults(agentaddress);

-- ─────────────────────────────────────────────────────
-- 4. UPDATE EXISTING VAULTS WITH CREATOR ADDRESSES
-- ─────────────────────────────────────────────────────
UPDATE vaults v
SET creatoraddress = u.walletaddress
FROM users u
WHERE v.creatorid = u.id
AND v.creatoraddress = '';

-- ─────────────────────────────────────────────────────
-- 5. ADD DOCUMENTATION COMMENTS (Optional)
-- ─────────────────────────────────────────────────────
COMMENT ON COLUMN vaults.agentid IS 'Agent/Platform (Dewi) who owns the platform where token was created';
COMMENT ON COLUMN vaults.creatoraddress IS 'Creator wallet address (Level 2) - receives 25% of house edge';
COMMENT ON COLUMN vaults.agentaddress IS 'Agent wallet address (Level 1) - receives 25% override commission';
COMMENT ON COLUMN vaults.totalagentfees IS 'Total 25% agent share earned from house edge';
COMMENT ON COLUMN users.totalcreatorearnings IS 'Lifetime earnings from creating tokens (25% of house edge)';
COMMENT ON COLUMN users.totalagentearnings IS 'Lifetime earnings from Agent platform (25% override commission)';

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES (Run after migration)
-- =====================================================

-- Check if columns were added successfully
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'vaults'
AND column_name IN ('agentid', 'creatoraddress', 'agentaddress', 'totalagentfees')
ORDER BY ordinal_position;

-- Check user columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('totalcreatorearnings', 'totalagentearnings')
ORDER BY ordinal_position;

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'vaults'
AND indexname LIKE 'idx_vaults_%';

-- Count existing vaults updated with creator addresses
SELECT COUNT(*) as vaults_with_creator_address
FROM vaults
WHERE creatoraddress != '';

-- =====================================================
-- MIGRATION SUCCESSFUL! ✅
-- =====================================================
