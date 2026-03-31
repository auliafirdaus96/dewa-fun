# Data Flow Diagrams

This document provides detailed data flow diagrams for all major operations in the Dewa.fun AI Agent Backend.

## Table of Contents

1. [User Authentication Flow](#user-authentication-flow)
2. [Token Launch Flow](#token-launch-flow)
3. [DLMM Rebalancing Flow](#dlmm-rebalancing-flow)
4. [Social Media Response Flow](#social-media-response-flow)
5. [Autonomous Agent Decision Loop](#autonomous-agent-decision-loop)
6. [Content Moderation Flow](#content-moderation-flow)

---

## User Authentication Flow

### Challenge-Response Authentication

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend (Next.js)
    participant A as API Gateway (Hono)
    participant AV as Auth Validator
    participant W as WalletVerifier
    participant D as Database
    
    U->>F: Click "Connect Wallet"
    F->>A: POST /api/auth/challenge<br/>{walletAddress}
    A->>AV: Validate wallet format
    AV->>W: Generate challenge
    W->>W: Create nonce + message
    W->>D: Store challenge (TTL: 5min)
    D-->>W: Stored ✓
    W-->>A: Return challenge
    A-->>F: Challenge message
    F-->>U: Display message to sign
    U->>U: Sign with wallet
    U-->>F: Signature
    F->>A: POST /api/auth/verify<br/>{challenge, signature}
    A->>W: Verify signature
    W->>W: ed25519 verify<br/>(message, sig, pubkey)
    alt Valid Signature
        W->>W: Generate JWT
        W->>D: Cache verification
        W-->>A: JWT token
        A-->>F: {success, token}
        F->>F: Store in localStorage
        F-->>U: Authenticated ✓
    else Invalid Signature
        W-->>A: Error
        A-->>F: 401 Unauthorized
        F-->>U: Show error
    end
```

### Protected Route Access

```mermaid
sequenceDiagram
    participant C as Client
    participant M as Middleware Stack
    participant A as Auth Middleware
    participant W as Wallet Verifier
    participant R as Route Handler
    participant D as Database
    
    C->>M: GET /api/agent/status<br/>Headers: {X-Wallet-Address, Authorization}
    M->>A: Extract JWT
    A->>A: Verify JWT signature
    alt JWT Invalid
        A-->>C: 401 Unauthorized
    else JWT Valid
        A->>A: Decode payload → userId
        A->>W: Check wallet verification cache
        alt Cached & Valid
            W-->>A: Verified ✓
            A->>M: Set context {userId, walletAddress}
            M->>R: Proceed to route
            R->>D: Query agent status
            D-->>R: Data
            R-->>C: 200 OK + JSON
        else Not Cached
            W->>D: Check verification status
            alt Recently Verified
                D-->>W: Verification record
                W->>W: Cache result
                W-->>A: Verified ✓
                A->>M: Set context
                M->>R: Proceed
                R-->>C: 200 OK
            else Not Verified
                D-->>W: No record
                W-->>A: Verification required
                A-->>C: 401 + {action: SIGN_CHALLENGE}
            end
        end
    end
```

---

## Token Launch Flow

### Complete Launch Process

```mermaid
flowchart TD
    Start([User Initiates Launch]) --> Auth{Authenticated?}
    Auth -->|No| Challenge[Sign Wallet Challenge]
    Challenge --> AuthCheck{Signature Valid?}
    AuthCheck -->|No| AuthFail[Return 401]
    AuthCheck -->|Yes| IssueJWT[Issue JWT]
    IssueJWT --> Submit
    Auth -->|Yes| Submit[Submit Launch Request]
    
    Submit --> Validate[Validate Parameters]
    Validate --> ValidationErr{Valid?}
    ValidationErr -->|No| ValError[Return 400 + Errors]
    
    ValidationErr -->|Yes| AgentInvoke[Invoke DewaMaster Agent]
    AgentInvoke --> GraphStart[Start LangGraph Workflow]
    
    GraphStart --> Think[THINK Node]
    Think --> Analyze[ANALYZE Node]
    Analyze --> GetData[Gather Market Data]
    GetData --> CheckLiquidity[Check Liquidity Requirements]
    CheckLiquidity --> ValidateLaunch[Validate Launch Viability]
    
    ValidateLaunch --> SelectTool[SELECT TOOL Node]
    SelectTool --> ToolDecide{Which Scheme?}
    ToolDecide -->|B2B| B2BTool[Call B2B Launch Tool]
    ToolDecide -->|B2C| B2CTool[Call B2C Launch Tool]
    
    B2BTool --> PrepTx[Prepare Transaction]
    B2CTool --> PrepTx
    
    PrepTx --> Execute[EXECUTE Node]
    Execute --> DeployToken[Deploy Token Program]
    DeployToken --> InitMeteora[Initialize Meteora Pool]
    InitMeteora --> AddLiquidity[Add Initial Liquidity]
    AddLiquidity --> ConfigureDLMM[Configure DLMM Parameters]
    
    ConfigureDLMM --> Evaluate[EVALUATE Node]
    Evaluate --> SuccessCheck{Success?}
    SuccessCheck -->|No| Retry{Retry?}
    Retry -->|Yes| Think
    Retry -->|No| Fail[Return Error]
    
    SuccessCheck -->|Yes| Record[Record in Database]
    Record --> Notify[Send Notification]
    Notify --> Respond[Return Response to User]
    Respond --> End([Complete])
```

### Detailed Transaction Flow

```mermaid
sequenceDiagram
    participant U as User
    participant AG as Agent
    participant LT as LaunchTool
    participant MS as MeteoraService
    participant TS as TransactionService
    participant SOL as Solana RPC
    participant META as Meteora API
    participant DB as Database
    
    AG->>LT: Invoke launch(params)
    LT->>LT: Validate launch parameters
    LT->>MS: Get pool creation requirements
    MS->>META: Fetch current requirements
    META-->>MS: Requirements
    MS-->>LT: Validated params
    
    LT->>TS: Create launch transaction batch
    TS->>SOL: Get latest blockhash
    SOL-->>TS: Blockhash
    TS->>TS: Build deploy transaction
    TS->>TS: Build init pool transaction
    TS->>TS: Build add liquidity transaction
    TS-->>LT: Transaction batch
    
    LT->>AG: Present transactions for approval
    AG->>AG: Final evaluation
    AG->>LT: Approve execution
    
    LT->>SOL: Send transaction 1 (Deploy)
    SOL-->>LT: Signature 1
    LT->>SOL: Confirm transaction 1
    SOL-->>LT: Confirmed ✓
    
    LT->>SOL: Send transaction 2 (Init Pool)
    SOL-->>LT: Signature 2
    LT->>SOL: Confirm transaction 2
    SOL-->>LT: Confirmed ✓
    
    LT->>SOL: Send transaction 3 (Add Liquidity)
    SOL-->>LT: Signature 3
    LT->>SOL: Confirm transaction 3
    SOL-->>LT: Confirmed ✓
    
    LT->>DB: Record launch details
    DB-->>LT: Stored ✓
    
    LT->>AG: Launch complete
    AG->>U: Return success response
```

---

## DLMM Rebalancing Flow

### Autonomous Rebalancing Cycle

```mermaid
flowchart TD
    Start([Worker Timer<br/>Every 30min]) --> GetAllNodes[Get All Active Nodes]
    GetAllNodes --> Iterate[Iterate Through Nodes]
    
    Iterate --> FetchPos[Fetch Current Positions]
    FetchPos --> CalcPnL[Calculate PnL]
    CalcPnL --> GetMetrics[Get Pool Metrics]
    
    GetMetrics --> Analyze{Analyze Conditions}
    Analyze -->|High Impermanent Loss| RebalanceIL[Rebalance to Reduce IL]
    Analyze -->|Low APY| RebalanceAPY[Reallocate to Higher APY]
    Analyize -->|Optimal| Skip[Skip - No Action]
    
    RebalanceIL --> CheckThreshold{Exceeds Threshold?}
    RebalanceAPY --> CheckThreshold
    
    CheckThreshold -->|No| Log[Log Analysis]
    CheckThreshold -->|Yes| PlanRebalance[Plan Rebalance Strategy]
    
    Log --> NextNode{More Nodes?}
    PlanRebalance --> ExecuteRB[Execute Rebalance]
    
    ExecuteRB --> RemoveLiq[Remove Liquidity]
    RemoveLiq --> Reposition[Reposition Range]
    Reposition --> AddLiq[Add Liquidity]
    AddLiq --> UpdateDB[Update Database]
    UpdateDB --> Notify[Send Alert]
    
    Notify --> NextNode
    NextNode -->|Yes| Iterate
    NextNode -->|No| End([Cycle Complete])
    
    Skip --> NextNode
```

### Position Management Details

```mermaid
sequenceDiagram
    participant W as Worker
    participant DA as DLMM Agent
    participant G as LangGraph
    participant MAS as MarketAnalytics
    participant MPS as MeteoraPositionService
    participant MET as Meteora Protocol
    participant DB as Database
    
    W->>DA: Trigger periodic check
    DA->>G: Start evaluation workflow
    G->>MAS: Request pool analytics
    MAS->>MET: GET /pools/{id}/analytics
    MET-->>MAS: Volume, fees, APY data
    MAS->>MAS: Calculate impermanent loss
    MAS-->>G: Analytics report
    
    G->>MPS: Get current positions
    MPS->>DB: Query positions by nodeId
    DB-->>MPS: Position data
    MPS->>MET: GET /positions/{id}
    MET-->>MPS: Live position state
    MPS-->>G: Position details
    
    G->>G: ANALYZE: Compare vs thresholds
    G->>G: DECIDE: Rebalance needed?
    
    alt Rebalance Required
        G->>MPS: Calculate optimal range
        MPS->>MPS: Run optimization algorithm
        MPS-->>G: New price range
        
        G->>MPS: Execute rebalance
        MPS->>MET: Withdraw liquidity
        MET-->>MPS: Position NFT returned
        MPS->>MET: Deposit with new range
        MET-->>MPS: New position NFT
        MPS->>DB: Update position record
        DB-->>MPS: Updated ✓
        MPS-->>G: Rebalance complete
        G->>DA: Report results
        DA->>W: Done
    else No Action Needed
        G-->>DA: Within acceptable range
        DA->>W: Skip
    end
```

---

## Social Media Response Flow

### Telegram Message Processing

```mermaid
sequenceDiagram
    participant TG as Telegram Server
    participant TL as Telegram Listener
    participant UA as User Agent
    participant G as LangGraph
    participant CT as ContentTools
    participant CM as ContentModerator
    participant DB as Database
    participant TG2 as Telegram (Send)
    
    TG->>TL: Update: New message
    TL->>TL: Parse message
    TL->>TL: Extract entities<br/>(mentions, commands, etc)
    TL->>UA: Process message
    
    UA->>G: Invoke response workflow
    G->>DB: Get conversation history
    DB-->>G: Context
    
    G->>THINK: Analyze intent
    THINK->>THINK: Classify message type
    THINK->>DB: Get agent persona
    DB-->>THINK: Persona config
    
    THINK->>ANALYZE: Gather context
    ANALYZE->>DB: Check user history
    DB-->>ANALYZE: User data
    ANALYZE->>G: Context summary
    
    G->>SELECT: Choose action
    SELECT->>SELECT: Direct reply? Forward? Ignore?
    SELECT->>CT: Generate content tool
    
    CT->>CT: Draft response based on persona
    CT->>CM: Moderate content
    CM->>CM: Check toxicity score
    CM->>CM: Check scam indicators
    CM->>CM: Verify factual accuracy
    
    alt Content Safe
        CM-->>CT: Approved ✓
        CT-->>G: Generated response
        G->>EVALUATE: Quality check
        EVALUATE->>EVALUATE: Score response
        EVALUATE-->>G: Acceptable
        G-->>UA: Final response text
        UA->>TG2: Send message
        TG2-->>TG: Delivered
        UA->>DB: Log interaction
        DB-->>UA: Logged
    else Content Flagged
        CM-->>CT: Rejected + reasons
        CT->>CT: Regenerate
        Note over CT,CM: Retry max 3 times
        CT->>G: Escalate to human
        G-->>UA: Escalation needed
    end
```

### Twitter Mention Monitoring

```mermaid
flowchart TD
    Start[Twitter Stream] --> Filter{Filter Mentions}
    Filter -->|Relevant| Analyze[Analyze Tweet]
    Filter -->|Irrelevant| Ignore[Ignore]
    
    Analyze --> Sentiment{Sentiment Analysis}
    Sentiment -->|Positive| EngagePos[Positive Engagement]
    Sentiment -->|Negative| HandleNeg[Handle Negative]
    Sentiment -->|Neutral| NeutralResp[Neutral Response]
    
    EngagePos --> GenPos[Generate Enthusiastic Reply]
    HandleNeg --> CheckLegit{Legitimate Concern?}
    CheckLegit -->|Yes| SupportResp[Support Response]
    CheckLegit -->|No| IgnoreTroll[Ignore/Minimal Response]
    
    NeutralResp --> InfoReply[Informative Response]
    
    GenPos --> Moderate[Moderate Content]
    SupportResp --> Moderate
    InfoReply --> Moderate
    IgnoreTroll --> Log[Log Interaction]
    
    Moderate --> Safe{Safe to Post?}
    Safe -->|Yes| PostTweet[Post Reply Tweet]
    Safe -->|No| Escalate[Flag for Review]
    
    PostTweet --> Log
    Log --> End[Update Metrics]
```

---

## Autonomous Agent Decision Loop

### OODA Loop Implementation

```mermaid
flowchart TD
    Start([Agent Wake-Up]) --> Observe[OBSERVE Phase]
    
    Observe --> CollectData[Collect Multi-Source Data]
    CollectData --> MarketData[Market Prices<br/>Volume<br/>Trends]
    CollectData --> SocialData[Social Sentiment<br/>Engagement<br/>Trending Topics]
    CollectData --> ChainData[On-Chain Metrics<br/>Holder Count<br/>Transactions]
    CollectData --> PosData[Position Performance<br/>APY<br/>Impermanent Loss]
    
    MarketData --> Orient
    SocialData --> Orient
    ChainData --> Orient
    PosData --> Orient
    
    Orient[ORIENT Phase] --> Analyze[Analyze Current State]
    Analyze --> CompareVsGoals[Compare vs Strategic Goals]
    CompareVsGoals --> IdentifyGaps[Identify Gaps/Opportunities]
    IdentifyGaps --> Prioritize[Prioritize Actions]
    
    Prioritize --> Decide[DECIDE Phase]
    Decide --> SelectStrategy[Select Best Strategy]
    SelectStrategy --> AllocateResources[Allocate Resources]
    AllocateResources --> PlanActions[Plan Action Sequence]
    
    PlanActions --> Act[ACT Phase]
    Act --> ExecuteTools[Execute Tool Calls]
    ExecuteTools --> MonitorResults[Monitor Results]
    MonitorResults --> FeedbackLoop[Feedback to OBSERVE]
    
    FeedbackLoop --> CheckInterval{Time for Next Cycle?}
    CheckInterval -->|No| Wait[Wait]
    CheckInterval -->|Yes| Start
    
    Wait --> Start
```

### Tool Selection Logic

```mermaid
flowchart TD
    Input[Agent Intent] --> Classify{Classify Task Type}
    
    Classify -->|Launch Token| LaunchPath[Launch Tool Path]
    Classify -->|Manage Liquidity| DLMMPath[DLMM Tool Path]
    Classify -->|Post Content| SocialPath[Social Tool Path]
    Classify -->|Query Data| QueryPath[Query Tool Path]
    Classify -->|Governance| GovPath[Governance Tool Path]
    
    LaunchPath --> ValidateParams[Validate Launch Params]
    ValidateParams --> SelectLaunchScheme{Which Scheme?}
    SelectLaunchScheme -->|B2B| B2BLaunch[Execute B2B Launch]
    SelectLaunchScheme -->|B2C| B2CLaunch[Execute B2C Launch]
    
    DLMMPath --> AnalyzePosition[Analyze Current Position]
    AnalyzePosition --> SelectDLOperation{Operation Type?}
    SelectDLOperation -->|Add| AddLiq[Add Liquidity]
    SelectDLOperation -->|Remove| RemoveLiq[Remove Liquidity]
    SelectDLOperation -->|Rebalance| Rebal[Rebalance Position]
    
    SocialPath --> GenerateContent[Generate Content]
    GenerateContent --> Moderate[Moderate Content]
    Moderate --> Post[Post to Platform]
    
    QueryPath --> SelectSource{Data Source?}
    SelectSource -->|Market| MarketAPI[Market Data API]
    SelectSource -->|Chain| ChainRPC[Blockchain RPC]
    SelectSource -->|Social| SocialAPI[Social Platform API]
    
    GovPath --> CheckProposal[Check Proposal Details]
    CheckProposal --> VoteDecision[Make Voting Decision]
    VoteDecision --> CastVote[Cast Vote on-Chain]
    
    B2BLaunch --> Result[Collect Result]
    B2CLaunch --> Result
    AddLiq --> Result
    RemoveLiq --> Result
    Rebal --> Result
    Post --> Result
    MarketAPI --> Result
    ChainRPC --> Result
    SocialAPI --> Result
    CastVote --> Result
    
    Result --> Evaluate[Evaluate Success]
    Evaluate --> ReportBack[Report to Agent]
```

---

## Content Moderation Flow

### Multi-Layer Content Filtering

```mermaid
flowchart TD
    Input[Generated Content] --> Layer1[Layer 1: Pattern Matching]
    
    Layer1 --> CheckBanned[Check Banned Words]
    CheckBanned --> CheckPatterns[Check Dangerous Patterns]
    CheckPatterns --> CheckLinks[Check Link Safety]
    
    CheckLinks --> Pass1{Passed L1?}
    Pass1 -->|No| Reject1[Reject Immediately]
    Pass1 -->|Yes| Layer2[Layer 2: ML Classification]
    
    Layer2 --> ToxicityCheck[Toxicity Detection]
    ToxicityCheck --> HateSpeech[Hate Speech Detection]
    HateSpeech --> Harassment[Harassment Detection]
    Harassment --> Sexual[Sexual Content Detection]
    Sexual --> Violence[Violence Detection]
    
    Violence --> ScoreML{ML Score < Threshold?}
    ScoreML -->|No| ReviewML[Flag for Human Review]
    ScoreML -->|Yes| Layer3[Layer 3: Context Analysis]
    
    Layer3 --> CheckContext[Analyze Full Context]
    CheckContext --> CheckIntent[Determine Intent]
    CheckIntent --> CheckAudience[Check Target Audience]
    
    CheckAudience --> Pass3{Passed L3?}
    Pass3 -->|No| HumanReview[Human Review Queue]
    Pass3 -->|Yes| Layer4[Layer 4: Business Rules]
    
    Layer4 --> CheckCompliance[Regulatory Compliance]
    CheckCompliance --> CheckPolicy[Platform Policy]
    CheckPolicy --> CheckBrand[Brand Guidelines]
    
    CheckBrand --> FinalCheck{All Checks Passed?}
    FinalCheck -->|No| Reject[Reject Content]
    FinalCheck -->|Yes| Approve[Approve ✓]
    
    Reject --> Log[Log Decision]
    Approve --> Log
    ReviewML --> Log
    HumanReview --> Log
    
    Log --> Output[Output: Safe/Unsafe/Review]
```

---

*Last updated: March 2026*
