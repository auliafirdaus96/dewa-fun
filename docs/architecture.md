# 🏛️ Dewa Protocol Architecture

Dewa adalah ekosistem monorepo yang dirancang untuk skalabilitas tinggi dalam penyediaan layanan Launchpad dan Social Casino bertenaga AI.

## 🏗️ Struktur Sistem

### 1. Layers
- **On-Chain Layer (`programs/`)**: Kontrak cerdas Solana (Anchor) untuk Dice Casino dan Metaplex Core Badges.
- **AI Brain Layer (`apps/agent-backend`)**: Python service berbasis LangGraph yang mengelola logika otonom, strategi sosial (Content Factory), dan dominasi pasar.
- **Frontend Layer (`apps/frontend`)**: Antarmuka pengguna berbasis Next.js 15 dengan integrasi Dashboard Partner & Social Casino.
- **SDK & Utils Layer (`packages/`)**: Kode bersama yang dapat digunakan oleh pihak ketiga.

### 2. Alur Data Utama
1. **Trigger**: Peluncuran token di Frontend.
2. **Sync**: Metadata agen disimpan di Supabase dan disinkronkan ke Backend AI.
3. **Action**: Backend AI melakukan aksi di media sosial dan on-chain (DLMM monitoring).
4. **Reward**: Badge NFT dicetak saat pencapaian tertentu terpenuhi.

## 🔗 Integrasi Pihak Ketiga (Public SDK)
Pengembang eksternal dapat menggunakan `@dewa/shared-types` dan `@dewa/solana-utils` untuk membangun aplikasi yang terintegrasi dengan ekosistem Dewa.
