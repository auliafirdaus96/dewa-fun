// app/dice/page.tsx
'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, RotateCcw, Zap, Play, ChevronDown } from 'lucide-react'
import { useManualDice, useAutoDice, useFlashDice } from '@/hooks/useDice'
import { useDiceStore } from '@/store/diceStore'
import { DiceSlider, BetHistory, StrategyPanel, DiceChat, VaultStatus } from '@/components/dice'
import LiveFeed from '@/components/dice/LiveFeed'
import { Header }       from '@/components/Header'
import { Sidebar }      from '@/components/Sidebar'
import { cn }           from '@/lib/utils'
import { useAuth }      from '@/hooks/useAuth'
import toast            from 'react-hot-toast'
import { useParams }    from 'next/navigation'

type DiceMode = 'MANUAL' | 'AUTO' | 'FLASH'

function DiceClient() {
  const params = useParams()
  const MINT = (params?.mint as string) || 'demo_mint_mooncat'

  const store = useDiceStore()
  const { isAuthenticated } = useAuth()
  const { placeBet }  = useManualDice(MINT)
  const { startAuto, cancel: cancelAuto } = useAutoDice(MINT)
  const { runFlash }  = useFlashDice(MINT)

  const [sidebarOpen,    setSidebarOpen]    = useState(false)
  const [showStrategy,   setShowStrategy]   = useState(false)
  const [showChat,       setShowChat]       = useState(false)
  const [autoConfig, setAutoConfig] = useState({
    strategy:     'FLAT',
    numberOfBets: 100,
    stopOnProfit: 1,
    stopOnLoss:   1,
  })
  const [flashBets, setFlashBets] = useState(100)

  const handleBet = useCallback(async () => {
    if (!isAuthenticated) { toast.error('Hubungkan wallet dulu'); return }
    switch (store.mode) {
      case 'MANUAL': await placeBet(); break
      case 'AUTO':   await startAuto(autoConfig); break
      case 'FLASH':  await runFlash(flashBets); break
    }
  }, [store.mode, isAuthenticated, placeBet, startAuto, runFlash, autoConfig, flashBets])

  const isRolling = store.isRolling || store.isVrfWait

  return (
    <div className="flex flex-col h-screen">
      <Header onMenuClick={() => setSidebarOpen(o => !o)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-[900px] mx-auto space-y-4">

            {/* Vault status */}
            <VaultStatus mint={MINT} />

            {/* Mode tabs */}
            <div className="flex bg-panel rounded-[8px] p-[3px] gap-[2px]">
              {(['MANUAL', 'AUTO', 'FLASH'] as DiceMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => store.setMode(m)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-2 rounded-[6px] text-[12px] font-semibold transition-all',
                    store.mode === m
                      ? 'bg-card text-[var(--a)] shadow-sm'
                      : 'text-[var(--t2)] hover:text-[var(--t1)]'
                  )}
                >
                  {m === 'MANUAL' && <Play size={12} />}
                  {m === 'AUTO'   && <RotateCcw size={12} />}
                  {m === 'FLASH'  && <Zap size={12} />}
                  {m}
                  {m === 'MANUAL' && <span className="text-[10px] text-[var(--t3)] font-normal">VRF</span>}
                  {m === 'AUTO'   && <span className="text-[10px] text-[var(--t3)] font-normal">Provably Fair</span>}
                  {m === 'FLASH'  && <span className="text-[10px] text-[var(--go)] font-normal">⚡ Instant</span>}
                </button>
              ))}
            </div>

            {/* Dice visual */}
            <div className="bg-card border border-dim rounded-xl p-6 flex flex-col items-center gap-5">

              {/* Roll result */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={store.lastRoll ?? 'idle'}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1,   opacity: 1 }}
                  className={cn(
                    'text-[68px] font-bold font-mono leading-none transition-all',
                    store.isVrfWait ? 'animate-pulse text-[var(--a)]' :
                    store.lastWon === true  ? 'text-[var(--g)] animate-pulse-win' :
                    store.lastWon === false ? 'text-[var(--r)] animate-pulse-lose' :
                    'text-[var(--t1)]'
                  )}
                >
                  {store.isVrfWait ? '...' : store.lastRoll ?? '—'}
                </motion.div>
              </AnimatePresence>

              {store.isVrfWait && (
                <p className="text-[12px] text-[var(--a)] animate-pulse">
                  ⏳ Menunggu Switchboard VRF...
                </p>
              )}

              {/* Under/Over toggle */}
              <div className="flex bg-panel rounded-[8px] p-[3px] gap-[2px] w-full max-w-[380px]">
                {(['UNDER', 'OVER'] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => store.setDirection(d)}
                    className={cn(
                      'flex-1 py-2 rounded-[6px] text-[12px] font-semibold transition-all',
                      store.direction === d && d === 'UNDER' ? 'bg-[rgba(104,211,145,.15)] text-[var(--g)]' :
                      store.direction === d && d === 'OVER'  ? 'bg-[rgba(252,129,129,.15)] text-[var(--r)]' :
                      'text-[var(--t2)] hover:text-[var(--t1)]'
                    )}
                  >
                    {d === 'UNDER' ? '⬇ Roll Under' : '⬆ Roll Over'}
                  </button>
                ))}
              </div>

              {/* Slider */}
              <DiceSlider />
            </div>

            {/* Bet controls */}
            <div className="bg-card border border-dim rounded-xl p-5 space-y-3">

              {/* Bet amount + potential win */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Jumlah Taruhan', id: 'bet', val: store.betAmount.toString(), suffix: 'TOKEN', readonly: false },
                  { label: 'Potensi Menang',  id: 'win', val: (store.betAmount * store.multiplier).toFixed(4), suffix: 'TOKEN', readonly: true },
                ].map(({ label, id, val, suffix, readonly }) => (
                  <div key={id}>
                    <label className="block text-[11px] font-semibold text-[var(--t3)] uppercase tracking-wider mb-1.5">{label}</label>
                    <div className="flex items-center bg-panel border border-dim rounded-[8px] overflow-hidden focus-within:border-[rgba(99,179,237,.4)] transition-colors">
                      <input
                        type="number" value={val} readOnly={readonly}
                        onChange={e => !readonly && store.setBetAmount(parseFloat(e.target.value) || 0)}
                        className="flex-1 bg-transparent px-3 py-[10px] text-[14px] font-mono font-semibold text-[var(--t1)] outline-none"
                        style={readonly ? { opacity: 0.7 } : {}}
                      />
                      {!readonly && (
                        <div className="flex gap-1 pr-2">
                          {[0.5, 2].map(f => (
                            <button key={f} onClick={() => store.setBetAmount(Math.max(0.001, store.betAmount * f))}
                              className="text-[10px] font-bold px-2 py-1 rounded-[5px] bg-[rgba(99,179,237,.1)] border border-[rgba(99,179,237,.2)] text-[var(--a)] hover:bg-[rgba(99,179,237,.2)] transition-all">
                              {f === 0.5 ? '½' : '2×'}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="px-3 text-[11px] font-semibold text-[var(--a)] bg-[rgba(99,179,237,.1)] border-l border-dim self-stretch flex items-center">{suffix}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Multiplier + Win chance */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Multiplier',    val: store.multiplier.toFixed(4), suffix: '×'   },
                  { label: 'Peluang Menang', val: store.winChance.toFixed(2),  suffix: '%'   },
                ].map(({ label, val, suffix }) => (
                  <div key={label}>
                    <label className="block text-[11px] font-semibold text-[var(--t3)] uppercase tracking-wider mb-1.5">{label}</label>
                    <div className="flex items-center bg-panel border border-dim rounded-[8px] overflow-hidden">
                      <input readOnly value={val} className="flex-1 bg-transparent px-3 py-[10px] text-[14px] font-mono font-semibold text-[var(--t1)] outline-none opacity-70" />
                      <div className="px-3 text-[11px] font-semibold text-[var(--a)] bg-[rgba(99,179,237,.1)] border-l border-dim self-stretch flex items-center">{suffix}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* AUTO config */}
              {store.mode === 'AUTO' && (
                <div className="border border-dim rounded-[9px] p-3 space-y-2 bg-panel">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-[var(--t3)] uppercase tracking-wider block mb-1">Jumlah Bet</label>
                      <input type="number" value={autoConfig.numberOfBets}
                        onChange={e => setAutoConfig(c => ({ ...c, numberOfBets: parseInt(e.target.value) }))}
                        className="w-full bg-card border border-dim rounded-[7px] px-3 py-[8px] text-[13px] font-mono text-[var(--t1)] outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] text-[var(--t3)] uppercase tracking-wider block mb-1">Strategi</label>
                      <select value={autoConfig.strategy}
                        onChange={e => setAutoConfig(c => ({ ...c, strategy: e.target.value }))}
                        className="w-full bg-card border border-dim rounded-[7px] px-3 py-[8px] text-[13px] text-[var(--t1)] outline-none">
                        {['FLAT','MARTINGALE','PAROLI','DALEMBERT'].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-[var(--t3)] uppercase tracking-wider block mb-1">Stop Profit</label>
                      <input type="number" value={autoConfig.stopOnProfit}
                        onChange={e => setAutoConfig(c => ({ ...c, stopOnProfit: parseFloat(e.target.value) }))}
                        className="w-full bg-card border border-dim rounded-[7px] px-3 py-[8px] text-[13px] font-mono text-[var(--t1)] outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] text-[var(--t3)] uppercase tracking-wider block mb-1">Stop Loss</label>
                      <input type="number" value={autoConfig.stopOnLoss}
                        onChange={e => setAutoConfig(c => ({ ...c, stopOnLoss: parseFloat(e.target.value) }))}
                        className="w-full bg-card border border-dim rounded-[7px] px-3 py-[8px] text-[13px] font-mono text-[var(--t1)] outline-none" />
                    </div>
                  </div>
                </div>
              )}

              {/* FLASH config */}
              {store.mode === 'FLASH' && (
                <div className="border border-dim rounded-[9px] p-3 bg-panel space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-[var(--t3)] uppercase tracking-wider font-bold">Jumlah Roll</label>
                    <span className="font-mono text-[14px] font-bold text-[var(--a)] bg-[rgba(99,179,237,.1)] px-2 py-0.5 rounded-md border border-[rgba(99,179,237,.2)]">
                      {flashBets} <span className="text-[10px] opacity-70">ROLL</span>
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <input type="range" min={10} max={1000} step={10} value={flashBets}
                      onChange={e => setFlashBets(parseInt(e.target.value))}
                      className="flex-1 accent-[var(--a)] h-1.5 bg-card rounded-lg appearance-none cursor-pointer" />
                  </div>

                  <div className="grid grid-cols-5 gap-1.5">
                    {[10, 50, 100, 500, 1000].map(val => (
                      <button
                        key={val}
                        onClick={() => setFlashBets(val)}
                        className={cn(
                          "py-1.5 rounded-md text-[10px] font-black transition-all border",
                          flashBets === val
                            ? "bg-[var(--a)] border-[var(--a)] text-black shadow-[0_0_12px_rgba(99,179,237,.3)]"
                            : "bg-card border-dim text-[var(--t3)] hover:text-[var(--t1)] hover:border-[var(--t3)]"
                        )}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                  
                  <p className="text-[10px] text-[var(--t3)] text-center italic">
                    ⚡ Seluruh hasil akan dikalkulasi secara instan dalam 1 transaksi.
                  </p>
                </div>
              )}

              {/* Bet button */}
              <div className="flex gap-3 mt-2">
                <button onClick={() => setShowStrategy(!showStrategy)}
                  className="w-[50px] h-[50px] bg-panel border border-dim rounded-[11px] flex items-center justify-center text-[var(--t2)] hover:border-[var(--bop)] hover:text-[var(--a)] transition-all">
                  <Settings size={17} />
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleBet}
                  disabled={isRolling}
                  className={cn(
                    'flex-1 py-[15px] rounded-[11px] text-[16px] font-bold transition-all',
                    isRolling
                      ? 'bg-[#1e293b] text-[var(--t3)] cursor-not-allowed'
                      : 'gradient-green text-white hover:-translate-y-[2px] hover:shadow-[0_8px_24px_rgba(104,211,145,.3)]'
                  )}
                >
                  {isRolling
                    ? store.isVrfWait ? '⏳ Menunggu VRF...' : '🎲 Rolling...'
                    : store.mode === 'FLASH' ? `⚡ FLASH ${flashBets} ROLL`
                    : store.mode === 'AUTO'  ? `🤖 MULAI AUTO`
                    : '🎲 TARUHAN'}
                </motion.button>
                {store.mode === 'AUTO' && isRolling && (
                  <button onClick={cancelAuto}
                    className="w-[50px] h-[50px] bg-[rgba(252,129,129,.1)] border border-[rgba(252,129,129,.25)] text-[var(--r)] rounded-[11px] flex items-center justify-center hover:bg-[rgba(252,129,129,.2)] transition-all">
                    ✕
                  </button>
                )}
                <button onClick={() => setShowChat(!showChat)}
                  className="w-[50px] h-[50px] bg-panel border border-dim rounded-[11px] flex items-center justify-center text-[var(--t2)] hover:border-[var(--bop)] hover:text-[var(--a)] transition-all text-[17px]">
                  💬
                </button>
              </div>
            </div>

            {/* Stats bar */}
            <div className="bg-card border border-dim rounded-xl p-4">
              <div className="grid grid-cols-5 gap-3">
                {[
                  { label: 'Keuntungan', val: store.stats.netProfit.toFixed(4),   cls: store.stats.netProfit >= 0 ? 'text-[var(--g)]' : 'text-[var(--r)]' },
                  { label: 'Taruhan',    val: store.stats.totalBets.toString(),    cls: 'text-[var(--t1)]' },
                  { label: 'Kalah',      val: store.stats.totalLosses.toString(),  cls: 'text-[var(--r)]' },
                  { label: 'Menang',     val: store.stats.totalWins.toString(),    cls: 'text-[var(--g)]' },
                  { label: 'Win Rate',   val: store.stats.totalBets ? `${((store.stats.totalWins/store.stats.totalBets)*100).toFixed(1)}%` : '0%', cls: 'text-[var(--a)]' },
                ].map(({ label, val, cls }) => (
                  <div key={label}>
                    <div className="text-[10px] text-[var(--t3)] uppercase tracking-wider mb-1">{label}</div>
                    <div className={cn('font-mono text-[13px] font-semibold', cls)}>{val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Strategy panel */}
            <AnimatePresence>
              {showStrategy && (
                <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}>
                  <StrategyPanel />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bet history */}
            <BetHistory />

            {/* Live Feed - Real-time WebSocket updates */}
            <LiveFeed mint={MINT} maxItems={15} />

            {/* Chat panel */}
            <AnimatePresence>
              {showChat && (
                <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}>
                  <DiceChat mint={MINT} />
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </main>
      </div>
    </div>
  )
}

export default dynamic(() => Promise.resolve(DiceClient), {
  ssr: false,
})
