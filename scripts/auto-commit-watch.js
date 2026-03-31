#!/usr/bin/env node

/**
 * Auto-Save Git Commit Hook
 * Watches for file changes and automatically commits them
 * 
 * Usage: node scripts/auto-commit-watch.js
 */

const chokidar = require('chokidar');
const { execSync } = require('child_process');
const path = require('path');

// Files/directories to ignore
const IGNORE_PATTERNS = [
  /node_modules/,
  /\.next/,
  /\.turbo/,
  /\.git/,
  /\.env(\..+)?$/,
  /\.vscode/,
  /\.idea/,
  /dist/,
  /build/,
  /\.log$/,
  /\.tsbuildinfo$/
];

// Debounce time in milliseconds (commit after 2 seconds of no changes)
const DEBOUNCE_MS = 2000;

let changeTimeout = null;
let pendingFiles = new Set();

console.log('👀 Watching for file changes...\n');

// Watch all files in the project
const watcher = chokidar.watch('.', {
  ignored: (filePath) => {
    return IGNORE_PATTERNS.some(pattern => pattern.test(filePath));
  },
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 100,
    pollInterval: 100
  }
});

watcher
  .on('add', (filePath) => handleFileChange('added', filePath))
  .on('change', (filePath) => handleFileChange('modified', filePath))
  .on('unlink', (filePath) => handleFileChange('deleted', filePath))
  .on('error', (error) => console.error('Watcher error:', error));

function handleFileChange(action, filePath) {
  // Skip if in ignore list
  if (IGNORE_PATTERNS.some(pattern => pattern.test(filePath))) {
    return;
  }

  pendingFiles.add(filePath);
  
  // Clear existing timeout
  if (changeTimeout) {
    clearTimeout(changeTimeout);
  }

  // Set new timeout to commit after debounce period
  changeTimeout = () => {
    commitChanges();
  };
  
  changeTimeout = setTimeout(commitChanges, DEBOUNCE_MS);
}

function commitChanges() {
  if (pendingFiles.size === 0) {
    return;
  }

  const filesArray = Array.from(pendingFiles);
  const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const commitMessage = `Auto-save: ${filesArray.length} file(s) changed at ${timestamp}`;
  
  console.log(`\n📝 Committing ${filesArray.length} file(s)...`);
  console.log(`   Files: ${filesArray.slice(0, 5).join(', ')}${filesArray.length > 5 ? '...' : ''}`);

  try {
    // Stage all changes
    execSync('git add -A', { stdio: 'pipe' });
    
    // Check if there are changes to commit
    const statusResult = execSync('git status --porcelain', { encoding: 'utf8' });
    
    if (!statusResult.trim()) {
      console.log('✅ No changes to commit');
      pendingFiles.clear();
      return;
    }

    // Commit
    execSync(`git commit -m "${commitMessage}"`, { stdio: 'pipe' });
    console.log('✅ Committed successfully!');
    console.log('💡 Tip: Run "git push origin main" to sync with GitHub\n');
    
  } catch (error) {
    if (error.message.includes('nothing to commit')) {
      console.log('✅ No changes to commit');
    } else {
      console.error('❌ Commit failed:', error.message);
    }
  } finally {
    pendingFiles.clear();
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Stopping auto-commit watcher...');
  process.exit(0);
});

console.log('✨ Auto-commit is active! Press Ctrl+C to stop.\n');
