-- Migration: Add security and mode tracking columns to bets table
-- Purpose: Support enhanced security features and mode tracking for Dice Casino
-- Date: March 27, 2026

-- Add mode column if not exists (should already exist from previous migrations)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'bets' AND column_name = 'mode') THEN
    ALTER TABLE bets ADD COLUMN mode TEXT NOT NULL DEFAULT 'MANUAL';
  END IF;
END $$;

-- Ensure proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_bets_mode ON bets(mode);
CREATE INDEX IF NOT EXISTS idx_bets_status ON bets(status);
CREATE INDEX IF NOT EXISTS idx_bets_vault_id_status ON bets(vaultid, status);

-- Add comment documenting the security purpose
COMMENT ON COLUMN bets.mode IS 'Bet mode: MANUAL (VRF), AUTO (HMAC batch), FLASH (instant sim + batch)';

-- Verify enum types exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'betmode') THEN
    CREATE TYPE betmode AS ENUM ('MANUAL', 'AUTO', 'FLASH');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'betstatus') THEN
    CREATE TYPE betstatus AS ENUM ('PENDING', 'WIN', 'LOSE', 'REFUNDED', 'PENDING_VRF');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'betdirection') THEN
    CREATE TYPE betdirection AS ENUM ('UNDER', 'OVER');
  END IF;
END $$;

-- Log migration execution
-- Note: This line is for framework-based migrations. Skip if running manually.
-- INSERT INTO schema_migrations (version, name, applied_at)
-- VALUES ('20260327_dice_security_enhancement', 'Add security and mode tracking', NOW())
-- ON CONFLICT (version) DO NOTHING;
