# 🚀 RENCANA IMPLEMENTASI PERBAIKAN AGENT BACKEND

## 📋 DAFTAR TUGAS BERDASARKAN PRIORITAS

---

## 🔴 **PRIORITAS 0 (P0) - KRITIS - MINGGU 1-2**

### **Tugas P0.1: Implementasi Autentikasi & Authorization Middleware**
**ID:** `sec001`  
**Agent:** Semua (Launch, Social, DLMM)  
**Estimasi:** 3 hari  
**File Terkait:** `src/middleware/auth.ts`, `src/routes/*.ts`

**Sub-tugas:**
- [ ] Buat middleware `verifyWalletSignature` untuk validasi signature Solana
- [ ] Implementasi JWT token generation setelah verifikasi wallet
- [ ] Tambahkan decorator `@Authenticated()` pada semua endpoint sensitive
- [ ] Buat endpoint `/api/auth/challenge` untuk mendapatkan nonce
- [ ] Buat endpoint `/api/auth/verify` untuk menukar signature dengan JWT
- [ ] Update semua route handlers untuk menggunakan auth middleware
- [ ] Test integration dengan frontend wallet connection

**Acceptance Criteria:**
- ✅ Semua endpoint POST/PUT/PATCH memerlukan authentication
- ✅ Signature verification menggunakan @solana/web3.js
- ✅ JWT token expired setelah 24 jam
- ✅ Unit tests untuk auth middleware pass

---

### **Tugas P0.2: Perbaiki Error Handling Database (Silent Failure Fix)**
**ID:** `sec002`  
**Agent:** Agent Launch  
**Estimasi:** 1 hari  
**File Terkait:** `src/tools/launchTool.ts`

**Sub-tugas:**
- [ ] Ganti silent catch dengan custom error class `DatabaseOperationError`
- [ ] Implementasi retry mechanism dengan exponential backoff (max 3 retries)
- [ ] Tambahkan transaction pattern untuk dual insert (agent_nodes + node_tokens)
- [ ] Buat rollback mechanism jika second insert gagal
- [ ] Log semua database errors ke monitoring service
- [ ] Throw error ke caller jika persistence gagal

**Acceptance Criteria:**
- ✅ Tidak ada lagi silent failures di database operations
- ✅ Error dilempar jika salah satu insert gagal
- ✅ Retry logic berfungsi dengan baik
- ✅ Integration tests untuk error scenarios

---

### **Tugas P0.3: Validasi Transaksi Bags.fm API**
**ID:** `sec003`  
**Agent:** Agent Launch  
**Estimasi:** 2 hari  
**File Terkait:** `src/tools/launchTool.ts`, `src/utils/transactionValidator.ts`

**Sub-tugas:**
- [ ] Buat utility `validateBagsTransaction()` untuk verifikasi response structure
- [ ] Verifikasi signature dari Bags.fm menggunakan public key mereka
- [ ] Validate field wajib: `transaction`, `mint`, `feeConfig`
- [ ] Tambahkan timeout handling (max 30 detik)
- [ ] Implementasi circuit breaker untuk API failures berulang
- [ ] Create mock transaction untuk testing tanpa API call nyata

**Acceptance Criteria:**
- ✅ Response API divalidasi sebelum diproses
- ✅ Signature verification berhasil
- ✅ Error handling untuk invalid responses
- ✅ Circuit breaker aktif setelah 5 failures berturut-turut

---

### **Tugas P0.4: Implementasi DLMM SDK Integration (Replace Mocks)**
**ID:** `sec004`  
**Agent:** Agent DLMM  
**Estimasi:** 5 hari  
**File Terkait:** `src/services/meteoraService.ts`, `src/tools/meteoraManager.ts`

**Sub-tugas:**
- [ ] Install package `@meteora-ag/dlmm` versi terbaru
- [ ] Setup connection ke Solana RPC (mainnet + devnet)
- [ ] Implementasi `initializeDlmmPool()` yang sebenarnya:
  - [ ] Buat DLMM instance dengan connection
  - [ ] Generate initialization instruction
  - [ ] Hitung estimated gas fees
- [ ] Implementasi `addLiquidityDlmm()` yang sebenarnya:
  - [ ] Fetch pool info dari on-chain
  - [ ] Build add liquidity instruction dengan SDK
  - [ ] Calculate position tokens
- [ ] Implementasi `rebalanceLiquidityDlmm()`:
  - [ ] Get user position data
  - [ ] Build rebalance instruction
  - [ ] Simulate transaction impact
- [ ] Implementasi `claimDlmmFees()`:
  - [ ] Fetch accumulated fees from pool
  - [ ] Build claim instruction
- [ ] Testing menyeluruh di Devnet sebelum Mainnet

**Acceptance Criteria:**
- ✅ Semua fungsi tidak lagi return mock data
- ✅ Transaction instructions dapat ditandatangani wallet
- ✅ Berhasil execute di Devnet test environment
- ✅ Error handling untuk insufficient balance, slippage, dll

---

### **Tugas P0.5: Fix Oracle Price Fallback Mechanism**
**ID:** `sec005`  
**Agent:** Agent DLMM  
**Estimasi:** 2 hari  
**File Terkait:** `src/services/oracleService.ts`

**Sub-tugas:**
- [ ] Tambahkan multiple price sources (Jupiter + Pyth + Chainlink)
- [ ] Implementasi price deviation check (max 5% dari median)
- [ ] Buat circuit state untuk oracle health monitoring
- [ ] Ganti hardcoded fallback dengan last known good price
- [ ] Tambahkan timestamp validation (reject prices > 5 menit)
- [ ] Alerting jika semua oracle sources gagal

**Acceptance Criteria:**
- ✅ Price validation menolak outliers (>5% deviation)
- ✅ System menggunakan last known good price jika semua oracle down
- ✅ Timestamp validation aktif
- ✅ Monitoring alerts saat oracle issues

---

### **Tugas P0.6: Secure Memory Management untuk API Keys**
**ID:** `sec006`  
**Agent:** Agent Social  
**Estimasi:** 1 hari  
**File Terkait:** `src/core/encryption.ts`, `src/core/llmWrapper.ts`

**Sub-tugas:**
- [ ] Buat buffer zeroing function setelah key digunakan
- [ ] Implementasi `SecureKeyContainer` class dengan auto-wipe
- [ ] Set maximum lifetime untuk decrypted keys dalam memory (5 menit)
- [ ] Gunakan `crypto.scryptSync` untuk key derivation
- [ ] Audit semua tempat dimana decrypted keys disimpan
- [ ] Tambahkan logging untuk key access tracking

**Acceptance Criteria:**
- ✅ Decrypted keys dihapus dari memory setelah digunakan
- ✅ Key container memiliki TTL 5 menit
- ✅ Tidak ada plaintext keys yang tersimpan lama di memory
- ✅ Security audit menunjukkan no key leakage

---

## 🟡 **PRIORITAS 1 (P1) - TINGGI - MINGGU 3-4**

### **Tugas P1.1: Rate Limiting Implementation**
**ID:** `sec007`  
**Agent:** Semua  
**Estimasi:** 2 hari  
**File Terkait:** `src/middleware/rateLimiter.ts`

**Sub-tugas:**
- [ ] Install `express-rate-limit` atau alternatif Hono
- [ ] Buat rate limit config per endpoint:
  - `/api/agents/run`: 10 requests/minute
  - `/api/agents/social/*`: 30 requests/minute
  - `/api/agents/dlmm/chat`: 20 requests/minute
- [ ] Implementasi sliding window algorithm
- [ ] Tambahkan Redis-backed rate limiting untuk distributed system
- [ ] Custom responses untuk rate-limited requests (429 Too Many Requests)
- [ ] Whitelist untuk admin wallets

**Acceptance Criteria:**
- ✅ Rate limiting aktif di semua endpoints
- ✅ Redis integration untuk multi-instance deployment
- ✅ Proper HTTP 429 responses
- ✅ Admin bypass berfungsi

---

### **Tugas P1.2: Input Validation & Sanitization Middleware**
**ID:** `sec008`  
**Agent:** Semua  
**Estimasi:** 2 hari  
**File Terkait:** `src/middleware/inputValidator.ts`

**Sub-tugas:**
- [ ] Extend Zod schemas dengan validasi lebih ketat:
  - Max length untuk strings (name: 50 chars, ticker: 10 chars)
  - Regex patterns untuk valid format
  - Number ranges untuk numerical inputs
- [ ] HTML/Script injection sanitization
- [ ] XSS prevention filtering
- [ ] SQL injection prevention (parameterized queries)
- [ ] Custom validators untuk Solana addresses
- [ ] Rate limit payload size (max 1MB per request)

**Acceptance Criteria:**
- ✅ Semua inputs divalidasi sebelum processing
- ✅ XSS attempts blocked dan logged
- ✅ Invalid addresses rejected dengan clear error
- ✅ Payload size limits enforced

---

### **Tugas P1.3: Content Moderation System**
**ID:** `sec009`  
**Agent:** Agent Social  
**Estimasi:** 3 hari  
**File Terkait:** `src/middleware/contentModerator.ts`, `src/tools/socialService.ts`

**Sub-tugas:**
- [ ] Integrate Perspective API untuk toxicity detection
- [ ] Buat custom filters untuk:
  - Hate speech detection
  - Scam/fraud prevention (keyword: "guaranteed returns", "moon soon")
  - NSFW content blocking
  - Spam detection (repeated content)
- [ ] Human review queue untuk borderline content
- [ ] Appeal mechanism untuk false positives
- [ ] Community reporting system
- [ ] Blacklist untuk repeat offenders

**Acceptance Criteria:**
- ✅ Toxic content otomatis blocked (toxicity score > 0.8)
- ✅ Scam keywords terdeteksi dan flagged
- ✅ Manual review workflow tersedia
- ✅ Reporting system berfungsi

---

### **Tugas P1.4: Wallet Ownership Verification**
**ID:** `sec010`  
**Agent:** Semua  
**Estimasi:** 2 hari  
**File Terkait:** `src/services/ownershipService.ts`

**Sub-tugas:**
- [ ] Buat function `verifyNodeOwnership(nodeId, walletAddress)`
- [ ] Query database untuk partner_wallet dari agent_nodes
- [ ] Match dengan verified wallet dari auth middleware
- [ ] Tambahkan multi-sig wallet support
- [ ] Ownership transfer mechanism dengan cooldown period
- [ ] Audit log untuk semua ownership checks

**Acceptance Criteria:**
- ✅ Hanya owner yang dapat modify node config
- ✅ Multi-sig verification untuk shared ownership
- ✅ Transfer ownership memerlukan 24h cooldown
- ✅ Complete audit trail

---

### **Tugas P1.5: Real-time Market Data Integration**
**ID:** `sec011`  
**Agent:** Agent DLMM  
**Estimasi:** 4 hari  
**File Terkait:** `src/services/oracleService.ts`, `src/services/priceService.ts`

**Sub-tugas:**
- [ ] Setup Pyth Network oracle integration:
  - [ ] Subscribe SOL/USD price feed
  - [ ] Handle price updates via WebSocket
- [ ] Setup Chainlink price feeds:
  - [ ] Integrate with Chainlink Data Feeds
  - [ ] Fallback logic antara Pyth dan Chainlink
- [ ] Historical data fetching untuk volatility calculations:
  - [ ] Fetch 24h, 7d, 30d price history
  - [ ] Calculate real volatility metrics
- [ ] Price caching strategy dengan Redis
- [ ] Health monitoring untuk oracle connections

**Acceptance Criteria:**
- ✅ Real-time prices dari minimal 2 sources
- ✅ Volatility calculation menggunakan data historis nyata
- ✅ Automatic failover antara oracles
- ✅ Price updates < 1 detik latency

---

## 🟢 **PRIORITAS 2 (P2) - SEDANG - MINGGU 5-6**

### **Tugas P2.1: Structured Logging System**
**ID:** `sec012`  
**Agent:** Semua  
**Estimasi:** 2 hari  
**File Terkait:** `src/utils/logger.ts`

**Sub-tugas:**
- [ ] Install Pino atau Winston logger
- [ ] Define log levels: ERROR, WARN, INFO, DEBUG
- [ ] Structured JSON logging untuk production
- [ ] Correlation IDs untuk request tracing
- [ ] Sensitive data masking (keys, addresses)
- [ ] Log rotation dan retention policy
- [ ] Integration dengan log aggregation (ELK/Datadog)

**Acceptance Criteria:**
- ✅ Semua logs dalam structured JSON format
- ✅ Request tracing dengan correlation IDs
- ✅ Sensitive data automatically masked
- ✅ Log files rotated daily, retained 30 days

---

### **Tugas P2.2: Comprehensive Test Coverage**
**ID:** `sec013`  
**Agent:** Semua  
**Estimasi:** 5 hari  
**File Terkait:** `tests/**/*.test.ts`

**Sub-tugas:**
- [ ] Unit tests untuk semua services dan tools:
  - [ ] Coverage target: >80%
  - [ ] Mock external dependencies
- [ ] Integration tests untuk API endpoints
- [ ] E2E tests untuk critical workflows:
  - Token launch flow
  - Social media posting flow
  - DLMM position management flow
- [ ] Security tests untuk auth & validation
- [ ] Load testing dengan Artillery.io
- [ ] CI/CD pipeline integration

**Acceptance Criteria:**
- ✅ Code coverage >80% untuk semua modules
- ✅ All critical paths tested
- ✅ E2E tests pass di staging environment
- ✅ Load test menunjukkan system handle 100 req/s

---

### **Tugas P2.3: Error Handling Standardization**
**ID:** `sec014`  
**Agent:** Semua  
**Estimasi:** 3 hari  
**File Terkait:** `src/utils/errors.ts`, semua files

**Sub-tugas:**
- [ ] Buat custom error hierarchy:
  - `AppError` (base class)
  - `AuthenticationError`
  - `ValidationError`
  - `DatabaseError`
  - `ExternalApiError`
  - `TransactionError`
- [ ] Standardize error response format
- [ ] Global error handler middleware
- [ ] Retry logic dengan exponential backoff
- [ ] Circuit breaker pattern implementation
- [ ] User-friendly error messages
- [ ] Error tracking dengan Sentry

**Acceptance Criteria:**
- ✅ Semua errors extend base AppError class
- ✅ Consistent error response format
- ✅ Automatic retries untuk transient failures
- ✅ Sentry integration menangkap semua errors

---

### **Tugas P2.4: Monitoring & Alerting Dashboard**
**ID:** `sec015`  
**Agent:** Semua  
**Estimasi:** 3 hari  
**File Terkait:** `src/monitoring/`, `docker-compose.monitoring.yml`

**Sub-tugas:**
- [ ] Setup Prometheus metrics collection:
  - Request rates
  - Error rates
  - Response times
  - Database query performance
- [ ] Grafana dashboard setup:
  - System health overview
  - Agent-specific metrics
  - Business metrics (launches, posts, trades)
- [ ] Alert rules configuration:
  - High error rate (>5%)
  - Slow response times (>2s)
  - Database connection failures
  - Oracle downtime
- [ ] PagerDuty/Slack integration untuk alerts
- [ ] Uptime monitoring dengan Pingdom

**Acceptance Criteria:**
- ✅ Real-time metrics dashboard di Grafana
- ✅ Alerts terkirim ke Slack/PagerDuty
- ✅ Auto-scaling triggers berdasarkan metrics
- ✅ 99.9% uptime monitoring aktif

---

## 📊 **TIMELINE & MILESTONES**

### **Phase 1: Critical Security Fixes (Minggu 1-2)**
- ✅ P0.1 - Authentication
- ✅ P0.2 - Database Error Handling
- ✅ P0.3 - Transaction Validation
- ✅ P0.5 - Oracle Fix
- ✅ P0.6 - Secure Memory Management

**Milestone:** System aman untuk internal testing

### **Phase 2: Core Functionality (Minggu 3-4)**
- ✅ P0.4 - DLMM SDK Integration
- ✅ P1.1 - Rate Limiting
- ✅ P1.2 - Input Validation
- ✅ P1.4 - Ownership Verification

**Milestone:** Ready for Devnet deployment

### **Phase 3: Advanced Features (Minggu 5-6)**
- ✅ P1.3 - Content Moderation
- ✅ P1.5 - Real-time Market Data
- ✅ P2.1 - Structured Logging
- ✅ P2.3 - Error Standardization

**Milestone:** Production-ready features complete

### **Phase 4: Polish & Deploy (Minggu 7-8)**
- ✅ P2.2 - Comprehensive Testing
- ✅ P2.4 - Monitoring Dashboard
- ✅ Bug fixes dari testing
- ✅ Documentation update

**Milestone:** 🎉 Production deployment ready!

---

## 📈 **SUCCESS METRICS**

### **Security Metrics:**
- Zero authentication bypass vulnerabilities
- 100% of endpoints protected by rate limiting
- < 0.1% failed transactions due to validation errors

### **Quality Metrics:**
- Code coverage > 80%
- Zero silent failures in database operations
- Mean Time To Recovery (MTTR) < 5 minutes

### **Performance Metrics:**
- API response time p95 < 500ms
- Oracle price latency < 1 second
- System uptime > 99.9%

---

## 🛠️ **RESOURCE REQUIREMENTS**

### **Development Team:**
- 2 Backend Engineers (TypeScript/Solana)
- 1 Blockchain Specialist (DLMM/Meteora)
- 1 Security Engineer
- 1 QA Engineer

### **Infrastructure:**
- Devnet RPC nodes untuk testing
- Staging environment identical to production
- CI/CD pipeline (GitHub Actions)
- Monitoring stack (Prometheus + Grafana)

### **Third-party Services:**
- Pyth Network / Chainlink oracles
- Perspective API untuk moderation
- Sentry untuk error tracking
- Redis untuk caching & rate limiting

---

Apakah Anda ingin saya mulai mengerjakan tugas tertentu dari daftar ini? Atau ada prioritas yang ingin diubah?