# Security Rules

## Wallet & Keys
- **No Private Keys in Code:** Never hardcode or log private keys.
- **Delegated Wallets:** Use delegated authority for automated agent transactions.
- **BYOK (Bring Your Own Key):** 
    - LLM API Keys must be encrypted at rest using AES-256.
    - User keys should only be decrypted in memory during the execution phase.
    - Never pass raw API keys through frontend logs.

## Smart Contracts
- **Overflow checks:** Always use checked math or `SafeMath` (Anchor handle this by default in newer versions).
- **Access Control:** Use `#[account(constraint = ...)]` for ownership checks.
- **Re-entrancy:** Be mindful of cross-program invocations (CPI).

## Data Privacy
- Sanitize all user inputs before passing to LLMs.
- Do not store PII (Personally Identifiable Information) on-chain.
