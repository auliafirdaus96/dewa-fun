# 🎲 dewa.fun — The AI-Native Token Launchpad & Social Casino

**dewa.fun** adalah protokol B2B2C (Launchpad-as-a-Service) revolusioner yang menggabungkan peluncuran memecoin dengan kasino sosial yang dikelola oleh AI Agent otonom. Di sini, setiap token bukan hanya aset, tapi juga "The House" bagi komunitasnya sendiri.

---

## 🌟 Visi Utama

Membangun ekosistem di mana setiap peluncuran memecoin memiliki utility instan melalui integrasi kasino (Dice Game) dan dikelola secara cerdas oleh "AI CEO" (Partner Nodes) yang dapat berinteraksi, berpromosi, dan mengambil keputusan otonom di media sosial.

---

## 🏗️ Arsitektur Monorepo

Proyek ini dikelola menggunakan struktur monorepo untuk menyinkronkan frontend, backend AI, dan smart contract:

### 1. [Frontend (Next.js 15)](/apps/frontend)
- **UI/UX:** Modern, responsif, dan dinamis menggunakan Tailwind dan Framer Motion.
- **Wallet Support:** Integrasi penuh dengan Solana Wallet Adapter.
- **Real-time:** Live chat dan feed taruhan menggunakan WebSockets.

### 2. [AI Backend (Python)](/apps/agent-backend)
- **Engine:** Berbasis LangGraph untuk alur kerja agentic yang cerdas.
- **Social Dominance:** Background worker (Dewa Worker) yang memposting konten proaktif, Social Raiding, dan Social Listeners.
- **On-Demand BYOK:** Implementasi *Bring Your Own Key* di mana pengguna hanya memberikan API Key saat mengaktifkan fitur operasional (Social/DLMM).

### 3. [Smart Contracts (Solana/Anchor)](/docs/DICE_ARCHITECTURE.md)
- **Provably Fair:** Algoritma Dice Game yang dapat diverifikasi kejujurannya.
- **Fee Routing:** Sistem pembagian fee otomatis antara Creator (0.75%), Treasury (0.25%), dan Partner.

---

## 🤖 Ekosistem "AGENTS" (AI-First)

Platform dewa.fun berfokus pada pemberdayaan token melalui tiga pilar utama AI:

1.  **Agent Launch**: Pengalaman peluncuran token yang ringan dan cepat tanpa hambatan teknis awal.
2.  **Agent Social**: Strategi pemasaran otonom (Social Strategist) yang melakukan raiding, engagement, dan konten viral menggunakan API Key pengguna.
3.  **Agent DLMM**: Manajemen likuiditas pada protokol Meteora untuk menjaga stabilitas harga dan kedalaman pasar secara otonom.

---

## 💰 Ekonomi Protokol

Kami menerapkan integrasi dengan protokol `bags.fm` untuk trading:
- **Partner Node (B2B2C):** 0.75% untuk Partner, 0.25% untuk Protocol Treasury.
- **House Edge:** 1% dari volume taruhan disalurkan untuk profitabilitas Creator dan buyback $DEWA.

---

## 🚀 Panduan Penggunaan (Quick Start)

### 1. Prerequisites
- Node.js v20+ & PNPM (untuk Frontend)
- Python 3.10+ & Venv (untuk AI Backend)
- Solana CLI & Anchor (untuk Kontrak)

### 2. Instalasi & Running
```powershell
# Jalankan UI Frontend
cd apps/frontend
npm run dev

# Jalankan Ekosistem AI
cd apps/agent-backend
.\venv\Scripts\activate
python start_all.py
```

---

## 🛠️ Stack Teknologi

| Komponen | Teknologi |
| --- | --- |
| **Frontend** | React 19, Next.js 15, Tailwind, Zustand |
| **AI Brain** | Python, LangGraph, OpenAI o1/gpt-4o, Anthropic |
| **Blockchain** | Solana (Anchor), Web3.js, Helius, Meteora |
| **Database** | Supabase (PostgreSQL), Redis |
| **Integrasi** | Bags.fm SDK, Telegram Bot API, Tweepy |

---

## 🗺️ Roadmap & Dokumentasi
- [Master Roadmap](/docs/ROADMAP.md)
- [Dice Game Architecture](/docs/DICE_ARCHITECTURE.md)
- [AI Backend Deep Dive](/apps/agent-backend/README.md)

---

<div align="center">
  <p>© 2026 dewa.fun - Built for the future of AI-Native memecoins.</p>
</div>
