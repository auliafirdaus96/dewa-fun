# 🚀 Auto Commit & Push ke GitHub

## 📋 Fitur yang Tersedia

### 1. **Auto Commit on Save** (Watch Mode)
Script ini akan otomatis commit setiap kali ada perubahan file.

**Cara Menjalankan:**
```bash
pnpm watch-commit
```

**Cara Kerja:**
- Script akan "watch" atau memantau semua perubahan file di project
- Setiap ada perubahan, akan otomatis di-commit setelah 2 detik tidak ada perubahan baru
- File yang diabaikan: `node_modules`, `.next`, `.turbo`, `.git`, `.env*`, dll
- Commit message format: `Auto-save: X file(s) changed at YYYY-MM-DD HH:MM:SS`

**Keuntungan:**
- ✅ Tidak perlu manual commit setiap kali coding
- ✅ History perubahan tersimpan rapi
- ✅ Aman - hanya commit lokal, tidak otomatis push

**Kekurangan:**
- ⚠️ Hanya commit ke repository lokal
- ⚠️ Belum ter-update ke GitHub (perlu push manual)

---

### 2. **Quick Commit & Push**
Script untuk commit dan push langsung ke GitHub dengan satu perintah.

**Cara Menjalankan:**
```bash
pnpm commit-push
```

**Cara Kerja:**
- Stage semua perubahan (`git add .`)
- Commit dengan message: `Update: YYYY-MM-DD HH:MM:SS`
- Push ke branch `main` di GitHub

**Keuntungan:**
- ✅ Langsung ter-update ke GitHub
- ✅ Cepat - satu perintah selesai

**Kekurangan:**
- ⚠️ Harus dijalankan manual
- ⚠️ Commit message kurang deskriptif

---

## 💡 Rekomendasi Workflow

### Opsi A: Auto Commit + Manual Push (RECOMMENDED)
1. Jalankan watch mode saat coding:
   ```bash
   pnpm watch-commit
   ```
2. Biarkan script auto-commit bekerja saat Anda coding
3. Setiap beberapa jam atau setelah selesai fitur, push ke GitHub:
   ```bash
   git push origin main
   ```

**Kenapa ini lebih baik?**
- Anda bisa fokus coding tanpa mikir commit
- Push dilakukan batch (beberapa commit sekaligus), tidak satu-satu
- Lebih aman - bisa review commit history sebelum push

---

### Opsi B: Manual Commit & Push
Jika tidak ingin menggunakan auto-commit:

1. Setelah selesai coding atau pada interval tertentu:
   ```bash
   # Cara tradisional
   git add .
   git commit -m "Deskripsi perubahan yang jelas"
   git push origin main
   
   # Atau cara cepat
   pnpm commit-push
   ```

---

## ⚙️ Kustomisasi Auto Commit

Edit file `scripts/auto-commit-watch.js` untuk mengubah:

### 1. Debounce Time (default: 2 detik)
```javascript
const DEBOUNCE_MS = 2000; // Ganti angka ini (dalam milidetik)
```

### 2. File yang Diabaikan
```javascript
const IGNORE_PATTERNS = [
  /node_modules/,
  /\.next/,
  // Tambah pattern lain di sini
];
```

---

## ❓ Troubleshooting

### "No changes to commit"
Artinya tidak ada perubahan baru sejak terakhir commit. Ini normal.

### Commit gagal karena .gitignore
File seperti `.env`, `node_modules` memang sengaja diabaikan untuk keamanan.

### Ingin stop watch mode?
Tekan `Ctrl+C` di terminal untuk menghentikan `pnpm watch-commit`.

---

## 🎯 Contoh Penggunaan Harian

```bash
# 1. Mulai sesi coding - jalankan watch mode
pnpm watch-commit

# 2. Coding seperti biasa... 
#    (script akan auto-commit setiap ada perubahan)

# 3. Setelah 1-2 jam atau selesai fitur, push ke GitHub
git push origin main

# 4. Atau jika ingin cepat (commit + push langsung)
pnpm commit-push
```

---

## 🔒 Keamanan

- Auto-commit TIDAK termasuk file sensitif (`.env`, dll) karena sudah di `.gitignore`
- Push ke GitHub tetap harus manual untuk menghindari accidental push
- Semua commit bisa di-review dengan `git log` sebelum di-push

---

## 📞 Butuh Bantuan?

Jika ada masalah dengan auto-commit atau push ke GitHub, cek:
1. Git status: `git status`
2. Git remote: `git remote -v`
3. Koneksi GitHub: `git fetch`

Atau gunakan cara manual tradisional jika auto-commit bermasalah.
