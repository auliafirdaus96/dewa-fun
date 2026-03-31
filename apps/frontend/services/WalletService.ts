/**
 * Wallet Service - Handle Solana wallet connections and transactions
 * Integrates with Phantom, Solflare, and other Solana wallets
 */

import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { toast } from 'react-hot-toast';

export interface WalletAdapter {
  publicKey: PublicKey | null;
  connected: boolean;
  signTransaction: <T extends Transaction | VersionedTransaction>(transaction: T) => Promise<T>;
  signAllTransactions: <T extends Transaction | VersionedTransaction>(transactions: T[]) => Promise<T[]>;
  disconnect: () => Promise<void>;
}

interface DlmmTransaction {
  instructionType: string;
  params: Record<string, any>;
  signersRequired: string[];
}

interface TransactionProposal {
  status: 'ready' | 'error';
  message: string;
  transaction?: DlmmTransaction;
  requiresSignature: boolean;
  poolDetails?: any;
  liquidityDetails?: any;
  rebalanceDetails?: any;
  feeDetails?: any;
}

class WalletServiceClass {
  private wallet: WalletAdapter | null = null;
  private connection: any = null;

  /**
   * Connect to user's wallet (Phantom, Solflare, etc.)
   */
  async connect(walletType: 'phantom' | 'solflare' | 'ledger' = 'phantom'): Promise<boolean> {
    try {
      // Check if wallet provider exists
      const providerName = this.getProviderName(walletType);
      const provider = (window as any)[providerName];

      if (!provider) {
        throw new Error(
          `${walletType} wallet not found. Please install the ${walletType} extension.`
        );
      }

      // Request connection
      const response = await provider.connect();
      
      this.wallet = {
        publicKey: response.publicKey,
        connected: true,
        signTransaction: provider.signTransaction.bind(provider),
        signAllTransactions: provider.signAllTransactions.bind(provider),
        disconnect: provider.disconnect.bind(provider)
      };

      toast.success(`${walletType.charAt(0).toUpperCase() + walletType.slice(1)} wallet connected!`);
      return true;
    } catch (error: any) {
      console.error('Wallet connection error:', error);
      toast.error(`Failed to connect wallet: ${error.message}`);
      return false;
    }
  }

  /**
   * Disconnect current wallet
   */
  async disconnect(): Promise<void> {
    if (this.wallet) {
      await this.wallet.disconnect();
      this.wallet = null;
      toast.success('Wallet disconnected');
    }
  }

  /**
   * Get current wallet public key
   */
  getPublicKey(): PublicKey | null {
    return this.wallet?.publicKey || null;
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return !!this.wallet?.connected;
  }

  /**
   * Process DLMM transaction proposal from AI agent
   * Returns formatted data for user review
   */
  async processDlmmProposal(proposalData: TransactionProposal): Promise<{
    approved: boolean;
    signature?: string;
    error?: string;
  }> {
    try {
      if (!proposalData.requiresSignature || !proposalData.transaction) {
        // No action needed
        return { approved: false, error: 'No action required' };
      }

      if (!this.isConnected()) {
        // Prompt user to connect wallet
        const connected = await this.promptConnect();
        if (!connected) {
          return { approved: false, error: 'Wallet connection required' };
        }
      }

      // Show transaction preview modal
      const userApproved = await this.showTransactionPreview(proposalData);
      
      if (!userApproved) {
        return { approved: false, error: 'User rejected transaction' };
      }

      // In production: Build actual transaction and send to wallet
      // For now: Simulate the flow
      const signature = await this.simulateTransaction(proposalData);

      return {
        approved: true,
        signature
      };
    } catch (error: any) {
      console.error('Transaction processing error:', error);
      return {
        approved: false,
        error: error.message || 'Transaction failed'
      };
    }
  }

  /**
   * Execute DLMM action (rebalance, add liquidity, etc.)
   */
  async executeDlmmAction(
    actionType: string,
    params: Record<string, any>
  ): Promise<{
    success: boolean;
    signature?: string;
    error?: string;
  }> {
    try {
      // Validate wallet connection
      if (!this.isConnected()) {
        const connected = await this.promptConnect();
        if (!connected) {
          return { success: false, error: 'Wallet not connected' };
        }
      }

      // Build transaction based on action type
      let transactionProposal: TransactionProposal;

      switch (actionType) {
        case 'REBALANCE':
          transactionProposal = {
            status: 'ready',
            message: 'Rebalance DLMM position',
            transaction: {
              instructionType: 'REBALANCE_DLMM',
              params,
              signersRequired: ['user_wallet']
            },
            requiresSignature: true,
            rebalanceDetails: params
          };
          break;

        case 'ADD_LIQUIDITY':
          transactionProposal = {
            status: 'ready',
            message: 'Add liquidity to DLMM pool',
            transaction: {
              instructionType: 'ADD_LIQUIDITY_DLMM',
              params,
              signersRequired: ['user_wallet']
            },
            requiresSignature: true,
            liquidityDetails: params
          };
          break;

        case 'CLAIM_FEES':
          transactionProposal = {
            status: 'ready',
            message: 'Claim accumulated fees',
            transaction: {
              instructionType: 'CLAIM_FEES_DLMM',
              params,
              signersRequired: ['user_wallet']
            },
            requiresSignature: true,
            feeDetails: params
          };
          break;

        default:
          return { success: false, error: `Unknown action type: ${actionType}` };
      }

      // Process the proposal
      const result = await this.processDlmmProposal(transactionProposal);

      if (result.approved && result.signature) {
        return {
          success: true,
          signature: result.signature
        };
      } else {
        return {
          success: false,
          error: result.error
        };
      }
    } catch (error: any) {
      console.error('DLMM action execution error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Log action to history (for tracking user decisions)
   */
  async logActionToHistory(actionData: {
    actionType: string;
    params: Record<string, any>;
    signature?: string;
    status: 'approved' | 'rejected' | 'failed';
    timestamp: Date;
  }): Promise<void> {
    try {
      // Store in localStorage for now (in production: send to backend)
      const historyKey = 'dlmm_action_history';
      const existing = JSON.parse(localStorage.getItem(historyKey) || '[]');
      
      existing.push({
        ...actionData,
        id: Date.now().toString()
      });

      // Keep only last 50 actions
      const trimmed = existing.slice(-50);
      localStorage.setItem(historyKey, JSON.stringify(trimmed));

      console.log('Action logged to history:', actionData);
    } catch (error) {
      console.error('Failed to log action:', error);
    }
  }

  /**
   * Get action history
   */
  getActionHistory(): Array<any> {
    try {
      const historyKey = 'dlmm_action_history';
      return JSON.parse(localStorage.getItem(historyKey) || '[]');
    } catch (error) {
      console.error('Failed to get history:', error);
      return [];
    }
  }

  // ==================== PRIVATE HELPERS ====================

  private getProviderName(walletType: string): string {
    const providers: Record<string, string> = {
      phantom: 'phantom',
      solflare: 'solflare',
      ledger: 'ledger'
    };
    return providers[walletType] || 'phantom';
  }

  private async promptConnect(): Promise<boolean> {
    const confirmed = window.confirm(
      'This action requires a connected wallet. Would you like to connect now?'
    );
    
    if (confirmed) {
      return await this.connect('phantom');
    }
    
    return false;
  }

  private async showTransactionPreview(proposal: TransactionProposal): Promise<boolean> {
    // In production: Show beautiful modal with transaction details
    // For now: Use confirm dialog
    
    let details = '';
    
    if (proposal.liquidityDetails) {
      details = `Pool: ${proposal.liquidityDetails.pool_address}\nAmounts: ${proposal.liquidityDetails.amount_a} / ${proposal.liquidityDetails.amount_b}`;
    } else if (proposal.rebalanceDetails) {
      details = `New Range: $${proposal.rebalanceDetails.new_min_price} - $${proposal.rebalanceDetails.new_max_price}`;
    } else if (proposal.feeDetails) {
      details = `Claim: $${proposal.feeDetails.accumulated_fees.total_value_usd}`;
    }

    const confirmed = window.confirm(
      `${proposal.message}\n\n${details}\n\nGas Fee: ~$2.50\n\nDo you want to proceed?`
    );

    return confirmed;
  }

  private async simulateTransaction(proposal: TransactionProposal): Promise<string> {
    // Simulate transaction signing (in production: build real tx)
    await new Promise(resolve => setTimeout(resolve, 1500)); // Fake delay

    // Generate fake signature for demo
    const fakeSig = Array(88).fill('0').join('') + 'simulated_signature_for_demo_purposes_only';
    
    toast.success('Transaction simulated! Check console for details.');
    console.log('Simulated transaction:', proposal);
    
    return fakeSig;
  }
}

// Singleton instance
export const walletService = new WalletServiceClass();
