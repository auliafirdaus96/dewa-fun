import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/agents/dlmm/strategies
 * Get all available strategy templates
 */
export async function GET() {
  try {
    const strategies = [
      {
        name: "Conservative Yield",
        description: "Stable yields with minimal risk. Perfect for beginners.",
        config: {
          risk_tolerance: "LOW",
          rebalance_threshold: 5.0,
          auto_compound: true,
          compound_frequency_hours: 24,
          hedge_enabled: false,
          preferred_pairs: ["USDC-USDT", "SOL-USDC"],
          max_il_risk: 3.0,
          target_apy_min: 10.0,
          target_apy_max: 20.0
        }
      },
      {
        name: "Balanced Growth",
        description: "Optimal balance between risk and reward.",
        config: {
          risk_tolerance: "MEDIUM",
          rebalance_threshold: 8.0,
          auto_compound: true,
          compound_frequency_hours: 12,
          hedge_enabled: true,
          hedge_threshold: 6.0,
          preferred_pairs: ["SOL-ETH", "SOL-BTC"],
          max_il_risk: 5.0,
          target_apy_min: 20.0,
          target_apy_max: 40.0
        }
      },
      {
        name: "Aggressive Alpha",
        description: "Maximum yields with higher risk. For experienced users.",
        config: {
          risk_tolerance: "HIGH",
          rebalance_threshold: 12.0,
          auto_compound: true,
          compound_frequency_hours: 6,
          hedge_enabled: false,
          preferred_pairs: ["SOL-MEME", "NEW_LAUNCHES"],
          max_il_risk: 8.0,
          target_apy_min: 40.0,
          target_apy_max: 100.0
        }
      }
    ];

    return NextResponse.json(strategies);
  } catch (error) {
    console.error('Failed to fetch strategies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch strategies' },
      { status: 500 }
    );
  }
}
