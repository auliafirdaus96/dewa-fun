// store/diceStore.ts
import { create } from 'zustand'

export type DiceMode  = 'MANUAL' | 'AUTO' | 'FLASH'
export type Direction = 'UNDER'  | 'OVER'
export type Strategy  = 'FLAT' | 'MARTINGALE' | 'PAROLI' | 'DALEMBERT'

interface BetResult {
  roll:       number
  won:        boolean
  amount:     number
  payout:     number
  profit:     number
  multiplier: number
  winChance:  number
}

interface SessionStats {
  totalBets:    number
  totalWins:    number
  totalLosses:  number
  totalWagered: number
  totalPayout:  number
  netProfit:    number
}

interface DiceState {
  // Config
  mode:        DiceMode
  direction:   Direction
  threshold:   number
  betAmount:   number
  strategy:    Strategy

  // Computed
  winChance:   number
  multiplier:  number

  // Session
  sessionId:       string | null
  serverSeedHash:  string | null
  clientSeed:      string | null
  nonce:           number

  // Live result
  lastRoll:    number | null
  lastWon:     boolean | null
  isRolling:   boolean
  isVrfWait:   boolean

  // Session stats (all-time in page)
  stats: SessionStats
  history: BetResult[]

  // Setters
  setMode:       (m: DiceMode)   => void
  setDirection:  (d: Direction)  => void
  setThreshold:  (t: number)     => void
  setBetAmount:  (a: number)     => void
  setStrategy:   (s: Strategy)   => void
  setIsRolling:  (v: boolean)    => void
  setIsVrfWait:  (v: boolean)    => void
  setLastResult: (roll: number, won: boolean) => void
  setSession:    (id: string, hash: string, cs: string, nonce: number) => void
  addResult:     (r: BetResult)  => void
  resetStats:    ()              => void
  calcOdds:      ()              => void
}

export const useDiceStore = create<DiceState>((set, get) => ({
  mode:      'MANUAL',
  direction: 'UNDER',
  threshold: 50,
  betAmount: 0.01,
  strategy:  'FLAT',
  winChance: 50,
  multiplier: 1.98,
  sessionId:      null,
  serverSeedHash: null,
  clientSeed:     null,
  nonce:          0,
  lastRoll: null,
  lastWon:  null,
  isRolling:  false,
  isVrfWait:  false,
  stats: { totalBets: 0, totalWins: 0, totalLosses: 0, totalWagered: 0, totalPayout: 0, netProfit: 0 },
  history: [],

  setMode:      (mode)      => set({ mode }),
  setDirection: (direction) => { set({ direction }); get().calcOdds() },
  setThreshold: (threshold) => { set({ threshold }); get().calcOdds() },
  setBetAmount: (betAmount) => { set({ betAmount }); get().calcOdds() },
  setStrategy:  (strategy)  => set({ strategy }),
  setIsRolling: (isRolling) => set({ isRolling }),
  setIsVrfWait: (isVrfWait)=> set({ isVrfWait }),

  setLastResult: (roll, won) => set({ lastRoll: roll, lastWon: won }),

  setSession: (sessionId, serverSeedHash, clientSeed, nonce) =>
    set({ sessionId, serverSeedHash, clientSeed, nonce }),

  addResult: (r) => set(s => ({
    history: [r, ...s.history].slice(0, 100),
    stats: {
      totalBets:    s.stats.totalBets    + 1,
      totalWins:    s.stats.totalWins    + (r.won ? 1 : 0),
      totalLosses:  s.stats.totalLosses  + (r.won ? 0 : 1),
      totalWagered: s.stats.totalWagered + r.amount,
      totalPayout:  s.stats.totalPayout  + r.payout,
      netProfit:    s.stats.netProfit    + r.profit,
    },
  })),

  resetStats: () => set({
    stats: { totalBets: 0, totalWins: 0, totalLosses: 0, totalWagered: 0, totalPayout: 0, netProfit: 0 },
    history: [],
  }),

  calcOdds: () => {
    const { direction, threshold } = get()
    const wc   = direction === 'UNDER' ? threshold / 100 : (100 - threshold - 1) / 100
    const mult = (1 / wc) * 0.99
    set({ winChance: parseFloat((wc * 100).toFixed(2)), multiplier: parseFloat(mult.toFixed(4)) })
  },
}))
