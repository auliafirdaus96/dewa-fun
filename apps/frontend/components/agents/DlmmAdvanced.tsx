"use client";

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Shield, Zap, BarChart3, Brain, Clock, Award, AlertCircle } from 'lucide-react';

interface StrategyTemplate {
  name: string;
  description: string;
  config: {
    risk_tolerance: string;
    rebalance_threshold: number;
    auto_compound: boolean;
    compound_frequency_hours: number;
    hedge_enabled: boolean;
    preferred_pairs: string[];
    max_il_risk: number;
    target_apy_min: number;
    target_apy_max: number;
  };
}

interface PerformanceData {
  total_pnl: number;
  total_fees_earned: number;
  total_impermanent_loss: number;
  actions_taken: number;
  success_rate: number;
  average_apy: number;
  best_trade: any;
  worst_trade: any;
  net_pnl: number;
  roi_percentage: number;
  win_rate: number;
}

export function StrategyTemplates({ onSelectStrategy }: { onSelectStrategy: (name: string) => void }) {
  const [strategies, setStrategies] = useState<StrategyTemplate[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);

  useEffect(() => {
    // Load strategy templates
    fetch('/api/agents/dlmm/strategies')
      .then(res => res.json())
      .then(data => setStrategies(data))
      .catch(console.error);
  }, []);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'MEDIUM': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'HIGH': return 'text-red-400 bg-red-500/10 border-red-500/20';
      default: return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-white font-bold text-lg mb-2">Choose Your Strategy</h3>
        <p className="text-zinc-500 text-sm">Set it and forget it - AI will manage everything automatically</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {strategies.map((strategy, idx) => (
          <motion.div
            key={strategy.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => {
              setSelectedStrategy(strategy.name);
              onSelectStrategy(strategy.name.toLowerCase());
            }}
            className={`p-6 rounded-2xl border cursor-pointer transition-all ${
              selectedStrategy === strategy.name
                ? 'bg-emerald-600/20 border-emerald-500/50'
                : 'bg-[#0a0a0a] border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-white font-bold">{strategy.name}</h4>
              <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${getRiskColor(strategy.config.risk_tolerance)}`}>
                {strategy.config.risk_tolerance}
              </span>
            </div>

            <p className="text-zinc-400 text-sm mb-4">{strategy.description}</p>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Target APY</span>
                <span className="text-white font-medium">
                  {strategy.config.target_apy_min}-{strategy.config.target_apy_max}%
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Rebalance Threshold</span>
                <span className="text-white font-medium">{strategy.config.rebalance_threshold}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Auto-Compound</span>
                <span className="text-white font-medium">
                  {strategy.config.auto_compound ? `Every ${strategy.config.compound_frequency_hours}h` : 'Off'}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Hedge Protection</span>
                <span className="text-white font-medium">
                  {strategy.config.hedge_enabled ? '✅ Enabled' : '❌ Disabled'}
                </span>
              </div>
            </div>

            {selectedStrategy === strategy.name && (
              <motion.button
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className="w-full mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white font-medium transition-all"
              >
                Activate Strategy
              </motion.button>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function PerformanceAnalytics() {
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [insights, setInsights] = useState<string[]>([]);

  useEffect(() => {
    // Load analytics
    fetch('/api/agents/dlmm/analytics')
      .then(res => res.json())
      .then(data => {
        setPerformance(data.performance);
        setInsights(data.insights);
      })
      .catch(console.error);
  }, []);

  if (!performance) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-white font-bold text-lg mb-2">Your Performance</h3>
        <p className="text-zinc-500 text-sm">Track your LP journey and learn from insights</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={TrendingUp}
          label="Net PnL"
          value={`$${performance.net_pnl.toFixed(2)}`}
          subvalue={`${performance.roi_percentage.toFixed(1)}% ROI`}
          color={performance.net_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}
        />
        <MetricCard
          icon={Award}
          label="Win Rate"
          value={`${performance.win_rate.toFixed(0)}%`}
          subvalue={`${performance.actions_taken} trades`}
          color="text-blue-400"
        />
        <MetricCard
          icon={Zap}
          label="Avg APY"
          value={`${performance.average_apy.toFixed(1)}%`}
          subvalue="Annualized"
          color="text-yellow-400"
        />
        <MetricCard
          icon={Shield}
          label="Fees Earned"
          value={`$${performance.total_fees_earned.toFixed(2)}`}
          subvalue="Passive income"
          color="text-emerald-400"
        />
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="p-6 rounded-2xl bg-[#0a0a0a] border border-white/10">
          <h4 className="text-white font-bold mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            AI Insights
          </h4>
          <div className="space-y-3">
            {insights.map((insight, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="text-zinc-300 text-sm">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Best/Worst Trades */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {performance.best_trade && (
          <div className="p-4 rounded-xl bg-emerald-600/10 border border-emerald-500/20">
            <h5 className="text-emerald-400 font-bold mb-2">🏆 Best Trade</h5>
            <p className="text-white text-sm mb-1">{performance.best_trade.action}</p>
            <p className="text-emerald-400 font-bold">+${Math.abs(performance.best_trade.pnl).toFixed(2)}</p>
          </div>
        )}
        {performance.worst_trade && (
          <div className="p-4 rounded-xl bg-red-600/10 border border-red-500/20">
            <h5 className="text-red-400 font-bold mb-2">📉 Worst Trade</h5>
            <p className="text-white text-sm mb-1">{performance.worst_trade.action}</p>
            <p className="text-red-400 font-bold">-${Math.abs(performance.worst_trade.pnl).toFixed(2)}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ 
  icon: Icon, 
  label, 
  value, 
  subvalue, 
  color 
}: { 
  icon: any; 
  label: string; 
  value: string; 
  subvalue?: string; 
  color: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-[#0a0a0a] border border-white/10">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-5 h-5 ${color}`} />
        <span className="text-zinc-500 text-xs">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color} mb-1`}>{value}</p>
      {subvalue && <p className="text-zinc-500 text-xs">{subvalue}</p>}
    </div>
  );
}
