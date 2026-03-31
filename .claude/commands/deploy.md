# Command: Deploy (/project:deploy)
Description: Melakukan deployment ke environment target.

## Instructions
1. **Frontend:** Jalankan `pnpm build` di `apps/frontend` dan deploy ke Vercel/Fleek.
2. **Programs:** Jalankan `anchor build` dan `anchor deploy` ke Solana Mainnet/Devnet.
3. **Agent:** Rebuild Docker container untuk `apps/agent-backend` dan push ke registry.
4. Verifikasi environment variables (BYOK master keys, RPC URLs).
