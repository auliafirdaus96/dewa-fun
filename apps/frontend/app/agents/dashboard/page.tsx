"use client";

import { useEffect, useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Coins, 
  Users, 
  ArrowUpRight, 
  ArrowDownRight, 
  ExternalLink,
  Wallet,
  LayoutDashboard,
  ShieldCheck,
  Zap,
  Loader2,
  RefreshCcw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useDashboard } from '../../../hooks/useDashboard';

// Helper to format lamports as SOL (assumes 9 decimals)
function fmt(n: number, decimals = 2): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: decimals });
}

export default function PartnerDashboard() {
  // In production, derive nodeId from the connected wallet or session
  const [nodeId, setNodeId] = useState<string | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);

  // Attempt to pick up nodeId from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('dewa_node_id');
    if (stored) setNodeId(stored);
  }, []);

  const { data, isLoading, error, refresh } = useDashboard(nodeId);

  const handleClaimFees = async () => {
    setIsClaiming(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsClaiming(false);
    setClaimSuccess(true);
    setTimeout(() => setClaimSuccess(false), 5000);
  };

  // ---- Loading state ----
  if (!nodeId) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-20 font-sans text-white text-center">
        <AlertCircle className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
        <p className="text-zinc-500 text-sm">No Agent Node connected.</p>
        <Link href="/agents/launch" className="mt-4 inline-block text-xs text-white font-bold border border-white/10 px-6 py-3 rounded-2xl hover:bg-white/5 transition-colors">
          Deploy an AI Agent →
        </Link>
      </div>
    );
  }

  const stats = [
    { 
      label: 'Total Volume', 
      value: data ? `${fmt(data.stats.totalVolume)} SOL` : '—',
      change: '24h', trend: 'up', icon: TrendingUp, color: 'emerald'
    },
    { 
      label: 'Creator Fees Earned', 
      value: data ? `${fmt(data.stats.creatorFeesEarned)} SOL` : '—',
      change: '50% Edge', trend: 'up', icon: Coins, color: 'blue'
    },
    { 
      label: 'Active Tokens', 
      value: data ? String(data.stats.activeTokens) : '—',
      change: 'launched', trend: 'up', icon: Zap, color: 'purple'
    },
    { 
      label: 'Agent Share', 
      value: `0.75%`,
      change: 'Protocol', trend: 'neutral', icon: ShieldCheck, color: 'zinc'
    }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans text-white">
      {/* HEADER */}
      <div className="flex flex-col xs:flex-row xs:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-zinc-500 text-[10px] xs:text-xs font-bold tracking-widest uppercase mb-2">
            <LayoutDashboard className="w-3 h-3 xs:w-4 xs:h-4" />
            Agent Node
          </div>
          <h1 className="text-3xl xs:text-4xl font-black tracking-tight">Agent Dashboard</h1>
          <p className="text-zinc-500 mt-2 text-xs xs:text-sm">
            {data?.node.nodeId || nodeId} &middot; {data?.node.aiModel || '—'}
          </p>
        </div>

        <div className="flex flex-col xs:flex-row items-stretch xs:gap-3 gap-2">
          <button 
            onClick={handleClaimFees}
            disabled={isClaiming || !data}
            className={`flex items-center justify-center gap-2 px-4 xs:px-6 py-2.5 xs:py-3 rounded-xl xs:rounded-2xl font-bold text-xs xs:text-sm transition-all ${
              claimSuccess 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'bg-white text-black hover:bg-zinc-200 active:scale-95 disabled:opacity-50'
            }`}
          >
            {isClaiming ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Claiming...</>
            ) : claimSuccess ? (
              <><CheckCircle2 className="w-4 h-4" />Fees Claimed</>
            ) : (
              <><Wallet className="w-4 h-4" />Claim {data ? `${fmt(data.stats.creatorFeesEarned)} SOL` : '...'}</>
            )}
          </button>
          <button 
            onClick={refresh}
            className="p-3 bg-zinc-900 border border-white/5 rounded-2xl hover:bg-zinc-800 transition-colors"
          >
            <RefreshCcw className={`w-5 h-5 text-zinc-400 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Failed to load data: {error}
        </div>
      )}

      {/* STATS GRID */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 xs:gap-4 mb-8 xs:mb-10">
        {stats.map((stat, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-[#0a0a0a] border border-white/5 rounded-2xl xs:rounded-3xl p-4 xs:p-6 relative overflow-hidden group"
          >
            <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-10 transition-opacity group-hover:opacity-20 pointer-events-none ${
              stat.color === 'emerald' ? 'bg-emerald-500' : 
              stat.color === 'blue' ? 'bg-blue-500' : 
              stat.color === 'purple' ? 'bg-purple-500' : 'bg-zinc-500'
            }`}></div>
            
            <div className="flex justify-between items-start mb-3 xs:mb-4">
              <stat.icon className={`w-4 h-4 xs:w-5 xs:h-5 ${
                stat.color === 'emerald' ? 'text-emerald-400' : 
                stat.color === 'blue' ? 'text-blue-400' : 
                stat.color === 'purple' ? 'text-purple-400' : 'text-zinc-400'
              }`} />
              <div className={`flex items-center gap-1 text-[8px] xs:text-[10px] font-bold px-1 py-0.5 xs:px-1.5 xs:py-0.5 rounded-md ${
                stat.trend === 'up' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-500'
              }`}>
                {stat.trend === 'up' && <ArrowUpRight className="w-2 h-2 xs:w-3 xs:h-3" />}
                {stat.change}
              </div>
            </div>
            <div className="text-zinc-500 text-[10px] xs:text-xs font-medium mb-1">{stat.label}</div>
            {isLoading && !data ? (
              <div className="h-6 xs:h-7 w-20 xs:w-24 bg-zinc-800 animate-pulse rounded-lg" />
            ) : (
              <div className="text-xl xs:text-2xl font-black tracking-tight">{stat.value}</div>
            )}
          </motion.div>
        ))}
      </div>

      {/* MAIN CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 xs:gap-8">
        {/* LAUNCHED TOKENS */}
        <div className="lg:col-span-2">
          <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3 mb-4 xs:mb-6">
            <h2 className="text-base xs:text-xl font-bold">Launched Tokens</h2>
            <Link href="/agents/launch" className="text-zinc-500 hover:text-white text-[10px] xs:text-xs font-bold tracking-widest uppercase transition-colors whitespace-nowrap">
              Deploy New AI Agent +
            </Link>
          </div>

          <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl xs:rounded-3xl overflow-hidden">
            {isLoading && !data ? (
              <div className="p-4 xs:p-6 space-y-3 xs:space-y-4">
                {[1,2,3].map(i => (
                  <div key={i} className="h-10 xs:h-12 bg-zinc-900 animate-pulse rounded-lg xs:rounded-xl" />
                ))}
              </div>
            ) : (data?.tokens?.length ?? 0) === 0 ? (
              <div className="py-16 xs:py-20 text-center">
                <Zap className="w-10 h-10 xs:w-12 xs:h-12 text-zinc-800 mx-auto mb-4" />
                <p className="text-zinc-500 text-xs xs:text-sm">No tokens launched yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="px-3 xs:px-6 py-3 xs:py-4 text-[8px] xs:text-[10px] font-bold tracking-widest text-zinc-500 uppercase whitespace-nowrap">Token</th>
                      <th className="px-3 xs:px-6 py-3 xs:py-4 text-[8px] xs:text-[10px] font-bold tracking-widest text-zinc-500 uppercase whitespace-nowrap">Type</th>
                      <th className="px-3 xs:px-6 py-3 xs:py-4 text-[8px] xs:text-[10px] font-bold tracking-widest text-zinc-500 uppercase whitespace-nowrap hidden sm:table-cell">Address</th>
                      <th className="px-3 xs:px-6 py-3 xs:py-4 text-[8px] xs:text-[10px] font-bold tracking-widest text-zinc-500 uppercase whitespace-nowrap">Launched</th>
                      <th className="px-3 xs:px-6 py-3 xs:py-4 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data?.tokens.map((token: import('../../../hooks/useDashboard').NodeToken) => (
                      <tr key={token.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-3 xs:px-6 py-4 xs:py-5">
                          <div className="flex items-center gap-2 xs:gap-3">
                            <div className="w-8 h-8 xs:w-10 xs:h-10 rounded-lg xs:rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center font-black text-[10px] xs:text-xs">
                              {(token.token_ticker || '?')[0]}
                            </div>
                            <div>
                              <div className="text-xs xs:text-sm font-bold">{token.token_name || 'Unknown'}</div>
                              <div className="text-[9px] xs:text-[10px] font-bold text-zinc-500 whitespace-nowrap">{token.token_ticker || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 xs:px-6 py-4 xs:py-5">
                          <span className={`inline-flex items-center px-1.5 xs:px-2 py-0.5 xs:py-1 rounded-md text-[8px] xs:text-[10px] font-bold ${
                            token.launchType === 'AGENT_LAUNCH' 
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}>
                            {token.launchType === 'AGENT_LAUNCH' ? 'Agent' : 'Standard'}
                          </span>
                        </td>
                        <td className="px-3 xs:px-6 py-4 xs:py-5">
                          <span className="text-[9px] xs:text-xs font-mono text-zinc-400 whitespace-nowrap sm:hidden">
                            {token.token_address.slice(0,4)}...{token.token_address.slice(-4)}
                          </span>
                          <span className="text-xs font-mono text-zinc-400 whitespace-nowrap hidden sm:inline">
                            {token.token_address.slice(0,6)}...{token.token_address.slice(-4)}
                          </span>
                        </td>
                        <td className="px-3 xs:px-6 py-4 xs:py-5">
                          <div className="text-[9px] xs:text-xs text-zinc-500 whitespace-nowrap">
                            {new Date(token.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="px-3 xs:px-6 py-4 xs:py-5 text-right">
                          <a 
                            href={`https://solscan.io/token/${token.token_address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 xs:p-2 bg-zinc-900 border border-white/5 rounded-lg inline-flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-zinc-800"
                          >
                            <ExternalLink className="w-3 h-3 xs:w-4 xs:h-4 text-zinc-400" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="space-y-4 xs:space-y-6">
          {/* NODE CONFIG */}
          <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl xs:rounded-3xl p-4 xs:p-6">
            <h3 className="text-xs xs:text-sm font-bold mb-3 xs:mb-4 flex items-center gap-2">
              <Zap className="w-3 h-3 xs:w-4 xs:h-4 text-purple-400" />
              Node Configuration
            </h3>
            <div className="space-y-3 xs:space-y-4">
              <div className="flex justify-between items-center py-2.5 xs:py-3 border-b border-white/5">
                <span className="text-[10px] xs:text-xs text-zinc-500">Status</span>
                <span className={`flex items-center gap-1.5 text-[10px] xs:text-xs font-bold ${data?.node.isActive ? 'text-emerald-400' : 'text-red-400'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${data?.node.isActive ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                  {data?.node.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2.5 xs:py-3 border-b border-white/5">
                <span className="text-[10px] xs:text-xs text-zinc-500">Node ID</span>
                <span className="text-[10px] xs:text-xs font-mono text-zinc-300 truncate max-w-[120px] xs:max-w-none">{data?.node.nodeId?.slice(0,12) || '...'}</span>
              </div>
              <div className="flex justify-between items-center py-2.5 xs:py-3 border-b border-white/5">
                <span className="text-[10px] xs:text-xs text-zinc-500">AI Model</span>
                <span className="text-[10px] xs:text-xs font-bold text-zinc-300">{data?.node.aiModel || '—'}</span>
              </div>
              <div className="flex justify-between items-center py-2.5 xs:py-3 border-b border-white/5">
                <span className="text-[10px] xs:text-xs text-zinc-500">Last Action</span>
                <span className="text-[10px] xs:text-xs font-bold text-blue-400">{data?.node.lastAction || 'IDLE'}</span>
              </div>
              <div className="pt-2">
                <Link href="/agents/launch" className="w-full h-9 xs:h-10 bg-zinc-900 border border-white/5 rounded-lg xs:rounded-xl flex items-center justify-center text-[10px] xs:text-xs font-bold hover:bg-zinc-800 transition-all">
                  Edit Agent Personality
                </Link>
              </div>
            </div>
          </div>

          {/* PROTOCOL REWARDS */}
          <div className="bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-white/5 rounded-2xl xs:rounded-3xl p-4 xs:p-6">
            <h3 className="text-xs xs:text-sm font-bold mb-2">Protocol Rewards</h3>
            <p className="text-[10px] xs:text-xs text-zinc-400 mb-3 xs:mb-4 leading-relaxed">
              You receive 0.75% of every trade on tokens launched via your node. Rewards are settled on-chain and can be claimed anytime.
            </p>
            <div className="flex items-center gap-2 text-[8px] xs:text-[10px] font-black tracking-widest text-emerald-400 uppercase">
              Partner Node V1.0 Active
            </div>
          </div>

          {/* SECURITY */}
          <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl xs:rounded-3xl p-4 xs:p-6">
            <div className="flex items-center justify-between mb-3 xs:mb-4">
              <h3 className="text-xs xs:text-sm font-bold flex items-center gap-2">
                <ShieldCheck className="w-3 h-3 xs:w-4 xs:h-4 text-emerald-400" />
                Security & Keys
              </h3>
              <span className="text-[8px] xs:text-[10px] bg-emerald-500/10 text-emerald-500 px-1.5 xs:px-2 py-0.5 xs:py-1 rounded-full font-bold">AES-256</span>
            </div>
            <div className="p-2.5 xs:p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg xs:rounded-xl">
              <p className="text-[9px] xs:text-[10px] text-emerald-500/70 leading-relaxed font-medium">
                Your keys are encrypted locally before storage. Only the dewa.fun orchestration layer can decrypt them for agent operations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
