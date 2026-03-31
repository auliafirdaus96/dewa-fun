// app/leaderboard/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { motion }  from 'framer-motion'
import { Trophy }  from 'lucide-react'
import { api }     from '@/lib/api'
import { cn }      from '@/lib/utils'
import { Header }      from '@/components/Header'
import { Sidebar } from '@/components/Sidebar'

const PERIODS = [
  { key: 'daily',   label: '24 Jam'   },
  { key: 'weekly',  label: '7 Hari'   },
  { key: 'alltime', label: 'All Time' },
]
const SORTS = [
  { key: 'profit', label: '💰 Profit'   },
  { key: 'bets',   label: '🎲 Bet Terbanyak' },
  { key: 'bigwin', label: '🏆 Big Win'  },
]

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

export default function LeaderboardPage() {
  const [period,      setPeriod]      = useState('daily')
  const [sort,        setSort]        = useState('profit')
  const [data,        setData]        = useState<any[]>([])
  const [loading,     setLoading]     = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.leaderboard.get({ period: period as any, sort: sort as any, limit: 50 })
      .then(({ data }) => setData(data))
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [period, sort])

  return (
    <div className="flex flex-col h-screen">
      <Header onMenuClick={() => setSidebarOpen(o => !o)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-[860px] mx-auto space-y-5">

            {/* Title */}
            <div className="flex items-center gap-3">
              <Trophy size={22} className="text-[var(--go)]" />
              <h1 className="text-[20px] font-bold">Leaderboard Dice</h1>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              {PERIODS.map(p => (
                <button key={p.key} onClick={() => setPeriod(p.key)}
                  className={cn('px-4 py-2 rounded-[8px] text-[12px] font-medium border transition-all',
                    period === p.key ? 'bg-[rgba(99,179,237,.12)] border-[rgba(99,179,237,.4)] text-[var(--a)]'
                                     : 'bg-panel border-dim text-[var(--t2)] hover:text-[var(--t1)]')}>
                  {p.label}
                </button>
              ))}
              <div className="flex-1" />
              {SORTS.map(s => (
                <button key={s.key} onClick={() => setSort(s.key)}
                  className={cn('px-4 py-2 rounded-[8px] text-[12px] font-medium border transition-all',
                    sort === s.key ? 'bg-[rgba(246,173,85,.1)] border-[rgba(246,173,85,.35)] text-[var(--go)]'
                                   : 'bg-panel border-dim text-[var(--t2)] hover:text-[var(--t1)]')}>
                  {s.label}
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="bg-card border border-dim rounded-xl overflow-hidden">
              <div className="grid grid-cols-[48px_1fr_100px_100px_100px] text-[11px] font-semibold text-[var(--t3)] uppercase tracking-wider px-4 py-3 border-b border-dim">
                <span>#</span><span>Player</span><span className="text-right">Profit</span><span className="text-right">Bets</span><span className="text-right">Win%</span>
              </div>

              {loading ? (
                <div className="text-center py-12 text-[var(--t3)]">Loading...</div>
              ) : data.length === 0 ? (
                <div className="text-center py-12 text-[var(--t3)] text-[13px]">Belum ada data</div>
              ) : (
                data.map((entry, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="grid grid-cols-[48px_1fr_100px_100px_100px] px-4 py-3 border-b border-[rgba(255,255,255,.03)] last:border-0 hover:bg-hover transition-colors items-center"
                  >
                    <span className="text-[15px]">
                      {MEDALS[entry.rank] || <span className="text-[13px] font-mono text-[var(--t3)]">{entry.rank}</span>}
                    </span>
                    <div>
                      <div className="text-[13px] font-semibold">
                        {entry.displayName || entry.displayAddr}
                      </div>
                      {entry.displayName && (
                        <div className="text-[11px] text-[var(--t3)] font-mono">{entry.displayAddr}</div>
                      )}
                    </div>
                    <div className={cn('text-right font-mono text-[13px] font-semibold',
                      entry.netProfit >= 0 ? 'text-[var(--g)]' : 'text-[var(--r)]')}>
                      {entry.netProfit >= 0 ? '+' : ''}{entry.netProfit.toFixed(4)}
                    </div>
                    <div className="text-right font-mono text-[13px] text-[var(--t2)]">{entry.totalBets}</div>
                    <div className="text-right font-mono text-[13px] text-[var(--a)]">
                      {entry.winRate ? `${entry.winRate}%` : '—'}
                    </div>
                  </motion.div>
                ))
              )}
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}
