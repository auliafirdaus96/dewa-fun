# Dewa.fun Development Tools Installer
# Jalankan PowerShell sebagai Administrator

Write-Host "========================================"
Write-Host "Dewa.fun Development Tools Installer"
Write-Host "========================================"
Write-Host ""

# STEP 1: Install Rust via rustup
Write-Host "[1/4] Installing Rust via rustup..."
$env:RUSTUP_INIT_SKIP_PATH_CHECK = "yes"

Invoke-WebRequest -Uri "https://static.rust-lang.org/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe" -OutFile "$env:TEMP\rustup-init.exe"
Start-Process -FilePath "$env:TEMP\rustup-init.exe" -ArgumentList "-y", "--default-toolchain", "stable", "--component", "rust-src" -Wait

Write-Host "OK Rust installed!"
Write-Host ""

# STEP 2: Add Rust to PATH
$rustPath = "$env:USERPROFILE\.cargo\bin"
$userPath = [Environment]::GetEnvironmentVariable("Path","User")
if ($userPath -notlike "*$rustPath*") {
    [Environment]::SetEnvironmentVariable("Path", $userPath + ";" + $rustPath, "User")
}

Write-Host "OK Rust added to PATH"
Write-Host ""

# STEP 3: Install Solana
Write-Host "[2/4] Installing Solana..."
Invoke-WebRequest -Uri "https://github.com/solana-labs/solana/releases/download/v1.18.26/solana-install-init-x86_64-pc-windows-msvc.exe" -OutFile "$env:TEMP\solana-install.exe"
Start-Process -FilePath "$env:TEMP\solana-install.exe" -ArgumentList "--data-dir", "$env:USERPROFILE\AppData\Local\Solana", "v1.18.26" -Wait

$solanaPath = "$env:USERPROFILE\AppData\Local\Solana\active_release\bin"
$userPath = [Environment]::GetEnvironmentVariable("Path","User")
if ($userPath -notlike "*$solanaPath*") {
    [Environment]::SetEnvironmentVariable("Path", $userPath + ";" + $solanaPath, "User")
}

Write-Host "OK Solana installed!"
Write-Host ""

# STEP 4: Install Anchor CLI
Write-Host "[3/4] Installing Anchor CLI..."
$cargoPath = "$env:USERPROFILE\.cargo\bin"
$env:Path = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [Environment]::GetEnvironmentVariable("Path","User")
cargo install --git https://github.com/coral-xyz/anchor avm --force

avm install latest
avm use latest

Write-Host "OK Anchor CLI installed!"
Write-Host ""

# STEP 5: Verify Installation
Write-Host "[4/4] Verifying installation..."
Write-Host ""

Write-Host "Installed versions:"
rustc --version
cargo --version
solana --version
anchor --version

Write-Host ""
Write-Host "========================================"
Write-Host "All tools installed successfully!"
Write-Host "========================================"
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Restart PowerShell to refresh PATH"
Write-Host "2. Navigate to: cd D:\GAME\dewa.fun\programs\dice-casino"
Write-Host "3. Build contract: anchor build"
Write-Host "4. Run tests: anchor test"
Write-Host ""
