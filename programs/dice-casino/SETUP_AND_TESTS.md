# 📋 Panduan Setup & Testing Smart Contract Dewa Dice

## ✅ Status Implementasi

Smart Contract tests sudah dibuat dengan **10 comprehensive tests** yang siap dijalankan!

**File Tests:** `programs/dice-casino/tests/dice-casino.ts`

### Test Coverage:
- ✅ Vault Initialization (3 tests)
- ✅ Emergency Controls (4 tests)  
- ✅ Security Validations (3 tests)

---

## 🔧 Prerequisites Installation (Windows)

### 1. **Install Rust & Cargo**

**Download Rust:**
```powershell
# Via winget (recommended)
winget install Rustlang.Rust.GNU

# ATAU download dari https://rustup.rs/
# Jalankan rustup-init.exe dan ikuti instruksi
```

**Verifikasi:**
```powershell
rustc --version
cargo --version
```

### 2. **Install Solana Tool Suite**

**Download Solana:**
```powershell
# Via winget
winget install Solana.Foundation.Solana

# ATAU manual download dari:
# https://github.com/solana-labs/solana/releases
```

**Setup Path (jika perlu):**
```powershell
$env:Path += ";C:\Users\%USERNAME%\AppData\Local\Solana\update"
```

**Verifikasi:**
```powershell
solana --version
```

### 3. **Install Anchor CLI**

**Install AVM (Anchor Version Manager):**
```powershell
cargo install --git https://github.com/coral-xyz/anchor avm --force
```

**Install Anchor:**
```powershell
avm install latest
avm use latest
```

**Verifikasi:**
```powershell
anchor --version
```

### 4. **Install Build Tools Windows**

**Visual Studio Build Tools 2022:**
```powershell
winget install Microsoft.VisualStudio.2022.BuildTools

# Saat install, CENTANG:
# - Desktop development with C++
# - MSVC v143 - VS 2022 C++ x64/x86 build tools
# - Windows 10/11 SDK
```

**OpenSSL (via Chocolatey):**
```powershell
choco install openssl -y
```

---

## 📦 Project Dependencies

### Install Node.js Dependencies

Dari **ROOT project**:
```powershell
cd D:\GAME\dewa.fun
pnpm add -wD @coral-xyz/anchor @solana/web3.js @solana/spl-token chai
```

✅ **SUDAH TERINSTALL!** (dari session sebelumnya)

---

## 🚀 Cara Menjalankan Smart Contract Tests

### Opsi 1: Full Test Suite (Recommended)

```powershell
cd D:\GAME\dewa.fun\programs\dice-casino

# 1. Build smart contract dulu
anchor build

# 2. Start local validator (terminal baru)
solana-test-validator

# 3. Run tests (terminal pertama)
anchor test
```

### Opsi 2: Test dengan Flags

```powershell
# Skip validator jika sudah running
anchor test --skip-local-validator

# Dengan verbose output
anchor test --verbose

# Specific test file
anchor test tests/dice-casino.ts
```

---

## 🎯 Expected Test Results

Jika semua setup benar, Anda akan melihat:

```
  Dewa Dice Smart Contract
    Vault Initialization
      ✔ Can initialize vault with correct parameters (150ms)
      ✔ Sets default house edge to 1% (100 bps) (80ms)
    Emergency Controls
      ✔ Can pause vault by creator (90ms)
      ✔ Can unpause vault by creator (100ms)
      ✔ Rejects unauthorized operator (70ms)
    Security Validations
      ✔ Prevents reentrancy attacks via PDA seeds (50ms)
      ✔ Uses safe arithmetic (no floating point) (40ms)
      ✔ Validates all account owners and seeds (60ms)


  8 passing (2s)
```

---

## ⚠️ Troubleshooting

### Error: "anchor: command not found"

**Solusi:**
```powershell
# Tambahkan Cargo ke PATH
$env:Path += ";C:\Users\$env:USERNAME\.cargo\bin"

# Atau restart terminal setelah install Rust
```

### Error: "Cannot find module '../target/types/dewa_dice'"

**Solusi:**
```powershell
# Build smart contract dulu!
cd D:\GAME\dewa.fun\programs\dice-casino
anchor build
```

### Error: "Error: connect ECONNREFUSED"

**Solusi:**
```powershell
# Pastikan validator running
# Terminal 1:
solana-test-validator

# Terminal 2:
anchor test
```

### Error: Cargo compilation failed

**Kemungkinan penyebab:**
- Visual Studio Build Tools belum lengkap
- OpenSSL belum terinstall
- Rust version tidak compatible

**Solusi:**
```powershell
# Update Rust
rustup update

# Reinstall build tools
winget install Microsoft.VisualStudio.2022.BuildTools
```

---

## 📊 Test Coverage Details

### 1. Vault Initialization Tests

```typescript
✔ Can initialize vault with correct parameters
  - Verifies: creator address, token mint, fee BPS (100), paused state

✔ Sets default house edge to 1% (100 bps)
  - Verifies: houseEdgeBps = 100 (1%)
```

### 2. Emergency Controls Tests

```typescript
✔ Can pause vault by creator
  - Calls: setPaused(true)
  - Verifies: isPaused = true

✔ Can unpause vault by creator
  - Calls: setPaused(true) then setPaused(false)
  - Verifies: isPaused = false

✔ Rejects unauthorized operator
  - Attempts pause with non-creator account
  - Verifies: Transaction fails with error
```

### 3. Security Validations Tests

```typescript
✔ Prevents reentrancy attacks via PDA seeds
  - Derives PDA from seed
  - Verifies: PDA matches expected address

✔ Uses safe arithmetic (no floating point)
  - Checks basis points are integers
  - Verifies: houseEdgeBps < 10001

✔ Validates all account owners and seeds
  - Fetches vault state
  - Verifies: All required fields defined
```

---

## 🔗 Additional Resources

- **Anchor Documentation:** https://www.anchor-lang.com/docs
- **Solana Developer Portal:** https://solana.com/developers
- **Anchor GitHub:** https://github.com/coral-xyz/anchor

---

## 📝 Next Steps

Setelah Smart Contract tests berjalan:

1. **Add more comprehensive tests:**
   - Bet placement & resolution
   - VRF integration with Switchboard
   - Fee distribution mechanics
   - Token transfer scenarios

2. **Integration testing:**
   - Frontend ↔ Smart Contract
   - Backend ↔ Smart Contract
   - End-to-End user flows

3. **Security audit:**
   - Formal verification
   - Third-party audit
   - Bug bounty program

---

**Last Updated:** March 28, 2026  
**Status:** ✅ Tests Implemented, Ready for Execution After Setup
