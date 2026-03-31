# 🚀 VERCEL DEPLOYMENT CHECKLIST - Dewa.fun

**Goal:** Successfully deploy Dewa.fun frontend to Vercel  
**Status:** ⏳ Ready for execution  
**Estimated Time:** 15-20 minutes

---

## ✅ PRE-DEPLOYMENT CHECKLIST

### 1. Git Repository Setup
- [x] ✅ Git initialized (`git init`)
- [x] ✅ .gitignore configured
- [x] ✅ .gitattributes created
- [ ] ⏳ Remote origin added (GitHub)
- [ ] ⏳ Initial commit created
- [ ] ⏳ Pushed to GitHub

### 2. Vercel Configuration
- [x] ✅ `vercel.json` exists with correct build command
- [x] ✅ Monorepo structure documented
- [x] ✅ Build script created (`scripts/vercel-build.cjs`)
- [ ] ⏳ Environment variables identified

### 3. Code Readiness
- [x] ✅ Frontend builds locally
- [x] ✅ No TypeScript errors
- [x] ✅ Playwright tests created (optional)
- [x] ✅ Legacy files cleaned (venv removed)

---

## 🎯 STEP-BY-STEP DEPLOYMENT GUIDE

### **METHOD 1: GITHUB + VERCEL DASHBOARD (RECOMMENDED)**

This is the MOST RELIABLE method for monorepo projects.

#### **Step 1: Create GitHub Repository** (2 min)

```bash
# 1. Open browser to: https://github.com/new

# 2. Fill in:
Repository name: dewa-fun
Description: "Dewa.fun - Social Casino & AI Agent Platform"
Visibility: Public or Private (your choice)
⚠️ DO NOT check "Add README" (we already have one)

# 3. Click "Create repository"
```

#### **Step 2: Add Remote & Push** (3 min)

```powershell
# Navigate to project root
cd d:\GAME\dewa.fun

# Add remote origin (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/dewa-fun.git

# Verify
git remote -v
# Should show:
# origin  https://github.com/YOUR_USERNAME/dewa-fun.git (fetch)
# origin  https://github.com/YOUR_USERNAME/dewa-fun.git (push)

# Configure git user (if not set)
git config user.name "Your Name"
git config user.email "your@email.com"

# Stage all files (exclude venv automatically via .gitignore)
git add .

# Create initial commit
git commit -m "Initial commit: Dewa.fun monorepo ready for Vercel deployment

Features:
- Next.js 15 frontend with Playwright E2E tests
- TypeScript throughout monorepo
- pnpm workspaces for dependency management
- Vercel deployment configuration
- Comprehensive documentation"

# Set main branch
git branch -M main

# Push to GitHub
git push -u origin main
```

**If authentication fails:**
```powershell
# Option A: Use Personal Access Token
# Generate token at: https://github.com/settings/tokens
# Then:
git push https://YOUR_USERNAME:YOUR_TOKEN@github.com/YOUR_USERNAME/dewa-fun.git main

# Option B: Use SSH (recommended for frequent use)
# Generate SSH key:
ssh-keygen -t ed25519 -C "your_email@example.com"
# Add to GitHub: https://github.com/settings/keys
# Change remote to SSH:
git remote set-url origin git@github.com:YOUR_USERNAME/dewa-fun.git
git push -u origin main
```

#### **Step 3: Import to Vercel** (5 min)

```bash
# 1. Go to: https://vercel.com/new

# 2. Login with GitHub account
#    (Authorize Vercel if first time)

# 3. Click "Import Git Repository"

# 4. Find and select your repo: "dewa-fun"

# 5. Click "Import"
```

#### **Step 4: Configure Monorepo Settings** (3 min)

**CRITICAL STEP** - Configure these settings in Vercel:

**Framework Preset:** `Next.js` ✅

**Root Directory:** `apps/frontend` ✅

**Build Command:** 
```bash
cd ../../ && pnpm install && pnpm --filter @dewa/frontend run build
```
✅

**Install Command:**
```bash
cd ../../ && pnpm install
```
✅

**Output Directory:** `.next` ✅

**Development Command:** `pnpm --filter @dewa/frontend run dev` (optional)

#### **Step 5: Add Environment Variables** (3 min)

Click **"Environment Variables"** button and add:

```bash
# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@host:port/dbname

# Redis (Rate limiting)
REDIS_URL=redis://localhost:6379

# Supabase (if using)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Solana Blockchain
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_RPC_URL=https://api.mainnet-beta.solana.com

# App URLs
NEXT_PUBLIC_APP_URL=https://dewa-fun.vercel.app
NEXT_PUBLIC_API_URL=https://your-api.vercel.app

# Sentry (Error tracking)
SENTRY_AUTH_TOKEN=your-sentry-token
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/yyy

# Email Service (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

**Note:** You can add these later too. For testing, you can start with minimal vars.

#### **Step 6: Deploy!** (5 min wait)

```bash
# 1. Click "Deploy" button

# 2. Wait for build (3-5 minutes)
#    Vercel will:
#    - Clone your repo
#    - Run install command
#    - Run build command
#    - Deploy to production

# 3. When you see "Congratulations!", site is live! 🎉

# 4. Click on deployment URL to visit your site
```

---

### **METHOD 2: VERCEL CLI (ALTERNATIVE)**

Use this if you want more control or can't use GitHub integration.

#### **Prerequisites**
```powershell
# Install Vercel CLI globally
pnpm add -g vercel

# Or use npx (no install needed)
npx vercel --version
```

#### **Step 1: Login to Vercel**
```powershell
npx vercel login
# Follow browser instructions
```

#### **Step 2: Link Project**
```powershell
cd apps/frontend
npx vercel link
# Follow prompts to create/link project
```

#### **Step 3: Configure for Monorepo**

Create `.vercelprojectrc` in `apps/frontend`:
```json
{
  "orgId": "your-org-id",
  "projectId": "your-project-id",
  "settings": {
    "framework": "nextjs",
    "buildCommand": "node ../../scripts/vercel-build.cjs",
    "installCommand": "cd ../.. && pnpm install",
    "outputDirectory": ".next"
  }
}
```

#### **Step 4: Deploy**
```powershell
# Preview deployment
npx vercel

# Production deployment
npx vercel --prod
```

---

## 🔧 TROUBLESHOOTING COMMON ISSUES

### Issue 1: "Module not found: @dewa/shared-types"

**Cause:** Workspace packages not resolved during build

**Solution:** Ensure build script runs from correct directory

Update `scripts/vercel-build.cjs`:
```javascript
const path = require('path');

console.log('🚀 Building from:', __dirname);
console.log('Root should be:', path.join(__dirname, '../..'));

// Make sure we're building from the right place
process.chdir(path.join(__dirname, '../..'));
```

### Issue 2: "Build failed: Command exceeded timeout"

**Cause:** Build takes too long (>10 minutes)

**Solutions:**
1. Optimize build by caching node_modules
2. Use smaller base image
3. Split large builds

Add to `vercel.json`:
```json
{
  "functions": {
    "maxDuration": 60
  }
}
```

### Issue 3: "No Next.js version detected"

**Cause:** Vercel looks in wrong directory

**Solution:** Explicitly set framework in `vercel.json`:
```json
{
  "framework": "nextjs",
  "buildCommand": "node ../../scripts/vercel-build.cjs"
}
```

### Issue 4: "pnpm: command not found"

**Cause:** Vercel doesn't have pnpm installed

**Solution:** Use Node.js build image that includes pnpm

In Vercel dashboard → Settings → Build & Development Settings:
- **Node.js Version:** 20.x (includes pnpm)

Or add `.nvmrc` file in root:
```
20
```

### Issue 5: Environment variables not working

**Cause:** Variables not set or typo in names

**Solution:**
1. Double-check variable names match exactly
2. Ensure marked as "Production" environment
3. Redeploy after adding variables

Test locally:
```bash
# Check what env vars are available
printenv | grep NEXT_PUBLIC
```

---

## 📊 POST-DEPLOYMENT VERIFICATION

### Checklist After Deployment

- [ ] Site loads at `https://dewa-fun.vercel.app`
- [ ] Homepage displays correctly
- [ ] No console errors in browser
- [ ] Navigation works between pages
- [ ] Mobile responsive
- [ ] Images load properly
- [ ] API routes respond (if any)
- [ ] Wallet connection UI appears (if implemented)

### Testing Commands

```bash
# View deployment logs
npx vercel logs

# List deployments
npx vercel ls

# View environment variables
npx vercel env ls

# Promote preview to production
npx vercel promote
```

---

## 🎯 SUCCESS CRITERIA

Deployment is considered successful when:

✅ **Build Phase:**
- [ ] Build completes without errors
- [ ] Duration < 10 minutes
- [ ] All workspace packages resolved
- [ ] Next.js build output created

✅ **Runtime Phase:**
- [ ] Site accessible via URL
- [ ] HTTP 200 response code
- [ ] No 500 errors in logs
- [ ] Functions execute correctly

✅ **User Experience:**
- [ ] Page loads < 3 seconds
- [ ] No visual regressions
- [ ] Interactive elements work
- [ ] Mobile-friendly

---

## 🔄 CONTINUOUS DEPLOYMENT SETUP

Once successfully deployed, every future push to `main` will auto-deploy:

```yaml
Git Push Flow:
1. git push origin main
   ↓
2. GitHub webhook triggers Vercel
   ↓
3. Vercel pulls latest code
   ↓
4. Auto-builds with same config
   ↓
5. Deploys to production
   ↓
6. Updates URL automatically
```

**For Pull Requests:**
- Vercel creates preview deployment
- Comments preview URL on PR
- Team can review before merge

---

## 📞 QUICK HELP COMMANDS

### Check Current Status
```bash
cd d:\GAME\dewa.fun
git status
git log --oneline -5
```

### Test Build Locally
```bash
cd apps/frontend
pnpm install
pnpm run build
# Should complete successfully
```

### View Vercel Project
```bash
npx vercel ls
```

### Manual Deploy
```bash
cd apps/frontend
npx vercel --prod
```

---

## 🎉 FINAL CHECKLIST

Before clicking Deploy in Vercel:

- [ ] ✅ GitHub repo created
- [ ] ✅ Code pushed to GitHub
- [ ] ✅ `vercel.json` configured correctly
- [ ] ✅ Build script tested locally
- [ ] ✅ Environment variables ready
- [ ] ✅ Team notified (if applicable)

**READY TO DEPLOY!** 🚀

---

**Created:** March 31, 2026  
**Last Updated:** Current session  
**Status:** Ready for execution

*Follow this guide step-by-step for successful deployment!*
