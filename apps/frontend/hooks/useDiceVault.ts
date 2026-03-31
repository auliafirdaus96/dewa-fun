'use client';

import { useState, useCallback } from 'react';

interface VaultInfo {
  mint: string;
  isPaused: boolean;
  maxBetDisplay: string;
  minBet: number;
  houseEdge: string;
  winChanceRange: string;
}

interface BetValidation {
  valid: boolean;
  maxBet?: number;
  message?: string;
}

/**
 * Hook for Dice vault operations with obfuscation
 */
export function useDiceVault() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get obfuscated vault info (public endpoint)
   */
  const getVaultInfo = useCallback(async (mint: string): Promise<VaultInfo | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/dice/vault/info?mint=${mint}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch vault info');
      }

      return data.data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Validate bet amount against vault limits
   */
  const validateBet = useCallback(async (mint: string, amount: number): Promise<BetValidation | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/dice/vault/validate-bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mint, amount })
      });
      
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Validation failed');
      }

      return {
        valid: result.valid,
        maxBet: result.maxBet,
        message: result.message
      };
    } catch (err: any) {
      setError(err.message);
      return { valid: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    getVaultInfo,
    validateBet,
    loading,
    error
  };
}
