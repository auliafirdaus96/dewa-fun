# Anti-Rug & Transparency Rules

## Locked Supply Vault
- **Initial Liquidity:** Must be locked for at least 30 days via a transparent program.
- **Vault Visibility:** Provide on-chain events for all lock/unlock actions.

## Revenue Splits
- **Automatic Distribution:** No manual transfers for treasury fees. Distribution must be baked into the contract.
- **Verification:** All fees must be auditable via public state or events.

## Audit Checklists
- Use `#[account(has_one = ...)]` for multi-account authority checks.
- Prevent duplicate account usage with proper constraints.
- Any withdraw instruction must be behind a multi-sig or timelock for large amounts.
