# 🧠 Dewa AI Agent Backend

Autonomous AI agent backend built with **TypeScript**, **Hono**, and **LangGraph** for automated token launch management, DeFi operations, and social media engagement.

## 🛠️ Tech Stack

- **Runtime**: Node.js with TypeScript (ESM)
- **Web Framework**: Hono (high-performance HTTP framework)
- **AI Orchestration**: LangGraph (autonomous agent workflows)
- **LLM Providers**: OpenAI & Anthropic (via LangChain)
- **Blockchain**: Solana (@solana/web3.js)
- **Database**: Supabase (PostgreSQL)
- **Social Integration**: Telegram (grammy), Twitter (twitter-api-v2)
- **Testing**: Vitest

## 🏗️ Architecture Overview

```
┌─────────────────┐
│   Frontend      │
│   (Next.js)     │
└────────┬────────┘
         │ REST API
         ▼
┌─────────────────────────────────────┐
│  Hono Server (src/index.ts)         │
│  ├─ Authentication (JWT/Wallet)     │
│  ├─ Rate Limiting                   │
│  ├─ Input Validation                │
│  └─ Content Moderation              │
└────────┬────────────────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐ ┌──────────────┐
│  Routes │ │ LangGraph    │
│  - /agent  │ │ Agents       │
│  - /dlmm   │ │ - DewaMaster│
│  - /social │ │ - DLMMAgent │
└─────────┘ │ - userAgent   │
            └──────┬───────┘
                   │
            ┌──────┴───────┐
            │              │
            ▼              ▼
     ┌──────────┐   ┌────────────┐
     │ Services │   │ Tools      │
     │ - Market │   │ - Launch   │
     │ - Oracle │   │ - Meteora  │
     │ - Monitor│   │ - Governance│
     └──────────┘   └────────────┘
```

## 🚀 Core Components

### 1. API Server (`src/index.ts`)
Hono-based REST API handling triggers from frontend for new token launches and manual user actions.

**Features:**
- JWT & Wallet signature authentication
- Request rate limiting
- Input validation & sanitization
- AI content moderation
- CORS configuration

### 2. Autonomous Worker (`src/worker.ts`)
Background process enabling "Dewa" agents to think and act proactively every 30-60 minutes.

**Responsibilities:**
- Periodic agent state evaluation
- Autonomous decision making
- Scheduled social media posts
- DLMM position rebalancing

### 3. AI Agents (`src/agents/`)
- **DewaMaster**: High-level coordination & strategic decisions
- **DLMM Agent**: Automated liquidity management on Meteora
- **UserAgent**: User interaction & support

### 4. Social Listeners (`src/listeners/`)
- **Telegram**: Real-time responses to messages in groups/channels
- **Twitter**: Monitoring mentions and engagement on X

### 5. LangGraph Workflows (`src/graphs/`)
State machine graphs defining agent behavior patterns:
- Think → Analyze → Tool Selection → Execute
- Multi-step reasoning loops
- Conditional branching based on context

## 🔧 Development & Setup

### Prerequisites
- Node.js 20+
- pnpm package manager
- Supabase instance configured
- Solana RPC endpoint

### Installation
```bash
# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env
# Edit .env with your credentials
```

### Running the Application

**Development Mode (Hot Reload):**
```bash
# Main API server
pnpm dev

# Background worker
pnpm dev:worker
```

**Production:**
```bash
# Build TypeScript
pnpm build

# Start servers
pnpm start
pnpm start:worker
```

### Testing
```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch
```

## 📁 Project Structure

```
src/
├── agents/          # AI agent definitions & personas
│   ├── dewaMaster.ts    # Master coordinator agent
│   ├── dlmmAgent.ts     # Liquidity management agent
│   └── userAgent.ts     # User interaction agent
├── core/            # Core infrastructure
│   ├── config.ts        # Environment configuration
│   ├── encryption.ts    # Encryption utilities
│   ├── llmWrapper.ts    # LLM provider abstraction
│   └── supabase.ts      # Database client
├── graphs/          # LangGraph workflow definitions
│   ├── mainGraph.ts     # Primary agent graph
│   └── nodes.ts         # Graph node implementations
├── listeners/       # Social media event listeners
│   ├── telegramListener.ts
│   └── twitterListener.ts
├── middleware/      # HTTP middleware stack
│   ├── auth.ts          # JWT & wallet auth
│   ├── walletVerifier.ts# Signature verification
│   ├── inputValidator.ts# Request validation
│   ├── contentModerator.ts # AI content filtering
│   └── rateLimiter.ts   # Rate limiting
├── routes/          # API route handlers
│   ├── agent.ts         # Agent management endpoints
│   ├── dlmm.ts          # DLMM liquidity endpoints
│   └── social.ts        # Social persona config
├── services/        # Business logic services
│   ├── marketDataService.ts
│   ├── meteoraService.ts
│   ├── oracleService.ts
│   ├── monitoringService.ts
│   └── ...
├── tools/           # Agent callable tools
│   ├── launchTool.ts      # Token launch automation
│   ├── meteoraManager.ts  # Liquidity operations
│   ├── governanceTools.ts # Buyback/burn execution
│   ├── contentTools.ts    # Content generation
│   └── ...
├── utils/           # Utility functions
│   ├── logger.ts        # Winston logger setup
│   ├── errorHandler.ts  # Error handling
│   ├── secureMemory.ts  # Secure credential storage
│   └── databaseService.ts
├── state/           # State schemas
│   └── schemas.ts       # Agent state definitions (Zod)
├── index.ts         # Main entry point
└── worker.ts        # Worker entry point
```

## 🔐 Security Features

- **Wallet Verification**: Challenge-response signature protocol
- **JWT Authentication**: Stateless session management
- **Input Sanitization**: XSS & SQL injection prevention
- **Rate Limiting**: DDoS protection
- **Secure Memory**: Auto-zeroing sensitive data
- **Content Moderation**: AI-powered toxicity detection

## 📊 Monitoring

Built-in monitoring service provides:
- Real-time metrics collection (gauges, counters, histograms)
- Health checks for all services
- Configurable alerting thresholds
- System performance tracking

## 🌐 API Endpoints

### Agent Routes (`/api/agent/*`)
- `POST /launch` - Trigger token launch
- `GET /status/:nodeId` - Get agent status
- `POST /configure` - Update agent configuration

### DLMM Routes (`/api/dlmm/*`)
- `GET /positions/:nodeId` - Get liquidity positions
- `POST /rebalance` - Rebalance DLMM position
- `GET /analytics/:poolId` - Pool analytics

### Social Routes (`/api/social/*`)
- `POST /config/:nodeId` - Update social persona
- `GET /metrics/:nodeId` - Social engagement metrics

## 🧪 Testing Philosophy

Comprehensive test coverage across:
- Unit tests for utilities & services
- Integration tests for API endpoints
- Agent behavior simulation tests
- Security middleware validation
- Transaction rollback scenarios

## 📝 License

Proprietary - Dewa.fun
