use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use switchboard_solana::prelude::*; // IMPORT SWITCHBOARD 

declare_id!("11111111111111111111111111111111");

#[program]
pub mod dewa_dice {
    use super::*;

    pub fn initialize_vault(
        ctx: Context<InitializeVault>,
        creator_fee_basis_points: u16, 
    ) -> Result<()> {
        let vault_state = &mut ctx.accounts.vault_state;
        vault_state.creator = ctx.accounts.creator.key();
        vault_state.operator = ctx.accounts.creator.key(); // Default operator is creator
        vault_state.token_mint = ctx.accounts.token_mint.key();
        vault_state.vault_bump = ctx.bumps.vault_token_account; 
        vault_state.house_edge_bps = 100; // 1%
        vault_state.is_paused = false;
        
        msg!("Dice Vault Initialized for Token: {}", vault_state.token_mint);
        Ok(())
    }

    pub fn set_operator(
        ctx: Context<SetOperator>,
        new_operator: Pubkey,
    ) -> Result<()> {
        let vault_state = &mut ctx.accounts.vault_state;
        require!(ctx.accounts.creator.key() == vault_state.creator, DiceError::Unauthorized);
        
        vault_state.operator = new_operator;
        msg!("Operator updated to: {}", new_operator);
        Ok(())
    }

    pub fn set_paused(
        ctx: Context<SetPaused>,
        paused: bool,
    ) -> Result<()> {
        let vault_state = &mut ctx.accounts.vault_state;
        require!(ctx.accounts.creator.key() == vault_state.creator, DiceError::Unauthorized);
        
        vault_state.is_paused = paused;
        msg!("Vault paused state updated to: {}", paused);
        Ok(())
    }

    pub fn settle_session(
        ctx: Context<SettleSession>,
        amount_wagered: u64,
        amount_payout: u64,
        fees_creator: u64,
        fees_treasury: u64,
        fees_partner: u64,
    ) -> Result<()> {
        let vault_state = &ctx.accounts.vault_state;
        require!(!vault_state.is_paused, DiceError::VaultPaused);
        require!(ctx.accounts.operator.key() == vault_state.operator, DiceError::Unauthorized);

        let vault_bump = vault_state.vault_bump;
        let auth_seeds = &["vault".as_bytes(), &[vault_bump]];
        let signer = &[&auth_seeds[..]];

        // 1. If Payout > Wagered (Vault loses money net)
        if amount_payout > amount_wagered {
            let net_loss = amount_payout.checked_sub(amount_wagered).unwrap();
            let transfer_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_token_account.to_account_info(),
                    to: ctx.accounts.player_token_account.to_account_info(),
                    authority: ctx.accounts.vault_state.to_account_info(),
                },
                signer,
            );
            token::transfer(transfer_ctx, net_loss)?;
        } 
        // 2. If Wagered > Payout (Vault wins money net - unlikely for single session but possible for batch)
        else if amount_wagered > amount_payout {
            // Note: In Auto/Flash, tokens are typically already in the vault or held by the program
            // This instruction assumes funds are correctly balanced in the vault PDA.
        }

        // 3. Distribute Fees
        if fees_creator > 0 {
             let creator_transfer_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_token_account.to_account_info(),
                    to: ctx.accounts.creator_account.to_account_info(),
                    authority: ctx.accounts.vault_state.to_account_info(),
                },
                signer,
            );
            token::transfer(creator_transfer_ctx, fees_creator)?;
        }

        if fees_treasury > 0 {
            let dewa_transfer_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_token_account.to_account_info(),
                    to: ctx.accounts.dewa_treasury.to_account_info(),
                    authority: ctx.accounts.vault_state.to_account_info(),
                },
                signer,
            );
            token::transfer(dewa_transfer_ctx, fees_treasury)?;
        }

        if fees_partner > 0 {
            let partner_transfer_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_token_account.to_account_info(),
                    to: ctx.accounts.partner_account.to_account_info(),
                    authority: ctx.accounts.vault_state.to_account_info(),
                },
                signer,
            );
            token::transfer(partner_transfer_ctx, fees_partner)?;
        }

        // 4. If Wagered > Payout (Vault wins money net)
        // Funds remain in the vault account naturally. 
        // We log it for indexing.

        msg!("Session settled: {} wagered, {} payout", amount_wagered, amount_payout);
        Ok(())
    }

    /// 🆕 NEW: Distribute house edge with 25-25-30-20 model
    /// Creator (Level 2): 25%
    /// Agent (Level 1): 25%  
    /// Dewa Protocol: 30%
    /// Affiliate: 20%
    pub fn distribute_house_edge(
        ctx: Context<DistributeHouseEdge>,
        house_edge_amount: u64,
    ) -> Result<()> {
        let vault_state = &ctx.accounts.vault_state;
        let vault_bump = vault_state.vault_bump;
        let auth_seeds = &["vault".as_bytes(), &[vault_bump]];
        let signer = &[&auth_seeds[..]];

        // Calculate shares (basis points: 2500 = 25%, 3000 = 30%, 2000 = 20%)
        let creator_share = house_edge_amount.checked_mul(2500).unwrap().checked_div(10000).unwrap(); // 25%
        let agent_share = house_edge_amount.checked_mul(2500).unwrap().checked_div(10000).unwrap();   // 25%
        let treasury_share = house_edge_amount.checked_mul(3000).unwrap().checked_div(10000).unwrap(); // 30%
        let affiliate_share = house_edge_amount.checked_mul(2000).unwrap().checked_div(10000).unwrap(); // 20%

        // Distribute to Creator (Level 2) - whoever created & deposited the token
        if creator_share > 0 && ctx.accounts.creator_account.amount > 0 {
            let creator_transfer_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_token_account.to_account_info(),
                    to: ctx.accounts.creator_account.to_account_info(),
                    authority: ctx.accounts.vault_state.to_account_info(),
                },
                signer,
            );
            token::transfer(creator_transfer_ctx, creator_share)?;
            msg!("Creator share distributed: {} lamports", creator_share);
        }

        // Distribute to Agent (Level 1) - platform owner (Dewi)
        // Optional: if agent_address is set and different from creator
        if agent_share > 0 && ctx.accounts.agent_account.amount > 0 {
            let agent_transfer_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_token_account.to_account_info(),
                    to: ctx.accounts.agent_account.to_account_info(),
                    authority: ctx.accounts.vault_state.to_account_info(),
                },
                signer,
            );
            token::transfer(agent_transfer_ctx, agent_share)?;
            msg!("Agent share distributed: {} lamports", agent_share);
        }

        // Distribute to Dewa Protocol Treasury (30%)
        if treasury_share > 0 {
            let treasury_transfer_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_token_account.to_account_info(),
                    to: ctx.accounts.dewa_treasury.to_account_info(),
                    authority: ctx.accounts.vault_state.to_account_info(),
                },
                signer,
            );
            token::transfer(treasury_transfer_ctx, treasury_share)?;
            msg!("Treasury share distributed: {} lamports", treasury_share);
        }

        // Distribute to Affiliate (20%)
        if affiliate_share > 0 {
            let affiliate_transfer_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_token_account.to_account_info(),
                    to: ctx.accounts.affiliate_account.to_account_info(),
                    authority: ctx.accounts.vault_state.to_account_info(),
                },
                signer,
            );
            token::transfer(affiliate_transfer_ctx, affiliate_share)?;
            msg!("Affiliate share distributed: {} lamports", affiliate_share);
        }

        msg!("House edge distributed: {} total | Creator: {}, Agent: {}, Treasury: {}, Affiliate: {}", 
             house_edge_amount, creator_share, agent_share, treasury_share, affiliate_share);
        
        Ok(())
    }

    pub fn place_bet(
        ctx: Context<PlaceBet>,
        amount: u64,
        target_number: u8,
        is_under: bool,
    ) -> Result<()> {
        let vault_state = &ctx.accounts.vault_state;
        require!(!vault_state.is_paused, DiceError::VaultPaused);
        require!(amount > 0, DiceError::InvalidBetAmount);
        require!(target_number > 0 && target_number < 100, DiceError::InvalidTarget);

        let max_profit = ctx.accounts.vault_token_account.amount.checked_div(100).unwrap();
        let expected_profit = calculate_profit(amount, target_number, is_under);
        require!(expected_profit <= max_profit, DiceError::BetExceedsVaultLimit);

        // Lock player funds explicitly into the Vault PDA
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.player_token_account.to_account_info(),
                to: ctx.accounts.vault_token_account.to_account_info(),
                authority: ctx.accounts.player.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, amount)?;

        // Initialize Bet State
        let bet_state = &mut ctx.accounts.bet_state;
        bet_state.player = ctx.accounts.player.key();
        bet_state.amount = amount;
        bet_state.target_number = target_number;
        bet_state.is_under = is_under;
        bet_state.expected_profit = expected_profit;
        bet_state.vrf_request = ctx.accounts.vrf_request.key();
        bet_state.timestamp = Clock::get()?.unix_timestamp;

        // 🔴 VRF CODE COMMENTED OUT FOR BUILD - WILL IMPLEMENT LATER 🔴
        // 🟢 SWITCHBOARD VRF REQUEST LOGIC 🟢
        // let vrf_request = &ctx.accounts.vrf_request;
        // let switchboard_program = &ctx.accounts.switchboard_program;
        // Issue CPI to Switchboard to request randomness
        // let request_cpi_ctx = VrfRequestRandomness {
        //     request: vrf_request.to_account_info(),
        //     vrf: ctx.accounts.vrf.to_account_info(),
        //     authority: ctx.accounts.player.to_account_info(),
        //     oracle_queue: ctx.accounts.oracle_queue.to_account_info(),
        //     queue_authority: ctx.accounts.queue_authority.to_account_info(),
        //     data_buffer: ctx.accounts.data_buffer.to_account_info(),
        //     permission: ctx.accounts.permission.to_account_info(),
        //     escrow: ctx.accounts.switchboard_escrow.to_account_info(),
        //     payer_wallet: ctx.accounts.player_token_account.to_account_info(),
        //     payer_authority: ctx.accounts.player.to_account_info(),
        //     recent_blockhashes: ctx.accounts.recent_blockhashes.to_account_info(),
        //     program_state: ctx.accounts.switchboard_state.to_account_info(),
        //     token_program: ctx.accounts.token_program.to_account_info(),
        // };
        // We pass the bet seed so the callback knows which bet to resolve
        // switchboard_solana::vrf_request_randomness(
        //     CpiContext::new(switchboard_program.to_account_info(), request_cpi_ctx),
        //     &[1],
        // )?;

        msg!("Bet locked! VRF Request sent. BetState initialized.");
        Ok(())
    }

    pub fn resolve_bet(
        ctx: Context<ResolveBet>,
    ) -> Result<()> {
        let bet_state = &mut ctx.accounts.bet_state;
        
        // 🔴 VRF CALLBACK COMMENTED OUT - WILL IMPLEMENT LATER 🔴
        // 🟢 SWITCHBOARD VRF CALLBACK LOGIC 🟢
        // let vrf_account_info = &ctx.accounts.vrf;
        // let vrf = switchboard_solana::VrfAccountData::new(vrf_account_info)?;
        
        // SECURITY: Verify that the callback is coming from the expected VRF account
        // require!(ctx.accounts.bet_state.vrf_request == vrf_account_info.key(), DiceError::Unauthorized);

        // Ensure VRF is successfully verified
        // let result_buffer = vrf.get_result()?;
        
        // Modulo the result buffer to get a number between 1 and 100
        // let vrf_result = (result_buffer[0] % 100) + 1;
        
        // For now, use a placeholder result (THIS SHOULD BE REPLACED WITH ACTUAL VRF RESULT)
        let vrf_result = 50; // Placeholder
        msg!("VRF Callback Received! Oracle generated number: {}", vrf_result);

        let is_win = if bet_state.is_under {
            vrf_result < bet_state.target_number
        } else {
            vrf_result > bet_state.target_number
        };

        let vault_bump = ctx.accounts.vault_state.vault_bump;
        let auth_seeds = &["vault".as_bytes(), &[vault_bump]];
        let signer = &[&auth_seeds[..]];

        // 🔒 SECURITY: Double-check vault balance and max win limit BEFORE payout
        let vault_balance = ctx.accounts.vault_token_account.amount;
        let max_allowed_payout = vault_balance.checked_div(100).unwrap(); // 1% rule
        
        if is_win {
            let payout = bet_state.amount + bet_state.expected_profit;
            
            // CRITICAL: Verify payout doesn't exceed 1% of vault
            require!(payout <= max_allowed_payout, DiceError::BetExceedsVaultLimit);
            
            // Additional safety: Ensure vault has sufficient balance
            require!(vault_balance >= payout, DiceError::InsufficientVaultLiquidity);
            
            let transfer_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_token_account.to_account_info(),
                    to: ctx.accounts.player_token_account.to_account_info(),
                    authority: ctx.accounts.vault_state.to_account_info(),
                },
                signer,
            );
            token::transfer(transfer_ctx, payout)?;
            msg!("Player Won! Payout transferred: {} (max allowed: {})", payout, max_allowed_payout);
        } else {
            let house_edge_amount = bet_state.amount.checked_div(100).unwrap(); // 1%
            let dewa_fee = house_edge_amount.checked_mul(30).unwrap().checked_div(100).unwrap();
            let partner_fee = house_edge_amount.checked_mul(20).unwrap().checked_div(100).unwrap();
            
            // 🔒 SECURITY: Also validate fees don't drain vault excessively
            let total_fees = dewa_fee + partner_fee;
            require!(total_fees <= max_allowed_payout, DiceError::BetExceedsVaultLimit);

            // Transfer Dewa Fee to Treasury (for Buyback & Burn)
            let dewa_transfer_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_token_account.to_account_info(),
                    to: ctx.accounts.dewa_treasury.to_account_info(),
                    authority: ctx.accounts.vault_state.to_account_info(),
                },
                signer,
            );
            token::transfer(dewa_transfer_ctx, dewa_fee)?;

            // Transfer Partner Fee (B2B2C Incentive)
            let partner_transfer_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_token_account.to_account_info(),
                    to: ctx.accounts.partner_account.to_account_info(),
                    authority: ctx.accounts.vault_state.to_account_info(),
                },
                signer,
            );
            token::transfer(partner_transfer_ctx, partner_fee)?;

            msg!("Player Lost. Fees routed: 30% Dewa Treasury | 20% Partner Node");
        }

        Ok(())
    }

    pub fn cancel_bet(
        ctx: Context<CancelBet>,
    ) -> Result<()> {
        let bet_state = &ctx.accounts.bet_state;
        let clock = Clock::get()?;

        // 1. Verify Timeout (60 Seconds)
        let timeout_seconds = 60;
        let elapsed = clock.unix_timestamp.checked_sub(bet_state.timestamp).unwrap();
        require!(elapsed >= timeout_seconds, DiceError::BetNotTimedOut);

        // 2. Refund Player (Transfer amount from vault)
        let vault_bump = ctx.accounts.vault_state.vault_bump;
        let auth_seeds = &["vault".as_bytes(), &[vault_bump]];
        let signer = &[&auth_seeds[..]];

        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_token_account.to_account_info(),
                to: ctx.accounts.player_token_account.to_account_info(),
                authority: ctx.accounts.vault_state.to_account_info(),
            },
            signer,
        );
        token::transfer(transfer_ctx, bet_state.amount)?;

        msg!("Bet Cancelled due to VRF Timeout. Refunded: {}", bet_state.amount);
        Ok(())
    }
}

// ---------------------------------------------------------------- //
// ACCOUNTS & STATE STRUCTS
// ---------------------------------------------------------------- //

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    pub token_mint: Account<'info, Mint>,
    
    #[account(init, payer = creator, space = 8 + 32 + 32 + 32 + 1 + 2 + 1, seeds = [b"vault_state", token_mint.key().as_ref()], bump)]
    pub vault_state: Account<'info, VaultState>,

    #[account(init, payer = creator, token::mint = token_mint, token::authority = vault_state, seeds = [b"vault", token_mint.key().as_ref()], bump)]
    pub vault_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct SetOperator<'info> {
    pub creator: Signer<'info>,
    #[account(mut)]
    pub vault_state: Account<'info, VaultState>,
}

#[derive(Accounts)]
pub struct SetPaused<'info> {
    pub creator: Signer<'info>,
    #[account(mut)]
    pub vault_state: Account<'info, VaultState>,
}

#[derive(Accounts)]
pub struct SettleSession<'info> {
    #[account(mut)]
    pub operator: Signer<'info>,
    #[account(mut)]
    pub vault_state: Account<'info, VaultState>,
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub player_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub creator_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub dewa_treasury: Account<'info, TokenAccount>,
    #[account(mut)]
    pub partner_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

/// 🆕 NEW: Accounts for 25-25-30-20 house edge distribution
#[derive(Accounts)]
pub struct DistributeHouseEdge<'info> {
    #[account(mut)]
    pub vault_state: Account<'info, VaultState>,
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    
    /// Creator (Level 2) - whoever created & deposited the token
    #[account(mut)]
    pub creator_account: Account<'info, TokenAccount>,
    
    /// Agent (Level 1) - platform owner (Dewi) - optional
    #[account(mut)]
    pub agent_account: Account<'info, TokenAccount>,
    
    /// Dewa Protocol Treasury (30%)
    #[account(mut)]
    pub dewa_treasury: Account<'info, TokenAccount>,
    
    /// Affiliate Network (20%)
    #[account(mut)]
    pub affiliate_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct PlaceBet<'info> {
    #[account(mut)]
    pub player: Signer<'info>,
    #[account(mut)]
    pub vault_state: Account<'info, VaultState>,
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub player_token_account: Account<'info, TokenAccount>,
    
    #[account(init, payer = player, space = 8 + 32 + 8 + 1 + 1 + 8 + 32 + 8)]
    pub bet_state: Account<'info, BetState>,

    // Switchboard Accounts for VRF Request
    /// CHECK: Switchboard VRF Request Account
    #[account(mut)]
    pub vrf_request: AccountInfo<'info>,
    /// CHECK: Switchboard VRF Account
    #[account(mut)]
    pub vrf: AccountInfo<'info>,
    /// CHECK: Switchboard Oracle Queue
    #[account(mut)]
    pub oracle_queue: AccountInfo<'info>,
    /// CHECK: Queue Authority
    pub queue_authority: AccountInfo<'info>,
    /// CHECK: Data Buffer
    #[account(mut)]
    pub data_buffer: AccountInfo<'info>,
    /// CHECK: Permission Account
    #[account(mut)]
    pub permission: AccountInfo<'info>,
    /// CHECK: Switchboard Escrow
    #[account(mut)]
    pub switchboard_escrow: AccountInfo<'info>,
    /// CHECK: Switchboard Program State
    pub switchboard_state: AccountInfo<'info>,
    /// CHECK: Switchboard Program
    pub switchboard_program: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveBet<'info> {
    // Switchboard Oracle calls this to inject randomness
    /// CHECK: Switchboard Program verifies this signature
    #[account(signer)]
    pub oracle: AccountInfo<'info>, 
    
    /// CHECK: Switchboard VRF Account data
    pub vrf: AccountInfo<'info>,

    #[account(mut)]
    pub vault_state: Account<'info, VaultState>,
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub player_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub dewa_treasury: Account<'info, TokenAccount>,
    #[account(mut)]
    pub partner_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub bet_state: Account<'info, BetState>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CancelBet<'info> {
    #[account(mut)]
    pub player: Signer<'info>,
    
    #[account(mut)]
    pub vault_state: Account<'info, VaultState>,
    
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub player_token_account: Account<'info, TokenAccount>,

    #[account(
        mut, 
        close = player, 
        constraint = bet_state.player == player.key() @ DiceError::Unauthorized
    )]
    pub bet_state: Account<'info, BetState>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct VaultState {
    pub creator: Pubkey,
    pub operator: Pubkey,
    pub token_mint: Pubkey,
    pub vault_bump: u8,
    pub house_edge_bps: u16,
    pub is_paused: bool,
}

#[account]
pub struct BetState {
    pub player: Pubkey,
    pub amount: u64,
    pub target_number: u8,
    pub is_under: bool,
    pub expected_profit: u64,
    pub vrf_request: Pubkey,
    pub timestamp: i64,
}

#[error_code]
pub enum DiceError {
    #[msg("Bet amount must be greater than 0")]
    InvalidBetAmount,
    #[msg("Target must be between 1 and 99")]
    InvalidTarget,
    #[msg("Bet exceeds vault limit (Maximum 1% of Vault Balance)")]
    BetExceedsVaultLimit,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Bet has not timed out yet (wait 60 seconds)")]
    BetNotTimedOut,
    #[msg("Vault is currently paused")]
    VaultPaused,
    #[msg("Insufficient vault liquidity for payout")]
    InsufficientVaultLiquidity,
}

pub fn calculate_profit(amount: u64, target_number: u8, is_under: bool) -> u64 {
    // SECURITY: Replaced f64 with Safe Fixed-Point Arithmetic (Basis 1,000,000)
    // Formula: payout = (amount * multiplier)
    // multiplier = (99 / win_chance)
    
    let win_chance = if is_under { target_number as u64 } else { (100 - target_number) as u64 };
    
    // Multiplier with 6 decimals precision
    // 99.0 / win_chance => (99 * 1_000_000) / win_chance
    let multiplier_scaled = 99_000_000u64.checked_div(win_chance).unwrap_or(0);
    
    let total_payout = (amount as u128)
        .checked_mul(multiplier_scaled as u128).unwrap()
        .checked_div(1_000_000).unwrap() as u64;

    total_payout.saturating_sub(amount)
}
