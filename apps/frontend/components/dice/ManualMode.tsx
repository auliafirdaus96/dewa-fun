"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { TrendingUp, TrendingDown, Info } from 'lucide-react';

interface ManualModeProps {
  mint: string;
  onBetPlaced: (result: any) => void;
}

export function ManualMode({ mint, onBetPlaced }: ManualModeProps) {
  const [betAmount, setBetAmount] = useState(0.1);
  const [winChance, setWinChance] = useState(50);
  const [direction, setDirection] = useState<'UNDER' | 'OVER'>('UNDER');
  const [isLoading, setIsLoading] = useState(false);
  
  // Calculate dynamically
  const multiplier = 99 / winChance;
  const profit = betAmount * multiplier - betAmount;
  const threshold = direction === 'UNDER' ? winChance : 100 - winChance;
  const payout = betAmount * multiplier;
  
  // House edge always 1%
  const houseEdge = 1;

  const handlePlaceBet = async () => {
    if (betAmount <= 0) {
      toast.error('Invalid bet amount');
      return;
    }
    
    if (winChance < 2 || winChance > 98) {
      toast.error('Win chance must be between 2% and 98%');
      return;
    }
    
    setIsLoading(true);
    try {
      // TODO: Call dice service to place bet
      // const result = await diceService.prepareManualBet({...})
      // onBetPlaced(result)
      
      toast.success('Bet placed! Waiting for VRF...');
    } catch (error: any) {
      toast.error(error.message || 'Failed to place bet');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900 rounded-2xl p-6 border border-gray-800"
    >
      <h2 className="text-2xl font-bold text-white mb-6">Manual Bet</h2>
      
      {/* Bet Amount Input */}
      <div className="mb-6">
        <label className="block text-gray-400 text-sm font-bold mb-2">
          Bet Amount (SOL)
        </label>
        <div className="relative">
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(Number(e.target.value))}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-4 text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            placeholder="0.1"
            step="0.001"
            min="0.001"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex gap-2">
            <button
              onClick={() => setBetAmount(prev => prev * 0.5)}
              className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded transition-colors"
            >
              ½
            </button>
            <button
              onClick={() => setBetAmount(prev => prev * 2)}
              className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded transition-colors"
            >
              2×
            </button>
          </div>
        </div>
      </div>

      {/* Win Chance Slider */}
      <div className="mb-6">
        <label className="block text-gray-400 text-sm font-bold mb-2">
          Win Chance: <span className="text-blue-400">{winChance}%</span>
        </label>
        <input
          type="range"
          min="2"
          max="98"
          value={winChance}
          onChange={(e) => setWinChance(Number(e.target.value))}
          className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>2%</span>
          <span>50%</span>
          <span>98%</span>
        </div>
      </div>

      {/* Direction Buttons */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button
          onClick={() => setDirection('UNDER')}
          className={`py-4 rounded-xl font-bold transition-all ${
            direction === 'UNDER'
              ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <TrendingDown size={20} />
            <span>ROLL UNDER {threshold.toFixed(0)}</span>
          </div>
        </button>
        <button
          onClick={() => setDirection('OVER')}
          className={`py-4 rounded-xl font-bold transition-all ${
            direction === 'OVER'
              ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <TrendingUp size={20} />
            <span>ROLL OVER {threshold.toFixed(0)}</span>
          </div>
        </button>
      </div>

      {/* Stats Display */}
      <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-800/50 rounded-xl">
        <div>
          <p className="text-gray-500 text-xs mb-1">Multiplier</p>
          <p className="text-white font-bold text-lg">{multiplier.toFixed(4)}x</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs mb-1">Potential Profit</p>
          <p className="text-green-400 font-bold text-lg">+{profit.toFixed(4)} SOL</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs mb-1">House Edge</p>
          <p className="text-white font-bold text-lg">{houseEdge}%</p>
        </div>
      </div>

      {/* Provably Fair Info */}
      <div className="mb-6 p-3 bg-blue-900/20 border border-blue-500/20 rounded-lg flex items-start gap-3">
        <Info size={18} className="text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-blue-300">
          <p className="font-bold mb-1">Provably Fair</p>
          <p>This bet uses Switchboard VRF oracle for maximum fairness. Results are verifiable on-chain.</p>
        </div>
      </div>

      {/* Submit Button */}
      <button
        onClick={handlePlaceBet}
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-black py-4 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30"
      >
        {isLoading ? 'PLACING BET...' : 'PLACE BET'}
      </button>
    </motion.div>
  );
}
