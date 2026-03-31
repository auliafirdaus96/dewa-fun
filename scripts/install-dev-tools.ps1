[ScriptInfo]
Version=1.0.0
Author=Dewa.fun Dev Team

.SYNOPSIS
    Install Rust, Solana, dan Anchor CLI untuk Windows
.DESCAMPLE
    .\install-dev-tools.ps1
.NOTES
    Jalankan PowerShell sebagai Administrator
#>

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Dewa.fun Development Tools Installer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# STEP 1: Install Rust via rustup
Write-Host "[1/4] Installing Rust via rustup..." -ForegroundColor Yellow
$env:RUSTUP_INIT_SKIP_PATH_CHECK = "yes"
$env:RUSTUP_INIT_SKIP_MODIFY_PATH = "no"

Invoke-WebRequest -Uri "https://static.rust-lang.org/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe" -OutFile "$env:TEMP\rustup-init.exe"
Start-Process -FilePath "$env:TEMP\rustup-init.exe" -ArgumentList "-y", "--default-toolchain", "stable", "--component", "rust-src" -Wait

Write-Host "✓ Rust installed successfully!" -ForegroundColor Green
Write-Host ""

# STEP 2: Add Rust to PATH
$rustPath = "$env:USERPROFILE\.cargo\bin"
if ($env:PATH -notlike "*$rustPath*") {
    $newPath = $env:Path + ";" + $rustPath
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

Write-Host "✓ Rust added to PATH" -ForegroundColor Green
Write-Host ""

# STEP 3: Install Solana
Write-Host "[2/4] Installing Solana..." -ForegroundColor Yellow
Invoke-WebRequest -Uri "https://github.com/solana-labs/solana/releases/download/v1.18.26/solana-install-init-x86_64-pc-windows-msvc.exe" -OutFile "$env:TEMP\solana-install.exe"
Start-Process -FilePath "$env:TEMP\solana-install.exe" -ArgumentList "--data-dir", "$env:USERPROFILE\AppData\Local\Solana", "v1.18.26" -Wait

$solanaPath = "$env:USERPROFILE\AppData\Local\Solana\active_release\bin"
if ($env:PATH -notlike "*$solanaPath*") {
    $newPath = $env:Path + ";" + $solanaPath
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

Write-Host "✓ Solana installed successfully!" -ForegroundColor Green
Write-Host ""

# STEP 4: Install Anchor CLI
Write-Host "[3/4] Installing Anchor CLI..." -ForegroundColor Yellow
cargo install --git https://github.com/coral-xyz/anchor avm --force

avm install latest
avm use latest

Write-Host "✓ Anchor CLI installed successfully!" -ForegroundColor Green
Write-Host ""

# STEP 5: Verify Installation
Write-Host "[4/4] Verifying installation..." -ForegroundColor Yellow
Write-Host ""

Write-Host "Installed versions:" -ForegroundColor Cyan
rustc --version
cargo --version
solana --version
anchor --version

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "All tools installed successfully! 🎉" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Restart PowerShell to refresh PATH" -ForegroundColor White
Write-Host "2. Navigate to: cd D:\GAME\dewa.fun\programs\dice-casino" -ForegroundColor White
Write-Host "3. Build contract: anchor build" -ForegroundColor White
Write-Host "4. Run tests: anchor test" -ForegroundColor White
Write-Host ""
