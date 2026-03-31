/**
 * scripts/startAll.ts
 * Orchestrator to start multiple Dewa.fun TS services concurrently.
 * Translated from start_all.py
 */

import { spawn } from 'child_process';

function startService(name: string, command: string) {
  console.log(`Starting ${name}...`);
  // Note: we use pnpm to execute the scripts defined in package.json
  const child = spawn(command, { shell: true, stdio: 'inherit' });
  
  child.on('error', (err) => {
    console.error(`Failed to start ${name}: ${err.message}`);
  });
  
  return child;
}

console.log('=== Dewa AI Multi-Service Orchestrator (Node.js) ===');

const services = [
  { name: 'API Server', cmd: 'pnpm run dev' },
  { name: 'Autonomous Worker', cmd: 'pnpm run dev:worker' }
  // To enable telegram listening independently you can configure its startup in index.ts or another worker script
];

const processes: any[] = [];

services.forEach((s) => {
  processes.push(startService(s.name, s.cmd));
});

console.log('\\nAll services are starting. Press Ctrl+C to stop all.');

process.on('SIGINT', () => {
  console.log('\\nStopping all services...');
  processes.forEach((p) => p.kill('SIGINT'));
  console.log('Done.');
  process.exit(0);
});
