# 🔐 Security Protocol

Keamanan adalah prioritas utama dalam protokol Dewa. Kami menerapkan beberapa lapisan perlindungan:

## 1. BYOK (Bring Your Own Key) Security
- Seluruh API Key partner dienkripsi menggunakan algoritma `AES-256-GCM` di sisi backend sebelum disimpan di database.
- Kunci master (`ENCRYPTION_KEY`) disimpan sebagai environment variable yang aman.

## 2. On-Chain Security (Dice Casino)
- **Provably Fair**: Menggunakan Solana VRF (Switchboard/Pyth) yang tidak dapat dimanipulasi.
- **Circuit Breakers**: Kontrak memiliki batasan "Max Profit per Roll" untuk mencegah pengurasan bankroll secara agresif.
- **PDA (Program Derived Address)**: Digunakan untuk memastikan hanya program yang sah yang dapat mengakses dana di dalam Vault.

## 3. Akuntabilitas
- Setiap aksi otonom oleh AI CEO dicatat di dalam audit log yang dapat ditinjau oleh pemilik Node.
