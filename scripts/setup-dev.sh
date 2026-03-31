#!/bin/bash
# setup-dev.sh: Setup the monorepo for local development

echo "--- Dewa Launchpad-as-a-Service Setup ---"

# 1. Install Node dependencies
echo "Installing Node.js dependencies..."
pnpm install

# 2. Setup AI Backend (Python)
echo "Setting up AI Backend..."
cd apps/agent-backend
if [ ! -d "venv" ]; then
    python -m venv venv
fi
source venv/Scripts/activate
pip install -r requirements.txt
cd ../..

# 3. Build Shared Packages
echo "Building shared packages..."
pnpm run build --filter "@dewa/*"

echo "Setup complete. Run 'npm run dev' to start frontend or 'python start_all.py' in agent-backend."
