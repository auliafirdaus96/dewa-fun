"use client";

import { useState } from 'react';
import { Image as ImageIcon, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from 'next/navigation';
import { getFeeShareConfig, createBagsLaunchTransaction } from '@/utils/bags';
import { useWallet } from '@solana/wallet-adapter-react';


export default function CreatePage() {
  const router = useRouter();
  const { publicKey } = useWallet();

  // ... (skipped for readability, assuming existing state)
  const [showSocials, setShowSocials] = useState(false);
  const [showInitialBuy, setShowInitialBuy] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    ticker: '',
    description: '',
    website: '',
    twitter: '',
    telegram: '',
    initialBuy: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLaunch = async () => {
    if (!formData.name || !formData.ticker || !formData.description) {
      alert("Please fill in the required fields (Name, Ticker, Description).");
      return;
    }

    setIsLoading(true);

    try {
      if (!publicKey) {
        alert("Please connect your wallet first.");
        return;
      }

      // 1. Prepare fee share config (Standard B2C)
      const feeShareConfig = getFeeShareConfig('standard', publicKey.toBase58());


      // 2. Prepare the payload for bags.fm API
      const payload = {
        name: formData.name,
        symbol: formData.ticker,
        description: formData.description,
        extensions: {
          website: formData.website,
          twitter: formData.twitter,
          telegram: formData.telegram,
        },
        initialBuyAmount: formData.initialBuy ? parseFloat(formData.initialBuy) : 0,
        feeShareConfig // Integrasi BPS: 5,000 Protokol / 5,000 Kreator
      };

      // 3. Call the bags.fm SDK utility
      const { success, tokenAddress } = await createBagsLaunchTransaction(payload);
      
      if (!success) throw new Error("Launch failed");

      // 4. Redirect to the new token page
      router.push(`/token/${tokenAddress}`);

    } catch (error) {
      console.error("Launch failed:", error);
      alert("Failed to launch token. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[500px] mx-auto font-sans pt-12 pb-20">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-[32px] font-bold text-white tracking-tight mb-3">Launch something new</h1>
        <p className="text-zinc-300 text-sm">List your project. Trade shares. Get funded.</p>
      </div>

      <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-6 shadow-2xl">
        
        {/* PROJECT INFO */}
        <div>
          <div className="text-[10px] font-medium tracking-widest text-zinc-300 uppercase mb-4">
            Project Info
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 mb-3">
            {/* Image Upload */}
            <div className="w-full sm:w-[120px] h-[120px] shrink-0 rounded-2xl border border-dashed border-zinc-700 bg-transparent flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-white/5 transition-colors">
              <ImageIcon className="w-6 h-6 text-zinc-400 stroke-[1.5]" />
              <span className="text-[8px] font-bold tracking-widest text-zinc-400 uppercase">Upload Image</span>
            </div>
            
            {/* Name and Ticker */}
            <div className="flex-1 flex flex-col gap-3">
              <input 
                type="text" 
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full h-[54px] bg-[#141414] border border-white/5 rounded-2xl px-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/20 transition-all" 
                placeholder="Name" 
              />
              <input 
                type="text" 
                name="ticker"
                value={formData.ticker}
                onChange={handleChange}
                className="w-full h-[54px] bg-[#141414] border border-white/5 rounded-2xl px-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/20 transition-all" 
                placeholder="Ticker" 
              />
            </div>
          </div>

          <textarea 
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full bg-[#141414] border border-white/5 rounded-2xl px-4 py-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/20 transition-all h-[100px] resize-none" 
            placeholder="Description"
          ></textarea>
        </div>

        {/* SOCIAL LINKS */}
        <div className="mt-6">
          <div 
            className="flex items-center gap-2 text-[10px] font-medium tracking-widest text-zinc-300 uppercase mb-4 cursor-pointer hover:text-white transition-colors"
            onClick={() => setShowSocials(!showSocials)}
          >
            Social Links (Optional)
            {showSocials ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </div>
          
          <AnimatePresence>
            {showSocials && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-col gap-3 pb-2">
                  <input 
                    type="text" 
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    className="w-full h-[54px] bg-[#141414] border border-white/5 rounded-2xl px-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/20 transition-all" 
                    placeholder="Website link (optional)" 
                  />
                  <input 
                    type="text" 
                    name="twitter"
                    value={formData.twitter}
                    onChange={handleChange}
                    className="w-full h-[54px] bg-[#141414] border border-white/5 rounded-2xl px-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/20 transition-all" 
                    placeholder="Twitter/X link (optional)" 
                  />
                  <input 
                    type="text" 
                    name="telegram"
                    value={formData.telegram}
                    onChange={handleChange}
                    className="w-full h-[54px] bg-[#141414] border border-white/5 rounded-2xl px-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/20 transition-all" 
                    placeholder="Telegram link (optional)" 
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* INITIAL BUY */}
        <div className="mt-6">
          <div 
            className="flex items-center gap-2 text-[10px] font-medium tracking-widest text-zinc-300 uppercase mb-4 cursor-pointer hover:text-white transition-colors"
            onClick={() => setShowInitialBuy(!showInitialBuy)}
          >
            Initial Buy (Optional)
            {showInitialBuy ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </div>
          
          <AnimatePresence>
            {showInitialBuy && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pb-2">
                  <div className="relative">
                    <input 
                      type="number" 
                      name="initialBuy"
                      value={formData.initialBuy}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      className="w-full h-[54px] bg-[#141414] border border-white/5 rounded-2xl pl-4 pr-12 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/20 transition-all" 
                      placeholder="0.00" 
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-medium">
                      SOL
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500 mt-2 px-1">
                    Be the first to buy your token. This helps protect against snipers.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* FEE DISTRIBUTION INFO */}
        <div className="mt-6 bg-black/30 border border-white/5 rounded-2xl p-5">
          <div className="text-[10px] font-medium tracking-widest text-zinc-500 uppercase mb-4">Fee Distribution</div>
          <div className="flex justify-between text-sm mb-3">
            <span className="text-zinc-500">Total Trading Fee</span>
            <span className="text-white font-medium">1.0%</span>
          </div>
          <div className="flex justify-between text-sm mb-3">
            <span className="text-zinc-500">Protocol Treasury</span>
            <span className="text-zinc-300 font-medium">0.5%</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Creator Fee</span>
            <span className="text-white font-medium">0.5%</span>
          </div>
        </div>

        <button 
          onClick={handleLaunch}
          disabled={isLoading}
          className="w-full mt-8 bg-white text-black rounded-2xl px-4 py-4 text-sm font-bold hover:bg-zinc-200 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Launching...
            </>
          ) : (
            "Launch Project"
          )}
        </button>
      </div>
    </div>
  );
}
