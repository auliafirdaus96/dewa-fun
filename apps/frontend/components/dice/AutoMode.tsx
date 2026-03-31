"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Settings, Play, Square, TrendingUp } from 'lucide-react';

interface AutoModeProps {
  mint: string;
  onSessionStart: (sessionId: string) => void;
}

const STRATEGIES = [
  { id: 'FLAT', name: 'Flat Bet', description: 'Constant bet amount' },
  { id: 'MARTINGALE', name: 'Martingale', description: 'Double on loss' },
  { id: 'PAROLI', name: 'Paroli', description: 'Double on win' },
  { id: 'DALEMBERT', name: "D'Alembert", description: '+1 unit on loss, -1 on win' },
];

export function AutoMode({ mint, onSessionStart }: AutoModeProps) {
  const [baseBet, setBaseBet] = useState(0.1);
  const [numberOfBets, setNumberOfBets] = useState(100);
  const [strategy, setStrategy] = useState('FLAT');
  const [direction, setDirection] = useState<'UNDER' | 'OVER'>('UNDER');
  const [threshold, setThreshold] = useState(50);
  const [stopOnProfit, setStopOnProfit] = useState<number | null>(null);
  const [stopOnLoss, setStopOnLoss] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  
  const handleStartAuto = async () => {
    if (baseBet <= 0) {
      toast.error('Invalid base bet');
      return;
    }
    
    if (numberOfBets < 1 || numberOfBets > 1000) {
      toast.error('Number of bets must be between 1 and 1000');
      return;
    }
    
    setIsRunning(true);
    try {
      // TODO: Call dice service to start auto session
      // const result = await diceService.startAutoSession(...)
      
      toast.success('Auto betting started!');
      onSessionStart('session_id_placeholder');
    } catch (error: any) {
      toast.error(error.message || 'Failed to start auto bet');
    } finally {
      setIsRunning(false);
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
          <Settings size={24} />
          Auto Betting
        </h2>
        {isRunning && (
          <span className="flex items-center gap-2 text-green-400">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            Running
          </span>
        )}
      </div>

      {/* Base Bet & Number of Bets */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-gray-400 text-sm font-bold mb-2">
            Base Bet (SOL)
          </label>
          <input
            type="number"
            value={baseBet}
            onChange={(e) => setBaseBet(Number(e.target.value))}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-4 text-white font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
            placeholder="0.1"
            step="0.001"
            min="0.001"
          />
        </div>
        <div>
          <label className="block text-gray-400 text-sm font-bold mb-2">
            Number of Bets
          </label>
          <input
            type="number"
            value={numberOfBets}
            onChange={(e) => setNumberOfBets(Number(e.target.value))}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-4 text-white font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
            placeholder="100"
            min="1"
            max="1000"
          />
        </div>
      </div>

      {/* Strategy Selection */}
      <div className="mb-6">
        <label className="block text-gray-400 text-sm font-bold mb-3">
          Betting Strategy
        </label>
        <div className="grid grid-cols-2 gap-3">
          {STRATEGIES.map((strat) => (
            <button
              key={strat.id}
              onClick={() => setStrategy(strat.id)}
              className={`p-3 rounded-lg text-left transition-all ${
                strategy === strat.id
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <div className="font-bold text-sm">{strat.name}</div>
              <div className="text-xs opacity-75">{strat.description}</div>
            </button>
          ))}
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
            className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
        </div>
      </div>

      {/* Stop Conditions */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-gray-400 text-sm font-bold mb-2">
            Stop on Profit (SOL)
          </label>
          <input
            type="number"
            value={stopOnProfit || ''}
            onChange={(e) => setStopOnProfit(e.target.value ? Number(e.target.value) : null)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-4 text-white font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
            placeholder="Optional"
            step="0.01"
            min="0"
          />
        </div>
        <div>
          <label className="block text-gray-400 text-sm font-bold mb-2">
            Stop on Loss (SOL)
          </label>
          <input
            type="number"
            value={stopOnLoss || ''}
            onChange={(e) => setStopOnLoss(e.target.value ? Number(e.target.value) : null)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-4 text-white font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
            placeholder="Optional"
            step="0.01"
            min="0"
          />
        </div>
      </div>

      {/* Start/Stop Button */}
      <button
        onClick={handleStartAuto}
        disabled={isRunning}
        className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-black py-4 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/30 flex items-center justify-center gap-3"
      >
        {isRunning ? (
          <>
            <Square size={20} />
            STOP AUTO BET
          </>
        ) : (
          <>
            <Play size={20} />
            START AUTO BET
          </>
        )}
      </button>
    </motion.div>
  );
}
