/**
 * e2eTest.ts
 * Dewa Launchpad End-to-End Test Orchestrator
 * Translated from Python e2e_test.py to fetch API
 */

async function testEndpoint(name: string, method: string, url: string, kwargs: Record<string, any> = {}) {
  console.log(`Testing ${name} (${method} ${url})...`);
  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (method === 'POST' || method === 'PUT') {
      options.body = JSON.stringify(kwargs.json || kwargs.params || {});
    } else if (kwargs.params) {
      const qs = new URLSearchParams(kwargs.params).toString();
      url += `?${qs}`;
    }

    const response = await fetch(url, options);
    const text = await response.text();

    if (response.ok) {
      console.log(`[SUCCESS] (${response.status})`);
      console.log(`   Response: ${text.substring(0, 200)}...\n`);
      return true;
    } else {
      console.log(`[FAILED] (${response.status})`);
      console.log(`   Response: ${text}\n`);
      return false;
    }
  } catch (err: any) {
    console.log(`[FAILED] to connect: ${err.message}\n`);
    return false;
  }
}

async function main() {
  console.log('=== DEWA LAUNCHPAD E2E TEST ===\n');

  await testEndpoint('Node.js Backend Health', 'GET', 'http://localhost:8000/health');

  await testEndpoint('Node.js Backend Run Agent', 'POST', 'http://localhost:8000/run-agent', {
    json: {
      node_id: 'test_e2e_node',
      persona: 'You are a witty test node.',
      message: 'Say hello world!',
    },
  });

  await testEndpoint('Next.js Dashboard API', 'GET', 'http://localhost:3000/api/agent/dashboard', {
    params: { nodeId: 'test_node' },
  });

  await testEndpoint('Dice Verify', 'POST', 'http://localhost:3000/api/dice/verify', {
    json: {
      serverSeed: 'test_seed',
      clientSeed: 'test_client',
      nonce: 0,
      betId: 'test_bet',
    },
  });

  console.log('=== TEST COMPLETE ===');
}

main().catch(console.error);
