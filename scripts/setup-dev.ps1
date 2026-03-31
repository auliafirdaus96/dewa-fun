# setup-dev.ps1: Setup the monorepo for local development (PowerShell version)

Write-Host "--- Dewa Launchpad-as-a-Service Setup ---" -ForegroundColor Cyan

# 1. Install Node dependencies
Write-Host "`nInstalling Node.js dependencies..." -ForegroundColor Yellow
pnpm install

# 2. Setup AI Backend (Python)
Write-Host "`nSetting up AI Backend..." -ForegroundColor Yellow
Set-Location apps\agent-backend
if (-not (Test-Path "venv")) {
    python -m venv venv
}
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
Set-Location ..\..

# 3. Build Shared Packages
Write-Host "`nBuilding shared packages..." -ForegroundColor Yellow
pnpm run build --filter "@dewa/*"

Write-Host "`n✅ Setup complete!" -ForegroundColor Green
Write-Host "Run 'npm run dev' to start frontend or 'python start_all.py' in agent-backend." -ForegroundColor Gray
