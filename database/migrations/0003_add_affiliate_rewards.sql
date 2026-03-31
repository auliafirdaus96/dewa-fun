-- Migration: Add affiliate reward tracking system
-- Purpose: Support hybrid reward model (instant + leaderboard + reserve)
-- Date: March 27, 2026

-- Add affiliate reward tracking table
CREATE TABLE IF NOT EXISTS affiliate_rewards (
  id              TEXT PRIMARY KEY DEFAULT 'cuid()',
  affiliateId     TEXT NOT NULL REFERENCES users(id),
  
  -- Reward breakdown
  instantRewards  DECIMAL(30,9) DEFAULT 0,  -- 15% direct per-bet rewards
  leaderboardRewards DECIMAL(30,9) DEFAULT 0, -- Monthly competition pool (3%)
  campaignRewards    DECIMAL(30,9) DEFAULT 0, -- Special campaigns (2%)
  totalEarned     DECIMAL(30,9) DEFAULT 0,
  
  -- Performance tracking (for leaderboard)
  totalReferrals  INTEGER DEFAULT 0,
  activeReferrals INTEGER DEFAULT 0,
  totalVolume     DECIMAL(30,9) DEFAULT 0,
  totalBets       INTEGER DEFAULT 0,
  
  -- Leaderboard period tracking
  currentPeriodRank INTEGER DEFAULT 0,
  previousPeriodRank INTEGER DEFAULT 0,
  
  -- Tier system (optional gamification)
  tier            TEXT DEFAULT 'BRONZE', -- BRONZE, SILVER, GOLD, PLATINUM
  
  -- Payout tracking
  lastPayoutAt    TIMESTAMP,
  nextPayoutDate  TIMESTAMP,
  
  createdAt       TIMESTAMP DEFAULT NOW(),
  updatedAt       TIMESTAMP DEFAULT NOW()
);

-- Add unique constraint as index (already created by schema, skip if exists)
CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliate_period_unique 
ON affiliate_rewards(affiliateid, date_trunc('month', createdat));

-- Indexes are already created by supabase_schema.sql, so we skip them here
-- CREATE INDEX idx_affiliate_rewards_affiliate ON affiliate_rewards(affiliateid);
-- CREATE INDEX idx_affiliate_rewards_tier ON affiliate_rewards(tier);
-- CREATE INDEX idx_affiliate_rewards_totalEarned ON affiliate_rewards(totalEarned DESC);
-- CREATE INDEX idx_affiliate_rewards_volume ON affiliate_rewards(totalVolume DESC);

-- Add leaderboard history table
CREATE TABLE IF NOT EXISTS leaderboard_history (
  id              TEXT PRIMARY KEY DEFAULT 'cuid()',
  period          TEXT NOT NULL, -- Format: '2026-03'
  affiliateId     TEXT NOT NULL REFERENCES users(id),
  
  rank            INTEGER NOT NULL,
  points          DECIMAL(30,9) NOT NULL,
  
  -- Breakdown
  instantReward   DECIMAL(30,9) NOT NULL,
  leaderboardReward DECIMAL(30,9) NOT NULL,
  
  -- Stats
  referralsCount  INTEGER NOT NULL,
  volumeGenerated DECIMAL(30,9) NOT NULL,
  betsCount       INTEGER NOT NULL,
  
  paidAt          TIMESTAMP,
  createdAt       TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_period_rank UNIQUE (period, rank)
);

-- Indexes are already created by supabase_schema.sql, so we skip them here
-- CREATE INDEX idx_leaderboard_history_period ON leaderboard_history(period);
-- CREATE INDEX idx_leaderboard_history_affiliate ON leaderboard_history(affiliateid);

-- Add comments for documentation
COMMENT ON TABLE affiliate_rewards IS 'Track affiliate rewards: 15% instant + 3% leaderboard + 2% reserve';
COMMENT ON COLUMN affiliate_rewards.instantRewards IS 'Direct per-bet rewards (15% of house edge)';
COMMENT ON COLUMN affiliate_rewards.leaderboardRewards IS 'Monthly competition pool (3% of house edge)';
COMMENT ON COLUMN affiliate_rewards.campaignRewards IS 'Special marketing campaigns (2% of house edge)';
COMMENT ON COLUMN affiliate_rewards.tier IS 'Affiliate tier: BRONZE < SILVER < GOLD < PLATINUM';

-- Log migration
-- Note: This line is for framework-based migrations. Skip if running manually.
-- INSERT INTO schema_migrations (version, name, applied_at)
-- VALUES ('20260327_add_affiliate_rewards', 'Add affiliate reward tracking system', NOW())
-- ON CONFLICT (version) DO NOTHING;
