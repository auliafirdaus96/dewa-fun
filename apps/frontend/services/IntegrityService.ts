
import { prisma as db } from '@/lib/prisma'
import { rng } from '@/services/RngService'
import { logger } from '@/services/LoggerService'
import * as Sentry from "@sentry/nextjs"

export class IntegrityService {

  /**
   * Performs a financial audit for a specific vault.
   * Compares the theoretical balance (Logic) vs Actual Balance (State).
   */
  async performVaultAudit(mint: string) {
    const vault = await db.vault.findUnique({ where: { mint } })
    if (!vault) throw new Error('Vault not found')

    // 1. Calculate theoretical balance change from ALL settled bets
    // Use aggregation to avoid loading millions of bets into memory
    const aggregation = await db.bet.aggregate({
      where: { 
        vaultId: vault.id,
        status: { in: ['WIN', 'LOSE'] }
      },
      _sum: {
        amount: true,
        payout: true,
        creatorFee: true,
        treasuryFee: true,
        affiliateFee: true,
      },
      _count: {
        id: true
      }
    })

    const totalWagered = parseFloat(String(aggregation._sum.amount || 0))
    const totalPayouts = parseFloat(String(aggregation._sum.payout || 0))
    const totalFees    = parseFloat(String(aggregation._sum.creatorFee || 0)) + 
                        parseFloat(String(aggregation._sum.treasuryFee || 0)) + 
                        parseFloat(String(aggregation._sum.affiliateFee || 0))
    const totalBetsCount = aggregation._count.id

    // Theoretical Change = Wagered In - Payouts Out - Fees Out
    const theoreticalChange = totalWagered - totalPayouts - totalFees
    
    // Actual Change = Current - Initial
    const initial = parseFloat(String(vault.initialDeposit))
    const current = parseFloat(String(vault.currentBalance))
    const actualChange = current - initial

    // Calculate Drift
    const drift = Math.abs(actualChange - theoreticalChange)
    
    // Integrity Threshold (e.g. 0.000001 for rounding errors)
    const THRESHOLD = 0.00001
    const isIntegral = drift < THRESHOLD

    if (!isIntegral) {
      logger.error('INTEGRITY_DRIFT_DETECTED', 'IntegrityService', {
        mint,
        theoreticalChange,
        actualChange,
        drift,
        totalBets: totalBetsCount
      })
      Sentry.captureException(new Error('INTEGRITY_DRIFT_DETECTED'), { extra: { mint, drift } })
    } else {
      logger.info('Vault integrity verified', 'IntegrityService', { 
        mint, 
        drift, 
        totalBets: totalBetsCount 
      })
    }

    return {
      mint,
      isIntegral,
      drift,
      stats: { totalWagered, totalPayouts, totalFees },
      timestamp: new Date()
    }
  }

  /**
   * Verifies the cryptographic chain of a session to ensure no DBA/Manual tampering.
   */
  async verifyProvablyFairChain(sessionId: string) {
    const session = await db.diceSession.findUnique({
      where: { id: sessionId },
      include: { bets: { orderBy: { nonce: 'asc' } } }
    })
    
    if (!session || !session.serverSeed) throw new Error('Session or seeds missing')

    const mismatches = []

    for (const bet of session.bets) {
      // Re-calculate the roll using the original seeds and nonce
      const { roll, hmac } = rng.roll(session.serverSeed, session.clientSeed, bet.nonce)
      
      const rollMatch = Math.abs(roll - parseFloat(String(bet.roll))) < 0.01
      const hmacMatch = hmac === bet.hmac

      if (!rollMatch || !hmacMatch) {
        mismatches.push({
          nonce: bet.nonce,
          expectedRoll: roll,
          actualRoll: bet.roll,
          expectedHmac: hmac,
          actualHmac: bet.hmac
        })
      }
    }

    if (mismatches.length > 0) {
      logger.error('PROVABLY_FAIR_TAMPERING_DETECTED', 'IntegrityService', {
        sessionId,
        mismatches: mismatches.length
      })
      Sentry.captureException(new Error('PROVABLY_FAIR_TAMPERING_DETECTED'), { extra: { sessionId } })
    } else {
      logger.info('Provably Fair chain verified', 'IntegrityService', {
        sessionId,
        betsChecked: session.bets.length
      })
    }

    return {
      sessionId,
      isValid: mismatches.length === 0,
      mismatches,
      betsChecked: session.bets.length
    }
  }
}

export const integrityService = new IntegrityService()
