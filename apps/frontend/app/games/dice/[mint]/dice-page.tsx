"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { ManualMode } from '@/components/dice/ManualMode';
import { AutoMode } from '@/components/dice/AutoMode';
import { FlashMode } from '@/components/dice/FlashMode';
import { Zap, RotateCcw, Play } from 'lucide-react';

type DiceMode = 'MANUAL' | 'AUTO' | 'FLASH';

export default function DiceGamePage() {
  const params = useParams();
  const mint = (params?.mint as string) || 'So11111111111111111111111111111111111111112'; // SOL
  const [mode, setMode] = useState<DiceMode>('MANUAL');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleBetPlaced = (result: any) => {
    console.log('Bet placed:', result);
    // TODO: Handle bet result
  };

  const handleSessionStart = (sessionId: string) => {
    console.log('Session started:', sessionId);
    // TODO: Handle session start
  };

  const handleFlashComplete = (results: any) => {
    console.log('Flash complete:', results);
    // TODO: Handle flash results
  };

  return (
    <div className="flex flex-col h-screen bg-black">
      <Header onMenuClick={() => setSidebarOpen(o => !o)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <h1 className="text-4xl font-black text-white mb-2">🎲 Dice Casino</h1>
              <p className="text-gray-400">Provably fair dice game with 1% house edge</p>
            </motion.div>

            {/* Mode Selector */}
            <div className="flex bg-gray-900 rounded-xl p-2 gap-2 mb-8 border border-gray-800">
              <button
                onClick={() => setMode('MANUAL')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all ${
                  mode === 'MANUAL'
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                    : 'text-gray-400 hover:bg-gray-800'
                }`}
              >
                <Play size={18} />
                MANUAL
              </button>
              <button
                onClick={() => setMode('AUTO')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all ${
                  mode === 'AUTO'
                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                    : 'text-gray-400 hover:bg-gray-800'
                }`}
              >
                <RotateCcw size={18} />
                AUTO
              </button>
              <button
                onClick={() => setMode('FLASH')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all ${
                  mode === 'FLASH'
                    ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/30'
                    : 'text-gray-400 hover:bg-gray-800'
                }`}
              >
                <Zap size={18} />
                FLASH
              </button>
            </div>

            {/* Game Components */}
            {mode === 'MANUAL' && (
              <ManualMode mint={mint} onBetPlaced={handleBetPlaced} />
            )}
            
            {mode === 'AUTO' && (
              <AutoMode mint={mint} onSessionStart={handleSessionStart} />
            )}
            
            {mode === 'FLASH' && (
              <FlashMode mint={mint} onFlashComplete={handleFlashComplete} />
            )}

            {/* Info Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                <h3 className="text-white font-bold mb-2">🔒 Provably Fair</h3>
                <p className="text-gray-400 text-sm">
                  All bets use cryptographic randomness. Verify fairness anytime with seed revelation.
                </p>
              </div>
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                <h3 className="text-white font-bold mb-2">💰 Best Odds</h3>
                <p className="text-gray-400 text-sm">
                  Only 1% house edge - the lowest in crypto casino. More wins for players!
                </p>
              </div>
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                <h3 className="text-white font-bold mb-2">⚡ Instant Payouts</h3>
                <p className="text-gray-400 text-sm">
                  Automated smart contract payouts. No manual approval needed.
                </p>
              </div>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}
