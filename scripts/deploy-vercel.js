#!/usr/bin/env node

/**
 * Vercel Deployment Helper Script
 * Automates the deployment process to Vercel
 * 
 * Usage: 
 *   node scripts/deploy-vercel.js          # Deploy to preview
 *   node scripts/deploy-vercel.js --prod   # Deploy to production
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Dewa.fun Vercel Deployment Helper\n');

// Check if --prod flag is passed
const isProduction = process.argv.includes('--prod') || process.argv.includes('-p');

try {
  // Step 1: Verify Vercel login
  console.log('📝 Checking Vercel login status...');
  try {
    execSync('vercel whoami', { stdio: 'pipe' });
    console.log('✅ Logged in to Vercel\n');
  } catch (error) {
    console.log('❌ Not logged in. Please login first:');
    console.log('   vercel login\n');
    process.exit(1);
  }

  // Step 2: Check Git status
  console.log('📊 Checking Git status...');
  const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
  
  if (gitStatus.trim()) {
    console.log('⚠️  You have uncommitted changes:\n');
    console.log(gitStatus);
    console.log('Recommendation: Commit and push changes before deploying.\n');
    
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readline.question('Continue anyway? (y/N): ', (answer) => {
      readline.close();
      if (answer.toLowerCase() !== 'y') {
        console.log('Deployment cancelled.');
        process.exit(0);
      }
      proceedToDeploy();
    });
  } else {
    console.log('✅ Git working tree clean\n');
    proceedToDeploy();
  }

  function proceedToDeploy() {
    // Step 3: Link project (if not already linked)
    console.log('🔗 Checking project link...');
    try {
      execSync('vercel link --list', { stdio: 'pipe' });
      console.log('✅ Project linked\n');
    } catch (error) {
      console.log('⚠️  Project not linked. Linking now...\n');
      execSync('vercel link', { stdio: 'inherit' });
    }

    // Step 4: Deploy
    console.log(`🚀 Deploying to Vercel ${isProduction ? '(Production)' : '(Preview)'}...\n`);
    
    const deployCommand = isProduction ? 'vercel --prod' : 'vercel';
    execSync(deployCommand, { stdio: 'inherit' });

    console.log('\n✅ Deployment complete!');
    console.log('\n💡 Next steps:');
    console.log('   - Check your deployment at https://vercel.com/dashboard');
    console.log('   - View logs: vercel logs <deployment-url>');
    console.log('   - Open in browser: vercel open\n');
  }

} catch (error) {
  console.error('\n❌ Deployment failed:', error.message);
  if (error.stdout) console.error(error.stdout.toString());
  if (error.stderr) console.error(error.stderr.toString());
  process.exit(1);
}
