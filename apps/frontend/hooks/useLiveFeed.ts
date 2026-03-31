"use client";
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { RealtimePostgresInsertPayload } from '@supabase/supabase-js';

export interface LiveBet {
  id: string;
  mint: string;
  amount: number;
  direction: 'UNDER' | 'OVER';
  threshold: number;
  roll: number;
  won: boolean;
  payout: number;
  mode: string;
  created_at: string;
  // Obfuscated wallet - never expose full address
  player: string;
}

export function useLiveFeed(mint?: string, maxItems = 20) {
  const [bets, setBets] = useState<LiveBet[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const handleNewBet = useCallback((payload: RealtimePostgresInsertPayload<any>) => {
    const row = payload.new;
    if (!row) return;

    const bet: LiveBet = {
      id: row.id,
      mint: row.mint,
      amount: parseFloat(row.amount),
      direction: row.direction,
      threshold: row.threshold,
      roll: row.roll,
      won: row.won,
      payout: parseFloat(row.payout),
      mode: row.mode,
      created_at: row.created_at,
      // Obfuscate wallet for privacy
      player: row.player_wallet
        ? `${row.player_wallet.slice(0, 4)}...${row.player_wallet.slice(-4)}`
        : 'Anonymous',
    };

    setBets((prev) => [bet, ...prev].slice(0, maxItems));
  }, [maxItems]);

  useEffect(() => {
    // Build filter: listen to all bets, or filter by specific token mint
    const filter = mint ? `mint=eq.${mint}` : undefined;

    const channel = supabase
      .channel(`live_bets_${mint || 'all'}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bets',
          ...(filter ? { filter } : {}),
        },
        handleNewBet
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
      setIsConnected(false);
    };
  }, [mint, handleNewBet]);

  const clear = useCallback(() => setBets([]), []);

  return { bets, isConnected, clear };
}
