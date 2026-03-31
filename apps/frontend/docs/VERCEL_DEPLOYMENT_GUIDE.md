# Vercel Deployment Guide - Dewa.fun Frontend

**Last Updated:** March 31, 2026  
**Status:** ⚠️ **Monorepo Configuration Required**

---

## 📋 Table of Contents

- [Overview](#overview)
- [Quick Deploy (Recommended)](#quick-deploy-recommended)
- [Monorepo Setup](#monorepo-setup)
- [Troubleshooting](#troubleshooting)
- [Environment Variables](#environment-variables)

---

## 🎯 Overview

Dewa.fun is a **monorepo** with the following structure:

```
dewa.fun/
├── apps/
│   ├── frontend/     # Next.js app to deploy
│   └── agent-backend/
├── packages/
│   ├── sdk/
│   ├── shared-types/
│   └── solana-utils/
└── vercel.json       # Vercel configuration
```

### Challenge

Vercel needs to:
1. Install dependencies from **root** (`pnpm install`)
2. Build from **apps/frontend** directory
3. Access workspace packages (`@dewa/shared-types`, `@dewa/solana-utils`)

---

## 🚀 Quick Deploy (Recommended)

### Option 1: Deploy from Root Directory

```bash
# Navigate to project root
cd d:\GAME\dewa.fun

# Deploy using Vercel CLI
npx vercel --prod
```

**What happens:**
- Vercel detects monorepo structure
- Runs `pnpm install` at root
- Builds `apps/frontend`
- Deploys with workspace packages

---

### Option 2: Deploy from Frontend Directory

If you want to deploy only the frontend without monorepo complexity:

```bash
cd apps/frontend

# Make sure you're logged in to Vercel
npx vercel login

# Deploy
npx vercel --prod
```

**⚠️ Warning:** This may fail if workspace packages aren't properly linked.

---

## 🔧 Monorepo Setup

### Root vercel.json Configuration

Create `vercel.json` in the **root directory**:

```json
{
  "projects": [
    {
      "path": "apps/frontend",
      "name": "dewa-frontend"
    }
  ]
}
```

### Frontend vercel.json Configuration

In `apps/frontend/vercel.json`:

```json
{
  "buildCommand": "cd ../.. && pnpm run build",
  "installCommand": "pnpm install",
  "outputDirectory": "apps/frontend/.next",
  "framework": "nextjs",
  "crons": [
    {
      "path": "/api/admin/cron/audit",
      "schedule": "0 2 * * *"
    }
  ]
}
```

### package.json Scripts

Make sure root `package.json` has build script:

```json
{
  "scripts": {
    "build": "turbo run build",
    "build:frontend": "pnpm --filter @dewa/frontend run build"
  }
}
```

---

## 📝 Step-by-Step Deployment

### Prerequisites

1. ✅ Node.js 18+ installed
2. ✅ pnpm installed globally: `pnpm add -g pnpm`
3. ✅ Vercel account created
4. ✅ Logged in to Vercel: `npx vercel login`

### Deployment Steps

#### Step 1: Link Project to Vercel

```bash
cd d:\GAME\dewa.fun
npx vercel link
```

This creates `.vercel` directory with project metadata.

#### Step 2: Set Environment Variables

In Vercel dashboard or via CLI:

```bash
npx vercel env add DATABASE_URL production
npx vercel env add REDIS_URL production
npx vercel env add NEXT_PUBLIC_APP_URL production
```

#### Step 3: Deploy

```bash
# Preview deployment first
npx vercel

# Then deploy to production
npx vercel --prod
```

#### Step 4: Verify Deployment

Visit your deployment URL:
```
https://dewa-frontend.vercel.app
```

---

## 🐛 Troubleshooting

### Error: "No Next.js version detected"

**Cause:** Vercel can't find `next` in package.json

**Solution 1:** Make sure you're deploying from correct directory

```bash
# Wrong
cd apps/frontend
npx vercel

# Correct - deploy from root for monorepo
cd d:\GAME\dewa.fun
npx vercel
```

**Solution 2:** Add explicit framework detection

In `vercel.json`:
```json
{
  "framework": "nextjs"
}
```

---

### Error: "Command 'npm install' exited with 1"

**Cause:** Vercel tries to use npm instead of pnpm

**Solution:** Override install command

In `vercel.json`:
```json
{
  "installCommand": "pnpm install"
}
```

Or for monorepo:
```json
{
  "installCommand": "cd ../.. && pnpm install"
}
```

---

### Error: Workspace packages not found

**Cause:** pnpm workspace packages can't be resolved

**Solution:** Ensure proper pnpm workspace setup

Root `pnpm-workspace.yaml`:
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

Root `package.json`:
```json
{
  "dependencies": {
    "@dewa/shared-types": "workspace:*",
    "@dewa/solana-utils": "workspace:*"
  }
}
```

---

### Error: Build fails with module not found

**Cause:** Build script doesn't account for monorepo

**Solution:** Use turbo or pnpm filter

Option 1 - Using Turbo:
```json
{
  "buildCommand": "turbo run build --filter=@dewa/frontend"
}
```

Option 2 - Using pnpm:
```json
{
  "buildCommand": "pnpm --filter @dewa/frontend run build"
}
```

Option 3 - Direct path:
```json
{
  "buildCommand": "cd apps/frontend && pnpm run build"
}
```

---

## 🔑 Environment Variables

### Required Variables

Create `.env.production` in `apps/frontend`:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Redis (for rate limiting)
REDIS_URL=redis://localhost:6379

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Solana
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_RPC_URL=https://api.mainnet-beta.solana.com

# App URLs
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_API_URL=https://your-api.vercel.app

# Sentry (error tracking)
SENTRY_AUTH_TOKEN=your-sentry-token
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id

# Email Service (if needed)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password
```

### Set in Vercel Dashboard

```bash
# Or use CLI
npx vercel env add DATABASE_URL production
npx vercel env add REDIS_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
```

---

## 📊 Deployment Status

### Current Status

| Component | Status | URL |
|-----------|--------|-----|
| **Frontend** | ⚠️ In Progress | https://vercel.com/spiderdevs-projects/dewa-monorepo |
| **Project ID** | ✅ Linked | dewa-monorepo |
| **Framework** | ✅ Detected | Next.js |

### Previous Attempts

1. ❌ `apps/frontend` directory - Missing Next.js detection
2. ❌ `npm install` - Should use pnpm
3. ⏳ **Root directory** - Currently deploying

---

## ✅ Post-Deployment Checklist

After successful deployment:

- [ ] Visit production URL
- [ ] Test homepage loads
- [ ] Test wallet connection
- [ ] Test dice game
- [ ] Check API endpoints
- [ ] Verify environment variables
- [ ] Check Sentry error tracking
- [ ] Test mobile responsiveness
- [ ] Run E2E tests against production

---

## 🔄 Continuous Deployment

### Automatic Deploys on Git Push

Connect Git repository in Vercel dashboard:

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your Git repository
3. Configure build settings:
   - **Framework:** Next.js
   - **Build Command:** `pnpm --filter @dewa/frontend run build`
   - **Install Command:** `pnpm install`
   - **Output Directory:** `apps/frontend/.next`

### Manual Deployments

Use Vercel CLI for manual deployments:

```bash
# Preview deployment
npx vercel

# Production deployment
npx vercel --prod
```

---

## 🎯 Best Practices

### 1. Use .vercelignore

Create `.vercelignore` in root:

```
node_modules
.git
*.log
.DS_Store
coverage
test-results
playwright-report
```

### 2. Optimize Build Time

Enable caching in `vercel.json`:

```json
{
  "buildCommand": "pnpm --filter @dewa/frontend run build",
  "installCommand": "pnpm install --store-target-dir .pnpm-store"
}
```

### 3. Use Preview Deployments

Test before production:

```bash
# Create preview
npx vercel

# If good, promote to production
npx vercel promote
```

### 4. Monitor with Vercel Analytics

Enable in dashboard:
- Web Vitals
- Function metrics
- Error tracking

---

## 📞 Support Resources

- **[Vercel Docs](https://vercel.com/docs)** - Official documentation
- **[Next.js Deployment](https://nextjs.org/docs/deployment)** - Next.js guide
- **[Monorepo Projects](https://vercel.com/docs/monorepos)** - Vercel monorepo support
- **[Vercel CLI](https://vercel.com/docs/cli)** - CLI reference

---

## 🎉 Success Criteria

Deployment is successful when:

✅ Site loads at production URL  
✅ All pages are accessible  
✅ Wallet connection works  
✅ Dice game is functional  
✅ API routes respond correctly  
✅ No console errors  
✅ Mobile responsive  
✅ Environment variables loaded  

---

**Deployment Date:** March 31, 2026  
**Deployed By:** Senior Development Team  
**Status:** ⏳ In Progress

*Good luck with your deployment!* 🚀
