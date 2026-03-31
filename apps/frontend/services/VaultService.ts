
import { prisma as db } from '@/lib/prisma'
import { emailService as es } from '@/services/EmailService'
import { logger } from './LoggerService'

export const vaultService = {

  async getPublicInfo(mint: string) {
    const vault = await db.vault.findUnique({ where: { mint } })
    if (!vault) return null
    
    // 🔒 SECURITY: OBFUSCATION LAYER
    // Never expose raw vault data to prevent player gaming
    const currentBalance = parseFloat(String(vault.currentBalance))
    const maxBet = vault.isPaused ? 0 : currentBalance * 0.01
    
    return {
      mint,
      isPaused:  vault.isPaused,
      // ✅ HIDDEN: Don't expose exact balance or maxBet formula
      maxBetDisplay: vault.isPaused ? "N/A" : "Dynamic",
      minBet: 0.001, // Fixed minimum
      houseEdge: "1%", // Public info OK
      winChanceRange: "2-98%", // Public info OK
      exists:    true,
      createdAt: vault.createdAt,
      
      // ❌ NEVER EXPOSE TO PLAYERS:
      // - currentBalance (would reveal vault size)
      // - initialDeposit (would let players calculate depletion)
      // - totalWagered (would show activity level)
      // - maxBet exact value (would reveal balance)
    }
  },
  
  // Internal validation only - not exposed to frontend
  async validateBetAmount(mint: string, amount: number): Promise<{ valid: boolean; maxBet?: number }> {
    const vault = await db.vault.findUnique({ where: { mint } })
    if (!vault) return { valid: false }
    if (vault.isPaused) return { valid: false }
    
    const maxBet = parseFloat(String(vault.currentBalance)) * 0.01
    
    // Return generic result - don't reveal why bet failed
    if (amount > maxBet) {
      return { valid: false } // Generic - could be limit, could be other reasons
    }
    
    return { valid: true, maxBet }
  },

  async getCreatorStats(mint: string) {
    const vault = await db.vault.findUnique({ where: { mint } })
    if (!vault) return null
    return {
      currentBalance:    parseFloat(String(vault.currentBalance)),
      initialDeposit:    parseFloat(String(vault.initialDeposit)),
      totalWagered:      parseFloat(String(vault.totalWagered)),
      totalPaidOut:      parseFloat(String(vault.totalPaidOut)),
      totalCreatorFees:  parseFloat(String(vault.totalCreatorFees)),
      totalTreasuryFees: parseFloat(String(vault.totalTreasuryFees)),
      totalAffiliateFees:parseFloat(String(vault.totalAffiliateFees)),
      isPaused:          vault.isPaused,
      houseProfit:       parseFloat(String(vault.totalWagered)) - parseFloat(String(vault.totalPaidOut)),
    }
  },

  async notifyVaultPaused(userId: string, mint: string, balance: string) {
    const user = await db.user.findUnique({ where: { id: userId } })
    if (user?.email && user.emailVerified) {
      await es.sendVaultPausedAlert(user.email, mint, balance)
    }
    logger.warn('Vault paused notification triggered', 'VaultService', { mint, userId });
    await db.notification.create({
      data: {
        userId,
        type:  'VAULT_PAUSED',
        title: 'Vault Dijeda',
        body:  `Vault ${mint.slice(0,8)}... dijeda karena saldo kritis`,
        metadata: { mint },
      },
    })
  },

  async notifyVaultResumed(userId: string, mint: string) {
    const user = await db.user.findUnique({ where: { id: userId } })
    if (user?.email && user.emailVerified) {
      await es.sendVaultResumedAlert(user.email, mint)
    }
    logger.info('Vault resumed notification triggered', 'VaultService', { mint, userId });
  },

  async getVaultHealthStats(mint: string) {
    const vault = await db.vault.findUnique({ where: { mint } })
    if (!vault) return null

    const initial = parseFloat(String(vault.initialDeposit))
    const current = parseFloat(String(vault.currentBalance))
    const wagered = parseFloat(String(vault.totalWagered))
    const payout  = parseFloat(String(vault.totalPaidOut))
    
    // Revenue yang sudah pasti diamankan (House Edge 1%)
    const grossHouseEdge = wagered * 0.01 
    const netPartnerRev  = grossHouseEdge * 0.5 // 50% dari 1%
    
    // Variansi Vault (Fluktuasi murni dari menang/kalah pemain)
    // Variance = (Total Masuk dari kalah) - (Total Keluar dari menang)
    // Saldo = Initial + Wagered - Payout - Fees
    const variance = current - initial + (wagered * 0.01)

    // Health Factor: Keamanan Likuiditas terhadap Max Bet
    const maxBet = current * 0.01 // 1% dari balance saat ini
    const healthFactor = maxBet > 0 ? (current / (maxBet * 10)) : 0

    return {
      mint,
      status: vault.isPaused ? 'PAUSED' : 'ACTIVE',
      metrics: {
        totalWagered: wagered,
        grossHouseEdge,
        netPartnerRevenue: netPartnerRev,
        vaultVariance: variance,
      },
      health: {
        factor: Math.min(healthFactor, 100), // Cap at 100 for UI purposes
        level: healthFactor > 5 ? 'EXCELLENT' : healthFactor > 2 ? 'GOOD' : 'CRITICAL',
        currentBalance: current,
        maxBetAllowed: maxBet,
      }
    }
  },

  async getGlobalVaultHealthStats() {
    const [totals, activeCount, anomalies] = await db.$transaction([
      db.vault.aggregate({
        _sum: {
          totalWagered: true,
          currentBalance: true,
        },
        _count: {
          id: true
        }
      }),
      db.vault.count({ where: { isPaused: false } }),
      db.vault.findMany({
        where: {
          // Anomali: saldo < 20% dari deposit awal
          // Prisma tidak mendukung perbandingan kolom di 'where' secara langsung tanpa 'raw',
          // jadi kita biarkan ini sebagai findMany terbatas atau filter.
          // Untuk audit ini, kita optimalkan agregasi utama dulu.
          isPaused: false, 
        },
        select: { mint: true, currentBalance: true, initialDeposit: true }
      })
    ])

    const totalWagered = parseFloat(String(totals._sum.totalWagered || 0))
    const totalBalance = parseFloat(String(totals._sum.currentBalance || 0))

    return {
      totalVolume: totalWagered,
      protocolRevenue: totalWagered * 0.01 * 0.3, // 30% dari 1%
      activeVaults: activeCount,
      totalVaults: totals._count.id,
      globalLiquidity: totalBalance,
      anomalies: (anomalies as any[])
        .filter((v: any) => parseFloat(String(v.currentBalance)) < (parseFloat(String(v.initialDeposit)) * 0.2))
        .map((v: any) => ({ mint: v.mint, balance: v.currentBalance }))
    }
  }
}
