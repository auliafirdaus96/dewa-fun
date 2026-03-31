#!/usr/bin/env node

/**
 * Custom Vercel Build Script for Monorepo
 * This script handles building the frontend in a monorepo context
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting custom build for Dewa.fun frontend...');

try {
  // Get the root directory from environment or default
  const rootDir = process.env.INIT_CWD || process.cwd();
  const frontendDir = path.join(rootDir, 'apps/frontend');
  
  console.log('📁 Root directory:', rootDir);
  console.log('📁 Frontend directory:', frontendDir);

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
