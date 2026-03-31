"use client";

import { useState } from 'react';
import { Rocket, Shield, Globe, Cpu, Key, CheckCircle2, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { getFeeShareConfig, createBagsLaunchTransaction } from '@/utils/bags';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { useWallet } from '@solana/wallet-adapter-react';


export default function AgentLaunchPage() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    personality: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLaunch = async () => {
    if (!publicKey) {
      alert("Please connect your wallet first.");
      return;
    }

    if (!formData.name) {
      alert("Please fill in the Platform Name.");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Prepare fee share config (Partner B2B2C)
      // Use the actual connected wallet and the protocol treasury address
      const userWallet = publicKey.toBase58();
      const protocolTreasury = process.env.NEXT_PUBLIC_PROTOCOL_TREASURY_ADDRESS || "G5cge6WWWcEvBQj5nqvmR2DaLKa3ojicbp8rjNk8KXun";
      
      const feeShareConfig = getFeeShareConfig('partner', userWallet, protocolTreasury);

      // 2. Prepare payload
      const payload = {
        name: formData.name,
        symbol: "AGENT",
        description: formData.personality,
        feeShareConfig 
      };

      // 3. Call Bags.fm SDK utility
      const { success } = await createBagsLaunchTransaction(payload);
      
      if (!success) throw new Error("Launch failed");

      alert("Partner Node Deployed Successfully! Redirecting to Profile...");
      router.push('/dashboard');

    } catch (error) {
      console.error("Launch failed:", error);
      alert("Failed to deploy partner node.");
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
          <div className="w-full max-w-xl mx-auto font-sans pt-8 pb-20">
            <div className="text-center mb-10">
              <h1 className="text-4xl font-bold text-white tracking-tight mb-3">Deploy Partner Node</h1>
              <p className="text-zinc-400">Launch your own white-labeled token platform powered by an AI CEO.</p>
            </div>

            <div className="bg-[#111111] border border-white/10 rounded-3xl p-6 md:p-8 flex flex-col gap-8 shadow-2xl relative overflow-hidden">
              {/* Decorative background glow */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 blur-[100px] rounded-full pointer-events-none"></div>

              <div className="relative z-10">
                <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/10 text-xs text-white">1</span>
                  Platform Branding
                </h2>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Platform Name</label>
                    <input 
                      type="text" 
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all" 
                      placeholder="e.g. ChadPad, Based.fun" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">AI CEO Personality</label>
                    <textarea 
                      name="personality"
                      value={formData.personality}
                      onChange={handleChange}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all h-32 resize-none" 
                      placeholder="Define how your AI CEO interacts with users..."
                    ></textarea>
                  </div>
                </div>
              </div>
              
              <div className="relative z-10 mt-2 bg-black/30 border border-white/5 rounded-2xl p-5">
                <div className="text-sm font-medium text-zinc-400 mb-4">Global Fee Routing</div>
                <div className="flex justify-between text-sm mb-3">
                  <span className="text-zinc-500">Total Trading Fee</span>
                  <span className="text-white font-medium">1.0%</span>
                </div>
                <div className="flex justify-between text-sm mb-3">
                  <span className="text-zinc-500">dewa.fun Protocol Fee</span>
                  <span className="text-zinc-300 font-medium">0.25%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Your Partner Fee</span>
                  <span className="text-white font-medium">0.75%</span>
                </div>
              </div>

              <button 
                onClick={handleLaunch}
                disabled={isLoading}
                className="relative z-10 w-full mt-2 bg-white text-black rounded-xl px-4 py-4 text-base font-semibold hover:bg-zinc-200 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Deploying Node...
                  </>
                ) : (
                  "Generate SDK & Deploy Node"
                )}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
