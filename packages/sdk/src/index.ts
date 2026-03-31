import axios from 'axios';
import CryptoJS from 'crypto-js';

export interface BetConfig {
  walletAddress: string;
  mint: string;
  amount: number;
  direction: 'UNDER' | 'OVER';
  threshold: number;
  clientSeed?: string;
}

export interface BetResult {
  betId: string;
  roll: number;
  won: boolean;
  payout: number;
  multiplier: number;
  winChance: number;
  proof: {
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
    hmac: string;
  };
}

export class DewaSDK {
  private baseUrl: string;
  private apiKey?: string;

  constructor(config: { baseUrl: string; apiKey?: string }) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
  }

  /**
   * Mengambil informasi publik tentang vault tertentu.
   */
  async getVaultInfo(mint: string) {
    const response = await axios.get(`${this.baseUrl}/api/vault/${mint}`);
    return response.data;
  }

  /**
   * Menempatkan taruhan manual melalui SDK.
   */
  async placeManualBet(config: BetConfig): Promise<BetResult> {
    const response = await axios.post(`${this.baseUrl}/api/dice/manual`, config, {
      headers: this.apiKey ? { 'X-API-KEY': this.apiKey } : {},
    });
    
    // Tunggu hasil VRF (simulasi atau polling jika perlu di level SDK)
    return response.data;
  }

  /**
   * Verifikasi hasil taruhan menggunakan Provably Fair logic.
   * Harus konsisten dengan RngService.ts di backend.
   */
  verifyFairness(
    serverSeed: string,
    clientSeed: string,
    nonce: number,
    actualRoll: number
  ): boolean {
    const hmacSource = `${clientSeed}:${nonce}`;
    // Menggunakan SHA512 agar konsisten dengan backend
    const hmac = CryptoJS.HmacSHA512(hmacSource, serverSeed).toString();
    
    // Ambil 5 karakter pertama, parse hex -> decimal, lalu modulo 10000 / 100
    // (Persis seperti logic di RngService.ts)
    const expectedRoll = (parseInt(hmac.substring(0, 5), 16) % 10000) / 100;
    
    // Gunakan toleransi kecil untuk floating point comparison
    return Math.abs(expectedRoll - actualRoll) < 0.0001;
  }
}
