# 🎲 dewa.fun - Dice Casino Smart Contract PRD
**Status:** INTEGRATED | **Phase:** 4 | **Model:** The Creator Deposit

## 1. Executive Summary
The Dice game on `dewa.fun` is not just a game; it is a rapid-utility generator for memecoins. By allowing Token Creators to deposit their own tokens to bankroll the casino, they become "The House". This incentivizes creators to lock their tokens, generates passive income for them through the House Edge, and prevents immediate rugpulls by creating a strong utility sink.

## 2. Core Mechanics

### 2.1 The Vault (Bankroll Pool)
- **Architecture**: A PDA (Program Derived Address) that holds SPL tokens.
- **Activation**: A token is NOT playable in the `/games/dice` UI until the Creator explicitly calls `initialize_vault` and deposits the required minimum amount of tokens (e.g., 1,000,000 tokens).
- **Sole Proprietor**: Only the Creator (or designated Partner Node) funds the Vault initially. No open community staking is allowed in Phase 1 to ensure exclusivity and simplicity.
- **Max Bet Limit**: To prevent a "Bank Run", the Smart Contract enforces a dynamic `Max Profit per Roll` parameter (e.g., 1% of the current Vault Balance). 

### 2.2 Gameplay Flow (Provably Fair)
1. **Bet Placement**: Player signs a `place_bet` instruction with their target number (e.g., `< 50`), transferring tokens to the temporary Vault escrow.
2. **VRF Call**: The contract requests a random number from a Solana oracle (Switchboard VRF or Pyth).
3. **Resolution**: The VRF callback triggers `resolve_bet`:
   - If Player Wins: Tokens are sent from the Vault to the Player.
   - If Player Loses: Player's tokens remain in the Vault (effectively going to the Creator), minus the Protocol Fee.

### 2.3 Tokenomics & Fee Routing
- **House Edge**: Fixed at 1% for maximum player attraction.
- **Fee Distribution** (Wager Fee Routing from the 1% Edge):
  - **50% of House Edge**: Stays in the Vault (Reward for Creator's liquidity risk).
  - **30% of House Edge**: Sent to the `dewa.fun` Protocol Treasury (For platform maintenance, protocol growth, and buyback & burn $DEWA).
  - **20% of House Edge**: Sent to the Affiliate/Partner Node wallet (B2B2C marketing incentive).

### 2.4 Vault Obfuscation (Anti-Gaming Mechanic)
- **Frontend Strictness**: The UI must **never** reveal the total balance or liquidity depth of a token's Vault to the player. Words like "Vault", "House Supply", or "Creator Deposit" are completely hidden from the gaming UI.
- **Why**: If players know the Vault is running low, they will stop playing. If they know it is exceedingly high, whale players might try aggressive Martingale strategies to drain it.
- **On-Chain Reality**: While blockchain explorers (Solscan) can trace the PDA balance, we mitigate on-chain snipers by strictly enforcing the dynamic `Max Profit per Roll` parameter in the Smart Contract. The UI will simply throw a generic "Bet exceeds table limit" error if a player places a bet that the Vault cannot safely pay out without risking Creator insolvency.

## 3. Solana Program Instructions (Rust/Anchor implementation)

### `initialize_vault`
- **Signer**: Token Creator
- **Action**: Creates the PDA Vault for a specific mint. Transfers initial liquidity to the Vault.

### `place_bet`
- **Signer**: Player
- **Params**: `amount`, `target_number`, `is_under`
- **Action**: Locks player funds, initiates Switchboard VRF request.

### `resolve_bet`
- **Signer**: Switchboard Oracle (Callback)
- **Params**: `vrf_result`
- **Action**: Calculates win/loss. Executes SPL token transfers based on Fee Routing rules.

## 4. Architecture & Integration (Next.js + Python AI Ecosystem)
- **Frontend App Router**: Diintegrasikan di dalam `app/dice/page.tsx` pada aplikasi frontend Next.js.
- **AI Agent Integration**: Agent "Dewa" (Python Backend) menggunakan tool `simulate_dice_game` untuk melakukan promosi dan simulasi taruhan guna meningkatkan volume casino secara otonom.
- **Wallet Adapter**: `@solana/wallet-adapter-react` digunakan penuh untuk me-request tanda tangan taruhan (VRF) secara on-chain.
