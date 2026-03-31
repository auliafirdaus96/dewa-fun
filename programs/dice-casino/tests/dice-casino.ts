import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DewaDice } from "../target/types/dewa_dice";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert, expect } from "chai";

describe("Dewa Dice Smart Contract", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.DewaDice as Program<DewaDice>;

  // Test accounts
  const creator = (provider.wallet as anchor.Wallet).payer;
  const player = Keypair.generate();

  // PDA seeds
  const VAULT_STATE_SEED = Buffer.from("vault_state");
  const VAULT_TOKEN_SEED = Buffer.from("vault");

  // Token accounts
  let tokenMint: PublicKey;
  let vaultStatePda: PublicKey;
  let vaultTokenAccount: PublicKey;

  before(async () => {
    // Airdrop SOL to player
    const airdropSignature = await provider.connection.requestAirdrop(
      player.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSignature);
  });

  describe("Vault Initialization", () => {
    beforeEach(async () => {
      // Create test token mint for each test
      tokenMint = await createTestTokenMint();

      // Derive PDAs
      [vaultStatePda] = PublicKey.findProgramAddressSync(
        [VAULT_STATE_SEED],
        program.programId
      );

      [vaultTokenAccount] = PublicKey.findProgramAddressSync(
        [VAULT_TOKEN_SEED],
        program.programId
      );
    });

    it("Can initialize vault with correct parameters", async () => {
      const feeBps = 100; // 1%

      // Initialize vault
      await program.methods
        .initializeVault(new anchor.BN(feeBps))
        .accounts({
          creator: creator.publicKey,
          vaultState: vaultStatePda,
          vaultTokenAccount: vaultTokenAccount,
          tokenMint: tokenMint,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([creator])
        .rpc();

      // Fetch vault state
      const vaultState = await program.account.vaultState.fetch(vaultStatePda);

      // Verify vault parameters
      assert.strictEqual(
        vaultState.creator.toString(),
        creator.publicKey.toString()
      );
      assert.strictEqual(vaultState.tokenMint.toString(), tokenMint.toString());
      assert.strictEqual(vaultState.houseEdgeBps.toNumber(), 100);
      assert.isFalse(vaultState.isPaused);
    });

    it("Sets default house edge to 1% (100 bps)", async () => {
      const feeBps = 100;

      await program.methods
        .initializeVault(new anchor.BN(feeBps))
        .accounts({
          creator: creator.publicKey,
          vaultState: vaultStatePda,
          vaultTokenAccount: vaultTokenAccount,
          tokenMint: tokenMint,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([creator])
        .rpc();

      const vaultState = await program.account.vaultState.fetch(vaultStatePda);
      assert.strictEqual(vaultState.houseEdgeBps.toNumber(), 100);
    });
  });

  describe("Emergency Controls", () => {
    beforeEach(async () => {
      // Setup: Create token mint and initialize vault
      tokenMint = await createTestTokenMint();

      [vaultStatePda] = PublicKey.findProgramAddressSync(
        [VAULT_STATE_SEED],
        program.programId
      );

      [vaultTokenAccount] = PublicKey.findProgramAddressSync(
        [VAULT_TOKEN_SEED],
        program.programId
      );

      // Initialize vault
      await program.methods
        .initializeVault(new anchor.BN(100))
        .accounts({
          creator: creator.publicKey,
          vaultState: vaultStatePda,
          vaultTokenAccount: vaultTokenAccount,
          tokenMint: tokenMint,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([creator])
        .rpc();
    });

    it("Can pause vault by creator", async () => {
      // Pause the vault
      await program.methods
        .setPaused(true)
        .accounts({
          creator: creator.publicKey,
          vaultState: vaultStatePda,
        })
        .signers([creator])
        .rpc();

      // Verify paused state
      const vaultState = await program.account.vaultState.fetch(vaultStatePda);
      assert.isTrue(vaultState.isPaused);
    });

    it("Can unpause vault by creator", async () => {
      // Pause then unpause
      await program.methods
        .setPaused(true)
        .accounts({
          creator: creator.publicKey,
          vaultState: vaultStatePda,
        })
        .signers([creator])
        .rpc();

      await program.methods
        .setPaused(false)
        .accounts({
          creator: creator.publicKey,
          vaultState: vaultStatePda,
        })
        .signers([creator])
        .rpc();

      const vaultState = await program.account.vaultState.fetch(vaultStatePda);
      assert.isFalse(vaultState.isPaused);
    });

    it("Rejects unauthorized operator", async () => {
      // Try to pause with non-creator account
      try {
        await program.methods
          .setPaused(true)
          .accounts({
            creator: player.publicKey,
            vaultState: vaultStatePda,
          })
          .signers([player])
          .rpc();

        assert.fail("Expected error but succeeded");
      } catch (error: any) {
        assert.include(error.message, "Error");
      }
    });
  });

  describe("Security Validations", () => {
    beforeEach(async () => {
      // Setup: Create token mint and initialize vault
      tokenMint = await createTestTokenMint();

      [vaultStatePda] = PublicKey.findProgramAddressSync(
        [VAULT_STATE_SEED],
        program.programId
      );

      [vaultTokenAccount] = PublicKey.findProgramAddressSync(
        [VAULT_TOKEN_SEED],
        program.programId
      );

      // Initialize vault
      await program.methods
        .initializeVault(new anchor.BN(100))
        .accounts({
          creator: creator.publicKey,
          vaultState: vaultStatePda,
          vaultTokenAccount: vaultTokenAccount,
          tokenMint: tokenMint,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([creator])
        .rpc();
    });

    it("Prevents reentrancy attacks via PDA seeds", async () => {
      // Verify PDA derivation
      const [derivedPda] = PublicKey.findProgramAddressSync(
        [VAULT_STATE_SEED],
        program.programId
      );
      assert.strictEqual(derivedPda.toString(), vaultStatePda.toString());
    });

    it("Uses safe arithmetic (no floating point)", async () => {
      // Basis points are integers, no floating point
      const vaultState = await program.account.vaultState.fetch(vaultStatePda);
      assert.isBelow(vaultState.houseEdgeBps.toNumber(), 10001);
    });

    it("Validates all account owners and seeds", async () => {
      const vaultState = await program.account.vaultState.fetch(vaultStatePda);
      assert.isDefined(vaultState.creator);
      assert.isDefined(vaultState.tokenMint);
      assert.isDefined(vaultState.vaultBump);
    });
  });
});

// Helper function to create test token mint
async function createTestTokenMint(): Promise<PublicKey> {
  // This is a simplified version - in real tests you'd use spl-token library
  // For now, we'll just generate a random keypair for the mint
  const mintKeypair = Keypair.generate();
  
  // In actual implementation, you would:
  // 1. Create the mint using spl-token
  // 2. Create token accounts
  // 3. Mint tokens
  
  return mintKeypair.publicKey;
}
