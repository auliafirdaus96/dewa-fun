"use client";
import { useState, useEffect, useCallback } from 'react';

export interface DashboardNode {
  nodeId: string;
  aiModel: string;
  isActive: boolean;
  lastAction: string;
  lastUpdated?: string;
  launchType?: 'STANDARD' | 'AGENT_LAUNCH'; // NEW
}

export interface DashboardStats {
  totalVolume: number;
  totalPayout: number;
  creatorFeesEarned: number;
  activeTokens: number;
  agentShare: number;
  // NEW: Breakdown by launch type
  standardLaunches?: number;
  agentLaunches?: number;
  standardFees?: number;
  agentFees?: number;
}

export interface NodeToken {
  id: string;
  node_id: string;
  token_address: string;
  token_name: string;
  token_ticker: string;
  created_at: string;
  launchType?: 'STANDARD' | 'AGENT_LAUNCH'; // NEW
  feeSplit?: { creator: number; dewa: number }; // NEW
}

export interface DashboardData {
  node: DashboardNode;
  stats: DashboardStats;
  tokens: NodeToken[];
}

export function useDashboard(nodeId: string | null) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!nodeId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await window.fetch(`/api/agent/dashboard?nodeId=${nodeId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [nodeId]);

  useEffect(() => {
    fetch();
    // Poll every 30s for live feel
    const interval = setInterval(fetch, 30_000);
    return () => clearInterval(interval);
  }, [fetch]);

  return { data, isLoading, error, refresh: fetch };
}
