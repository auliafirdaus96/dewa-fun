# Git & Vercel Integration Guide - Dewa.fun

**Setup Date:** March 31, 2026  
**Status:** ✅ **Git Initialized - Ready for Remote**

---

## 📋 Table of Contents

- [Overview](#overview)
- [Git Setup Complete](#git-setup-complete)
- [Push to GitHub](#push-to-github)
- [Vercel Integration](#vercel-integration)
- [Deployment Workflow](#deployment-workflow)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This guide covers the complete Git and Vercel integration process for Dewa.fun monorepo project.

### Project Structure

```
dewa.fun/
├── apps/
│   ├── frontend/         # Next.js app (to be deployed to Vercel)
│   └── agent-backend/    # Python/FastAPI backend
├── packages/             # Shared workspace packages
│   ├── shared-types/
│   └── solana-utils/
├── programs/             # Solana smart contracts
├── database/             # Database migrations
└── docs/                 # Documentation
```

---

## ✅ Git Setup Complete

### What's Been Done

#### 1. **Git Repository Initialized**
```bash
✅ git init
✅ .gitignore configured
✅ .gitattributes created (line ending consistency)
```

#### 2. **Excluded from Version Control**
```
✅ node_modules/
✅ .next/ (build output)
✅ venv/ (Python virtual environments)
✅ .env* (environment files)
✅ .vercel/ (Vercel config)
✅ test-results/ (test artifacts)
✅ playwright-report/ (E2E reports)
```

#### 3. **Included in Version Control**
```
✅ All source code (.ts, .tsx, .py)
✅ Configuration files (package.json, tsconfig.json)
✅ Documentation (.md files)
✅ Build scripts
✅ Test files
✅ Docker configs
```

---

## 🚀 Push to GitHub

### Step 1: Create GitHub Repository

**Option A: Via GitHub Website**
1. Go to [github.com/new](https://github.com/new)
2. Repository name: `dewa-fun` or your preferred name
3. Description: "Dewa.fun - Social Casino & AI Agent Platform"
4. Choose: **Public** or **Private**
5. **DO NOT** initialize with README (we already have one)
6. Click "Create repository"

**Option B: Via GitHub CLI**
```bash
gh repo create dewa-fun --public --description "Dewa.fun - Social Casino & AI Agent Platform"
```

### Step 2: Add Remote Origin

```bash
# Navigate to project root
cd d:\GAME\dewa.fun

# Add remote origin (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/dewa-fun.git

# Verify remote
git remote -v
```

Expected output:
```
origin  https://github.com/YOUR_USERNAME/dewa-fun.git (fetch)
origin  https://github.com/YOUR_USERNAME/dewa-fun.git (push)
```

### Step 3: Initial Commit

```bash
# Make sure all files are staged
git status

# If files are missing, stage them (excluding venv)
git add -A :!apps/agent-backend/venv

# Create initial commit
git commit -m "Initial commit: Dewa.fun monorepo

- Frontend: Next.js 15 with Playwright E2E tests
- Backend: Python FastAPI agent backend
- Blockchain: Solana programs & smart contracts
- Database: PostgreSQL with Prisma ORM
- Testing: Comprehensive test coverage
- Documentation: Complete guides and audits"
```

### Step 4: Push to GitHub

```bash
# Set main branch
git branch -M main

# Push to GitHub
git push -u origin main
```

If you get authentication error:
```bash
# Use GitHub Personal Access Token
# Generate token at: https://github.com/settings/tokens
# Then use:
git push https://YOUR_USERNAME:YOUR_TOKEN@github.com/YOUR_USERNAME/dewa-fun.git main
```

Or use SSH (recommended):
```bash
# Generate SSH key (if you don't have one)
ssh-keygen -t ed25519 -C "your_email@example.com"

# Add to GitHub: https://github.com/settings/keys
# Then change remote to SSH
git remote set-url origin git@github.com:YOUR_USERNAME/dewa-fun.git

# Push with SSH
git push -u origin main
```

---

## 🔗 Vercel Integration

### Method 1: Vercel Dashboard (RECOMMENDED)

This is the easiest and most reliable method for monorepo projects.

#### Step 1: Import Project

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"**
3. Select your GitHub account (authorize if needed)
4. Find and select `dewa-fun` repository
5. Click **"Import"**

#### Step 2: Configure Monorepo

**Framework Preset:** Next.js  
**Root Directory:** `apps/frontend`  
**Build Command:** 
```bash
cd ../../ && pnpm install && pnpm --filter @dewa/frontend run build
```
**Install Command:** 
```bash
cd ../../ && pnpm install
```
**Output Directory:** `.next`

#### Step 3: Environment Variables

Click **"Environment Variables"** and add:

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Redis
REDIS_URL=redis://localhost:6379

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key

# Solana
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_RPC_URL=https://api.mainnet-beta.solana.com

# App URLs
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_API_URL=https://your-api.vercel.app

# Sentry
SENTRY_AUTH_TOKEN=your-token
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
```

#### Step 4: Deploy!

1. Click **"Deploy"**
2. Wait 3-5 minutes for build
3. Your site is live! 🎉

**You'll get:**
- Production URL: `https://dewa-fun.vercel.app`
- Preview URLs for every branch
- Automatic deployments on push

---

### Method 2: Vercel CLI (Alternative)

For advanced users who want more control.

#### Step 1: Install Vercel CLI

```bash
pnpm add -g vercel
```

#### Step 2: Login

```bash
npx vercel login
```

#### Step 3: Link Project

```bash
cd apps/frontend
npx vercel link
```

#### Step 4: Deploy

```bash
# Preview deployment
npx vercel

# Production deployment
npx vercel --prod
```

---

## 🔄 Deployment Workflow

### Automatic Deployments (Git-based)

Once connected to GitHub:

#### Every Push to `main`:
```yaml
1. Push code → git push origin main
2. GitHub webhook triggers Vercel
3. Vercel pulls latest code
4. Runs install command: pnpm install
5. Runs build command: pnpm run build
6. Deploys to production
7. Updates production URL
```

#### Every Pull Request:
```yaml
1. Create PR → git push + PR on GitHub
2. Vercel creates preview deployment
3. Comments preview URL on PR
4. Team can review and test
5. Merge to main → auto-deploy to production
```

### Manual Deployments (CLI)

For quick fixes without Git:

```bash
# 1. Make changes locally
cd apps/frontend
# Edit files...

# 2. Build and test
pnpm run build

# 3. Deploy
npx vercel --prod

# 4. Verify
open https://your-app.vercel.app
```

---

## 📊 Branch Strategy

### Recommended Branch Names

```
main              # Production-ready code
├── develop       # Development branch (optional)
├── feature/*     # New features
├── bugfix/*      # Bug fixes
├── hotfix/*      # Production hotfixes
└── release/*     # Release preparation
```

### Example Workflow

```bash
# Start new feature
git checkout main
git pull
git checkout -b feature/dice-game-v2

# Work on feature...
git add .
git commit -m "Add dice game v2"

# Push feature branch
git push -u origin feature/dice-game-v2

# Create Pull Request on GitHub
# Vercel creates preview deployment automatically

# After review, merge to main
# Vercel deploys to production automatically
```

---

## 🎯 Best Practices

### 1. Commit Messages

Follow conventional commits:

```bash
# Features
git commit -m "feat(dice): Add new dice game variant"

# Bug fixes
git commit -m "fix(auth): Resolve wallet connection issue"

# Documentation
git commit -m "docs: Update deployment guide"

# Tests
git commit -m "test(e2e): Add dice game E2E tests"

# Refactoring
git commit -m "refactor(services): Improve error handling"
```

### 2. Pre-commit Checklist

Before committing:

```bash
# Run tests
pnpm test

# Lint code
pnpm lint

# Build locally
pnpm run build

# Check for secrets
git diff --cached | grep -i "password\|token\|key"
```

### 3. .gitignore Best Practices

Already configured, but remember to exclude:

- ❌ Never commit: `.env`, `node_modules`, `.next`
- ✅ Always commit: Source code, configs, docs
- ⚠️ Careful with: `vercel.json`, ensure correct paths

---

## 🔧 Troubleshooting

### Issue: "Failed to load next.js"

**Solution:** Ensure build command is correct

In Vercel dashboard:
```
Build Command: cd ../../ && pnpm install && pnpm --filter @dewa/frontend run build
```

### Issue: "Module not found: @dewa/shared-types"

**Solution:** Workspace packages not resolved

Check `pnpm-workspace.yaml` exists at root:
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### Issue: Git authentication failed

**Solution:** Use personal access token

1. Go to: https://github.com/settings/tokens
2. Generate token with `repo` scope
3. Use in push command:
```bash
git push https://USERNAME:TOKEN@github.com/USERNAME/repo.git main
```

### Issue: Vercel build timeout

**Solution:** Optimize build or increase timeout

Local build test:
```bash
cd apps/frontend
pnpm install
pnpm run build
# Should complete in < 5 minutes
```

If slow, consider:
- Caching `.pnpm-store`
- Using incremental builds
- Splitting large builds

---

## 📈 Monitoring & Analytics

### Vercel Dashboard

Access at: `https://vercel.com/YOUR_ACCOUNT/dewa-fun`

**Features:**
- ✅ Deployment history
- ✅ Performance metrics
- ✅ Error tracking
- ✅ Analytics (if enabled)
- ✅ Function logs
- ✅ Custom domains

### Enable Notifications

1. Go to Project Settings
2. Notifications tab
3. Enable:
   - ✅ Deployment success/failure
   - ✅ Function errors
   - ✅ Domain verification

---

## 🎉 Success Checklist

### Git Setup
- [x] Git repository initialized
- [x] .gitignore configured
- [x] .gitattributes created
- [ ] Remote origin added
- [ ] Initial commit created
- [ ] Pushed to GitHub

### Vercel Integration
- [ ] Vercel account created
- [ ] GitHub connected to Vercel
- [ ] Project imported
- [ ] Monorepo configured
- [ ] Environment variables set
- [ ] First deployment successful

### Post-Deployment
- [ ] Site loads at `.vercel.app` domain
- [ ] All pages accessible
- [ ] No console errors
- [ ] Mobile responsive
- [ ] API routes working
- [ ] Wallet connection functional
- [ ] Dice game playable

---

## 📞 Support Resources

- **[Vercel Docs](https://vercel.com/docs)** - Official documentation
- **[GitHub Guides](https://guides.github.com/)** - Git tutorials
- **[Next.js Deployment](https://nextjs.org/docs/deployment)** - Next.js guide
- **[Monorepo Projects](https://vercel.com/docs/monorepos)** - Vercel monorepo support

---

## 🚀 Quick Commands Reference

### Git Commands
```bash
# Initialize
git init

# Stage files
git add .
git add path/to/file

# Commit
git commit -m "Message"

# Push
git push origin main
git push -u origin main  # First time

# Check status
git status
git log --oneline
```

### Vercel Commands
```bash
# Login
npx vercel login

# Link project
npx vercel link

# Deploy
npx vercel          # Preview
npx vercel --prod   # Production

# View logs
npx vercel logs
```

---

**Last Updated:** March 31, 2026  
**Status:** ✅ Git Ready - Waiting for Remote

*Next step: Create GitHub repository and push!* 🚀
