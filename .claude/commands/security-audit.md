# Command: Security Audit (/project:security-audit)
Description: Audit keamanan menyeluruh pada wallet, BYOK, dan transaksi.

## Instructions
1. Cek semua tempat penyimpanan key di codebase.
2. Pastikan enkripsi BYOK menggunakan salt yang benar.
3. Audit flow transaksi untuk mencegah "fee leakage" atau "drainer" patterns.
4. Verifikasi `anti-rug.md` compliance.
