# Skill: DLMM Rebalance
Description: Membantu SEMUA user (creator maupun retail trader) optimize yield di Meteora DLMM pools.

## Target Users
- **Token Creators:** Managing liquidity pool token mereka sendiri
- **Retail Traders:** Providing liquidity for yield farming (ANY pool, not just their token)
- **AI Agents:** Managing positions on behalf of users (non-custodial)

## Workflow
1. Monitor user's active DLMM positions across ANY pools (not limited to owner's token)
2. Detect opportunities based on:
   - Price approaching range edges (risk of IL)
   - High volatility creating fee opportunities
   - Market conditions matching user's strategy template
3. Calculate optimal new bin range considering:
   - Current volatility index (from Oracle Service)
   - Fee APR vs impermanent loss risk
   - User's selected strategy (Conservative/Balanced/Aggressive)
4. Generate rebalance recommendations with clear explanations
5. Create transaction instructions (NON-CUSTODIAL - user must approve & sign)
6. Notify user via dashboard with full transparency

## Safety Rules
- NEVER execute without user signature (non-custodial)
- ALWAYS show expected impact (fees, IL, gas costs)
- Provide 2-3 options when possible (conservative vs aggressive)
- Log all recommendations to user's action history
