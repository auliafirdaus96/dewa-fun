# 🗺️ dewa.fun - Master Roadmap & Architecture Plan

## 🎯 Visi Utama
**dewa.fun** adalah **Protokol B2B2C (Launchpad-as-a-Service)** yang memungkinkan siapa saja meluncurkan platform token launchpad sendiri yang dikelola oleh AI Agent (AI CEO).

---

## 🚀 Fase Pengembangan (Phases of Work)

### Phase 1: Foundation & Core UI (B2C) - [x] Complete
- [x] Landing Page & Vision.
- [x] Token Launchpad Core (Standard Launch).
- [x] Wallet Integration (Solana).

### Phase 2: The "Partner Node" Protocol (B2B2C) - [x] Complete
- [x] Dashboard Partner/Agent (`/agents/dashboard`).
- [x] Fee Routing System (0.75% for Agent).
- [x] BYOK (Bring Your Own Key) security.

### Phase 3: AI CEO & Automation - [x] Complete
- [x] Integrasi LangGraph untuk Agent logic.
- [x] Autonomous Twitter/X & Telegram interaction.
- [x] AI Decision Making (Buyback/Burn).

### Phase 4: Gamification & Utility (Dice Game) - [x] Complete
- [x] Dice Game Smart Contract (Anchor/Solana).
- [x] Wolfbet-style UI (Manual, Auto, Flash).
- [x] Provably Fair & Creator Bankroll model.

### Phase 5: Hardening & Scalability - [x] Complete
- [x] **Security Hardening**
    - [x] VRF Timeout & Refund mechanism.
    - [x] Vault Circuit Breakers (Auto-pause).
    - [x] Migrasi BYOK ke KMS (Key Management Service).
- [x] **Observability & Trust**
    - [x] Structured Logging (JSON).
    - [x] Dashboard Monitoring Real-time (Health Factor).
    - [x] Integrity Scrutiny (Audit trails harian).

### Phase 6: Production Hardening - [x] Complete
- [x] **Reliability & Monitoring**
    - [x] Automated Daily Audit Reports (Email Admin).
    - [x] Sentry Integration (Client, Server, Edge error tracking).
    - [x] Load Testing Script (`scripts/loadTest.ts`) for high traffic simulation.
- [x] **Integrity Automation**
    - [x] implemented `AuditCronjob.ts` for background audits.

### Phase 7: Ecosystem & Public SDK - [x] Complete
- [x] DB Indexing optimization for large Bet history.
- [x] Public SDK for 3rd party game integrations.
- [x] Automated Partner SDK CI/CD Pipeline.
- [x] Advanced AI Persona (Sentiment Listener).

### Phase 8: AI Social Dominance & Python Transition - [x] Complete
- [x] **Backend Rewrite (Python)**
    - [x] Porting logika LangGraph dari TS ke Python.
    - [x] Integrasi FastAPI untuk API Agent yang lebih cepat.
    - [x] Implementasi Real Tooling (Solana, Meteora, Metaplex).
- [x] **Autonomous Presence**
    - [x] Background Worker untuk aksi proaktif periodik.
    - [x] Real-time Social Listeners (Telegram/Twitter).
- [x] **Frontend-Backend Integration**
    - [x] Sinkronisasi Webhook antara Next.js dan Python AI.

### Phase 9: AI Agent Ecosystem & B2B Scalability - [x] Complete
- [x] **Tiga Pilar AI Agent (White-label & BYOK)**
    1. **AI Launch:** Automasi peluncuran token dengan 2 skema:
        - *B2C (Standard):* Fee Share 0.5% Creator / 0.5% Dewa.
        - *B2B (Agent Launch):* Fee Share 0.75% Agent / 0.25% Dewa.
    2. **AI CEO:** Manajemen komunitas otonom (Twitter/Telegram) & platform governance.
    3. **AI DLMM:** Pengelolaan likuiditas otomatis melalui Meteora DLMM.
- [x] **Infrastructure Modernization (Cloud-First)**
    - [x] Migrasi dari local Docker ke **Cloud Managed Services** (Railway/Google Cloud Run/AWS Fargate).
    - [x] Implementasi GitHub Actions untuk Cloud Build & Deployment otomatis (menghemat resource perangkat lokal).
    - [x] Penguatan sistem **BYOK** (Bring Your Own Key) untuk OpenAI, Anthropic, dan Solana Private Keys.

---

## 💰 Economic Model (Fee Sharing)
Total Trading Fee: **1.0%**

| Tipe Launch | Kreator/Agent Share | Dewa Treasury Share | Keterangan |
| :--- | :--- | :--- | :--- |
| **Standard (B2C)** | 0.5% | 0.5% | User biasa membuat koin manual |
| **Agent (B2B)** | 0.75% | 0.25% | Partner/B2B menggunakan AI Agent Launch |

---

## 🛠️ Tech Stack
- **Frontend:** Next.js 15, React 19, Tailwind CSS (Vercel Deployment).
- **Backend (Web):** Node.js, Prisma (Supabase PostgreSQL).
- **Backend (AI Core):** Python 3.10+, FastAPI, LangGraph.
- **Infrastructure:** Railway / GCP (Cloud-first, skip local Docker for production workers).
- **AI Engine:** OpenAI (GPT-4o), Anthropic (Claude 3.5) via BYOK.
- **Blockchain:** Solana (solana-py, solders), Meteora (DLMM Liquidity), Metaplex.
