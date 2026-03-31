# Utilities Rules (Hybrid & AI)

## Dice Hybrid
- **Provably Fair:** Gunakan logic SHA-512 konsisten antara Python (backend) dan JS (SDK).
- **Vault Obfuscation:** Jangan expose saldo asli vault ke public API; gunakan percentage-based limits (max bet).

## Social Content Factory (Phase 10)
- **Viral Content:** Gunakan `generate_social_content` untuk membuat narasi berbasis data (Price/Vol).
- **Hooks & Tone:** Prioritaskan "witty" dan "bullish" tone untuk memecoin.
- **Multi-Platform:** Sesuaikan limit karakter (280) untuk Twitter/X.

## DLMM (Dynamic Liquidity Market Maker)
- Prioritaskan integrasi Meteora DLMM SDK.
- Auto-rebalance trigger harus didasarkan pada slippage dan volume volatility.

## Badges (Metaplex Core)
- Gunakan Metaplex Core untuk efisiensi.
- Badge diberikan berdasarkan milestone: `FIRST_LAUNCH`, `VOL_100SOL`, `TOP_AFFILIATE`.
