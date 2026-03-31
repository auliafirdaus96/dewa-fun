# 🚀 Panduan Deploy ke Vercel

## ✅ Prerequisites (Sudah Selesai)

- ✅ Vercel CLI terinstall (`vercel --version`)
- ✅ Sudah login ke Vercel (`vercel login`)
- ✅ Build script sudah diperbaiki (`scripts/vercel-build.cjs`)
- ✅ Konfigurasi `apps/frontend/vercel.json` sudah benar

---

## 📋 Cara Deploy (2 Opsi)

### **Opsi 1: Via Vercel Dashboard (RECOMMENDED)** ⭐

Ini cara paling mudah dan reliable untuk monorepo.

#### **Langkah 1: Buka Vercel Dashboard**
1. Kunjungi: https://vercel.com/dashboard
2. Login dengan GitHub Anda (auliafirdaus96)

#### **Langkah 2: Import Project dari GitHub**
1. Klik **"Add New..."** → **"Project"**
2. Di bagian **"Import Git Repository"**, cari `auliafirdaus96/dewa-fun`
3. Klik **"Import"**

#### **Langkah 3: Configure Project**

**Framework Preset:**
```
Next.js
```

**Root Directory:**
```
apps/frontend
```

**Build Command:**
```
node ../../scripts/vercel-build.cjs
```

**Install Command:**
```
pnpm install
```

**Output Directory:**
```
.next
```

#### **Langkah 4: Environment Variables**

Tambahkan environment variables berikut di Vercel dashboard:

**Development:**
```
NEXT_PUBLIC_API_URL=http://localhost:3000
NODE_ENV=development
```

**Production:**
```
NEXT_PUBLIC_API_URL=https://api.dewa.fun
NODE_ENV=production
```

**Variables Lainnya (sesuaikan dengan .env.example):**
```
# Database
DATABASE_URL=your_database_url_here

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_key

# Solana
NEXT_PUBLIC_SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com

# Wallet Adapter
NEXT_PUBLIC_WALLET_ADAPTER=phantom

# API Keys (ganti dengan yang asli)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

⚠️ **PENTING:** Jangan copy dari `.env.local`! Gunakan placeholder dulu, nanti bisa update di dashboard.

#### **Langkah 5: Deploy!**
1. Klik **"Deploy"**
2. Tunggu build selesai (~3-5 menit)
3. Jika ada error, cek build logs di dashboard

---

### **Opsi 2: Via Vercel CLI**

Deploy langsung dari terminal (butuh konfigurasi manual).

#### **Step 1: Hapus .vercel directory (jika ada)**
```bash
rm -rf .vercel
# atau di PowerShell:
Remove-Item -Recurse -Force .vercel
```

#### **Step 2: Link ke Vercel Project**
```bash
vercel link
```

Akan muncul prompt:
- `? Set up and deploy "D:\GAME\dewa.fun"?` → **Yes**
- `? Which scope do you want to link to?` → Pilih **Aulia's projects**
- `? Link to existing project?` → **No** (untuk project baru)
- `? What's your project's name?` → **dewa-fun**
- `? In which directory is your code located?` → **apps/frontend**

#### **Step 3: Override Settings**
Vercel akan detect settings otomatis. Override dengan:

```
? Want to override the settings?
  - Build Command: node ../../scripts/vercel-build.cjs
  - Install Command: pnpm install  
  - Output Directory: .next
```

#### **Step 4: Setup Environment Variables**
```bash
vercel env add NEXT_PUBLIC_API_URL production
> Value: https://api.dewa.fun

vercel env add NODE_ENV production
> Value: production

# Tambahkan variables lainnya sesuai kebutuhan
```

#### **Step 5: Deploy**
```bash
# Deploy ke production
vercel --prod

# Atau deploy ke preview/staging
vercel
```

---

## 🔍 Monitoring Deployment

### **Cek Status Deploy**
```bash
vercel ls
```

### **Lihat Logs**
```bash
vercel logs <deployment-url>
```

### **Buka Dashboard**
```bash
vercel open
```

---

## ⚙️ Update Deployment (Setiap Ada Perubahan)

### **Auto-Deploy (Jika Connect GitHub)**
Jika project di-connect ke GitHub di Vercel dashboard:
- Setiap push ke branch `main` akan auto-deploy
- Tidak perlu manual deploy lagi!

### **Manual Deploy**
```bash
# Commit & push perubahan
git add .
git commit -m "Update fitur X"
git push origin main

# Deploy ke production
vercel --prod
```

---

## 🛠️ Troubleshooting

### **Build Failed: "ERR_PNPM_NO_PKG_MANIFEST"**
**Solusi:** Pastikan build command benar:
```
node ../../scripts/vercel-build.cjs
```
Bukan: `pnpm run build` atau `turbo build`

### **Environment Variables Not Found**
**Solusi:**
1. Cek di Vercel Dashboard → Settings → Environment Variables
2. Pastikan variables ada di **Production** environment
3. Redeploy setelah tambah variables

### **Deployment Success tapi 404**
**Solusi:**
1. Cek Output Directory harus `.next`
2. Pastikan `apps/frontend/vercel.json` konfigurasi benar
3. Cek build logs apakah Next.js build success

### **Monorepo Packages Not Found**
**Solusi:**
Pastikan build script menjalankan:
```bash
pnpm --filter @dewa/shared-types run build
pnpm --filter @dewa/solana-utils run build
pnpm --filter @dewa/frontend run build
```

---

## 📊 Struktur Deployment

```
Vercel Deployment
├── Root: apps/frontend
├── Build: node ../../scripts/vercel-build.cjs
│   ├── 1. pnpm install (di root monorepo)
│   ├── 2. Build shared-types
│   ├── 3. Build solana-utils
│   └── 4. Build frontend (Next.js)
├── Output: .next
└── Env Vars: Dari Vercel Dashboard
```

---

## 💡 Tips

1. **Gunakan Dashboard untuk setup pertama** - Lebih mudah visualisasinya
2. **Connect GitHub repo** - Auto deploy setiap push
3. **Preview Deployments** - Setiap branch dapat preview URL sendiri
4. **Environment Variables** - Bisa beda value per environment (preview/production)
5. **Rollback** - Bisa rollback ke deployment sebelumnya jika ada masalah

---

## 🎯 Checklist Sebelum Deploy

- [ ] Build script `vercel-build.cjs` sudah OK
- [ ] `apps/frontend/vercel.json` konfigurasi benar
- [ ] Environment variables siap
- [ ] Sudah login Vercel (`vercel login`)
- [ ] Code sudah di-push ke GitHub
- [ ] `.env` files tidak ter-commit (cek `.gitignore`)

---

## 📞 Need Help?

- Vercel Docs: https://vercel.com/docs
- Next.js Deployment: https://nextjs.org/docs/deployment
- Vercel CLI: https://vercel.com/docs/cli

Atau cek dashboard untuk error details dan build logs.
