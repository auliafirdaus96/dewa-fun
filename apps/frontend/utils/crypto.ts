import crypto from 'crypto';

/**
 * Utilitas Kriptografi untuk dewa.fun (BYOK Security)
 * Menggunakan AES-256-GCM untuk Enkripsi Authenticated.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Panjang standar untuk GCM
const AUTH_TAG_LENGTH = 16;

// Master Key (Harus disimpan di .env secara aman)
// SECURITY: Gunakan server-only env var (tanpa NEXT_PUBLIC_ prefix)
// File ini HANYA boleh di-import dari Server Components atau API Routes
const _key = process.env.ENCRYPTION_KEY;
if (!_key) {
  throw new Error(
    '[FATAL] ENCRYPTION_KEY is required. This module must only be used server-side.'
  );
}
if (_key.length < 32) {
  throw new Error('[FATAL] ENCRYPTION_KEY must be at least 32 characters.');
}
const MASTER_KEY: string = _key;

/**
 * Mengenkripsi teks biasa menjadi format: iv:authTag:encryptedText
 */
export function encrypt(text: string): string {
  if (!text) return '';
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(MASTER_KEY.slice(0, 32)), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Format: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Mendekripsi format iv:authTag:encryptedText kembali ke teks biasa
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) return '';
  
  try {
    const [ivHex, authTagHex, encryptedTextHex] = encryptedData.split(':');
    
    if (!ivHex || !authTagHex || !encryptedTextHex) {
      throw new Error('Invalid encrypted format');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(MASTER_KEY.slice(0, 32)), iv);
    
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedTextHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    return 'DECRYPTION_ERROR';
  }
}

/**
 * Helper untuk menyamarkan API Key (Masking)
 */
export function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '••••••••';
  return `${key.slice(0, 4)}••••••••${key.slice(-4)}`;
}
