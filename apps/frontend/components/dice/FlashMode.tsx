"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Zap, BarChart3, CheckCircle } from 'lucide-react';

interface FlashModeProps {
  mint: string;
  onFlashComplete: (results: any) => void;
}

export function FlashMode({ mint, onFlashComplete }: FlashModeProps) {
  const [baseBet, setBaseBet] = useState(0.1);
  const [totalBets, setTotalBets] = useState(500);
  const [direction, setDirection] = useState<'UNDER' | 'OVER'>('UNDER');
  const [threshold, setThreshold] = useState(50);
  const [isRunning, setIsRunning] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleRunFlash = async () => {
    if (baseBet <= 0) {
      toast.error('Invalid bet amount');
      return;
    }
    
    if (totalBets < 1 || totalBets > 1000) {
      toast.error('Total bets must be between 1 and 1000');
      return;
    }
    
    setIsRunning(true);
    try {
      // TODO: Call dice service to run flash bet
      // const result = await diceService.runFlashBet(...)
      
      // Simulate instant results for demo
      const simulatedResults = {
        sessionId: 'flash_session_' + Date.now(),
        totalBets,
        totalWins: Math.floor(totalBets * (threshold / 100)),
        totalLosses: totalBets - Math.floor(totalBets * (threshold / 100)),
        totalWagered: baseBet * totalBets,
        totalPayout: baseBet * Math.floor(totalBets * (threshold / 100)) * (99 / threshold),
        netProfit: (baseBet * Math.floor(totalBets * (threshold / 100)) * (99 / threshold)) - (baseBet * totalBets),
        bets: Array(totalBets).fill(null).map((_, i) => ({
          nonce: i,
          roll: Math.random() * 100,
          won: direction === 'UNDER' ? Math.random() * 100 < threshold : Math.random() * 100 > threshold,
          amount: baseBet,
          payout: 0,
        })),
      };
      
      setResults(simulatedResults);
      setShowResults(true);
      onFlashComplete(simulatedResults);
      
      toast.success('Flash simulation complete!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to run flash bet');
    } finally {
      setIsRunning(false);
    }
  };

  const handleSettle = async () => {
    try {
      // TODO: Call dice service to settle on-chain
      toast.success('Settled on-chain!');
      setShowResults(false);
    } catch (error: any) {
      toast.error('Failed to settle');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900 rounded-2xl p-6 border border-gray-800"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Zap size={24} className="text-yellow-400" />
          Flash Mode
        </h2>
        <span className="text-xs text-gray-400 bg-gray-800 px-3 py-1 rounded-full">
          ⚡ Instant Results
        </span>
      </div>

      {/* Configuration */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-gray-400 text-sm font-bold mb-2">
            Bet Amount (SOL)
          </label>
          <input
            type="number"
            value={baseBet}
            onChange={(e) => setBaseBet(Number(e.target.value))}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-4 text-white font-mono focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all"
            placeholder="0.1"
            step="0.001"
            min="0.001"
          />
        </div>
        <div>
          <label className="block text-gray-400 text-sm font-bold mb-2">
            Total Bets
          </label>
          <input
            type="number"
            value={totalBets}
            onChange={(e) => setTotalBets(Number(e.target.value))}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-4 text-white font-mono focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all"
            placeholder="500"
            min="1"
            max="1000"
          />
        </div>
      </div>

      {/* Direction & Threshold */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-gray-400 text-sm font-bold mb-2">
            Direction
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setDirection('UNDER')}
              className={`py-3 rounded-lg font-bold transition-all ${
                direction === 'UNDER'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              UNDER
            </button>
            <button
              onClick={() => setDirection('OVER')}
              className={`py-3 rounded-lg font-bold transition-all ${
                direction === 'OVER'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              OVER
            </button>
          </div>
        </div>
        <div>
          <label className="block text-gray-400 text-sm font-bold mb-2">
            Threshold: {threshold}
          </label>
          <input
            type="range"
            min="2"
            max="98"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-yellow-500"
          />
          <div className="text-xs text-gray-500 mt-1">
            Win chance: {direction === 'UNDER' ? threshold : 100 - threshold}%
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-500/20 rounded-lg">
        <div className="flex items-start gap-3">
          <Zap size={18} className="text-yellow-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-yellow-300">
            <p className="font-bold mb-1">Instant Simulation</p>
            <p>Run up to 1000 bets instantly off-chain, then settle in a single on-chain transaction. Perfect for strategy testing!</p>
          </div>
        </div>
      </div>

      {/* Run Button */}
      {!showResults && (
        <button
          onClick={handleRunFlash}
          disabled={isRunning}
          className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-black py-4 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-yellow-500/30 flex items-center justify-center gap-3"
        >
          {isRunning ? (
            <>RUNNING SIMULATION...</>
          ) : (
            <>
              <Zap size={20} />
              RUN FLASH SIMULATION
            </>
          )}
        </button>
      )}

      {/* Results Display */}
      <AnimatePresence>
        {showResults && results && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mt-6"
          >
            {/* Summary Stats */}
            <div className="bg-gray-800 rounded-xl p-6 mb-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <BarChart3 size={20} />
                Simulation Results
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <p className="text-gray-500 text-xs mb-1">Total Bets</p>
                  <p className="text-white font-bold text-lg">{results.totalBets}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Wins</p>
                  <p className="text-green-400 font-bold text-lg">{results.totalWins}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Losses</p>
                  <p className="text-red-400 font-bold text-lg">{results.totalLosses}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Win Rate</p>
                  <p className="text-white font-bold text-lg">
                    {((results.totalWins / results.totalBets) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-900 rounded-lg">
                <div>
                  <p className="text-gray-500 text-xs mb-1">Wagered</p>
                  <p className="text-white font-mono text-sm">{results.totalWagered.toFixed(4)} SOL</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Payout</p>
                  <p className="text-white font-mono text-sm">{results.totalPayout.toFixed(4)} SOL</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Net Profit</p>
                  <p className={`font-mono text-sm ${results.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {results.netProfit >= 0 ? '+' : ''}{results.netProfit.toFixed(4)} SOL
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleRunFlash}
                className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-4 rounded-xl transition-all"
              >
                RUN AGAIN
              </button>
              <button
                onClick={handleSettle}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-black py-4 rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-green-500/30"
              >
                <CheckCircle size={20} />
                SETTLE ON-CHAIN
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
