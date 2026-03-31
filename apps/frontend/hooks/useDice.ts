// hooks/useDice.ts
'use client'
import { useCallback, useRef } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { VersionedTransaction } from '@solana/web3.js'
import toast from 'react-hot-toast'
import { api }          from '@/lib/api'
import { useDiceStore } from '@/store/diceStore'
import { useSocketStore } from '@/store/socketStore'

// ── MANUAL ────────────────────────────────────
export function useManualDice(mint: string) {
  const { publicKey, signTransaction } = useWallet()
  const { connection }  = useConnection()
  const store           = useDiceStore()
  const { socket }      = useSocketStore()

  const placeBet = useCallback(async () => {
    if (!publicKey || !signTransaction) { toast.error('Hubungkan wallet'); return }

    store.setIsRolling(true)
    store.setLastResult(0, false)

    try {
      // 1. Prepare tx
      const { data } = await api.dice.prepare({
        walletAddress: publicKey.toBase58(),
        mint,
        amount:    store.betAmount,
        direction: store.direction,
        threshold: store.threshold,
      })

      // 2. Sign & broadcast
      const txBytes = Buffer.from(data.txBase64, 'base64')
      const tx      = VersionedTransaction.deserialize(txBytes)
      const signed  = await signTransaction(tx as any)
      const sig     = await connection.sendRawTransaction((signed as any).serialize())
      await connection.confirmTransaction(sig, 'confirmed')

      store.setIsVrfWait(true)

      // 3. Poll VRF result
      let attempts = 0
      const poll = async () => {
        try {
          const { data: res } = await api.dice.getResult(data.betId)
          if (res.status === 'PENDING_VRF' && attempts < 20) {
            attempts++
            setTimeout(poll, 2000)
            return
          }

          store.setIsVrfWait(false)
          store.setIsRolling(false)

          if (res.status === 'REFUNDED') {
            toast('↩ Taruhan dikembalikan — VRF timeout', { icon: '⚠️' })
            return
          }

          const r = res.result
          store.setLastResult(r.roll, r.won)
          store.addResult({ roll: r.roll, won: r.won, amount: r.amount, payout: r.payout, profit: r.profit, multiplier: r.multiplier, winChance: r.winChance })

          if (r.won) toast.success(`🎉 WIN! Roll: ${r.roll} — +${r.profit.toFixed(4)}`)
          else       toast.error(`💔 LOSE. Roll: ${r.roll} — -${r.amount.toFixed(4)}`)

          // Emit to live feed
          socket?.emit('dice:result', { mint, wallet: publicKey.toBase58(), roll: r.roll, won: r.won, amount: r.amount, payout: r.payout, mode: 'MANUAL' })
        } catch {
          setTimeout(poll, 2000)
        }
      }
      setTimeout(poll, 2000)

    } catch (e: any) {
      toast.error(e.message)
      store.setIsRolling(false)
      store.setIsVrfWait(false)
    }
  }, [publicKey, signTransaction, connection, mint, store, socket])

  return { placeBet }
}

// ── AUTO ──────────────────────────────────────
export function useAutoDice(mint: string) {
  const { publicKey, signTransaction } = useWallet()
  const { connection } = useConnection()
  const store          = useDiceStore()
  const { socket }     = useSocketStore()
  const cancelRef      = useRef(false)

  const startAuto = useCallback(async (config: {
    strategy:      string
    numberOfBets:  number
    stopOnProfit?: number
    stopOnLoss?:   number
    maxBet?:       number
  }) => {
    if (!publicKey || !signTransaction) { toast.error('Hubungkan wallet'); return }
    cancelRef.current = false
    store.setIsRolling(true)

    try {
      // 1. Init session
      const { data: session } = await api.dice.autoStart({
        walletAddress: publicKey.toBase58(),
        mint,
      })
      store.setSession(session.sessionId, session.serverSeedHash, session.clientSeed, 0)

      // 2. Sign approval tx
      const approvalTx = VersionedTransaction.deserialize(
        Buffer.from(session.approvalTxBase64, 'base64')
      )
      const signedApproval = await signTransaction(approvalTx as any)
      await connection.sendRawTransaction((signedApproval as any).serialize())

      // 3. Join socket session room for live progress
      socket?.emit('join:session', session.sessionId)

      // 4. Run auto bet
      const { data: summary } = await api.dice.autoRun({
        sessionId: session.sessionId,
        config: {
          ...config,
          baseBet:   store.betAmount,
          direction: store.direction,
          threshold: store.threshold,
          onWin:  { reset: config.strategy !== 'PAROLI' },
          onLoss: { reset: config.strategy !== 'MARTINGALE' },
        },
      })

      if (cancelRef.current) return

      toast.success(`Auto selesai: ${summary.totalBets} bet, profit: ${summary.netProfit.toFixed(4)}`)

      // 5. Sign & broadcast settlement
      const { data: settleTx } = await api.dice.autoSettle({ sessionId: session.sessionId })
      const tx     = VersionedTransaction.deserialize(Buffer.from(settleTx.txBase64, 'base64'))
      const signed = await signTransaction(tx as any)
      const sig    = await connection.sendRawTransaction((signed as any).serialize())
      await connection.confirmTransaction(sig, 'confirmed')

    } catch (e: any) {
      toast.error(e.message)
    } finally {
      store.setIsRolling(false)
    }
  }, [publicKey, signTransaction, connection, mint, store, socket])

  const cancel = useCallback(() => {
    cancelRef.current = true
    store.setIsRolling(false)
    toast('Auto bet dibatalkan')
  }, [store])

  return { startAuto, cancel }
}

// ── FLASH ─────────────────────────────────────
export function useFlashDice(mint: string) {
  const { publicKey, signTransaction } = useWallet()
  const { connection } = useConnection()
  const store          = useDiceStore()

  const runFlash = useCallback(async (totalBets: number) => {
    if (!publicKey || !signTransaction) { toast.error('Hubungkan wallet'); return }

    store.setIsRolling(true)
    const toastId = toast.loading(`⚡ Flash: 0 / ${totalBets} roll...`)

    try {
      const { data } = await api.dice.flashRun({
        walletAddress: publicKey.toBase58(),
        mint,
        config: {
          baseBet:   store.betAmount,
          direction: store.direction,
          threshold: store.threshold,
          totalBets,
          stopOnProfit: undefined,
          stopOnLoss:   undefined,
        },
      })

      // Add semua hasil ke store sekaligus
      for (const b of data.bets) {
        store.addResult({
          roll: b.roll, won: b.won,
          amount: b.amount, payout: b.payout,
          profit: b.payout - b.amount,
          multiplier: store.multiplier,
          winChance:  store.winChance,
        })
      }

      // Update last result
      const last = data.bets[data.bets.length - 1]
      if (last) store.setLastResult(last.roll, last.won)

      toast.dismiss(toastId)
      toast.success(`⚡ Flash selesai! ${data.totalBets} roll — profit: ${data.netProfit.toFixed(4)}`)

      // Settle
      const { data: settleTx } = await api.dice.flashSettle({ sessionId: data.sessionId })
      const tx     = VersionedTransaction.deserialize(Buffer.from(settleTx.txBase64, 'base64'))
      const signed = await signTransaction(tx as any)
      const sig    = await connection.sendRawTransaction((signed as any).serialize())
      await connection.confirmTransaction(sig, 'confirmed')

    } catch (e: any) {
      toast.dismiss(toastId)
      toast.error(e.message)
    } finally {
      store.setIsRolling(false)
    }
  }, [publicKey, signTransaction, connection, mint, store])

  return { runFlash }
}
