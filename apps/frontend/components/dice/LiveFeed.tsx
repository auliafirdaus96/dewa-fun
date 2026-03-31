"use client";
import { useLiveFeed, LiveBet } from '../../hooks/useLiveFeed';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUp, ArrowDown, Wifi, WifiOff, Zap } from 'lucide-react';

interface LiveFeedProps {
  mint?: string;       // Filter by specific token; undefined = global feed
  maxItems?: number;
  className?: string;
}

function BetRow({ bet }: { bet: LiveBet }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12, backgroundColor: bet.won ? '#052e16' : '#2d0a04' }}
      animate={{ opacity: 1, y: 0, backgroundColor: 'transparent' }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04] text-xs group hover:bg-white/[0.02] transition-colors"
    >
      {/* Player + Mode */}
      <div className="flex items-center gap-2 min-w-0">
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${bet.won ? 'bg-emerald-400' : 'bg-red-400'}`} />
        <span className="font-mono text-zinc-500 truncate">{bet.player}</span>
        <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-bold uppercase">
          {bet.mode}
        </span>
      </div>

      {/* Direction + Threshold */}
      <div className="flex items-center gap-1 text-zinc-400 shrink-0 px-3">
        {bet.direction === 'UNDER'
          ? <ArrowDown className="w-3 h-3 text-blue-400" />
          : <ArrowUp className="w-3 h-3 text-orange-400" />
        }
        <span className="font-bold">{bet.threshold}</span>
        <span className="text-zinc-600 ml-1">→</span>
        <span className={`font-black ${bet.won ? 'text-emerald-400' : 'text-red-400'}`}>
          {bet.roll}
        </span>
      </div>

      {/* Amount + Payout */}
      <div className="text-right shrink-0">
        <div className={`font-black text-xs ${bet.won ? 'text-emerald-400' : 'text-zinc-500'}`}>
          {bet.won ? `+${(bet.payout - bet.amount).toFixed(4)}` : `-${bet.amount.toFixed(4)}`}
        </div>
        <div className="text-[9px] text-zinc-600">
          {bet.amount.toFixed(4)} bet
        </div>
      </div>
    </motion.div>
  );
}

export default function LiveFeed({ mint, maxItems = 20, className = '' }: LiveFeedProps) {
  const { bets, isConnected, clear } = useLiveFeed(mint, maxItems);

  return (
    <div className={`bg-[#0a0a0a] border border-white/5 rounded-3xl overflow-hidden flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-bold">Live Bets</span>
          {bets.length > 0 && (
            <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full font-bold">
              {bets.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {bets.length > 0 && (
            <button
              onClick={clear}
              className="text-[10px] text-zinc-600 hover:text-zinc-400 font-bold transition-colors"
            >
              Clear
            </button>
          )}
          <div className={`flex items-center gap-1.5 text-[10px] font-bold ${isConnected ? 'text-emerald-400' : 'text-zinc-500'}`}>
            {isConnected
              ? <><Wifi className="w-3 h-3" />LIVE</>
              : <><WifiOff className="w-3 h-3" />Connecting...</>
            }
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto max-h-[420px]">
        {bets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse mb-3" />
            <p className="text-zinc-600 text-xs">Waiting for bets...</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {bets.map((bet) => (
              <BetRow key={bet.id} bet={bet} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
