-- =====================================================
-- DEWA.FUN - Master Supabase Schema
-- =====================================================
-- Version: 1.0.0
-- Last Updated: March 28, 2026
-- Description: Complete database schema for Supabase deployment
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Table: users
-- Core user accounts with wallet & earnings tracking
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY DEFAULT ('usr_' || gen_random_uuid()::text),
  walletAddress TEXT UNIQUE NOT NULL,
  email         TEXT UNIQUE,
  emailVerified BOOLEAN DEFAULT false,
  displayName   TEXT,
  avatarUrl     TEXT,
  
  -- Earnings tracking
  totalCreatorEarnings DECIMAL(30,9) DEFAULT 0,
  totalAgentEarnings   DECIMAL(30,9) DEFAULT 0,
  
  createdAt   TIMESTAMP DEFAULT NOW(),
  updatedAt   TIMESTAMP DEFAULT NOW()
);

-- Table: vaults
-- Dice vault for each token with fee distribution
CREATE TABLE IF NOT EXISTS vaults (
  id                  TEXT PRIMARY KEY DEFAULT ('vlt_' || gen_random_uuid()::text),
  mint                TEXT UNIQUE NOT NULL,
  creatorId           TEXT REFERENCES users(id),
  
  -- Agent/Platform tracking
  agentId             TEXT REFERENCES users(id),
  creatorAddress      TEXT NOT NULL DEFAULT '',
  agentAddress        TEXT,
  
  -- Vault config
  initialDeposit      DECIMAL(30,9) NOT NULL,
  currentBalance      DECIMAL(30,9) NOT NULL,
  affiliate           TEXT NOT NULL,
  
  -- Stats
  totalWagered        DECIMAL(30,9) DEFAULT 0,
  totalPaidOut        DECIMAL(30,9) DEFAULT 0,
  totalCreatorFees    DECIMAL(30,9) DEFAULT 0,
  totalTreasuryFees   DECIMAL(30,9) DEFAULT 0,
  totalAffiliateFees  DECIMAL(30,9) DEFAULT 0,
  totalAgentFees      DECIMAL(30,9) DEFAULT 0,
  
  -- State
  isPaused            BOOLEAN DEFAULT false,
  pausedAt            TIMESTAMP,
  onChainTx           TEXT,
  
  createdAt           TIMESTAMP DEFAULT NOW(),
  updatedAt           TIMESTAMP DEFAULT NOW()
);

-- Table: dice_sessions
-- Provably fair gaming sessions
CREATE TABLE IF NOT EXISTS dice_sessions (
  id             TEXT PRIMARY KEY DEFAULT ('ses_' || gen_random_uuid()::text),
  userId         TEXT REFERENCES users(id),
  vaultId        TEXT REFERENCES vaults(id),
  mint           TEXT NOT NULL,
  
  -- Provably fair
  serverSeed     TEXT NOT NULL,
  serverSeedHash TEXT NOT NULL,
  clientSeed     TEXT NOT NULL,
  nonce          INTEGER DEFAULT 0,
  
  -- Mode
  mode           TEXT NOT NULL DEFAULT 'MANUAL',
  status         TEXT NOT NULL DEFAULT 'ACTIVE',
  
  -- Settlement
  totalWagered   DECIMAL(30,9) DEFAULT 0,
  totalPayout    DECIMAL(30,9) DEFAULT 0,
  settleTx       TEXT,
  
  revealedAt     TIMESTAMP,
  createdAt      TIMESTAMP DEFAULT NOW(),
  updatedAt      TIMESTAMP DEFAULT NOW()
);

-- Table: bets
-- Bet history with fee distribution
CREATE TABLE IF NOT EXISTS bets (
  id              TEXT PRIMARY KEY DEFAULT ('bet_' || gen_random_uuid()::text),
  userId          TEXT REFERENCES users(id),
  sessionId       TEXT REFERENCES dice_sessions(id),
  vaultId         TEXT REFERENCES vaults(id),
  mint            TEXT NOT NULL,
  
  -- Input
  amount          DECIMAL(30,9) NOT NULL,
  direction       TEXT NOT NULL,
  threshold       INTEGER NOT NULL,
  winChance       DECIMAL(8,6) NOT NULL,
  multiplier      DECIMAL(12,6) NOT NULL,
  potentialPayout DECIMAL(30,9) NOT NULL,
  
  -- Provably fair proof
  serverSeedHash  TEXT NOT NULL,
  clientSeed      TEXT NOT NULL,
  nonce           INTEGER NOT NULL,
  hmac            TEXT,
  
  -- Result
  roll            DECIMAL(6,2) DEFAULT 0,
  won             BOOLEAN DEFAULT false,
  payout          DECIMAL(30,9) DEFAULT 0,
  
  -- Fees
  creatorFee      DECIMAL(30,9) DEFAULT 0,
  treasuryFee     DECIMAL(30,9) DEFAULT 0,
  affiliateFee    DECIMAL(30,9) DEFAULT 0,
  
  -- Mode & status
  mode            TEXT NOT NULL DEFAULT 'MANUAL',
  status          TEXT NOT NULL DEFAULT 'PENDING',
  txSignature     TEXT,
  
  createdAt       TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- REFERRAL SYSTEM
-- =====================================================

-- Table: referrals
-- Referral tracking system
CREATE TABLE IF NOT EXISTS referrals (
  id          TEXT PRIMARY KEY DEFAULT ('ref_' || gen_random_uuid()::text),
  code        TEXT UNIQUE NOT NULL,
  senderId    TEXT REFERENCES users(id),
  receiverId  TEXT REFERENCES users(id),
  
  -- Tracking
  clicks      INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  earnings    DECIMAL(30,9) DEFAULT 0,
  
  isActive    BOOLEAN DEFAULT true,
  createdAt   TIMESTAMP DEFAULT NOW(),
  usedAt      TIMESTAMP
);

-- =====================================================
-- AFFILIATE REWARDS (Migration 0003)
-- =====================================================

-- Table: affiliate_rewards
-- Track affiliate rewards: 15% instant + 3% leaderboard + 2% reserve
CREATE TABLE IF NOT EXISTS affiliate_rewards (
  id              TEXT PRIMARY KEY DEFAULT ('aff_' || gen_random_uuid()::text),
  affiliateId     TEXT NOT NULL REFERENCES users(id),
  
  -- Reward breakdown
  instantRewards    DECIMAL(30,9) DEFAULT 0,
  leaderboardRewards DECIMAL(30,9) DEFAULT 0,
  campaignRewards   DECIMAL(30,9) DEFAULT 0,
  totalEarned       DECIMAL(30,9) DEFAULT 0,
  
  -- Performance tracking
  totalReferrals    INTEGER DEFAULT 0,
  activeReferrals   INTEGER DEFAULT 0,
  totalVolume       DECIMAL(30,9) DEFAULT 0,
  totalBets         INTEGER DEFAULT 0,
  
  -- Leaderboard period tracking
  currentPeriodRank INTEGER DEFAULT 0,
  previousPeriodRank INTEGER DEFAULT 0,
  
  -- Tier system
  tier            TEXT DEFAULT 'BRONZE',
  
  -- Payout tracking
  lastPayoutAt    TIMESTAMP,
  nextPayoutDate  TIMESTAMP,
  
  createdAt       TIMESTAMP DEFAULT NOW(),
  updatedAt       TIMESTAMP DEFAULT NOW()
);

-- Add unique constraint separately
CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliate_period_unique 
ON affiliate_rewards(affiliateid, date_trunc('month', createdat));

-- Table: leaderboard_history
-- Monthly leaderboard history
CREATE TABLE IF NOT EXISTS leaderboard_history (
  id              TEXT PRIMARY KEY DEFAULT ('lbh_' || gen_random_uuid()::text),
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
  createdAt       TIMESTAMP DEFAULT NOW()
);

-- Add unique constraint separately
CREATE UNIQUE INDEX IF NOT EXISTS idx_period_rank_unique 
ON leaderboard_history(period, rank);

-- =====================================================
-- SOCIAL & COMMUNICATION
-- =====================================================

-- Table: chat_messages
-- Live chat messages per token
CREATE TABLE IF NOT EXISTS chat_messages (
  id        TEXT PRIMARY KEY DEFAULT ('msg_' || gen_random_uuid()::text),
  userId    TEXT REFERENCES users(id),
  mint      TEXT NOT NULL,
  message   TEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW()
);

-- Table: notifications
-- User notifications
CREATE TABLE IF NOT EXISTS notifications (
  id        TEXT PRIMARY KEY DEFAULT ('ntf_' || gen_random_uuid()::text),
  userId    TEXT REFERENCES users(id),
  type      TEXT NOT NULL,
  title     TEXT NOT NULL,
  body      TEXT NOT NULL,
  read      BOOLEAN DEFAULT false,
  metadata  JSONB,
  createdAt TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- AI AGENT TABLES
-- =====================================================

-- Table: agent_nodes
-- Partner/AI agent configuration
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
  
  -- Stats
  standard_launches INTEGER DEFAULT 0,
  agent_launches INTEGER DEFAULT 0,
  total_fees_earned DECIMAL(30,9) DEFAULT 0,
  
  -- Social persona (Migration from add_social_persona_to_agents.sql)
  social_persona_prompt TEXT,
  social_posting_frequency INTEGER DEFAULT 3,
  social_tone VARCHAR(50) DEFAULT 'witty',
  social_platforms TEXT[] DEFAULT ARRAY['twitter'],
  social_enabled BOOLEAN DEFAULT true,
  last_social_post_at TIMESTAMP,
  total_social_posts INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: agent_memory
-- AI agent state & history
CREATE TABLE IF NOT EXISTS agent_memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_id TEXT REFERENCES agent_nodes(node_id) ON DELETE CASCADE,
  state JSONB DEFAULT '{}',
  history JSONB DEFAULT '[]',
  last_action TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: node_tokens
-- Tokens launched by agents
CREATE TABLE IF NOT EXISTS node_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_id TEXT REFERENCES agent_nodes(node_id) ON DELETE CASCADE,
  token_address TEXT UNIQUE NOT NULL,
  token_name TEXT,
  token_ticker TEXT,
  launch_type VARCHAR(20) DEFAULT 'STANDARD',
  fee_split JSONB DEFAULT '{"creator": 0.5, "dewa": 0.5}',
  trading_fees DECIMAL(30,9) DEFAULT 0,
  trading_volume DECIMAL(30,9) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(walletaddress);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Vaults indexes
CREATE INDEX IF NOT EXISTS idx_vaults_mint ON vaults(mint);
CREATE INDEX IF NOT EXISTS idx_vaults_creator_id ON vaults(creatorid);
CREATE INDEX IF NOT EXISTS idx_vaults_agent_id ON vaults(agentid);
CREATE INDEX IF NOT EXISTS idx_vaults_creator_address ON vaults(creatoraddress);
CREATE INDEX IF NOT EXISTS idx_vaults_agent_address ON vaults(agentaddress);
CREATE INDEX IF NOT EXISTS idx_vaults_paused ON vaults(ispaused);

-- Dice sessions indexes
CREATE INDEX IF NOT EXISTS idx_dice_sessions_user_status ON dice_sessions(userid, status);
CREATE INDEX IF NOT EXISTS idx_dice_sessions_server_hash ON dice_sessions(serverseedhash);

-- Bets indexes
CREATE INDEX IF NOT EXISTS idx_bets_user_created ON bets(userid, createdat);
CREATE INDEX IF NOT EXISTS idx_bets_session ON bets(sessionid);
CREATE INDEX IF NOT EXISTS idx_bets_vault ON bets(vaultid);
CREATE INDEX IF NOT EXISTS idx_bets_won ON bets(won);
CREATE INDEX IF NOT EXISTS idx_bets_user_mint_created ON bets(userid, mint, createdat);
CREATE INDEX IF NOT EXISTS idx_bets_vault_status ON bets(vaultid, status);
CREATE INDEX IF NOT EXISTS idx_bets_mint_created ON bets(mint, createdat);
CREATE INDEX IF NOT EXISTS idx_bets_created ON bets(createdat);
CREATE INDEX IF NOT EXISTS idx_bets_status ON bets(status);
CREATE INDEX IF NOT EXISTS idx_bets_mode ON bets(mode);

-- Referrals indexes
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(code);
CREATE INDEX IF NOT EXISTS idx_referrals_sender ON referrals(senderid);

-- Affiliate rewards indexes
CREATE INDEX idx_affiliate_rewards_affiliate ON affiliate_rewards(affiliateid);
CREATE INDEX idx_affiliate_rewards_tier ON affiliate_rewards(tier);
CREATE INDEX idx_affiliate_rewards_totalEarned ON affiliate_rewards(totalearned DESC);
CREATE INDEX idx_affiliate_rewards_volume ON affiliate_rewards(totalvolume DESC);

-- Leaderboard history indexes
CREATE INDEX idx_leaderboard_history_period ON leaderboard_history(period);
CREATE INDEX idx_leaderboard_history_affiliate ON leaderboard_history(affiliateid);

-- Chat messages indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_mint_created ON chat_messages(mint, createdat);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(userid, read);

-- Agent nodes indexes
CREATE INDEX IF NOT EXISTS idx_node_tokens_node_id ON node_tokens(node_id);
CREATE INDEX IF NOT EXISTS idx_agent_nodes_social_active 
  ON agent_nodes(social_enabled, is_active) 
  WHERE social_enabled = true AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_agent_nodes_social_tone ON agent_nodes(social_tone);
CREATE INDEX IF NOT EXISTS idx_agent_nodes_social_posts_count ON agent_nodes(total_social_posts DESC);

-- Token indexes
CREATE INDEX IF NOT EXISTS idx_tokens_launch_type ON node_tokens(launch_type);

-- =====================================================
-- VIEWS & FUNCTIONS
-- =====================================================

-- View: partner_dashboard_stats
-- Analytics view for partner dashboard
CREATE OR REPLACE VIEW partner_dashboard_stats AS
SELECT 
  an.node_id,
  an.partner_wallet as wallet_address,
  an.node_id as brand_name,
  
  -- Launch counts
  COUNT(nt.id) FILTER (WHERE nt.launch_type = 'STANDARD') as standard_launches,
  COUNT(nt.id) FILTER (WHERE nt.launch_type = 'AGENT_LAUNCH') as agent_launches,
  COUNT(nt.id) as total_launches,
  
  -- Fee tracking
  COALESCE(SUM(nt.trading_fees) FILTER (WHERE nt.launch_type = 'STANDARD'), 0) as standard_fees,
  COALESCE(SUM(nt.trading_fees) FILTER (WHERE nt.launch_type = 'AGENT_LAUNCH'), 0) as agent_fees,
  COALESCE(SUM(nt.trading_fees), 0) as total_fees,
  
  -- Volume tracking
  COALESCE(SUM(nt.trading_volume), 0) as total_volume,
  
  -- Active tokens (launched in last 30 days)
  COUNT(nt.id) FILTER (WHERE nt.created_at > NOW() - INTERVAL '30 days') as active_tokens
  
FROM agent_nodes an
LEFT JOIN node_tokens nt ON nt.node_id = an.node_id
GROUP BY an.node_id, an.partner_wallet, an.node_id;

-- Function: update_partner_stats
-- Auto-update partner statistics
CREATE OR REPLACE FUNCTION update_partner_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update agent_nodes stats when token is inserted/updated
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE agent_nodes
    SET 
      standard_launches = (
        SELECT COUNT(*) FROM node_tokens WHERE node_id = NEW.node_id AND launch_type = 'STANDARD'
      ),
      agent_launches = (
        SELECT COUNT(*) FROM node_tokens WHERE node_id = NEW.node_id AND launch_type = 'AGENT_LAUNCH'
      ),
      total_fees_earned = (
        SELECT COALESCE(SUM(trading_fees), 0) FROM node_tokens WHERE node_id = NEW.node_id
      )
    WHERE node_id = NEW.node_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: trigger_update_partner_stats
-- Auto-update partner stats on token changes
DROP TRIGGER IF EXISTS trigger_update_partner_stats ON node_tokens;
CREATE TRIGGER trigger_update_partner_stats
AFTER INSERT OR UPDATE ON node_tokens
FOR EACH ROW
EXECUTE FUNCTION update_partner_stats();

-- =====================================================
-- PERMISSIONS
-- =====================================================

-- Grant permissions (adjust based on your Supabase setup)
GRANT SELECT ON partner_dashboard_stats TO authenticated;
GRANT EXECUTE ON FUNCTION update_partner_stats() TO authenticated;

-- Enable Realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE bets;
ALTER PUBLICATION supabase_realtime ADD TABLE dice_sessions;

-- =====================================================
-- SCHEMA COMPLETE
-- =====================================================
