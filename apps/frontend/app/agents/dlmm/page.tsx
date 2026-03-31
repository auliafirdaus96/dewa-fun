"use client";

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { kms } from '@/services/KmsService';
import { LineChart, BarChart2, Shield, Zap, Info, TrendingUp } from 'lucide-react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { DlmmChat } from '@/components/agents/DlmmChat';
import toast from 'react-hot-toast';

export default function AgentDLMMPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isActivated, setIsActivated] = useState(false);
  const [nodeId, setNodeId] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('dewa_node_id') || 'agent_demo';
    setNodeId(stored);
  }, []);

  const handleActivate = async () => {
    if (!nodeId || !apiKey) {
      toast.error('Please enter your API Key');
      return;
    }
    setIsLoading(true);
    try {
      // 1. Encrypt key before sending
      const encryptedApiKey = await kms.encrypt(apiKey);

      const res = await fetch('/api/agent/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId, feature: 'dlmm', active: true, encryptedApiKey })
      });
      if (res.ok) {
        setIsActivated(true);
        toast.success('Agent DLMM Activated!');
      }
    } catch (err) {
      toast.error('Failed to activate agent');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black font-mono">
      <Header onMenuClick={() => setSidebarOpen(o => !o)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 overflow-y-auto p-6 md:p-10">
          <div className="max-w-4xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black tracking-widest uppercase mb-4">
                <TrendingUp size={12} /> Liquidity Protocol AI
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-4">
                Agent DLMM
              </h1>
              <p className="text-zinc-500 text-lg max-w-2xl leading-relaxed">
                Autonomous Dynamic Liquidity Market Maker. Optimize your token's depth, minimize slippage, and earn maximum fees from every trade.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              {[
                { 
                  title: 'Dynamic Rebalancing', 
                  desc: 'Automatically adjusts liquidity bins based on price volatility to keep your pool in-range.',
                  icon: LineChart,
                  color: 'text-emerald-400'
                },
                { 
                  title: 'Anti-Arbitrage Shield', 
                  desc: 'Protects LPs from toxic flow and sandwich attacks using proprietary predictive algorithms.',
                  icon: Shield,
                  color: 'text-red-400'
                },
                { 
                  title: 'Volume Generation', 
                  desc: 'Ethical market making to ensure organic-looking price action and sustained volume.',
                  icon: BarChart2,
                  color: 'text-blue-400'
                },
                { 
                  title: 'Flash Management', 
                  desc: 'Deploy instant liquidity for sudden volume spikes without permanent loss exposure.',
                  icon: Zap,
                  color: 'text-yellow-400'
                }
              ].map((feature, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="p-6 rounded-3xl bg-[#0a0a0a] border border-white/5 hover:border-white/10 transition-all group"
                >
                  <feature.icon className={`w-8 h-8 ${feature.color} mb-4 group-hover:scale-110 transition-transform`} />
                  <h3 className="text-white font-bold text-lg mb-2">{feature.title}</h3>
                  <p className="text-zinc-500 text-sm leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className={`p-8 rounded-[40px] overflow-hidden relative transition-all ${isActivated ? 'bg-blue-600' : 'bg-gradient-to-br from-emerald-600 to-teal-700'} text-white`}
            >
              <div className="relative z-10">
                <h2 className="text-2xl font-black mb-2">
                  {isActivated ? 'DLMM Manager Active' : 'Optimize Liquidity'}
                </h2>
                <p className="text-emerald-100/80 mb-6 max-w-md">
                  {isActivated ? 'AI is now rebalancing bins and providing depth.' : 'Enter your OpenAI or Anthropic API Key to activate autonomous market making.'}
                </p>
                {!isActivated && (
                  <div className="mb-6">
                    <input 
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full max-w-sm bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/40 transition-all mb-2"
                    />
                    <p className="text-[10px] text-emerald-200/50 uppercase tracking-widest font-bold">Encrypted via Dewa KMS</p>
                  </div>
                )}
                <button 
                  onClick={handleActivate}
                  disabled={isLoading || isActivated}
                  className="bg-white text-black font-black px-8 py-4 rounded-2xl hover:bg-zinc-100 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isLoading ? 'ACTIVATING...' : isActivated ? '✓ DLMM ACTIVE' : 'ACTIVATE AGENT DLMM'}
                </button>
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[80px] -mr-20 -mt-20"></div>
            </motion.div>

            {/* DLMM Chat Interface */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <DlmmChat />
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}
