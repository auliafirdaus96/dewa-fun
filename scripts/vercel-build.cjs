#!/usr/bin/env node

/**
 * Custom Vercel Build Script for Monorepo
 * This script handles building the frontend in a monorepo context
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting custom build for Dewa.fun frontend...');

try {
  // Resolve to monorepo root by finding package.json
  let currentDir = process.cwd();
  while (currentDir !== path.parse(currentDir).root) {
    if (fs.existsSync(path.join(currentDir, 'package.json')) && 
        fs.existsSync(path.join(currentDir, 'pnpm-workspace.yaml'))) {
      break;
    }
    currentDir = path.dirname(currentDir);
  }
  
  const rootDir = currentDir;
  const frontendDir = path.join(rootDir, 'apps/frontend');
  
  console.log('📁 Root directory:', rootDir);
  console.log('📁 Frontend directory:', frontendDir);
  console.log('📁 Current working directory:', process.cwd());

  // Change to root directory for pnpm operations
  process.chdir(rootDir);
  console.log('📍 Changed working directory to:', process.cwd());

  // Step 1: Install dependencies at root level
  console.log('\n📦 Installing dependencies...');
  execSync('pnpm install', { stdio: 'inherit' });

  // Step 2: Build workspace packages first
  console.log('\n🔨 Building workspace packages...');
  execSync('pnpm --filter @dewa/shared-types run build', { 
    stdio: 'inherit'
  });
  
  execSync('pnpm --filter @dewa/solana-utils run build', { 
    stdio: 'inherit'
  });

  // Step 3: Build frontend
  console.log('\n🏗️ Building frontend...');
  execSync('pnpm --filter @dewa/frontend run build', { 
    stdio: 'inherit'
  });

  console.log('\n✅ Build completed successfully!');
} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  if (error.stdout) console.error(error.stdout.toString());
  if (error.stderr) console.error(error.stderr.toString());
  process.exit(1);
}
