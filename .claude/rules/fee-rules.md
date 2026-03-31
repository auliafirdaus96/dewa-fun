# Fee & Tokenomics Rules

## Trading Fees (Dewa Launchpad - Phase 9)
- **Standard (B2C):** 0.5% Creator / 0.5% Dewa Treasury.
- **Agent Launch (B2B):** 0.75% Agent / 0.25% Dewa Treasury.
- **Protocol Total:** 1.0% (100 BPS) target on all trading volume.

## Utility Fees (Dice Games)
- **Split Ratio:** 25-25-30-20
    - **25%:** Creator (Token owner who deposited vault funds)
    - **25%:** Agent (Platform operator / Vault operator)
    - **30%:** Dewa Treasury (Protocol revenue)
    - **20%:** Affiliates/Referrals (User referrals)

**Note:** If no Agent is configured, Creator receives both shares (50% total).

## Utility Fees (AI Tools - DLMM, Social, etc.)

### NO PLATFORM FEES - COMPLETELY FREE

**Policy:**
- User provides their own LLM API key (OpenAI, Anthropic, Groq, etc.)
- User pays LLM provider directly
- **Platform Fee: $0** - We do not charge for AI tool usage
- **No subscription, no markup, no hidden fees**

**Rationale:**
- AI tools are **user acquisition**, not revenue center
- Free AI access attracts users to platform
- Users trade on DLMM/Dice → Platform earns from **trading fees** (already structured)
- Win-win: Users get free AI, platform gets trading volume

**Revenue comes from:**
1. Dice Games trading fees (25-25-30-20 split)
2. DLMM trading fees (when implemented)
3. **NOT** from AI tool usage fees

**Important:** There is NO "Managed Service" or "Premium Tier" for AI tools. All AI features are free when users bring their own API key.

## Anti-Rug Mechanisms
- **Locked Supply Vault:** Initial supply for liquidity must be locked in a transparent vault program.
- **Transparent Splits:** All fee distributions must be verifiable on-chain via events or public state.
- **Max Bet Limits:** For casino games, dynamic max bets based on vault depth to prevent bankroll draining.
