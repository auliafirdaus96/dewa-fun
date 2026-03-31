'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';

interface EarningsData {
  user: {
    id: string;
    walletAddress: string;
    displayName?: string;
    avatarUrl?: string;
  };
  earnings: {
    lifetimeCreatorEarnings: number;
    lifetimeAgentEarnings: number;
    totalLifetimeEarnings: number;
    vaultsCount: number;
    agentVaultsCount: number;
    totalCreatorFeesFromVaults: number;
    totalAgentFeesFromVaults: number;
  };
  vaults: {
    asCreator: Array<{
      mint: string;
      creatorFees: number;
      wagered: number;
      createdAt: string;
    }>;
    asAgent: Array<{
      mint: string;
      agentFees: number;
      wagered: number;
      createdAt: string;
    }>;
  };
}

export function EarningsDashboard() {
  const { connected } = useWallet();
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!connected) return;

    const fetchEarnings = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/earnings/dashboard');
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch earnings');
        }

        setData(result.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEarnings();
  }, [connected]);

  if (!connected) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Connect wallet to view earnings</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-400">
        <p>{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-2xl p-6 border border-purple-500/30"
      >
        <h2 className="text-3xl font-bold mb-2">Earnings Dashboard</h2>
        <p className="text-gray-400">Track your Creator & Agent rewards</p>
      </motion.div>

      {/* Total Earnings Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Creator Earnings */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-900 rounded-2xl p-6 border border-green-500/30"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-green-400">Creator Earnings</h3>
            <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full">Level 2</span>
          </div>
          <div className="text-3xl font-bold text-white mb-2">
            {data.earnings.lifetimeCreatorEarnings.toFixed(4)} SOL
          </div>
          <p className="text-sm text-gray-400">
            From {data.vaults.asCreator.length} token{data.vaults.asCreator.length !== 1 ? 's' : ''} created
          </p>
          <p className="text-xs text-gray-500 mt-2">25% of house edge per bet</p>
        </motion.div>

        {/* Agent Earnings */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-900 rounded-2xl p-6 border border-blue-500/30"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-blue-400">Agent Earnings</h3>
            <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full">Level 1</span>
          </div>
          <div className="text-3xl font-bold text-white mb-2">
            {data.earnings.lifetimeAgentEarnings.toFixed(4)} SOL
          </div>
          <p className="text-sm text-gray-400">
            From {data.vaults.asAgent.length} platform{data.vaults.asAgent.length !== 1 ? 's' : ''}
          </p>
          <p className="text-xs text-gray-500 mt-2">25% override commission</p>
        </motion.div>

        {/* Total Lifetime */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-2xl p-6 border border-purple-500/50"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-purple-300">Total Lifetime</h3>
            <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full">Combined</span>
          </div>
          <div className="text-4xl font-bold text-white mb-2">
            {data.earnings.totalLifetimeEarnings.toFixed(4)} SOL
          </div>
          <p className="text-sm text-gray-400">
            Creator + Agent rewards
          </p>
          <p className="text-xs text-gray-500 mt-2">Passive income from Dice house edge</p>
        </motion.div>
      </div>

      {/* Vaults Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* As Creator */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gray-900 rounded-2xl p-6 border border-green-500/20"
        >
          <h3 className="text-xl font-bold text-green-400 mb-4">Your Tokens (As Creator)</h3>
          
          {data.vaults.asCreator.length === 0 ? (
            <p className="text-gray-500 text-sm">No tokens created yet</p>
          ) : (
            <div className="space-y-3">
              {data.vaults.asCreator.map((vault, idx) => (
                <div key={idx} className="bg-gray-800/50 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono text-sm text-green-300 truncate max-w-[200px]">
                      {vault.mint.slice(0, 20)}...
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(vault.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Earned:</span>
                    <span className="text-green-400 font-semibold">
                      {vault.creatorFees.toFixed(4)} SOL
                    </span>
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-gray-500">Wagered:</span>
                    <span className="text-gray-300">{vault.wagered.toFixed(2)} SOL</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* As Agent */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gray-900 rounded-2xl p-6 border border-blue-500/20"
        >
          <h3 className="text-xl font-bold text-blue-400 mb-4">Your Platforms (As Agent)</h3>
          
          {data.vaults.asAgent.length === 0 ? (
            <p className="text-gray-500 text-sm">No agent platforms yet</p>
          ) : (
            <div className="space-y-3">
              {data.vaults.asAgent.map((vault, idx) => (
                <div key={idx} className="bg-gray-800/50 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono text-sm text-blue-300 truncate max-w-[200px]">
                      {vault.mint.slice(0, 20)}...
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(vault.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Earned:</span>
                    <span className="text-blue-400 font-semibold">
                      {vault.agentFees.toFixed(4)} SOL
                    </span>
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-gray-500">Wagered:</span>
                    <span className="text-gray-300">{vault.wagered.toFixed(2)} SOL</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4"
      >
        <h4 className="font-semibold text-blue-300 mb-2">How It Works</h4>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>• <strong>Creator (25%):</strong> Create a token and deposit to Dice vault → earn 25% of house edge on all bets</li>
          <li>• <strong>Agent (25%):</strong> Launch Agent platform → attract creators → earn 25% override commission</li>
          <li>• <strong>Dewa Protocol (30%):</strong> Infrastructure maintenance & development</li>
          <li>• <strong>Affiliate (20%):</strong> Marketing & user acquisition incentives</li>
        </ul>
      </motion.div>
    </div>
  );
}
