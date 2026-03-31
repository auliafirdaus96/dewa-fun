/**
 * core/encryption.ts
 * AES-256-GCM encryption/decryption for BYOK API keys.
 * Migrated from Python: src/utils/encryption.py (Fernet → AES-256-GCM)
 *
 * Python used Fernet (AES-128-CBC + HMAC). We upgrade to AES-256-GCM
 * using Node.js built-in `node:crypto` — no external dependencies needed.
 *
 * ⚠️  KMS_MASTER_KEY must be a 64-char hex string (32 bytes).
 *      Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;   // 96-bit IV recommended for GCM
const TAG_LENGTH = 16;  // 128-bit auth tag

function getMasterKey(): Buffer {
  const raw = process.env.KMS_MASTER_KEY;
  if (!raw || raw.length !== 64) {
    throw new Error(
      '[Encryption] KMS_MASTER_KEY must be a 64-character hex string (32 bytes). ' +
      'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  return Buffer.from(raw, 'hex');
}

/**
 * Encrypts a plaintext string (API key) using AES-256-GCM.
 * Returns a base64-encoded string: iv:authTag:ciphertext
 */
export function encryptKey(plainText: string): string {
  const key = getMasterKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Format: base64(iv) + ':' + base64(authTag) + ':' + base64(ciphertext)
  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

/**
 * Decrypts an AES-256-GCM encrypted string back to plaintext.
 * Expects format: base64(iv):base64(authTag):base64(ciphertext)
 */
export function decryptKey(encryptedText: string): string {
  const key = getMasterKey();
  const parts = encryptedText.split(':');

  if (parts.length !== 3) {
    throw new Error('[Encryption] Invalid encrypted format. Expected iv:authTag:ciphertext');
  }

  const [ivB64, authTagB64, encryptedB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const encryptedData = Buffer.from(encryptedB64, 'base64');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

/**
 * Safe decrypt — returns null on failure instead of throwing.
 * Use in non-critical paths where missing key should degrade gracefully.
 */
export function decryptKeySafe(encryptedText: string): string | null {
  try {
    return decryptKey(encryptedText);
  } catch {
    return null;
  }
}
