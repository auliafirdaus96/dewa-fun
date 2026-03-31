/**
 * agents/dlmmAdvanced.ts
 * DLMM Agent - Advanced Features Module
 * Multi-turn conversations, context memory, strategy templates, and analytics
 * Migrated from Python: src/agents/dlmm_advanced.py
 */

export class ConversationMemory {
  public nodeId: string;
  public conversationHistory: any[];
  public userPreferences: Record<string, any>;
  public lastInteraction: Date | null;
  public sessionCount: number;

  constructor(nodeId: string) {
    this.nodeId = nodeId;
    this.conversationHistory = [];
    this.userPreferences = {};
    this.lastInteraction = null;
    this.sessionCount = 0;
    this.loadFromStorage();
  }

  addMessage(role: string, content: string, metadata?: Record<string, any>) {
    const message = {
      role,
      content,
      timestamp: new Date().toISOString(),
      metadata: metadata || {},
    };
    this.conversationHistory.push(message);

    if (this.conversationHistory.length > 50) {
      this.conversationHistory = this.conversationHistory.slice(-50);
    }

    this.lastInteraction = new Date();
    this.saveToStorage();
  }

  getContextSummary(): string {
    if (this.conversationHistory.length === 0) return 'No previous conversation';

    const recent = this.conversationHistory.slice(-5);
    const parts = recent.map((msg) => {
      if (msg.role === 'user') return `User asked about: ${msg.content.substring(0, 100)}`;
      if (msg.role === 'assistant') return `AI recommended: ${msg.content.substring(0, 100)}`;
      return '';
    });

    return parts.filter((p) => p).join('\n');
  }

  updatePreference(key: string, value: any) {
    this.userPreferences[key] = value;
    this.saveToStorage();
  }

  getPreference(key: string, defaultValue: any = null): any {
    return this.userPreferences[key] !== undefined ? this.userPreferences[key] : defaultValue;
  }

  private saveToStorage() {
    // In production, save to Supabase agent_memory
    console.log(`[MEMORY] Saved ${this.conversationHistory.length} messages for ${this.nodeId}`);
  }

  private loadFromStorage() {
    console.log(`[MEMORY] Loaded memory for ${this.nodeId}`);
  }
}

export const StrategyTemplates = {
  CONSERVATIVE: {
    name: 'Conservative Yield',
    description: 'Stable yields with minimal risk. Perfect for beginners.',
    config: {
      risk_tolerance: 'LOW',
      rebalance_threshold: 5.0,
      auto_compound: true,
      compound_frequency_hours: 24,
      hedge_enabled: false,
      preferred_pairs: ['USDC-USDT', 'SOL-USDC'],
      max_il_risk: 3.0,
      target_apy_min: 10.0,
      target_apy_max: 20.0,
    },
  },
  BALANCED: {
    name: 'Balanced Growth',
    description: 'Optimal balance between risk and reward.',
    config: {
      risk_tolerance: 'MEDIUM',
      rebalance_threshold: 8.0,
      auto_compound: true,
      compound_frequency_hours: 12,
      hedge_enabled: true,
      hedge_threshold: 6.0,
      preferred_pairs: ['SOL-ETH', 'SOL-BTC'],
      max_il_risk: 5.0,
      target_apy_min: 20.0,
      target_apy_max: 40.0,
    },
  },
  AGGRESSIVE: {
    name: 'Aggressive Alpha',
    description: 'Maximum yields with higher risk. For experienced users.',
    config: {
      risk_tolerance: 'HIGH',
      rebalance_threshold: 12.0,
      auto_compound: true,
      compound_frequency_hours: 6,
      hedge_enabled: false,
      preferred_pairs: ['SOL-MEME', 'NEW_LAUNCHES'],
      max_il_risk: 8.0,
      target_apy_min: 40.0,
      target_apy_max: 100.0,
    },
  },
};

export function getTemplateByName(name: string): any {
  const normalized = name.toUpperCase();
  // @ts-ignore
  return StrategyTemplates[normalized] || null;
}

export class PerformanceAnalytics {
  public nodeId: string;
  public performanceData: any;

  constructor(nodeId: string) {
    this.nodeId = nodeId;
    this.performanceData = {
      total_pnl: 0.0,
      total_fees_earned: 0.0,
      total_impermanent_loss: 0.0,
      actions_taken: 0,
      success_rate: 0.0,
      average_apy: 0.0,
      best_trade: null,
      worst_trade: null,
    };
    this.loadFromStorage();
  }

  recordAction(actionType: string, params: any, result: string, pnlImpact: number = 0.0) {
    this.performanceData.actions_taken++;

    if (pnlImpact > 0) {
      this.performanceData.total_pnl += pnlImpact;
      if (!this.performanceData.best_trade || pnlImpact > this.performanceData.best_trade.pnl) {
        this.performanceData.best_trade = { action: actionType, pnl: pnlImpact, timestamp: new Date().toISOString() };
      }
    } else if (pnlImpact < 0) {
      if (!this.performanceData.worst_trade || pnlImpact < this.performanceData.worst_trade.pnl) {
        this.performanceData.worst_trade = { action: actionType, pnl: pnlImpact, timestamp: new Date().toISOString() };
      }
    }

    this.saveToStorage();
  }

  updateFeesEarned(amount: number) {
    this.performanceData.total_fees_earned += amount;
    this.saveToStorage();
  }

  updateImpermanentLoss(amount: number) {
    this.performanceData.total_impermanent_loss += amount;
    this.saveToStorage();
  }

  getPerformanceSummary() {
    return {
      ...this.performanceData,
      net_pnl: this.performanceData.total_pnl + this.performanceData.total_fees_earned + this.performanceData.total_impermanent_loss,
      roi_percentage: this.calculateRoi(),
      win_rate: this.calculateWinRate(),
    };
  }

  generateInsights(): string[] {
    const insights = [];
    const winRate = this.calculateWinRate();
    if (winRate > 70) insights.push('🎯 Excellent win rate! Your strategy is working well.');
    else if (winRate < 40) insights.push('⚠️ Win rate below average. Consider adjusting your strategy.');

    const fees = this.performanceData.total_fees_earned;
    const il = Math.abs(this.performanceData.total_impermanent_loss);

    if (fees > il * 2) insights.push('✅ Fees are outperforming IL. Great job managing risk!');
    else if (il > fees) insights.push('⚠️ Impermanent loss exceeding fees. Consider hedging or wider ranges.');

    if (this.performanceData.actions_taken < 5) insights.push('💡 You haven\'t taken many actions. Consider more active management.');
    else if (this.performanceData.actions_taken > 50) insights.push('📊 Very active manager! Make sure gas fees aren\'t eating profits.');

    return insights;
  }

  private calculateRoi() {
    const initialInvestment = 1000; // Assume $1000 initial for mock
    return initialInvestment > 0 ? (this.performanceData.total_pnl / initialInvestment) * 100 : 0;
  }

  private calculateWinRate() {
    if (this.performanceData.actions_taken === 0) return 0.0;
    return 60.0; // Assume 60% win rate for demo
  }

  private saveToStorage() {
    console.log(`[ANALYTICS] Saved performance data for ${this.nodeId}`);
  }

  private loadFromStorage() {
    console.log(`[ANALYTICS] Loaded performance data for ${this.nodeId}`);
  }
}

export class DlmmAgentAdvanced {
  public nodeId: string;
  public memory: ConversationMemory;
  public analytics: PerformanceAnalytics;
  public activeStrategy: any | null;

  constructor(nodeId: string) {
    this.nodeId = nodeId;
    this.memory = new ConversationMemory(nodeId);
    this.analytics = new PerformanceAnalytics(nodeId);
    this.activeStrategy = null;
  }

  async processPromptAdvanced(userPrompt: string, userPosition: any = null, executeAction: boolean = false) {
    this.memory.addMessage('user', userPrompt, { position: userPosition });
    const contextSummary = this.memory.getContextSummary();
    const riskTolerance = this.memory.getPreference('risk_tolerance', 'MEDIUM');

    if (this.activeStrategy && executeAction) {
      return await this.executeStrategyAction(userPrompt, userPosition);
    }

    const response = await this.generateContextualResponse(userPrompt, userPosition, contextSummary, riskTolerance);
    this.memory.addMessage('assistant', response.text, { actions: response.actions });
    return response;
  }

  setStrategyTemplate(templateName: string) {
    const template = getTemplateByName(templateName);
    if (template) {
      this.activeStrategy = template.config;
      this.memory.updatePreference('strategy', templateName);
      this.memory.updatePreference('risk_tolerance', template.config.risk_tolerance);
    }
  }

  getAnalyticsDashboard() {
    return {
      performance: this.analytics.getPerformanceSummary(),
      insights: this.analytics.generateInsights(),
      active_strategy: this.activeStrategy,
      conversation_stats: {
        total_messages: this.memory.conversationHistory.length,
        session_count: this.memory.sessionCount,
        last_active: this.memory.lastInteraction ? this.memory.lastInteraction.toISOString() : null,
      },
    };
  }

  private async generateContextualResponse(userPrompt: string, userPosition: any, contextSummary: string, riskTolerance: string) {
    // Return structured decision
    return {
      text: `Based on our conversation and your ${riskTolerance} risk tolerance, I recommend...\n\n${contextSummary}`,
      actions: [
        { label: 'Continue', action: 'CONTINUE', params: {} },
        { label: 'Change Strategy', action: 'CHANGE_STRATEGY', params: {} },
      ],
      context_used: true,
    };
  }

  private async executeStrategyAction(userPrompt: string, userPosition: any) {
    if (!this.activeStrategy) return { error: 'No active strategy' };

    const config = this.activeStrategy;

    if (userPrompt.toLowerCase().includes('rebalance')) {
      if (config.risk_tolerance === 'LOW') {
        return {
          text: 'Conservative strategy: Rebalancing with tight range...',
          action: 'REBALANCE',
          params: { conservative_range: true },
        };
      } else if (config.risk_tolerance === 'HIGH') {
        return {
          text: 'Aggressive strategy: Rebalancing with wide range for max fees...',
          action: 'REBALANCE',
          params: { wide_range: true },
        };
      }
    }

    return {
      text: `Executing action per ${config.name} strategy...`,
      action: 'EXECUTE_STRATEGY',
      params: { strategy: config },
    };
  }
}
