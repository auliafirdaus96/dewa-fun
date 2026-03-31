// components/dice/DiceSlider.tsx
'use client'
import { useRef, useEffect, useCallback, useState } from 'react'
import { useDiceStore } from '@/store/diceStore'
import { useSocketStore } from '@/store/socketStore'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Send, AlertTriangle } from 'lucide-react'

export function DiceSlider() {
  const { threshold, setThreshold, direction } = useDiceStore()
  const trackRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const update = useCallback((clientX: number) => {
    if (!trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const pct  = Math.max(2, Math.min(97, ((clientX - rect.left) / rect.width) * 100))
    setThreshold(Math.round(pct))
  }, [setThreshold])

  useEffect(() => {
    const onMove  = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current) return
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX
      update(x)
    }
    const onUp = () => { dragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend',  onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend',  onUp)
    }
  }, [update])

  const pct = `${threshold}%`

  return (
    <div className="w-full px-1">
      <div
        ref={trackRef}
        onClick={e => update(e.clientX)}
        className="relative h-[8px] rounded-full cursor-pointer my-7"
        style={{ background: `linear-gradient(90deg, #68d391 ${pct}, #fc8181 ${pct})` }}
      >
        <div
          onMouseDown={e => { dragging.current = true; e.preventDefault() }}
          onTouchStart={e => { dragging.current = true }}
          className="absolute w-[26px] h-[26px] bg-white rounded-full -translate-x-1/2 -translate-y-1/2 top-1/2 cursor-grab active:cursor-grabbing border-[3px] border-[var(--a)] shadow-lg flex items-center justify-center text-[9px] font-bold text-[var(--a)] select-none"
          style={{ left: pct }}
        >
          II
        </div>
      </div>
      <div className="flex justify-between text-[11px] text-[var(--t3)] font-mono px-[2px]">
        <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
      </div>
    </div>
  )
}


// components/dice/BetHistory.tsx


export function BetHistory() {
  const { history, resetStats } = useDiceStore()

  return (
    <div className="bg-card border border-dim rounded-xl">
      <div className="flex items-center justify-between p-4 border-b border-dim">
        <span className="text-[13px] font-semibold">📋 Riwayat Taruhan</span>
        <button onClick={resetStats} className="text-[12px] text-[var(--t3)] hover:text-[var(--t1)] transition-colors">Hapus</button>
      </div>
      <div className="max-h-[220px] overflow-y-auto">
        {history.length === 0
          ? <div className="text-center py-6 text-[13px] text-[var(--t3)]">Belum ada taruhan</div>
          : history.map((h, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-[9px] border-b border-[rgba(255,255,255,.03)] last:border-0 text-[12px]">
              <span className={cn('font-mono font-bold text-[15px] w-[38px]', h.won ? 'text-[var(--g)]' : 'text-[var(--r)]')}>
                {h.roll}
              </span>
              <div className="flex-1 text-[var(--t2)]">
                {h.amount.toFixed(4)} × {h.multiplier.toFixed(2)} | {useDiceStore.getState().direction === 'UNDER' ? 'Under' : 'Over'} {useDiceStore.getState().threshold}
              </div>
              <span className={cn('font-mono font-semibold', h.won ? 'text-[var(--g)]' : 'text-[var(--r)]')}>
                {h.won ? '+' : '-'}{h.won ? (h.payout - h.amount).toFixed(4) : h.amount.toFixed(4)}
              </span>
            </div>
          ))
        }
      </div>
    </div>
  )
}


// components/dice/StrategyPanel.tsx


const STRATEGIES = [
  { id: 'FLAT',       name: 'Flat Bet',    desc: 'Taruhan tetap setiap ronde. Aman & stabil.' },
  { id: 'MARTINGALE', name: 'Martingale',  desc: 'Lipat taruhan setiap kalah. Reset saat menang.' },
  { id: 'PAROLI',     name: 'Paroli',      desc: 'Lipat taruhan setiap menang. Reset saat kalah.' },
  { id: 'DALEMBERT',  name: "D'Alembert",  desc: '+1 unit kalah, -1 unit menang.' },
] as const

export function StrategyPanel() {
  const { strategy, setStrategy } = useDiceStore()

  return (
    <div className="bg-card border border-[rgba(246,173,85,.2)] rounded-xl p-5">
      <div className="text-[13px] font-semibold text-[var(--go)] mb-4">⚡ Strategi Bawaan</div>
      <div className="grid grid-cols-2 gap-3">
        {STRATEGIES.map(s => (
          <button
            key={s.id}
            onClick={() => { setStrategy(s.id as any); toast.success(`✅ Strategi ${s.name} diterapkan`) }}
            className={cn(
              'text-left p-3 rounded-[9px] border transition-all',
              strategy === s.id
                ? 'border-[rgba(246,173,85,.4)] bg-[rgba(246,173,85,.05)]'
                : 'border-dim bg-panel hover:border-[rgba(246,173,85,.3)] hover:bg-[rgba(246,173,85,.03)]'
            )}
          >
            <div className="text-[13px] font-semibold mb-1">{s.name}</div>
            <div className="text-[11px] text-[var(--t3)] leading-relaxed">{s.desc}</div>
          </button>
        ))}
      </div>
    </div>
  )
}


// components/dice/DiceChat.tsx


export function DiceChat({ mint }: { mint: string }) {
  const { chatMsgs, sendChat, joinDice } = useSocketStore()
  const { isAuthenticated, shortAddress } = useAuth()
  const [msg,   setMsg]  = useState('')
  const bottomRef        = useRef<HTMLDivElement>(null)
  const messages         = chatMsgs[mint] || []

  useEffect(() => {
    joinDice(mint)
    api.chat.get(mint, { limit: 30 }).then(({ data }) => {
      // Pre-load historical messages handled via socketStore init
    })
  }, [mint])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const send = () => {
    if (!msg.trim() || !isAuthenticated) return
    sendChat(mint, msg.trim())
    setMsg('')
  }

  return (
    <div className="bg-card border border-dim rounded-xl">
      <div className="p-4 border-b border-dim text-[13px] font-semibold flex items-center gap-2">
        💬 Live Chat
        <span className="text-[10px] text-[var(--g)] bg-[rgba(104,211,145,.1)] border border-[rgba(104,211,145,.2)] px-[7px] py-[2px] rounded-full">
          {messages.length > 0 ? `${messages.length} pesan` : 'Belum ada chat'}
        </span>
      </div>
      <div className="h-[200px] overflow-y-auto p-3 space-y-2">
        {messages.map((m, i) => (
          <div key={i} className="text-[12px]">
            <span className={cn('font-semibold mr-2', m.user.wallet === shortAddress?.replace('...', '') ? 'text-[var(--a)]' : 'text-[var(--go)]')}>
              {m.user.displayName || m.user.short}:
            </span>
            <span className="text-[var(--t2)]">{m.message}</span>
          </div>
        ))}
        {messages.length === 0 && <div className="text-center text-[12px] text-[var(--t3)] py-4">Belum ada pesan</div>}
        <div ref={bottomRef} />
      </div>
      {isAuthenticated && (
        <div className="flex items-center gap-2 p-3 border-t border-dim">
          <input
            value={msg}
            onChange={e => setMsg(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Ketik pesan..."
            maxLength={500}
            className="flex-1 bg-panel border border-dim rounded-[8px] px-3 py-[8px] text-[13px] text-[var(--t1)] placeholder-[var(--t3)] outline-none focus:border-[rgba(99,179,237,.4)] transition-colors"
          />
          <button onClick={send} className="gradient-btn text-white p-[9px] rounded-[8px] hover:opacity-90 transition-all">
            <Send size={14} />
          </button>
        </div>
      )}
    </div>
  )
}


// components/dice/VaultStatus.tsx


export function VaultStatus({ mint }: { mint: string }) {
  const [vault, setVault] = useState<{ isPaused: boolean; maxBet: number } | null>(null)

  useEffect(() => {
    api.vault.get(mint).then(({ data }) => setVault(data)).catch(() => {})

    const onPause  = () => setVault(v => v ? { ...v, isPaused: true,  maxBet: 0 } : v)
    const onResume = () => setVault(v => v ? { ...v, isPaused: false } : v)
    window.addEventListener('vault:paused',  onPause)
    window.addEventListener('vault:resumed', onResume)
    return () => {
      window.removeEventListener('vault:paused',  onPause)
      window.removeEventListener('vault:resumed', onResume)
    }
  }, [mint])

  if (!vault?.isPaused) return null

  return (
    <div className="flex items-start gap-3 bg-[rgba(246,173,85,.06)] border border-[rgba(246,173,85,.25)] rounded-xl p-4">
      <AlertTriangle size={18} className="text-[var(--go)] flex-shrink-0 mt-0.5" />
      <div>
        <div className="text-[13px] font-semibold text-[var(--go)]">⏸ Sesi Permainan Sedang Dijeda</div>
        <div className="text-[12px] text-[var(--t2)] mt-1 leading-relaxed">
          Sistem sedang melakukan sinkronisasi ulang pada jaringan. Permainan akan otomatis terbuka kembali dalam waktu singkat.
        </div>
      </div>
    </div>
  )
}
