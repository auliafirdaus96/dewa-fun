
import { prisma }  from '@/lib/prisma'
import { rng }     from '@/services/RngService'
import { vaultService } from '@/services/VaultService'
import { logger } from './LoggerService'
import * as Sentry from "@sentry/nextjs"
import { PublicKey } from '@solana/web3.js'
import { anchorTxBuilder } from './AnchorTxBuilder'

// Type definitions
type BetMode = 'MANUAL' | 'AUTO' | 'FLASH'

// House Edge Distribution Constants (basis points)
const CREATOR_SHARE_BPS   = 2500 // 25%
const AGENT_SHARE_BPS     = 2500 // 25%
const TREASURY_SHARE_BPS  = 3000 // 30%
const AFFILIATE_SHARE_BPS = 2000 // 20%

const MAX_BET_RATIO  = 0.01
const PAUSE_RATIO    = 0.02
const FLASH_MAX      = 1000
const AUTO_MAX       = 1000

export class DiceService {

  async getVaultPublicInfo(mint: string) {
    // 🔒 SECURITY: Return only obfuscated data safe for public display
    const publicInfo = await vaultService.getPublicInfo(mint)
    
    if (!publicInfo) {
      throw Object.assign(new Error('Vault not found'), { code: 'VAULT_NOT_FOUND' })
    }
    
    // Additional sanitization - ensure no sensitive data leaks
    return {
      mint: publicInfo.mint,
      isPaused: publicInfo.isPaused,
      maxBetDisplay: publicInfo.maxBetDisplay, // "Dynamic" instead of exact number
      minBet: publicInfo.minBet,
      houseEdge: publicInfo.houseEdge,
      winChanceRange: publicInfo.winChanceRange,
      exists: publicInfo.exists,
      // ✅ Explicitly exclude: currentBalance, initialDeposit, totalWagered
    }
  }
  
  private async validateBetInternal(mint: string, amount: number) {
    // 🔒 SECURITY: Internal validation with generic errors
    const validation = await vaultService.validateBetAmount(mint, amount)
    
    if (!validation.valid) {
      // Generic error - don't reveal vault state or limits
      throw Object.assign(new Error('Bet amount not allowed'), { 
        code: 'BET_INVALID',
        // Don't include maxBet in error - would reveal vault size
      })
    }
    
    return true
  }

  private async getAndValidateVault(mint: string, amount: number, threshold: number) {
    const vault = await prisma.vault.findUnique({ where: { mint } })
    if (!vault)       throw Object.assign(new Error('Vault not found'),      { code: 'VAULT_NOT_FOUND' })
    if (vault.isPaused) throw Object.assign(new Error('Vault is paused'),    { code: 'VAULT_PAUSED' })
    if (threshold < 2 || threshold > 97) throw Object.assign(new Error('Invalid threshold'), { code: 'INVALID_THRESHOLD' })
    const maxBet = parseFloat(String(vault.currentBalance)) * MAX_BET_RATIO
    if (amount > maxBet) throw Object.assign(new Error(`Max bet: ${maxBet.toFixed(6)}`), { code: 'BET_EXCEEDS_LIMIT', maxBet })
    if (amount <= 0)     throw Object.assign(new Error('Invalid amount'),    { code: 'INVALID_AMOUNT' })
    
    logger.info('Vault validated for bet', 'DiceService', { mint, amount });
    return vault
  }

  private async checkAndPauseVault(vault: any) {
    const balance     = parseFloat(String(vault.currentBalance))
    const pauseAt     = parseFloat(String(vault.initialDeposit)) * PAUSE_RATIO
    if (balance <= pauseAt) {
      await prisma.vault.update({
        where: { mint: vault.mint },
        data:  { isPaused: true, pausedAt: new Date() },
      })
      await vaultService.notifyVaultPaused(vault.creatorId, vault.mint, balance.toFixed(6))
      logger.warn('Vault auto-paused due to low balance', 'DiceService', { mint: vault.mint, balance });
      return true
    }
    return false
  }

  // ── MANUAL ─────────────────────────────────
  async prepareManualBet(input: {
    walletAddress: string; mint: string
    amount: number; direction: 'UNDER' | 'OVER'; threshold: number
  }) {
    const vault = await this.getAndValidateVault(input.mint, input.amount, input.threshold)
    const user  = await prisma.user.upsert({
      where: { walletAddress: input.walletAddress },
      update: {}, create: { walletAddress: input.walletAddress },
    })

    const wc   = rng.winChance(input.direction, input.threshold)
    const mult = rng.multiplier(wc)
    const pp   = input.amount * mult

    const session = await this.getOrCreateSession(user.id, vault.id, input.mint, 'MANUAL')
    const bet = await prisma.bet.create({
      data: {
        userId: user.id, sessionId: session.id,
        vaultId: vault.id, mint: input.mint,
        amount: input.amount, direction: input.direction,
        threshold: input.threshold, winChance: wc, multiplier: mult,
        potentialPayout: pp, serverSeedHash: session.serverSeedHash,
        clientSeed: session.clientSeed, nonce: session.nonce,
        mode: 'MANUAL', status: 'PENDING_VRF',
      },
    })

    await prisma.diceSession.update({ where: { id: session.id }, data: { nonce: { increment: 1 } } })

    const txBase64 = await anchorTxBuilder.buildPlaceBetTx({
      playerWallet: new PublicKey(input.walletAddress),
      mint: new PublicKey(input.mint),
      amount: input.amount,
      targetNumber: input.threshold,
      isUnder: input.direction === 'UNDER',
    })

    return {
      betId: bet.id, maxBet: parseFloat(String(vault.currentBalance)) * MAX_BET_RATIO,
      winChance: wc * 100, multiplier: mult, potentialPayout: pp,
      txBase64,
    }
  }

  async getManualBetResult(betId: string) {
    const bet = await prisma.bet.findUnique({ where: { id: betId } })
    if (!bet) throw new Error('BET_NOT_FOUND')
    if (bet.status === 'PENDING_VRF') return { status: 'PENDING_VRF' as const }

    const f = rng.fees(parseFloat(String(bet.amount)))
    return {
      status: bet.status as 'WIN' | 'LOSE' | 'REFUNDED',
      result: {
        betId: bet.id, mint: bet.mint,
        roll: bet.roll, won: bet.won,
        amount: parseFloat(String(bet.amount)),
        payout: parseFloat(String(bet.payout)),
        profit: parseFloat(String(bet.payout)) - parseFloat(String(bet.amount)),
        multiplier: parseFloat(String(bet.multiplier)),
        winChance: parseFloat(String(bet.winChance)) * 100,
        fees: { creator: f.creator, treasury: f.treasury, affiliate: f.affiliate },
        txSignature: bet.txSignature,
      },
    }
  }

  // ── AUTO ───────────────────────────────────
  async startAutoSession(walletAddress: string, mint: string, clientSeed?: string) {
    const vault = await prisma.vault.findUnique({ where: { mint } })
    if (!vault || vault.isPaused) throw new Error('VAULT_PAUSED')

    const user = await prisma.user.upsert({
      where: { walletAddress }, update: {}, create: { walletAddress },
    })

    const serverSeed = rng.generateServerSeed()
    const cs         = clientSeed || rng.generateClientSeed()

    const session = await prisma.diceSession.create({
      data: {
        userId: user.id, vaultId: vault.id, mint,
        serverSeed, serverSeedHash: rng.hashSeed(serverSeed),
        clientSeed: cs, nonce: 0, mode: 'AUTO',
      },
    })

    const approvalTxBase64 = await anchorTxBuilder.buildApprovalTx({
      playerWallet: new PublicKey(walletAddress),
      mint: new PublicKey(mint),
      maxAmount: parseFloat(String(vault.currentBalance)) * MAX_BET_RATIO * AUTO_MAX,
    })

    return {
      sessionId: session.id, serverSeedHash: session.serverSeedHash,
      clientSeed: cs, nonce: 0,
      approvalTxBase64,
    }
  }

  async runAutoBet(
    sessionId: string,
    config: any,
    onProgress?: (p: { bet: number; wins: number; profit: number }) => void,
  ) {
    const session = await prisma.diceSession.findUnique({
      where: { id: sessionId }, include: { vault: true },
    })
    if (!session || session.status !== 'ACTIVE') throw new Error('SESSION_INVALID')
    if (session.vault.isPaused) throw new Error('VAULT_PAUSED')

    const target   = Math.min(config.numberOfBets || AUTO_MAX, AUTO_MAX)
    let curBet     = config.baseBet
    let nonce      = session.nonce
    let netProfit  = 0, totalW = 0, totalP = 0, wins = 0, losses = 0
    const fees     = { creator: 0, treasury: 0, affiliate: 0 }
    const dbBets:  any[] = []

    // 🔒 SECURITY: Get vault balance for max win validation
    const vaultBalance = parseFloat(String(session.vault.currentBalance))
    const maxWinPerBet = vaultBalance * 0.01 // 1% max win rule

    for (let i = 0; i < target; i++) {
      if (config.stopOnProfit && netProfit >= config.stopOnProfit) break
      if (config.stopOnLoss   && netProfit <= -config.stopOnLoss)  break
      if (config.maxBet       && curBet > config.maxBet)           break

      const wc   = rng.winChance(config.direction, config.threshold)
      const mult = rng.multiplier(wc)
      
      // 🔒 CRITICAL FIX: Validate max win before each bet
      const potentialWin = curBet * (mult - 1) // Profit only
      if (potentialWin > maxWinPerBet) {
        logger.warn('Auto bet exceeded max win limit', 'DiceService', { 
          bet: i + 1, 
          potentialWin, 
          maxAllowed: maxWinPerBet,
          curBet,
          mult
        });
        // Stop auto mode gracefully
        break
      }
      
      const { roll, hmac } = rng.roll(session.serverSeed, session.clientSeed, nonce)
      const won  = rng.determineWin(roll, config.direction, config.threshold)
      const pay  = won ? curBet * mult : 0
      const f    = rng.fees(curBet)
      const prof = pay - curBet

      netProfit += prof; totalW += curBet; totalP += pay
      fees.creator += f.creator; fees.treasury += f.treasury; fees.affiliate += f.affiliate
      won ? wins++ : losses++

      dbBets.push({
        userId: session.userId, sessionId, vaultId: session.vaultId, mint: session.mint,
        amount: curBet, direction: config.direction, threshold: config.threshold,
        winChance: wc, multiplier: mult, potentialPayout: curBet * mult,
        serverSeedHash: session.serverSeedHash, clientSeed: session.clientSeed, nonce, hmac,
        roll, won, payout: pay, mode: 'AUTO', status: won ? 'WIN' : 'LOSE',
        creatorFee: f.creator, treasuryFee: f.treasury, affiliateFee: f.affiliate,
      })
      nonce++

      onProgress?.({ bet: i + 1, wins, profit: netProfit })
      curBet = this.applyStrategy(config, curBet, won)
    }

    try {
      await prisma.$transaction([
        prisma.bet.createMany({ data: dbBets }),
        prisma.diceSession.update({
          where: { id: sessionId },
          data: { nonce, status: 'SETTLED', totalWagered: { increment: totalW }, totalPayout: { increment: totalP } },
        }),
        prisma.vault.update({
          where: { id: session.vaultId },
          data: {
            currentBalance:     { increment: totalW - totalP - fees.creator - fees.treasury - fees.affiliate },
            totalWagered:       { increment: totalW },
            totalPaidOut:       { increment: totalP },
            totalCreatorFees:   { increment: fees.creator },
            totalTreasuryFees:  { increment: fees.treasury },
            totalAffiliateFees: { increment: fees.affiliate },
          },
        }),
      ])
    } catch (error) {
      Sentry.captureException(error, { extra: { sessionId } })
      throw error
    }

    logger.info('Auto session settled', 'DiceService', { sessionId, bets: dbBets.length, netProfit });
    await this.checkAndPauseVault(session.vault)

    return {
      sessionId, mode: 'AUTO', totalBets: dbBets.length,
      totalWins: wins, totalLosses: losses,
      totalWagered: totalW, totalPayout: totalP, netProfit, fees,
    }
  }

  // ── FLASH ──────────────────────────────────
  async runFlashBet(walletAddress: string, mint: string, config: any, clientSeed?: string) {
    const vault = await prisma.vault.findUnique({ where: { mint } })
    if (!vault || vault.isPaused) throw new Error('VAULT_PAUSED')

    const user = await prisma.user.upsert({
      where: { walletAddress }, update: {}, create: { walletAddress },
    })

    const serverSeed = rng.generateServerSeed()
    const cs         = clientSeed || rng.generateClientSeed()
    const target     = Math.min(config.totalBets, FLASH_MAX)

    const session = await prisma.diceSession.create({
      data: {
        userId: user.id, vaultId: vault.id, mint,
        serverSeed, serverSeedHash: rng.hashSeed(serverSeed),
        clientSeed: cs, nonce: 0, mode: 'FLASH',
      },
    })

    let netProfit = 0, totalW = 0, totalP = 0, wins = 0, losses = 0
    const fees    = { creator: 0, treasury: 0, affiliate: 0 }
    const dbBets: any[] = []
    const results: any[] = []

    // 🔒 SECURITY: Get vault balance once at start for validation
    const vaultBalance = parseFloat(String(vault.currentBalance))
    const maxWinPerBet = vaultBalance * 0.01 // 1% max win rule

    for (let i = 0; i < target; i++) {
      if (config.stopOnProfit && netProfit >= config.stopOnProfit) break
      if (config.stopOnLoss   && netProfit <= -config.stopOnLoss)  break

      const wc   = rng.winChance(config.direction, config.threshold)
      const mult = rng.multiplier(wc)
      
      // 🔒 CRITICAL FIX: Validate max win per bet BEFORE calculating result
      const potentialWin = config.baseBet * (mult - 1) // Profit only
      if (potentialWin > maxWinPerBet) {
        logger.warn('Flash bet exceeded max win limit', 'DiceService', { 
          bet: i + 1, 
          potentialWin, 
          maxAllowed: maxWinPerBet 
        });
        // Stop flash mode gracefully - don't reveal why
        break
      }
      
      const { roll, hmac } = rng.roll(serverSeed, cs, i)
      const won  = rng.determineWin(roll, config.direction, config.threshold)
      const pay  = won ? config.baseBet * mult : 0
      const f    = rng.fees(config.baseBet)
      const prof = pay - config.baseBet

      netProfit += prof; totalW += config.baseBet; totalP += pay
      fees.creator += f.creator; fees.treasury += f.treasury; fees.affiliate += f.affiliate
      won ? wins++ : losses++

      results.push({ nonce: i, roll, won, amount: config.baseBet, payout: pay, proof: {
        serverSeedHash: rng.hashSeed(serverSeed), clientSeed: cs, nonce: i, hmac,
      }})
      dbBets.push({
        userId: user.id, sessionId: session.id, vaultId: vault.id, mint,
        amount: config.baseBet, direction: config.direction, threshold: config.threshold,
        winChance: wc, multiplier: mult, potentialPayout: config.baseBet * mult,
        serverSeedHash: rng.hashSeed(serverSeed), clientSeed: cs, nonce: i, hmac,
        roll, won, payout: pay, mode: 'FLASH', status: won ? 'WIN' : 'LOSE',
        creatorFee: f.creator, treasuryFee: f.treasury, affiliateFee: f.affiliate,
      })
    }

    await prisma.$transaction([
      prisma.bet.createMany({ data: dbBets }),
      prisma.diceSession.update({
        where: { id: session.id },
        data: { 
          nonce: dbBets.length, 
          status: 'PENDING_SETTLEMENT', // SECURITY: Wait for on-chain tx
          totalWagered: totalW, 
          totalPayout: totalP 
        },
      }),
      // WE DO NOT UPDATE VAULT BALANCE HERE ANYMORE.
      // Balance is only updated in confirmSettlement() after on-chain TX.
    ])

    logger.info('Flash session results generated', 'DiceService', { sessionId: session.id, bets: dbBets.length, netProfit });
    // await this.checkAndPauseVault(vault) // Move to confirmation

    return {
      sessionId: session.id, mode: 'FLASH',
      totalBets: dbBets.length, totalWins: wins, totalLosses: losses,
      totalWagered: totalW, totalPayout: totalP, netProfit, fees,
      bets: results,
    }
  }

  async buildSettleTx(sessionId: string) {
    const session = await prisma.diceSession.findUnique({
      where: { id: sessionId },
      include: { vault: true }
    })
    if (!session || session.status !== 'PENDING_SETTLEMENT') throw new Error('SESSION_NOT_READY_FOR_SETTLEMENT')

    const txBase64 = await anchorTxBuilder.buildSettleTx({
      operatorWallet: new PublicKey(process.env.NEXT_PUBLIC_OPERATOR_WALLET || '11111111111111111111111111111111'),
      mint: new PublicKey(session.mint),
      amountWagered: parseFloat(String(session.totalWagered)),
      amountPayout: parseFloat(String(session.totalPayout)),
      feesCreator: 0,
      feesTreasury: 0,
      feesPartner: 0,
    })

    return { 
      txBase64, 
      sessionId,
      details: {
        wagered: session.totalWagered,
        payout:  session.totalPayout,
        mint:    session.mint
      }
    }
  }

  async confirmSettlement(sessionId: string, txSignature: string) {
    const session = await prisma.diceSession.findUnique({
      where: { id: sessionId },
      include: { vault: true }
    })
    if (!session || session.status !== 'PENDING_SETTLEMENT') throw new Error('INVALID_SESSION_STATUS')

    const totalW = parseFloat(String(session.totalWagered))
    const totalP = parseFloat(String(session.totalPayout))
    const f      = rng.fees(totalW) // Re-calculate fees for aggregation

    await prisma.$transaction([
      prisma.diceSession.update({
        where: { id: sessionId },
        data: { status: 'SETTLED', settleTx: txSignature }
      }),
      prisma.vault.update({
        where: { id: session.vaultId },
        data: {
          currentBalance:     { increment: totalW - totalP - f.creator - f.treasury - f.affiliate },
          totalWagered:       { increment: totalW },
          totalPaidOut:       { increment: totalP },
          totalCreatorFees:   { increment: f.creator },
          totalTreasuryFees:  { increment: f.treasury },
          totalAffiliateFees: { increment: f.affiliate },
        }
      })
    ])

    logger.info('Flash settlement confirmed', 'DiceService', { sessionId, txSignature });
    await this.checkAndPauseVault(session.vault)
    return { success: true }
  }

  async rotateSeed(sessionId: string) {
    const session = await prisma.diceSession.findUnique({ where: { id: sessionId } })
    if (!session) throw new Error('SESSION_NOT_FOUND')

    await prisma.diceSession.update({ where: { id: sessionId }, data: { status: 'ROTATED' } })

    const newSS = rng.generateServerSeed()
    const newCS = rng.generateClientSeed()
    const next  = await prisma.diceSession.create({
      data: {
        userId: session.userId, vaultId: session.vaultId, mint: session.mint,
        serverSeed: newSS, serverSeedHash: rng.hashSeed(newSS),
        clientSeed: newCS, nonce: 0, mode: session.mode,
        status: 'ACTIVE',
      },
    })

    return {
      previous: { serverSeed: session.serverSeed, serverSeedHash: session.serverSeedHash, clientSeed: session.clientSeed, totalBets: session.nonce },
      next:     { sessionId: next.id, serverSeedHash: next.serverSeedHash, clientSeed: next.clientSeed },
    }
  }

  async getBetHistory(userId: string, mint?: string, page = 1, limit = 20) {
    const where: any = { userId }
    if (mint) where.mint = mint

    const [bets, total] = await prisma.$transaction([
      prisma.bet.findMany({
        where, orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit, take: limit,
        select: {
          id: true, amount: true, direction: true, threshold: true,
          winChance: true, multiplier: true, roll: true, won: true,
          payout: true, mode: true, serverSeedHash: true, clientSeed: true,
          nonce: true, createdAt: true, mint: true,
        },
      }),
      prisma.bet.count({ where }),
    ])

    return { bets, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  async getUserStats(userId: string, mint?: string) {
    const where: any = { userId }
    if (mint) where.mint = mint

    const [all, wins] = await prisma.$transaction([
      prisma.bet.aggregate({
        where,
        _sum:   { amount: true, payout: true },
        _count: { id: true },
        _max:   { payout: true },
      }),
      prisma.bet.count({ where: { ...where, won: true } }),
    ])

    const wagered = parseFloat(String(all._sum.amount || 0))
    const payout  = parseFloat(String(all._sum.payout || 0))

    return {
      totalBets:    all._count.id,
      totalWins:    wins,
      totalLosses:  all._count.id - wins,
      winRate:      all._count.id ? ((wins / all._count.id) * 100).toFixed(2) : '0',
      totalWagered: wagered.toFixed(6),
      totalPayout:  payout.toFixed(6),
      netProfit:    (payout - wagered).toFixed(6),
      biggestWin:   parseFloat(String(all._max.payout || 0)).toFixed(6),
    }
  }

  private applyStrategy(config: any, cur: number, won: boolean): number {
    const base = config.baseBet
    switch (config.strategy) {
      case 'FLAT':       return base
      case 'MARTINGALE': return won ? base : cur * 2
      case 'PAROLI':     return won ? cur * 2 : base
      case 'DALEMBERT':  return won ? Math.max(base, cur - base) : cur + base
      default:           return base
    }
  }

  // ── HOUSE EDGE DISTRIBUTION (25-25-30-20) ───────────────

  /**
   * Calculate house edge distribution for a bet
   * Creator (Level 2): 25%
   * Agent (Level 1): 25%
   * Dewa Protocol: 30%
   * Affiliate: 20%
   */
  private calculateHouseEdgeDistribution(houseEdgeAmount: number) {
    const creatorShare = (houseEdgeAmount * CREATOR_SHARE_BPS) / 10000;
    const agentShare = (houseEdgeAmount * AGENT_SHARE_BPS) / 10000;
    const treasuryShare = (houseEdgeAmount * TREASURY_SHARE_BPS) / 10000;
    const affiliateShare = (houseEdgeAmount * AFFILIATE_SHARE_BPS) / 10000;

    return {
      creatorShare,
      agentShare,
      treasuryShare,
      affiliateShare,
      totalDistributed: creatorShare + agentShare + treasuryShare + affiliateShare,
    };
  }

  /**
   * Track and update house edge earnings for all parties
   * Called after bet settlement
   */
  async trackHouseEdgeDistribution(bet: any) {
    try {
      const houseEdge = parseFloat(String(bet.amount)) * 0.01; // 1% house edge
      
      const distribution = this.calculateHouseEdgeDistribution(houseEdge);

      // Get vault to find creator and agent info
      const vault = await prisma.vault.findUnique({
        where: { id: bet.vaultId },
        include: {
          creator: true,
          agent: true,
        },
      });

      if (!vault) {
        logger.warn('Vault not found for house edge tracking', 'DiceService', { betId: bet.id });
        return;
      }

      // Update vault totals
      await prisma.vault.update({
        where: { id: bet.vaultId },
        data: {
          totalCreatorFees: { increment: distribution.creatorShare },
          totalAgentFees: { increment: distribution.agentShare },
          totalTreasuryFees: { increment: distribution.treasuryShare },
          totalAffiliateFees: { increment: distribution.affiliateShare },
        },
      });

      // Update creator lifetime earnings (Level 2)
      if (vault.creatorId) {
        await prisma.user.update({
          where: { id: vault.creatorId },
          data: {
            totalCreatorEarnings: { increment: distribution.creatorShare },
          },
        });
      }

      // Update agent lifetime earnings (Level 1 - Dewi platform)
      if (vault.agentId) {
        await prisma.user.update({
          where: { id: vault.agentId },
          data: {
            totalAgentEarnings: { increment: distribution.agentShare },
          },
        });
      }

      logger.info('House edge distributed', 'DiceService', {
        betId: bet.id,
        houseEdge,
        distribution,
        creatorId: vault.creatorId,
        agentId: vault.agentId,
      });

    } catch (error) {
      logger.error('Failed to track house edge distribution', 'DiceService', error);
      Sentry.captureException(error);
    }
  }

  // ── SESSION MANAGEMENT ─────────────────────────────────
  private async getOrCreateSession(userId: string, vaultId: string, mint: string, mode: BetMode) {
    const existing = await prisma.diceSession.findFirst({
      where: { userId, vaultId, status: 'ACTIVE', mode },
    })
    if (existing) return existing

    const ss = rng.generateServerSeed()
    return prisma.diceSession.create({
      data: {
        userId, vaultId, mint,
        serverSeed: ss, serverSeedHash: rng.hashSeed(ss),
        clientSeed: rng.generateClientSeed(),
        nonce: 0, mode, status: 'ACTIVE',
      },
    })
  }
}

export const diceService = new DiceService()
