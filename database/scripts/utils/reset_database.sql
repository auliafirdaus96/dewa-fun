-- =====================================================
-- DEWA.FUN - Database Reset Utility
-- =====================================================
-- WARNING: This will DELETE ALL DATA! Use only in development.
-- =====================================================

BEGIN;

-- Drop all tables (in reverse dependency order)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS leaderboard_history CASCADE;
DROP TABLE IF EXISTS affiliate_rewards CASCADE;
DROP TABLE IF EXISTS referrals CASCADE;
DROP TABLE IF EXISTS bets CASCADE;
DROP TABLE IF EXISTS dice_sessions CASCADE;
DROP TABLE IF EXISTS vaults CASCADE;
DROP TABLE IF EXISTS node_tokens CASCADE;
DROP TABLE IF EXISTS agent_memory CASCADE;
DROP TABLE IF EXISTS agent_nodes CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop views
DROP VIEW IF EXISTS partner_dashboard_stats CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_partner_stats() CASCADE;

-- Drop types
DROP TYPE IF EXISTS betmode CASCADE;
DROP TYPE IF EXISTS betstatus CASCADE;
DROP TYPE IF EXISTS betdirection CASCADE;

COMMIT;

-- Recreate schema from scratch
-- Run: psql $DATABASE_URL -f database/schemas/supabase_schema.sql
