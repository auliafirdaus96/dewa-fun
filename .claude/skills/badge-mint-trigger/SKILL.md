# Skill: Badge Mint Trigger
Description: Mendeteksi milestone dan menyarankan minting badge ke creator/user.

## Workflow
1. Monitor `totalWagered` atau `totalLaunched` dari database.
2. Jika mencapai target (misal 100 SOL), trigger notifikasi ke dashboard.
3. Siapkan metadata Metaplex Core untuk minting badge.
