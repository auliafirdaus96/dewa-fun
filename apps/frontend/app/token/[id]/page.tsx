"use client";

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Settings, ArrowDownUp, Clock, Users, Globe, Twitter, MessageCircle, Activity, Info, Dice5, Lock, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { createChart, ColorType, Time, CandlestickSeries } from 'lightweight-charts';
import { sampleTokens } from '@/data/tokens';
import { motion, AnimatePresence } from 'framer-motion';

export default function TokenPage() {
  const params = useParams();
  const id = params?.id as string;
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [activeTab, setActiveTab] = useState<'chart' | 'txs' | 'holders'>('chart');
  const [timeframe, setTimeframe] = useState<'1m' | '5m' | '15m' | '1h' | '4h' | '1d'>('1h');
  const [isTrading, setIsTrading] = useState(false);
  const [tradeMessage, setTradeMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
  const [slippage, setSlippage] = useState('1.0');
  const [showSettings, setShowSettings] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // DICE VAULT (CREATOR OVERRIDE) MOCK STATE
  const [vaultStatus, setVaultStatus] = useState<'UNFUNDED' | 'FUNDING' | 'ACTIVE'>('UNFUNDED');
  const [depositAmount, setDepositAmount] = useState('1000000');

  // Get actual token data
  const tokenData = sampleTokens.find(t => t.id === id);
  const token = tokenData ? {
    ...tokenData,
    price: "$0.0000152",
    change24h: "+24.5%",
    volume24h: "$4.5K",
    holders: 142,
    address: id || "7xKX...3b9P",
  } : {
    name: "Unknown Token",
    ticker: "UNKNOWN",
    price: "$0.0000000",
    change24h: "0.0%",
    marketCap: "$0K",
    volume24h: "$0K",
    holders: 0,
    address: id || "7xKX...3b9P",
    description: "Token not found.",
    logo: "https://picsum.photos/seed/unknown/150/150",
    creator: "Unknown",
    replies: 0,
    progress: 0
  };

  useEffect(() => {
    if (!chartContainerRef.current || activeTab !== 'chart') return;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#71717a',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#f43f5e',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#f43f5e',
    });

    const data = [];
    let currentPrice = 0.0000152;
    
    // Calculate seconds per candle based on timeframe
    const timeframeToSeconds: Record<string, number> = {
      '1m': 60,
      '5m': 300,
      '15m': 900,
      '1h': 3600,
      '4h': 14400,
      '1d': 86400,
    };
    const secondsPerCandle = timeframeToSeconds[timeframe] || 3600;
    
    let currentTime = Math.floor(Date.now() / 1000) - 50 * secondsPerCandle;
    for (let i = 0; i < 50; i++) {
      const open = currentPrice;
      const close = open + (Math.random() - 0.45) * 0.000002;
      const high = Math.max(open, close) + Math.random() * 0.000001;
      const low = Math.min(open, close) - Math.random() * 0.000001;
      data.push({ time: currentTime as Time, open, high, low, close });
      currentPrice = close;
      currentTime += secondsPerCandle;
    }

    candlestickSeries.setData(data);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [activeTab, timeframe]);

  const handleTrade = async () => {
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setTradeMessage({ type: 'error', text: 'Please enter a valid amount' });
      return;
    }

    setIsTrading(true);
    setTradeMessage(null);

    try {
      // Placeholder for bags.fm SDK call
      // e.g., await bags.swap({ tokenAddress: id, amount: numAmount, side: tradeType });
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate network latency

      setTradeMessage({
        type: 'success',
        text: `Successfully ${tradeType === 'buy' ? 'bought' : 'sold'} ${tradeType === 'buy' ? token.ticker : 'SOL'}!`
      });
      setAmount('');
    } catch (error) {
      setTradeMessage({
        type: 'error',
        text: 'Transaction failed. Please try again.'
      });
    } finally {
      setIsTrading(false);
    }
  };

  const handleActivateCasino = async () => {
    if (!depositAmount || Number(depositAmount) < 10000) return;
    setVaultStatus('FUNDING');
    // Mock Solana PDA transaction delay
    setTimeout(() => {
      setVaultStatus('ACTIVE');
    }, 2500);
  };


  return (
    <div className="w-full max-w-[1200px] mx-auto font-sans pt-6 pb-20 px-4">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </Link>
          <div className="w-12 h-12 rounded-full bg-zinc-800 border border-white/10 overflow-hidden shrink-0 relative">
            <Image src={token.logo} alt={token.name} fill className="object-cover" referrerPolicy="no-referrer" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">{token.name}</h1>
              <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-white/10 text-zinc-300">
                ${token.ticker}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm mt-1">
              <span className="text-zinc-400 font-mono">{token.address}</span>
              <div className="flex gap-2">
                <Globe className="w-4 h-4 text-zinc-500 hover:text-white cursor-pointer transition-colors" />
                <Twitter className="w-4 h-4 text-zinc-500 hover:text-white cursor-pointer transition-colors" />
                <MessageCircle className="w-4 h-4 text-zinc-500 hover:text-white cursor-pointer transition-colors" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-6 bg-[#0a0a0a] border border-white/5 rounded-2xl p-4">
          <div>
            <div className="text-[10px] font-medium tracking-widest text-zinc-500 uppercase mb-1">Price</div>
            <div className="text-lg font-bold text-white">{token.price}</div>
          </div>
          <div>
            <div className="text-[10px] font-medium tracking-widest text-zinc-500 uppercase mb-1">24h Change</div>
            <div className="text-lg font-bold text-emerald-400">{token.change24h}</div>
          </div>
          <div>
            <div className="text-[10px] font-medium tracking-widest text-zinc-500 uppercase mb-1">Market Cap</div>
            <div className="text-lg font-bold text-white">{token.marketCap}</div>
          </div>
          <div className="hidden sm:block">
            <div className="text-[10px] font-medium tracking-widest text-zinc-500 uppercase mb-1">Volume</div>
            <div className="text-lg font-bold text-white">{token.volume24h}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: CHART & INFO */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* CHART AREA */}
          <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-1 overflow-hidden shadow-2xl flex flex-col h-[500px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-b border-white/5">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setActiveTab('chart')}
                  className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'chart' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  <div className="flex items-center gap-2"><Activity className="w-4 h-4" /> Chart</div>
                </button>
                <button 
                  onClick={() => setActiveTab('txs')}
                  className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'txs' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> Transactions</div>
                </button>
                <button 
                  onClick={() => setActiveTab('holders')}
                  className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'holders' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  <div className="flex items-center gap-2"><Users className="w-4 h-4" /> Holders</div>
                </button>
              </div>

              {activeTab === 'chart' && (
                <div className="flex items-center gap-1 bg-[#141414] p-1 rounded-xl border border-white/5">
                  {(['1m', '5m', '15m', '1h', '4h', '1d'] as const).map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all ${timeframe === tf ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      {tf.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 p-4">
              {activeTab === 'chart' && (
                <div className="w-full h-full" ref={chartContainerRef} />
              )}
              
              {activeTab === 'txs' && (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                  <Clock className="w-8 h-8 mb-3 opacity-50" />
                  <p>Recent transactions will appear here</p>
                </div>
              )}

              {activeTab === 'holders' && (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                  <Users className="w-8 h-8 mb-3 opacity-50" />
                  <p>Top holders will appear here</p>
                </div>
              )}
            </div>
          </div>

          {/* ABOUT SECTION */}
          <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-[10px] font-medium tracking-widest text-zinc-300 uppercase mb-4">
              <Info className="w-3 h-3" /> About {token.name}
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed">
              {token.description}
            </p>
          </div>

          {/* CREATOR CASINO ACTIVATION (MOCK CREATOR VIEW) */}
          <div className="bg-[#050505] border border-green-900/40 rounded-3xl p-6 shadow-[0_0_30px_rgba(0,0,0,0.8)] relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #0f0 2px, #0f0 4px)', backgroundSize: '100% 4px' }}></div>
            
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="bg-green-500/10 p-3 rounded-xl border border-green-500/30">
                  <Dice5 className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg flex items-center gap-2">
                    Dice Game Utility
                    <span className="text-[9px] font-black tracking-widest bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-sm">CREATOR ONLY</span>
                  </h3>
                  <p className="text-zinc-500 text-xs mt-1">Activate the on-chain casino to give your token instant utility.</p>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-[10px] font-bold tracking-widest px-3 py-1 rounded-full border ${vaultStatus === 'ACTIVE' ? 'bg-green-500/10 border-green-500/50 text-green-400' : 'bg-zinc-900 border-zinc-700 text-zinc-500'}`}>
                  {vaultStatus === 'ACTIVE' ? '🟢 CASINO LIVE' : '🔴 OFFLINE'}
                </div>
              </div>
            </div>

            <div className="relative z-10">
              <AnimatePresence mode="wait">
                {vaultStatus === 'UNFUNDED' && (
                  <motion.div 
                    key="unfunded"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex flex-col gap-4"
                  >
                    <div className="bg-black border border-green-900/30 rounded-2xl p-4">
                       <label className="text-xs text-zinc-400 font-bold mb-2 block">Initial Bankroll Deposit (Min. 10,000 {token.ticker})</label>
                       <div className="flex items-center gap-3">
                         <div className="flex-1 bg-[#111] border border-zinc-800 rounded-xl px-4 py-3 flex justify-between focus-within:border-green-500/50 transition-colors">
                           <input 
                             type="number" 
                             value={depositAmount} 
                             onChange={(e) => setDepositAmount(e.target.value)}
                             className="bg-transparent text-white font-mono font-bold w-full focus:outline-none placeholder-zinc-700"
                           />
                           <span className="text-zinc-500 font-bold">{token.ticker}</span>
                         </div>
                       </div>
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-zinc-500 bg-green-500/5 border border-green-900/30 p-3 rounded-xl">
                      <Lock className="w-4 h-4 text-green-500 shrink-0" />
                      <p>Tokens will be locked in the Smart Contract PDA Vault. As Creator, you earn <strong>50% of the House Edge</strong> for providing liquidity.</p>
                    </div>

                    <button 
                      onClick={handleActivateCasino}
                      className="w-full bg-green-500 hover:bg-green-400 text-black font-black text-sm py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(34,197,94,0.2)]"
                    >
                      [ ACTIVATE DICE CASINO ]
                    </button>
                  </motion.div>
                )}

                {vaultStatus === 'FUNDING' && (
                  <motion.div 
                    key="funding"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-8 text-center"
                  >
                    <div className="w-12 h-12 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin mb-4 mx-auto"></div>
                    <div className="text-green-400 font-mono font-bold text-sm">INITIALIZING PDA VAULT...</div>
                    <div className="text-zinc-500 text-xs mt-2">Awaiting Solana network confirmation</div>
                  </motion.div>
                )}

                {vaultStatus === 'ACTIVE' && (
                  <motion.div 
                    key="active"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-green-500/5 border border-green-500/20 rounded-2xl p-5"
                  >
                    <div className="flex items-center gap-3 text-green-400 mb-4">
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      <span className="font-bold">PDA Vault Initialized Successfully</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-black/50 border border-green-900/30 rounded-xl p-3">
                         <div className="text-[10px] text-zinc-500 font-bold mb-1">YOUR VAULT LIQUIDITY</div>
                         <div className="text-white font-mono font-bold">{Number(depositAmount).toLocaleString()} {token.ticker}</div>
                      </div>
                      <div className="bg-black/50 border border-green-900/30 rounded-xl p-3">
                         <div className="text-[10px] text-zinc-500 font-bold mb-1">HOUSE EDGE REVENUE</div>
                         <div className="text-emerald-400 font-mono font-bold">+0.00 {token.ticker}</div>
                      </div>
                    </div>
                    <Link href={`/games/dice/${id}`} className="block w-full text-center bg-[#111] hover:bg-zinc-800 text-white border border-zinc-700 font-bold text-sm py-3 rounded-xl transition-colors">
                      Test Dice Game
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SWAP INTERFACE */}
        <div className="lg:col-span-1">
          <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-6 shadow-2xl sticky top-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex bg-[#141414] rounded-xl p-1 border border-white/5">
                <button 
                  onClick={() => setTradeType('buy')}
                  className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${tradeType === 'buy' ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Buy
                </button>
                <button 
                  onClick={() => setTradeType('sell')}
                  className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${tradeType === 'sell' ? 'bg-rose-500/20 text-rose-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Sell
                </button>
              </div>
              <div className="relative">
                <button onClick={() => setShowSettings(!showSettings)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <Settings className="w-5 h-5 text-zinc-400" />
                </button>
                {showSettings && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-[#1a1a1a] border border-white/10 rounded-xl p-3 shadow-xl z-50">
                    <div className="text-xs font-medium text-white mb-2">Slippage Tolerance</div>
                    <div className="flex gap-2">
                      {['0.5', '1.0', '5.0'].map(val => (
                        <button key={val} onClick={() => setSlippage(val)} className={`flex-1 py-1 rounded-md text-xs ${slippage === val ? 'bg-emerald-500 text-black' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}>
                          {val}%
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 flex items-center gap-2 bg-black/50 rounded-md px-2 py-1 border border-white/5">
                      <input type="number" value={slippage} onChange={e => setSlippage(e.target.value)} className="bg-transparent w-full text-xs text-white focus:outline-none" />
                      <span className="text-xs text-zinc-500">%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {/* Input */}
              <div className="bg-[#141414] border border-white/5 rounded-2xl p-4 transition-all focus-within:border-white/20">
                <div className="flex justify-between text-xs text-zinc-500 mb-2">
                  <span>You pay</span>
                  <span>Balance: 0.00 {tradeType === 'buy' ? 'SOL' : token.ticker}</span>
                </div>
                <div className="flex items-center justify-between">
                  <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="bg-transparent text-3xl font-bold text-white placeholder:text-zinc-700 focus:outline-none w-full"
                    placeholder="0.0"
                  />
                  <div className="flex items-center gap-2 bg-[#222] rounded-xl px-3 py-1.5 shrink-0">
                    {tradeType === 'buy' ? (
                      <span className="text-sm font-bold text-white">SOL</span>
                    ) : (
                      <span className="text-sm font-bold text-white">{token.ticker}</span>
                    )}
                  </div>
                </div>
                {tradeType === 'sell' && (
                  <div className="flex gap-2 mt-3">
                    {['25%', '50%', '75%', '100%'].map((pct) => (
                      <button key={pct} className="flex-1 bg-white/5 hover:bg-white/10 rounded-lg py-1 text-xs font-medium text-zinc-400 transition-colors">
                        {pct}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-center -my-2 z-10">
                <div className="bg-[#0a0a0a] border border-white/5 rounded-full p-2">
                  <ArrowDownUp className="w-4 h-4 text-zinc-500" />
                </div>
              </div>

              {/* Output */}
              <div className="bg-[#141414] border border-white/5 rounded-2xl p-4">
                <div className="flex justify-between text-xs text-zinc-500 mb-2">
                  <span>You receive (estimated)</span>
                  <span>Slippage: {slippage}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <input 
                    type="text" 
                    readOnly
                    value={amount ? (Number(amount) * (tradeType === 'buy' ? 15000 : 0.000066)).toFixed(2) : ''}
                    className="bg-transparent text-3xl font-bold text-zinc-400 focus:outline-none w-full"
                    placeholder="0.0"
                  />
                  <div className="flex items-center gap-2 bg-[#222] rounded-xl px-3 py-1.5 shrink-0">
                    {tradeType === 'buy' ? (
                      <span className="text-sm font-bold text-white">{token.ticker}</span>
                    ) : (
                      <span className="text-sm font-bold text-white">SOL</span>
                    )}
                  </div>
                </div>
              </div>

              <button 
                onClick={handleTrade}
                disabled={isTrading || !amount}
                className={`w-full mt-4 rounded-2xl px-4 py-4 text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none ${
                  tradeType === 'buy' 
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-black' 
                    : 'bg-rose-500 hover:bg-rose-400 text-white'
                }`}
              >
                {isTrading ? 'Processing Trade...' : 'Place Trade'}
              </button>

              {tradeMessage && (
                <div className={`mt-2 p-3 rounded-xl text-sm text-center ${
                  tradeMessage.type === 'success' 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  {tradeMessage.text}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
