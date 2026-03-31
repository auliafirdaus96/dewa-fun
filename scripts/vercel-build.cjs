#!/usr/bin/env node

/**
 * Custom Vercel Build Script for Monorepo
 * This script handles building the frontend in a monorepo context
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting custom build for Dewa.fun frontend...');

try {
  // Step 1: Install dependencies at root level
  console.log('📦 Installing dependencies...');
  execSync('pnpm install', { stdio: 'inherit', cwd: path.join(__dirname, '../..') });

  // Step 2: Build workspace packages first
  console.log('🔨 Building workspace packages...');
  execSync('pnpm --filter @dewa/shared-types run build', { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '../..')
  });
  
  execSync('pnpm --filter @dewa/solana-utils run build', { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '../..')
  });

  // Step 3: Build frontend
  console.log('🏗️ Building frontend...');
  execSync('pnpm run build', { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });

  console.log('✅ Build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
