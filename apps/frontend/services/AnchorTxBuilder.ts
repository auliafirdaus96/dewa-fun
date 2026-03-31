import { Connection, PublicKey, Transaction, SystemProgram, SYSVAR_RECENT_BLOCKHASHES_PUBKEY, Keypair } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, createTransferInstruction, getAssociatedTokenAddress } from '@solana/spl-token';
import { logger } from './LoggerService';

// DEWA Dice Program ID
const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_DICE_PROGRAM_ID || 'st5rkJkNUmrMPjfj9vmNcCnkJFH5Qc9Pbmzc27BbfTr9');
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

// Switchboard VRF Program ID (Mainnet)
const SWITCHBOARD_PROGRAM_ID = new PublicKey('swi1tchDCndXGoHnUJ8YxJUKvqHvEorGKpvKzmpM4PC');

// Dewa Treasury Wallet (from env)
const DEWA_TREASURY = new PublicKey(process.env.NEXT_PUBLIC_PROTOCOL_TREASURY_ADDRESS || 'DEWA6k7v7P9XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');

export class AnchorTxBuilder {
  private connection: Connection;

  constructor() {
    this.connection = new Connection(RPC_URL, 'confirmed');
  }

  /**
   * Derive PDA for Vault State
   */
  private async deriveVaultState(mint: PublicKey): Promise<PublicKey> {
    const [vaultStatePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault_state'), mint.toBytes()],
      PROGRAM_ID
    );
    return vaultStatePda;
  }

  /**
   * Derive PDA for Vault Token Account
   */
  private async deriveVaultTokenAccount(mint: PublicKey): Promise<PublicKey> {
    const [vaultTokenAccountPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), mint.toBytes()],
      PROGRAM_ID
    );
    return vaultTokenAccountPda;
  }

  /**
   * Build Manual Bet TX: place_bet instruction
   */
  async buildPlaceBetTx(params: {
    playerWallet: PublicKey;
    mint: PublicKey;
    amount: number;
    targetNumber: number;
    isUnder: boolean;
  }): Promise<string> {
    logger.info('Building place_bet TX', 'AnchorTxBuilder', {
      mint: params.mint.toBase58(),
      amount: params.amount,
    });

    try {
      // Derive PDAs
      const vaultStatePda = await this.deriveVaultState(params.mint);
      const vaultTokenAccountPda = await this.deriveVaultTokenAccount(params.mint);
      
      // Get player's token account
      const playerTokenAccount = await getAssociatedTokenAddress(
        params.mint,
        params.playerWallet
      );

      // Create bet state account (ephemeral - will be closed after resolution)
      const betStateKeypair = Keypair.generate();
      const betStatePubkey = betStateKeypair.publicKey;

      // Generate VRF request accounts (simplified - in production should use actual Switchboard setup)
      const vrfRequestKeypair = Keypair.generate();
      const vrfKeypair = Keypair.generate();
      const oracleQueueKeypair = Keypair.generate();
      const queueAuthorityKeypair = Keypair.generate();
      const dataBufferKeypair = Keypair.generate();
      const permissionKeypair = Keypair.generate();
      const switchboardEscrowKeypair = Keypair.generate();
      const switchboardStateKeypair = Keypair.generate();

      // Create transaction
      const transaction = new Transaction().add(
        // Initialize bet state account
        SystemProgram.createAccount({
          fromPubkey: params.playerWallet,
          newAccountPubkey: betStatePubkey,
          lamports: await this.connection.getMinimumBalanceForRentExemption(8 + 32 + 8 + 1 + 1 + 8 + 32 + 8),
          space: 8 + 32 + 8 + 1 + 1 + 8 + 32 + 8,
          programId: PROGRAM_ID,
        }),
        // Place bet instruction
        {
          keys: [
            { pubkey: params.playerWallet, isSigner: true, isWritable: true },
            { pubkey: vaultStatePda, isSigner: false, isWritable: true },
            { pubkey: vaultTokenAccountPda, isSigner: false, isWritable: true },
            { pubkey: playerTokenAccount, isSigner: false, isWritable: true },
            { pubkey: betStatePubkey, isSigner: false, isWritable: true },
            { pubkey: vrfRequestKeypair.publicKey, isSigner: false, isWritable: true },
            { pubkey: vrfKeypair.publicKey, isSigner: false, isWritable: true },
            { pubkey: oracleQueueKeypair.publicKey, isSigner: false, isWritable: true },
            { pubkey: queueAuthorityKeypair.publicKey, isSigner: false, isWritable: false },
            { pubkey: dataBufferKeypair.publicKey, isSigner: false, isWritable: true },
            { pubkey: permissionKeypair.publicKey, isSigner: false, isWritable: true },
            { pubkey: switchboardEscrowKeypair.publicKey, isSigner: false, isWritable: true },
            { pubkey: SYSVAR_RECENT_BLOCKHASHES_PUBKEY, isSigner: false, isWritable: false },
            { pubkey: switchboardStateKeypair.publicKey, isSigner: false, isWritable: false },
            { pubkey: SWITCHBOARD_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          ],
          programId: PROGRAM_ID,
          data: Buffer.from([
            0, // Instruction discriminator for place_bet
            ...Buffer.from(Uint32Array.from([params.amount]).buffer),
            params.targetNumber,
            params.isUnder ? 1 : 0,
          ]),
        }
      );

      // Get recent blockhash and set fee payer
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = params.playerWallet;

      // Serialize to base64
      const serializedTx = transaction.serialize({ requireAllSignatures: false });
      return serializedTx.toString('base64');
    } catch (error) {
      logger.error('Failed to build place_bet TX', 'AnchorTxBuilder', { error });
      throw new Error(`Failed to build place_bet transaction: ${error}`);
    }
  }

  /**
   * Build Auto Approval TX: approve token delegation
   */
  async buildApprovalTx(params: {
    playerWallet: PublicKey;
    mint: PublicKey;
    maxAmount: number;
  }): Promise<string> {
    logger.info('Building approval TX', 'AnchorTxBuilder', {
      mint: params.mint.toBase58(),
    });

    try {
      // For auto betting, we need to approve the program to spend player's tokens
      const playerTokenAccount = await getAssociatedTokenAddress(
        params.mint,
        params.playerWallet
      );

      const vaultTokenAccountPda = await this.deriveVaultTokenAccount(params.mint);

      // Create Approve instruction (SPL Token)
      const transaction = new Transaction().add(
        createTransferInstruction(
          playerTokenAccount,
          vaultTokenAccountPda,
          params.playerWallet,
          Math.floor(params.maxAmount * 1_000_000), // Convert to smallest unit (assuming 6 decimals)
          [],
          TOKEN_PROGRAM_ID
        )
      );

      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = params.playerWallet;

      const serializedTx = transaction.serialize({ requireAllSignatures: false });
      return serializedTx.toString('base64');
    } catch (error) {
      logger.error('Failed to build approval TX', 'AnchorTxBuilder', { error });
      throw new Error(`Failed to build approval transaction: ${error}`);
    }
  }

  /**
   * Build Settle Session TX: settle_session instruction
   */
  async buildSettleTx(params: {
    operatorWallet: PublicKey;
    mint: PublicKey;
    amountWagered: number;
    amountPayout: number;
    feesCreator: number;
    feesTreasury: number;
    feesPartner: number;
  }): Promise<string> {
    logger.info('Building settle_session TX', 'AnchorTxBuilder', {
      mint: params.mint.toBase58(),
    });

    try {
      const vaultStatePda = await this.deriveVaultState(params.mint);
      const vaultTokenAccountPda = await this.deriveVaultTokenAccount(params.mint);

      // Get token accounts for fee recipients
      const creatorAccount = await getAssociatedTokenAddress(
        params.mint,
        vaultStatePda, // Creator account from vault state (in production, fetch from vault_state.creator)
        true // Allow owner to be PDA
      );
      
      const dewaTreasuryAccount = await getAssociatedTokenAddress(
        params.mint,
        DEWA_TREASURY,
        true
      );

      // Partner account - in production fetch from vault_state.affiliate
      const partnerAccount = await getAssociatedTokenAddress(
        params.mint,
        vaultStatePda,
        true
      );

      // Player token account (placeholder - should be passed or derived from session)
      const playerTokenAccount = await getAssociatedTokenAddress(
        params.mint,
        params.operatorWallet,
        true
      );

      const transaction = new Transaction().add({
        keys: [
          { pubkey: params.operatorWallet, isSigner: true, isWritable: true },
          { pubkey: vaultStatePda, isSigner: false, isWritable: true },
          { pubkey: vaultTokenAccountPda, isSigner: false, isWritable: true },
          { pubkey: playerTokenAccount, isSigner: false, isWritable: true },
          { pubkey: creatorAccount, isSigner: false, isWritable: true },
          { pubkey: dewaTreasuryAccount, isSigner: false, isWritable: true },
          { pubkey: partnerAccount, isSigner: false, isWritable: true },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ],
        programId: PROGRAM_ID,
        data: Buffer.from([
          1, // Instruction discriminator for settle_session
          ...Buffer.from(Uint32Array.from([params.amountWagered]).buffer),
          ...Buffer.from(Uint32Array.from([params.amountPayout]).buffer),
          ...Buffer.from(Uint32Array.from([params.feesCreator]).buffer),
          ...Buffer.from(Uint32Array.from([params.feesTreasury]).buffer),
          ...Buffer.from(Uint32Array.from([params.feesPartner]).buffer),
        ]),
      });

      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = params.operatorWallet;

      const serializedTx = transaction.serialize({ requireAllSignatures: false });
      return serializedTx.toString('base64');
    } catch (error) {
      logger.error('Failed to build settle_session TX', 'AnchorTxBuilder', { error });
      throw new Error(`Failed to build settle_session transaction: ${error}`);
    }
  }
}

export const anchorTxBuilder = new AnchorTxBuilder();
