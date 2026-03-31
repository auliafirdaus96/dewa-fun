# Skill: Security Review
Description: Otomatis memeriksa kerentanan pada wallet dan transaksi sebelum eksekusi.

## Workflow
1. Intercept permintaan transaksi.
2. Jalankan simulasi via RPC (simulateTransaction).
3. Cek balance changes; pastikan tidak ada "sudden drain".
4. Verifikasi `security.md` compliance.
