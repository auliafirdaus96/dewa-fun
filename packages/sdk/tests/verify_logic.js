const crypto = require('crypto');

/**
 * Fungsi ini mereplikasi logika verifyFairness pada SDK
 * namun menggunakan modul crypto bawaan Node.js
 */
function verifyFairnessLogic(serverSeed, clientSeed, nonce) {
  const hmacSource = `${clientSeed}:${nonce}`;
  
  // Backend menggunakan crypto.createHmac('sha512', serverSeed)
  const hmac = crypto.createHmac('sha512', serverSeed)
    .update(hmacSource)
    .digest('hex');
    
  // Ambil 5 karakter pertama (20 bit), modulo 10000, bagi 100
  const roll = (parseInt(hmac.substring(0, 5), 16) % 10000) / 100;
  
  return { hmac, roll };
}

console.log('--- 🛡️ Verifikasi Logika Provably Fair SDK (Node Crypto) ---');

// Test Case 1
const serverSeed = 'd4c3b2a1d4c3b2a1d4c3b2a1d4c3b2a1d4c3b2a1d4c3b2a1d4c3b2a1d4c3b2a1';
const clientSeed = 'dewa_client_seed_123';
const nonce = 1;

const result = verifyFairnessLogic(serverSeed, clientSeed, nonce);

console.log('\nInput:');
console.log(` - Server Seed: ${serverSeed}`);
console.log(` - Client Seed: ${clientSeed}`);
console.log(` - Nonce:       ${nonce}`);

console.log('\nOutput:');
console.log(` - HMAC SHA512 (full): ${result.hmac}`);
console.log(` - HMAC SHA512 (first 5 chars): ${result.hmac.substring(0, 5)}`);
console.log(` - Calculated Roll:            ${result.roll}`);

// Test Case 2 (Variasi Nonce)
const result2 = verifyFairnessLogic(serverSeed, clientSeed, 2);
console.log(`\nNext Roll (Nonce 2): ${result2.roll}`);

console.log(`\nStatus: ${result.roll >= 0 && result.roll < 100 ? '✅ VALID (Range Match)' : '❌ INVALID'}`);
