/**
 * services/dlmmAnalyticsService.ts
 * Calculates DLMM performance metrics, PnL analytics, and trading insights
 * Migrated from Python: src/services/dlmm_analytics_service.py
 */

export class DlmmAnalyticsService {
  async getPerformanceAnalytics(userWallet: string): Promise<Record<string, any>> {
    try {
      // Typically fetch from a MeteoraPositionService or Indexed DB
      // Mocking position logic for TS as in Python
      const positions: any[] = []; 

      if (!positions.length) return this.getEmptyAnalytics();

      const totalValue = positions.reduce((sum, p) => sum + (p.current_value || 0), 0);
      const totalInitial = positions.reduce((sum, p) => sum + (p.initial_value || 0), 0);
      const totalFees = positions.reduce((sum, p) => sum + (p.fees_earned || 0), 0);

      const priceChangePnl = totalValue - totalInitial;
      const totalPnl = priceChangePnl + totalFees;

      const roi = totalInitial > 0 ? (totalPnl / totalInitial) * 100 : 0;
      const winningPositions = positions.filter((p) => (p.current_value || 0) > (p.initial_value || 0));
      const winCount = winningPositions.length;
      const totalCount = positions.length;
      const winRate = totalCount > 0 ? (winCount / totalCount) * 100 : 0;
      const avgApy = totalCount > 0 ? positions.reduce((sum, p) => sum + (p.apy || 0), 0) / totalCount : 0;

      let bestTrade = null;
      let worstTrade = null;

      if (positions.length > 0) {
        const sortedByPnl = [...positions].sort((a, b) => (b.current_value || 0) - (b.initial_value || 0) - ((a.current_value || 0) - (a.initial_value || 0)));
        const best = sortedByPnl[0];
        const worst = sortedByPnl[sortedByPnl.length - 1];

        bestTrade = {
          action: `Add Liquidity (${best.pool_name || 'Unknown'})`,
          pnl: (best.current_value || 0) - (best.initial_value || 0),
          timestamp: best.created_at || '',
          pool: best.pool_address || '',
        };
        worstTrade = {
          action: `Add Liquidity (${worst.pool_name || 'Unknown'})`,
          pnl: (worst.current_value || 0) - (worst.initial_value || 0),
          timestamp: worst.created_at || '',
          pool: worst.pool_address || '',
        };
      }

      const insights = this.generateInsights({ win_rate: winRate, total_pnl: totalPnl, total_fees: totalFees, avg_apy: avgApy });

      return {
        performance: {
          total_pnl: Number(totalPnl.toFixed(2)),
          total_fees_earned: Number(totalFees.toFixed(2)),
          price_change_pnl: Number(priceChangePnl.toFixed(2)),
          impermanent_loss: Number(positions.reduce((sum, p) => sum + (p.impermanent_loss || 0), 0).toFixed(2)),
          actions_taken: totalCount,
          success_rate: Number(winRate.toFixed(2)),
          average_apy: Number(avgApy.toFixed(2)),
          best_trade: bestTrade,
          worst_trade: worstTrade,
          net_pnl: Number(totalPnl.toFixed(2)),
          roi_percentage: Number(roi.toFixed(2)),
          win_rate: Number(winRate.toFixed(2)),
          total_value_locked: Number(totalValue.toFixed(2)),
          initial_investment: Number(totalInitial.toFixed(2)),
        },
        insights,
        conversation_stats: {
          total_messages: 0,
          session_count: 0,
          last_active: new Date().toISOString(),
        },
        positions_summary: {
          total_positions: totalCount,
          in_range: positions.filter((p) => p.in_range !== false).length,
          out_of_range: positions.filter((p) => p.in_range === false).length,
          positions: positions.map((p) => ({
            pool: p.pool_name || 'Unknown',
            value: p.current_value || 0,
            apy: p.apy || 0,
            in_range: p.in_range !== false,
          })),
        },
      };
    } catch (e: any) {
      console.error(`Error calculating analytics: ${e.message}`);
      return this.getEmptyAnalytics();
    }
  }

  async getHistoricalPnl(userWallet: string, days = 30): Promise<any[]> {
    try {
      const history = [];
      const endDate = new Date();
      let currentDate = new Date();
      currentDate.setDate(endDate.getDate() - days);

      while (currentDate <= endDate) {
        let daysElapsed = Math.floor((currentDate.getTime() - (endDate.getTime() - days * 86400000)) / 86400000);
        // Correct to avoid possible negative days in edge cases
        if(daysElapsed < 0) daysElapsed = 0; 
        
        const mockPnl = daysElapsed * 2.5;

        history.push({
          date: currentDate.toISOString(),
          total_value: 1000 + mockPnl,
          pnl: mockPnl,
          fees_earned: daysElapsed * 0.5,
          active_positions: 1,
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }
      return history;
    } catch (e: any) {
      return [];
    }
  }

  private generateInsights(metrics: Record<string, any>): string[] {
    const insights: string[] = [];
    const winRate = metrics.win_rate || 0;
    const totalPnl = metrics.total_pnl || 0;
    const totalFees = metrics.total_fees || 0;
    const avgApy = metrics.avg_apy || 0;

    if (winRate >= 70) insights.push('🎯 Excellent win rate! Your strategy is working very well.');
    else if (winRate >= 50) insights.push('✅ Win rate above 50%. Good job managing risk!');
    else if (winRate >= 30) insights.push('⚠️ Win rate below average. Consider adjusting your strategy.');
    else insights.push('🔴 Low win rate detected. Review your position management approach.');

    if (totalFees > Math.abs(totalPnl)) insights.push('💰 Fees are your main source of returns. Great passive income!');

    if (avgApy >= 40) insights.push('🚀 High APY! You are capturing excellent yields.');
    else if (avgApy >= 20) insights.push('✅ Solid APY. Your positions are performing well.');
    else if (avgApy >= 10) insights.push('📊 Moderate APY. Consider optimizing your ranges.');
    else insights.push('⚠️ Low APY. You might want to explore other pools or adjust ranges.');

    if (totalPnl > 100) insights.push('🎉 Profitable overall! Keep up the good work.');
    else if (totalPnl > 0) insights.push('✅ Slightly profitable. Small adjustments could improve returns.');
    else insights.push('📉 Currently at a loss. Consider rebalancing or cutting losses on underperforming positions.');

    return insights;
  }

  private getEmptyAnalytics(): Record<string, any> {
    return {
      performance: {
        total_pnl: 0,
        total_fees_earned: 0,
        price_change_pnl: 0,
        impermanent_loss: 0,
        actions_taken: 0,
        success_rate: 0,
        average_apy: 0,
        best_trade: null,
        worst_trade: null,
        net_pnl: 0,
        roi_percentage: 0,
        win_rate: 0,
        total_value_locked: 0,
        initial_investment: 0,
      },
      insights: [
        '👋 Start providing liquidity to see analytics and insights.',
        '💡 DLMM pools can generate yields through trading fees.',
        '📚 Learn about concentrated liquidity strategies for better returns.',
      ],
      conversation_stats: {
        total_messages: 0,
        session_count: 0,
        last_active: new Date().toISOString(),
      },
      positions_summary: {
        total_positions: 0,
        in_range: 0,
        out_of_range: 0,
        positions: [],
      },
    };
  }
}

export const dlmmAnalyticsService = new DlmmAnalyticsService();
