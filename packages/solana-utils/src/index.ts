import { Connection, PublicKey } from '@solana/web3.js';

export const DEWA_TREASURY_WALLET = "DEWA6k7...v7P9";

export interface FeeShareConfig {
  claimersArray: string[];
  basisPointsArray: number[];
}

export type LaunchType = 'standard' | 'partner';

export function getFeeShareConfig(type: LaunchType, userWallet: string, partnerWallet?: string): FeeShareConfig {
  if (type === 'partner' && partnerWallet) {
    return {
      claimersArray: [DEWA_TREASURY_WALLET, partnerWallet],
      basisPointsArray: [2500, 7500],
    };
  }

  return {
    claimersArray: [DEWA_TREASURY_WALLET, userWallet],
    basisPointsArray: [5000, 5000],
  };
}

export async function createBagsLaunchTransaction(payload: any) {
  // Placeholder for real bags.fm integration
  return {
    success: true,
    transaction: "MockSolanaTransactionData",
    tokenAddress: "7xKX...3b9P"
  };
}

// Security Utils (moved from root utils/crypto.ts)
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

export function encrypt(text: string, masterKey: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(masterKey.slice(0, 32)), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decrypt(encryptedData: string, masterKey: string): string {
  if (!encryptedData) return '';
  try {
    const [ivHex, authTagHex, encryptedTextHex] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(masterKey.slice(0, 32)), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedTextHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    return 'DECRYPTION_ERROR';
  }
}
