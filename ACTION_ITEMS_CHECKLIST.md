# ✅ DEWA.FUN - CRITICAL ACTION ITEMS CHECKLIST
**Priority Tracking Document**  
**Created:** March 30, 2026  
**Status**: ACTIVE  
**Related Documents:** 
- [COMPREHENSIVE_AUDIT_REPORT.md](./COMPREHENSIVE_AUDIT_REPORT.md)
- [EXECUTIVE_SUMMARY.md](./EXECUTIVE_SUMMARY.md)

---

## 🔴 CRITICAL PRIORITY (Week 1-2)
**Must complete before any mainnet launch**

### 1.1 Smart Contract Security

#### 🔴 VRF Integration - COMPLETE
- [ ] **Owner:** Blockchain Lead
- [ ] **Task:** Implement Switchboard VRF callback in `resolve_bet()`
- [ ] **Files:** `programs/dice-casino/src/lib.rs`
- [ ] **Sub-tasks:**
  - [ ] Import Switchboard VRF program ID
  - [ ] Create VRF account in `place_bet()`
  - [ ] Implement callback handler for VRF result
  - [ ] Use VRF randomness to calculate roll outcome
  - [ ] Add timeout mechanism (refund if VRF fails)
  - [ ] Test on devnet with 100+ bets
- [ ] **Acceptance Criteria:**
  - [ ] VRF request initiated correctly
  - [ ] Callback verifies oracle signature
  - [ ] Random number determines win/loss
  - [ ] Timeout refund works correctly
  - [ ] 100% test coverage for VRF flow
- [ ] **Estimated Effort:** 8 hours
- [ ] **Priority:** P0 (Blocker)
- [ ] **Status:** ⏳ PENDING
- [ ] **Blocked By:** None
- [ ] **Dependencies:** Switchboard VRF account funded

#### 🔴 Emergency Pause Function - COMPLETE
- [ ] **Owner:** Blockchain Lead
- [ ] **Task:** Implement multi-sig emergency pause
- [ ] **Files:** `programs/dice-casino/src/lib.rs`
- [ ] **Sub-tasks:**
  - [ ] Define EMERGENCY_ADMIN constant
  - [ ] Create `emergency_pause()` instruction
  - [ ] Create `emergency_resume()` instruction
  - [ ] Add pause check in all bet-related functions
  - [ ] Allow withdrawals during pause state
  - [ ] Require 2-of-3 multi-sig for pause/resume
- [ ] **Acceptance Criteria:**
  - [ ] Admin can pause all vault operations
  - [ ] Players can withdraw funds during pause
  - [ ] New bets blocked during pause
  - [ ] Requires multi-sig authorization
  - [ ] Event emitted on pause/resume
- [ ] **Estimated Effort:** 4 hours
- [ ] **Priority:** P0 (Blocker)
- [ ] **Status:** ⏳ PENDING
- [ ] **Blocked By:** None
- [ ] **Dependencies:** Multi-sig wallet setup

#### 🔴 Rate Limiting On-Chain - COMPLETE
- [ ] **Owner:** Blockchain Lead
- [ ] **Task:** Add bet rate limits per user
- [ ] **Files:** `programs/dice-casino/src/lib.rs`
- [ ] **Sub-tasks:**
  - [ ] Track last bet timestamp per user
  - [ ] Enforce minimum time between bets (6 seconds)
  - [ ] Track bets per hour counter
  - [ ] Reset counter every hour
  - [ ] Store rate limit state in PDA
- [ ] **Acceptance Criteria:**
  - [ ] Max 10 bets per minute per user
  - [ ] Max 100 bets per hour per user
  - [ ] Cooldown period enforced automatically
  - [ ] Configurable by admin via governance
  - [ ] Clear error message when rate limited
- [ ] **Estimated Effort:** 6 hours
- [ ] **Priority:** P0 (Blocker)
- [ ] **Status:** ⏳ PENDING
- [ ] **Blocked By:** None
- [ ] **Dependencies:** None

#### 🔴 Max Bet Enforcement On-Chain - COMPLETE
- [ ] **Owner:** Blockchain Lead
- [ ] **Task:** Enforce 1% vault balance limit on-chain
- [ ] **Files:** `programs/dice-casino/src/lib.rs`
- [ ] **Sub-tasks:**
  - [ ] Read current vault balance in `place_bet()`
  - [ ] Calculate max allowed payout (1% of balance)
  - [ ] Reject bet if potential payout exceeds limit
  - [ ] Return clear error code to frontend
- [ ] **Acceptance Criteria:**
  - [ ] Dynamic calculation based on vault balance
  - [ ] Bet rejected before funds locked
  - [ ] Error message: "Bet exceeds table limit"
  - [ ] Works for all bet types (Manual/Auto/Flash)
- [ ] **Estimated Effort:** 4 hours
- [ ] **Priority:** P0 (Blocker)
- [ ] **Status:** ⏳ PENDING
- [ ] **Blocked By:** None
- [ ] **Dependencies:** Vault balance oracle

---

### 1.2 Testing & Quality Assurance

#### 🔴 Critical Missing Tests - IN PROGRESS
- [ ] **Owner:** QA Lead
- [ ] **Task:** Achieve 70%+ test coverage
- [ ] **Target Coverage:** 53% → 70%
- [ ] **Files:** Multiple across all packages
- [ ] **Test Files to Create:**

**Frontend Tests:**
- [ ] `apps/frontend/__tests__/services/FeeDistribution.test.ts`
  - [ ] Calculate creator fee (25% of house edge)
  - [ ] Calculate treasury fee (30% of house edge)
  - [ ] Calculate affiliate fee (20% of house edge)
  - [ ] Calculate agent fee (25% of house edge)
  - [ ] Edge cases: zero volume, negative values
  
- [ ] `apps/frontend/__tests__/services/VaultService.test.ts`
  - [ ] Initialize vault with minimum deposit
  - [ ] Pause vault functionality
  - [ ] Withdrawal restrictions when paused
  - [ ] Max bet calculation
  
- [ ] `apps/frontend/__tests__/components/AffiliateRewards.test.tsx`
  - [ ] Instant reward calculation (15%)
  - [ ] Leaderboard points calculation
  - [ ] Tier progression logic
  - [ ] Monthly payout distribution

**Backend Tests:**
- [ ] `apps/agent-backend/tests/test_byok_encryption.py`
  - [ ] AES-256-GCM encryption
  - [ ] Decryption with correct key
  - [ ] Decryption failure with wrong key
  - [ ] Key rotation mechanism
  
- [ ] `apps/agent-backend/tests/test_affiliate_rewards.py`
  - [ ] Reward distribution logic
  - [ ] Leaderboard ranking
  - [ ] Tier assignment based on volume
  - [ ] Monthly reset functionality

**Smart Contract Tests:**
- [ ] `programs/dice-casino/tests/vrf-integration.test.ts`
  - [ ] VRF request flow
  - [ ] Callback verification
  - [ ] Timeout and refund
  - [ ] Randomness distribution (chi-square test)
  
- [ ] `programs/dice-casino/tests/emergency-pause.test.ts`
  - [ ] Pause function (multi-sig)
  - [ ] Resume function
  - [ ] Betting blocked during pause
  - [ ] Withdrawals allowed during pause
  
- [ ] `programs/dice-casino/tests/rate-limiting.test.ts`
  - [ ] Bet frequency enforcement
  - [ ] Hourly counter reset
  - [ ] Multiple users independent limits

- [ ] **Acceptance Criteria:**
  - [ ] Fee distribution: 100% coverage
  - [ ] VRF integration: 95% coverage
  - [ ] BYOK encryption: 90% coverage
  - [ ] Affiliate rewards: 95% coverage
  - [ ] Emergency scenarios: 90% coverage
  - [ ] Overall coverage reaches 70%
  
- [ ] **Estimated Effort:** 40 hours
- [ ] **Priority:** P0 (Blocker)
- [ ] **Status:** ⏳ PENDING
- [ ] **Blocked By:** VRF implementation (1.1)
- [ ] **Dependencies:** VRF must be implemented first

#### 🔴 Load Testing Execution - TODO
- [ ] **Owner:** DevOps Lead
- [ ] **Task:** Run load tests with existing script
- [ ] **Files:** `scripts/loadTest.ts`
- [ ] **Sub-tasks:**
  - [ ] Setup staging environment
  - [ ] Configure test data (100 test users)
  - [ ] Execute load test (1,000 concurrent users)
  - [ ] Monitor system metrics
  - [ ] Identify bottlenecks
  - [ ] Document findings
  - [ ] Optimize top 3 slowest endpoints
- [ ] **Metrics to Measure:**
  - [ ] API response times (p50, p95, p99)
  - [ ] Database query performance
  - [ ] WebSocket connection stability
  - [ ] Memory usage under load
  - [ ] CPU utilization
  - [ ] Network throughput
- [ ] **Acceptance Criteria:**
  - [ ] p95 latency < 500ms
  - [ ] Error rate < 1%
  - [ ] No memory leaks detected
  - [ ] All requests complete successfully
  - [ ] Performance report documented
- [ ] **Estimated Effort:** 16 hours
- [ ] **Priority:** P1 (High)
- [ ] **Status:** ⏳ PENDING
- [ ] **Blocked By:** None
- [ ] **Dependencies:** Staging environment ready

---

### 1.3 Legal & Compliance

#### 🔴 Terms of Service Drafting - TODO
- [ ] **Owner:** Legal Counsel
- [ ] **Task:** Create comprehensive ToS
- [ ] **Files:** `apps/frontend/app/tos.md` or `apps/frontend/app/legal/terms-of-service.mdx`
- [ ] **Required Sections:**
  - [ ] Introduction & Acceptance of Terms
  - [ ] Eligibility Requirements (18+, not in restricted jurisdictions)
  - [ ] Risk Disclosures (gambling, crypto volatility)
  - [ ] Fee Structure (clearly explained)
  - [ ] User Obligations & Prohibited Conduct
  - [ ] Intellectual Property Rights
  - [ ] Disclaimer of Warranties ("as is" basis)
  - [ ] Limitation of Liability (cap at fees paid)
  - [ ] Indemnification Clause
  - [ ] Dispute Resolution (arbitration, class action waiver)
  - [ ] Governing Law & Jurisdiction
  - [ ] Modifications to Terms
  - [ ] Termination Rights
  - [ ] Contact Information
- [ ] **Acceptance Criteria:**
  - [ ] Reviewed by securities lawyer
  - [ ] Reviewed by gambling law specialist
  - [ ] Compliant with target jurisdictions
  - [ ] Clear, readable language (no legalese)
  - [ ] Mobile-friendly display
  - [ ] User acceptance tracking (checkbox)
- [ ] **Estimated Effort:** 20 hours (legal review included)
- [ ] **Priority:** P0 (Blocker)
- [ ] **Status:** ⏳ PENDING
- [ ] **Blocked By:** None
- [ ] **Dependencies:** Legal counsel engagement

#### 🔴 Privacy Policy Creation - TODO
- [ ] **Owner:** Legal Counsel
- [ ] **Task:** GDPR/CCPA-compliant privacy policy
- [ ] **Files:** `apps/frontend/app/privacy.md` or `apps/frontend/app/legal/privacy-policy.mdx`
- [ ] **Required Sections:**
  - [ ] Information We Collect
    - [ ] Wallet addresses
    - [ ] Transaction data
    - [ ] Device information
    - [ ] IP addresses (for geofencing)
  - [ ] How We Use Your Information
  - [ ] Data Sharing & Third Parties
  - [ ] Cookies & Tracking Technologies
  - [ ] Data Retention Period
  - [ ] User Rights (GDPR):
    - [ ] Right to access
    - [ ] Right to rectification
    - [ ] Right to erasure
    - [ ] Right to restrict processing
    - [ ] Right to data portability
    - [ ] Right to object
  - [ ] CCPA Rights:
    - [ ] Right to know
    - [ ] Right to delete
    - [ ] Right to opt-out of sale
  - [ ] International Data Transfers
  - [ ] Children's Privacy (under 18 prohibition)
  - [ ] Security Measures
  - [ ] Changes to Privacy Policy
  - [ ] Contact Information (DPO email)
- [ ] **Acceptance Criteria:**
  - [ ] GDPR compliant (EU users)
  - [ ] CCPA compliant (California users)
  - [ ] Available in multiple languages
  - [ ] Easy to understand
  - [ ] Prominently displayed
- [ ] **Estimated Effort:** 12 hours
- [ ] **Priority:** P0 (Blocker)
- [ ] **Status:** ⏳ PENDING
- [ ] **Blocked By:** None
- [ ] **Dependencies:** None

#### 🔴 Age Verification Implementation - TODO
- [ ] **Owner:** Frontend Lead
- [ ] **Task:** Add age gate popup with confirmation
- [ ] **Files:** 
  - [ ] `apps/frontend/components/AgeVerification.tsx` (component)
  - [ ] `apps/frontend/hooks/useAgeVerification.ts` (hook)
  - [ ] `apps/frontend/middleware.ts` (route protection)
- [ ] **Sub-tasks:**
  - [ ] Create modal component with warning text
  - [ ] Add "I am 18+" and "I am under 18" buttons
  - [ ] Store confirmation in localStorage (timestamp + wallet)
  - [ ] Create middleware to check verification status
  - [ ] Redirect unverified users to age gate
  - [ ] Add responsible gaming resources links
  - [ ] Implement cooldown/re-verification (yearly)
- [ ] **Design Requirements:**
  - [ ] Clear warning: "This platform involves gambling risks"
  - [ ] Link to gambling addiction help (GamCare, Gamblers Anonymous)
  - [ ] Non-dismissible (must click button)
  - [ ] Accessible (WCAG 2.1 AA compliant)
- [ ] **Acceptance Criteria:**
  - [ ] Popup appears on first visit
  - [ ] Cannot bypass without confirming 18+
  - [ ] Verification persists across sessions
  - [ ] Re-verification required after 1 year
  - [ ] Under-18 users blocked and redirected
- [ ] **Estimated Effort:** 4 hours
- [ ] **Priority:** P0 (Blocker)
- [ ] **Status:** ⏳ PENDING
- [ ] **Blocked By:** None
- [ ] **Dependencies:** None

#### 🔴 Geofencing Implementation - TODO
- [ ] **Owner:** Backend Lead
- [ ] **Task:** Block users from restricted jurisdictions
- [ ] **Files:**
  - [ ] `apps/frontend/middleware.ts` (IP check)
  - [ ] `apps/agent-backend/src/middleware.py` (API protection)
  - [ ] `apps/frontend/lib/geoBlocking.ts` (utility)
- [ ] **Restricted Countries List:**
  - [ ] United States (including territories)
  - [ ] China (including Hong Kong)
  - [ ] North Korea
  - [ ] Iran
  - [ ] Syria
  - [ ] Cuba
  - [ ] Crimea region
  - [ ] Any other sanctioned jurisdictions
- [ ] **Implementation Details:**
  - [ ] Use IP geolocation service (MaxMind GeoIP2 or ipapi)
  - [ ] Check IP on every session start
  - [ ] Cache country result (reduce API calls)
  - [ ] Block access at middleware level
  - [ ] Show clear error message with country list
  - [ ] Log blocked attempts (compliance tracking)
  - [ ] Prevent VPN circumvention (detect proxy/VPN)
- [ ] **Error Message:**
  ```
  Access Restricted
  
  Unfortunately, users from [Country Name] are not permitted 
  to use this platform due to regulatory restrictions.
  
  If you believe this is an error, please contact support.
  ```
- [ ] **Acceptance Criteria:**
  - [ ] Accurate country detection (>99%)
  - [ ] Blocked users cannot access platform
  - [ ] Clear error messaging
  - [ ] Attempt logging for compliance
  - [ ] VPN/proxy detection enabled
- [ ] **Estimated Effort:** 8 hours
- [ ] **Priority:** P0 (Blocker)
- [ ] **Status:** ⏳ PENDING
- [ ] **Blocked By:** Legal counsel to provide final restricted country list
- [ ] **Dependencies:** 
  - [ ] MaxMind GeoIP2 database license
  - [ ] Final restricted jurisdiction list from legal

---

### 1.4 Monitoring & Observability

#### 🔴 Uptime Monitoring Setup - TODO
- [ ] **Owner:** DevOps Lead
- [ ] **Task:** Configure UptimeRobot or Pingdom monitoring
- [ ] **Services to Monitor:**
  - [ ] **Frontend:** https://dewa.fun
    - [ ] Check interval: 5 minutes
    - [ ] Expected status: 200 OK
    - [ ] Keywords: "dewa.fun", "Launch Token"
  - [ ] **Backend API:** https://api.dewa.fun/health
    - [ ] Check interval: 5 minutes
    - [ ] Expected response: `{"status": "healthy"}`
    - [ ] Response time threshold: < 500ms
  - [ ] **Solana RPC Connection**
    - [ ] Custom endpoint health check
    - [ ] Helius status monitoring
  - [ ] **Database:** Supabase health endpoint
    - [ ] Query execution test
    - [ ] Connection pool availability
  - [ ] **Redis Cache**
    - [ ] Ping/pong test
    - [ ] Memory usage monitoring
- [ ] **Alert Configuration:**
  - [ ] SMS alerts for critical downtime (>5 min)
  - [ ] Email alerts for warnings
  - [ ] Slack notifications to #devops channel
  - [ ] Escalation policy (after 15 min → CTO)
- [ ] **Public Status Page:**
  - [ ] Create status.dewa.fun subdomain
  - [ ] Display current uptime percentage
  - [ ] Show incident history
  - [ ] Allow user subscriptions
- [ ] **Acceptance Criteria:**
  - [ ] All critical services monitored
  - [ ] Alerts trigger within 5 minutes
  - [ ] Public status page live
  - [ ] Response time tracking active
  - [ ] Historical data retained (90 days)
- [ ] **Estimated Effort:** 4 hours
- [ ] **Priority:** P1 (High)
- [ ] **Status:** ⏳ PENDING
- [ ] **Blocked By:** None
- [ ] **Dependencies:** Domain DNS access

#### 🔴 Sentry Alert Configuration - TODO
- [ ] **Owner:** DevOps Lead
- [ ] **Task:** Configure error tracking and alerting
- [ ] **Projects to Setup:**
  - [ ] Frontend (Next.js)
  - [ ] Backend (Python FastAPI)
  - [ ] Smart Contract (Anchor tests)
- [ ] **Configuration Steps:**
  - [ ] Create Sentry organization (dewa-fun)
  - [ ] Install SDKs:
    - [ ] `@sentry/nextjs` (frontend)
    - [ ] `@sentry/python` (backend)
  - [ ] Configure DSN in environment variables
  - [ ] Enable source maps upload (frontend)
  - [ ] Set up release tracking
  - [ ] Configure custom tags:
    - [ ] Environment (development/staging/production)
    - [ ] Severity (low/medium/high/critical)
    - [ ] Component (frontend/backend/blockchain)
    - [ ] User wallet (anonymized hash)
- [ ] **Alert Rules:**
  - [ ] Critical errors: Immediate SMS + Slack
  - [ ] High severity: Slack notification within 5 min
  - [ ] Medium severity: Daily digest email
  - [ ] Low severity: Weekly report
- [ ] **Integration:**
  - [ ] Slack channel: #sentry-alerts
  - [ ] GitHub issues (auto-create for critical bugs)
  - [ ] PagerDuty (for on-call rotation)
- [ ] **Acceptance Criteria:**
  - [ ] All errors captured with stack traces
  - [ ] Error grouping works correctly
  - [ ] Release tracking shows error trends
  - [ ] Alerts trigger appropriately
  - [ ] Source maps enable readable stack traces
- [ ] **Estimated Effort:** 6 hours
- [ ] **Priority:** P1 (High)
- [ ] **Status:** ⏳ PENDING
- [ ] **Blocked By:** None
- [ ] **Dependencies:** Sentry account setup

#### 🔴 Grafana Dashboard Creation - TODO
- [ ] **Owner:** DevOps Lead
- [ ] **Task:** Create operational monitoring dashboard
- [ ] **Data Sources:**
  - [ ] Prometheus (metrics)
  - [ ] Loki (logs)
  - [ ] PostgreSQL (business metrics)
- [ ] **Dashboard Panels:**

**System Health:**
- [ ] CPU Usage (%) - All servers
- [ ] Memory Usage (MB/GB) - All servers
- [ ] Disk I/O (read/write ops/sec)
- [ ] Network I/O (bytes in/out)
- [ ] Active Connections (WebSocket, DB)

**API Performance:**
- [ ] Request Rate (requests/min) - Line graph
- [ ] Latency p50, p95, p99 (ms) - Multi-line graph
- [ ] Error Rate (%) - Percentage of failed requests
- [ ] Top 10 Slowest Endpoints - Table
- [ ] Requests by Endpoint - Bar chart

**Business Metrics:**
- [ ] Active Users (real-time) - Gauge
- [ ] New Users Today - Counter
- [ ] Tokens Launched (total, last 24h) - Counter
- [ ] Total Value Locked in Vaults ($) - Gauge
- [ ] Bet Volume (hourly, daily) - Bar chart
- [ ] House Edge Revenue (hourly, daily) - Line graph

**Blockchain Metrics:**
- [ ] Solana RPC Latency (ms)
- [ ] Pending Transactions (count)
- [ ] Failed Transactions (%)
- [ ] Gas Fees (average lamports)

**AI Agent Activity:**
- [ ] Agent Actions per Hour - Line graph
- [ ] Social Posts Generated (daily) - Bar chart
- [ ] AI Inference Latency (avg, p95) - Line graph
- [ ] Token Launches by Agent (daily) - Counter

**Database Performance:**
- [ ] Query Rate (queries/sec)
- [ ] Slow Queries (>100ms) - Counter
- [ ] Connection Pool Usage (%)
- [ ] Database Size (GB) - Growth trend

- [ ] **Alert Thresholds:**
  - [ ] CPU > 80% for 5 min → Warning
  - [ ] CPU > 95% for 2 min → Critical
  - [ ] Error rate > 1% → Critical
  - [ ] Latency p99 > 1s → Warning
  - [ ] Active users drop 50% → Investigate
- [ ] **Acceptance Criteria:**
  - [ ] Real-time data refresh (every 30s)
  - [ ] Mobile-responsive dashboard
  - [ ] Historical data (30-day retention)
  - [ ] Export capabilities (PNG, PDF, CSV)
  - [ ] Role-based access (view-only vs admin)
- [ ] **Estimated Effort:** 12 hours
- [ ] **Priority:** P1 (High)
- [ ] **Status:** ⏳ PENDING
- [ ] **Blocked By:** None
- [ ] **Dependencies:** Prometheus/Grafana setup

---

## 🟡 HIGH PRIORITY (Week 3-4)

### 2.1 Security Hardening

#### 🟡 API Rate Limiting - TODO
- [ ] **Owner:** Backend Lead
- [ ] **Task:** Implement Redis-based rate limiting
- [ ] **Files:**
  - [ ] `apps/frontend/app/api/middleware.ts`
  - [ ] `apps/agent-backend/src/middleware.py`
  - [ ] `apps/frontend/lib/rateLimiter.ts`
- [ ] **Rate Limits:**
  - [ ] **General API:** 100 requests/minute per IP
  - [ ] **Authenticated Users:** 1,000 requests/hour per user
  - [ ] **Bet Endpoints:** 10 bets/minute per user
  - [ ] **Vault Operations:** 5 transactions/minute per user
  - [ ] **AI Agent Endpoints:** 20 requests/minute per node
  - [ ] **Login/Auth:** 5 attempts/minute per IP (prevent brute force)
- [ ] **Implementation:**
  - [ ] Use Redis INCR with TTL
  - [ ] Store counters: `ratelimit:{ip}:{endpoint}:{window}`
  - [ ] Return 429 Too Many Requests
  - [ ] Include headers:
    - [ ] `X-RateLimit-Limit: 100`
    - [ ] `X-RateLimit-Remaining: 42`
    - [ ] `X-RateLimit-Reset: 1617024000`
    - [ ] `Retry-After: 60` (seconds)
- [ ] **Whitelist:**
  - [ ] Internal services (monitoring, health checks)
  - [ ] Trusted partners (with explicit approval)
  - [ ] Load testing IPs (during scheduled tests)
- [ ] **Acceptance Criteria:**
  - [ ] Rate limiting enforced consistently
  - [ ] Proper HTTP 429 responses
  - [ ] Headers inform clients of limits
  - [ ] No false positives (legitimate users blocked)
  - [ ] Configurable limits per endpoint
- [ ] **Estimated Effort:** 8 hours
- [ ] **Priority:** P1 (High)
- [ ] **Status:** ⏳ PENDING
- [ ] **Blocked By:** None
- [ ] **Dependencies:** Redis connection configured

#### 🟡 Content Security Policy Headers - TODO
- [ ] **Owner:** Frontend Lead
- [ ] **Task:** Add CSP headers to prevent XSS attacks
- [ ] **Files:** `apps/frontend/next.config.ts`
- [ ] **CSP Directives:**
  ```javascript
  Content-Security-Policy: 
    default-src 'self';
    script-src 'self' 'unsafe-inline' https://vercel.live;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' data: https: blob:;
    font-src 'self' https://fonts.gstatic.com;
    connect-src 'self' 
      https://api.dewa.fun 
      https://*.supabase.co 
      https://mainnet.helius-rpc.com 
      wss://*.helius.xyz;
    frame-src 'none';
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
    upgrade-insecure-requests;
    block-all-mixed-content;
  ```
- [ ] **Implementation:**
  - [ ] Add headers in `next.config.ts`
  - [ ] Use helmet or custom headers
  - [ ] Test with Chrome DevTools console
  - [ ] Fix any CSP violations
  - [ ] Add nonce for inline scripts (if needed)
- [ ] **Testing:**
  - [ ] Use https://csp-evaluator.withgoogle.com/
  - [ ] Test all pages for functionality
  - [ ] Verify no console errors
  - [ ] Check third-party integrations still work
- [ ] **Acceptance Criteria:**
  - [ ] No XSS vulnerabilities via CSP
  - [ ] All legitimate scripts allowed
  - [ ] Clickjacking prevented (frame-ancestors 'none')
  - [ ] Mixed content blocked
  - [ ] No console errors from CSP
- [ ] **Estimated Effort:** 4 hours
- [ ] **Priority:** P1 (High)
- [ ] **Status:** ⏳ PENDING
- [ ] **Blocked By:** None
- [ ] **Dependencies:** None

#### 🟡 DDoS Protection - TODO
- [ ] **Owner:** DevOps Lead
- [ ] **Task:** Configure Cloudflare for DDoS mitigation
- [ ] **Steps:**
  - [ ] Create Cloudflare account (Pro plan recommended)
  - [ ] Change nameservers to Cloudflare
  - [ ] Configure DNS records:
    - [ ] A record for dewa.fun → Vercel IP
    - [ ] CNAME for www → dewa.fun
    - [ ] CNAME for api → backend URL
  - [ ] Enable Cloudflare Proxy (orange cloud)
  - [ ] Configure SSL/TLS:
    - [ ] Mode: Full (strict)
    - [ ] Always use HTTPS: Enabled
    - [ ] Minimum TLS version: 1.3
  - [ ] Enable WAF (Web Application Firewall):
    - [ ] OWASP Core Rule Set
    - [ ] SQL Injection protection
    - [ ] XSS protection
    - [ ] Bad bots blocking
  - [ ] Configure Rate Limiting Rules:
    - [ ] 100 requests/5 seconds per IP (global)
    - [ ] 10 requests/second to /api/* endpoints
    - [ ] Challenge (CAPTCHA) on violation
  - [ ] Enable Bot Fight Mode
  - [ ] Configure Cache Rules:
    - [ ] Cache static assets (images, CSS, JS)
    - [ ] Bypass cache for dynamic content
    - [ ] Set appropriate TTL values
  - [ ] Setup Page Rules:
    - [ ] Cache everything for static pages
    - [ ] Bypass cache for /api/*
    - [ ] Force HTTPS redirect
- [ ] **Acceptance Criteria:**
  - [ ] DNS fully migrated to Cloudflare
  - [ ] WAF rules active
  - [ ] Rate limiting enforced at edge
  - [ ] Bot traffic reduced by >80%
  - [ ] Site speed improved (cached assets)
  - [ ] SSL certificate valid
- [ ] **Estimated Effort:** 6 hours
- [ ] **Priority:** P1 (High)
- [ ] **Status:** ⏳ PENDING
- [ ] **Blocked By:** None
- [ ] **Dependencies:** Cloudflare account, domain DNS access

---

### 2.2 Performance Optimization

#### 🟡 Database Query Optimization - TODO
- [ ] **Owner:** Backend Lead
- [ ] **Task:** Analyze and optimize slow queries
- [ ] **Steps:**
  - [ ] Enable slow query logging in Supabase
  - [ ] Set threshold: 100ms
  - [ ] Run application with realistic workload
  - [ ] Collect slow query logs for 24 hours
  - [ ] Identify top 10 slowest queries
  - [ ] Analyze query plans (EXPLAIN ANALYZE)
  - [ ] Add missing indexes
  - [ ] Optimize JOIN operations
  - [ ] Implement query caching where appropriate
  - [ ] Refactor N+1 query patterns
- [ ] **Common Optimizations:**
  - [ ] Add composite indexes for frequently filtered queries
  - [ ] Use materialized views for complex aggregations
  - [ ] Implement read replicas for heavy read workloads
  - [ ] Cache frequent queries in Redis (5-10 min TTL)
  - [ ] Use connection pooling (PgBouncer)
- [ ] **Target Queries to Optimize:**
  - [ ] `SELECT * FROM bets WHERE userId = ? ORDER BY createdAt DESC` (add index)
  - [ ] `SELECT SUM(amount) FROM bets WHERE vaultId = ? GROUP BY DATE(created_at)` (add composite index)
  - [ ] Vault balance calculations (use materialized view)
  - [ ] Affiliate leaderboard rankings (pre-calculate daily)
- [ ] **Acceptance Criteria:**
  - [ ] All queries execute in < 100ms (p95)
  - [ ] No N+1 query patterns remain
  - [ ] Index usage verified via EXPLAIN
  - [ ] Slow query count reduced by >90%
  - [ ] Documentation updated with query patterns
- [ ] **Estimated Effort:** 12 hours
- [ ] **Priority:** P1 (High)
- [ ] **Status:** ⏳ PENDING
- [ ] **Blocked By:** Slow query log data needed
- [ ] **Dependencies:** Production-like dataset for testing

---

## 🟢 MEDIUM PRIORITY (Month 2)

### 3.1 Professional Audit

#### 🟢 Smart Contract Audit - TODO
- [ ] **Owner:** CTO
- [ ] **Task:** Engage professional smart contract auditor
- [ ] **Budget:** $15,000 - $30,000
- [ ] **Recommended Firms:**
  - [ ] OtterSec (https://osec.io/)
  - [ ] Neodyme (https://neodyme.io/)
  - [ ] Halborn (https://halborn.com/)
  - [ ] CertiK (https://www.certik.com/)
- [ ] **Preparation Steps:**
  - [ ] Complete all critical security features (Week 1-2 tasks)
  - [ ] Achieve >90% test coverage for smart contracts
  - [ ] Document all external dependencies
  - [ ] Prepare architecture documentation
  - [ ] Create test suite for auditors to run
  - [ ] Set up dedicated audit branch (freeze features)
  - [ ] Prepare list of specific concerns to investigate
- [ ] **Audit Scope:**
  - [ ] Dice casino smart contract (`programs/dice-casino/`)
  - [ ] Fee distribution logic
  - [ ] VRF integration
  - [ ] Vault management
  - [ ] Emergency pause mechanisms
  - [ ] Rate limiting enforcement
- [ ] **Timeline:**
  - [ ] Week 1: Engagement letter & scope finalization
  - [ ] Week 2-3: Auditor review period
  - [ ] Week 4: Receive preliminary findings
  - [ ] Week 5: Fix identified issues
  - [ ] Week 6: Receive final audit report
  - [ ] Week 7: Publish audit report publicly
- [ ] **Acceptance Criteria:**
  - [ ] No critical vulnerabilities found
  - [ ] All high-severity issues fixed
  - [ ] Medium-severity issues addressed or accepted with rationale
  - [ ] Final audit report published on website
  - [ ] Audit badge displayed on homepage
- [ ] **Estimated Effort:** 40 hours (coordination + fixes)
- [ ] **Priority:** P0 (Blocker for mainnet)
- [ ] **Status:** ⏳ PENDING
- [ ] **Blocked By:** Completion of Week 1-2 security tasks
- [ ] **Dependencies:** Budget approval, auditor availability

---

### 3.2 Beta Launch Preparation

#### 🟢 Beta Tester Onboarding - TODO
- [ ] **Owner:** Product Manager
- [ ] **Task:** Recruit and onboard 50 beta testers
- [ ] **Target Profile:**
  - [ ] 20 token creators (active in memecoin space)
  - [ ] 15 traders/gamblers (experienced with dice games)
  - [ ] 10 affiliate marketers (influencers, community leaders)
  - [ ] 5 security researchers (to find bugs)
- [ ] **Recruitment Channels:**
  - [ ] Twitter/X outreach
  - [ ] Discord communities (memecoin, Solana)
  - [ ] Telegram groups
  - [ ] Personal networks
  - [ ] Existing waitlist (if any)
- [ ] **Onboarding Process:**
  - [ ] Create beta landing page (/beta)
  - [ ] Application form (Google Forms or Typeform)
  - [ ] Screening criteria (experience, activity level)
  - [ ] Welcome email with instructions
  - [ ] Private Discord/Telegram group for beta testers
  - [ ] NDAs for security researchers (optional)
  - [ ] Incentive structure:
    - [ ] Early adopter NFT badge
    - [ ] Reduced fees during beta (0.25% instead of 0.5%)
    - [ ] Priority support
    - [ ] Bounty rewards for bug reports
- [ ] **Beta Duration:** 4 weeks
- [ ] **Success Metrics:**
  - [ ] 20+ tokens launched during beta
  - [ ] 500+ active users
  - [ ] $100k+ monthly trading volume
  - [ ] < 1% critical bug rate
  - [ ] Net Promoter Score > 50
  - [ ] 80%+ tester retention (week 1 → week 4)
- [ ] **Feedback Collection:**
  - [ ] Weekly surveys (Typeform)
  - [ ] Office hours (Zoom calls)
  - [ ] Discord feedback channel
  - [ ] In-app feedback widget
  - [ ] Bug bounty submissions
- [ ] **Acceptance Criteria:**
  - [ ] 50 beta testers onboarded
  - [ ] All testers active (at least 1 action/week)
  - [ ] Feedback system operational
  - [ ] Bug triage process established
  - [ ] Weekly iteration on feedback
- [ ] **Estimated Effort:** 20 hours
- [ ] **Priority:** P1 (High)
- [ ] **Status:** ⏳ PENDING
- [ ] **Blocked By:** Critical security features complete
- [ ] **Dependencies:** Platform stability verified

---

## 📊 TRACKING & REPORTING

### Weekly Progress Reviews

**Every Monday:**
- [ ] Review completed items from previous week
- [ ] Update status of in-progress items
- [ ] Identify blockers and assign owners
- [ ] Prioritize upcoming week's tasks
- [ ] Send status report to stakeholders

**Status Legend:**
- ⏳ PENDING - Not started
- 🔄 IN PROGRESS - Currently being worked on
- ✅ COMPLETE - Finished and verified
- 🚫 BLOCKED - Cannot proceed (blocker identified)
- ⚠️ AT RISK - May miss deadline

### Progress Metrics

**Track Weekly:**
```
Critical Items (P0): X/Y complete (Z%)
High Priority (P1): A/B complete (C%)
Medium Priority (P2): D/E complete (F%)

Overall Progress: (X+A+D)/(Y+B+E) * 100 = G%

Blockers: [List current blockers]
At Risk: [List at-risk items]
```

### Stakeholder Updates

**Weekly Report Template:**
```markdown
## Week of [Date]

### Completed This Week
- [Item 1] - Owner: [Name]
- [Item 2] - Owner: [Name]

### In Progress
- [Item 3] - 60% complete - Owner: [Name]
- [Item 4] - 30% complete - Owner: [Name]

### Blockers
- [Blocker 1] - Needs: [Action] - Owner: [Name]

### Next Week Priorities
1. [Priority 1]
2. [Priority 2]
3. [Priority 3]

### Overall Status: 🟢 On Track / 🟡 At Risk / 🔴 Off Track
```

---

## 📝 CHANGELOG

**Version History:**
- v1.0 (March 30, 2026) - Initial creation from audit findings

**Last Updated:** March 30, 2026  
**Next Review:** April 6, 2026

---

## ✍️ APPROVALS

**Task Assignments Approved By:**
- [ ] CTO - Technical priorities
- [ ] Product Manager - Beta timeline
- [ ] Legal Counsel - Compliance items
- [ ] DevOps Lead - Infrastructure tasks

**Team Member Acknowledgments:**
- [ ] Blockchain Lead - Smart contract tasks
- [ ] Frontend Lead - UI/UX tasks
- [ ] Backend Lead - API/security tasks
- [ ] QA Lead - Testing tasks
- [ ] DevOps Lead - Monitoring/infrastructure tasks

---

**END OF CHECKLIST**

---

## 🎯 QUICK REFERENCE

### Top 10 Must-Complete Before Mainnet:
1. ✅ VRF integration complete
2. ✅ Emergency pause function
3. ✅ Rate limiting on-chain
4. ✅ Max bet enforcement
5. ✅ Test coverage > 70%
6. ✅ Terms of Service published
7. ✅ Privacy Policy published
8. ✅ Age verification implemented
9. ✅ Geofencing active
10. ✅ Professional audit completed

### Go/No-Go Criteria for Mainnet:
**All must be YES:**
- [ ] All P0 items complete?
- [ ] Test coverage > 80%?
- [ ] Professional audit passed?
- [ ] Legal compliance basic framework in place?
- [ ] Monitoring systems operational?
- [ ] Beta launch successful (20+ tokens, 500+ users)?
- [ ] Team confident in platform stability?

If ANY answer is NO → Do NOT launch

---

**Document Classification:** INTERNAL USE ONLY  
**Distribution:** Development team, stakeholders, investors  
**Confidentiality:** Do not share externally without approval
