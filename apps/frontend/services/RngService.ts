import crypto from 'crypto'
import { logger } from './LoggerService'

export const rng = {
  generateServerSeed: () => {
    const seed = crypto.randomBytes(32).toString('hex');
    logger.info('Server seed generated', 'RngService');
    return seed;
  },
  generateClientSeed: () => crypto.randomBytes(16).toString('hex'),

  hashSeed: (seed: string) => crypto.createHash('sha256').update(seed).digest('hex'),

  roll: (serverSeed: string, clientSeed: string, nonce: number) => {
    const hmac = crypto.createHmac('sha512', serverSeed)
      .update(`${clientSeed}:${nonce}`)
      .digest('hex')

    // Ambil 5 karakter pertama, parse hex -> decimal
    // (Bisa juga chunking, tapi ini paling simpel & umum)
    // Unbiased chunking: 4-byte chunks, reject if >= 4294960000 (nearest multiple of 10000 below 2^32)
    let roll = 0;
    for (let i = 0; i < hmac.length; i += 8) {
      const chunk = parseInt(hmac.slice(i, i + 8), 16);
      if (chunk < 4294960000) {
        roll = (chunk % 10000) / 100;
        break;
      }
      // Extremely unlikely fallback (if all chunks rejected)
      if (i + 8 >= hmac.length) {
        roll = (chunk % 10000) / 100;
      }
    }
    return { roll, hmac }
  },

  winChance: (dir: 'UNDER' | 'OVER', threshold: number) => {
    return dir === 'UNDER' ? threshold / 100 : (100 - threshold) / 100
  },

  multiplier: (winChance: number) => {
    // 1% House Edge
    return parseFloat(((1 / winChance) * 0.99).toFixed(4))
  },

  determineWin: (roll: number, dir: 'UNDER' | 'OVER', threshold: number) => {
    return dir === 'UNDER' ? roll < threshold : roll > threshold
  },

  fees: (amount: number) => {
    // House Edge 1% divided: 50% Creator, 30% Dewa, 20% Affiliate
    const totalEdge = amount * 0.01
    return {
      creator:   totalEdge * 0.50,
      treasury:  totalEdge * 0.30,
      affiliate: totalEdge * 0.20,
    }
  }
}
