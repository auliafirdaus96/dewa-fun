/**
 * agents/dlmmAgent.ts
 * Main class wrapper for DLMM Liquidity Management Conversational AI.
 * Migrated from Python: src/agents/dlmm_interface.py
 */

import { getLLM } from '../core/llmWrapper.js';
import { oracleService } from '../services/oracleService.js';

interface ActionParam {
  label: string;
  action: string;
  params: Record<string, any>;
  description?: string;
}

interface AgentResponse {
  analysis: string;
  recommendation: string;
  actions: ActionParam[];
  risks: string;
  disclaimer: string;
}

export class DlmmAgentInterface {
  private systemPrompt = `
You are a DLMM (Dynamic Liquidity Market Maker) Assistant helping users manage their liquidity positions.

YOUR ROLE:
- Analyze user's LP position and market conditions
- Provide clear, actionable recommendations
- Explain complex DeFi concepts simply
- ALWAYS prioritize capital preservation over yield
- NEVER give financial advice (always disclaim)

AVAILABLE ACTIONS:
1. ANALYZE_POSITION - Review current LP health
2. REBALANCE - Adjust price range based on volatility
3. COMPOUND - Reinvest earned rewards
4. HEDGE - Protect against impermanent loss
5. EXIT_POSITION - Withdraw from pool
6. EDUCATE - Explain concepts (IL, APY, volatility, etc.)

RESPONSE FORMAT (JSON ONLY):
{
  "analysis": "Brief assessment of situation",
  "recommendation": "What user should do and why",
  "actions": [
    {
      "label": "Action button text",
      "action": "ACTION_NAME",
      "params": {"param1": "value1"},
      "description": "What this does"
    }
  ],
  "risks": "Key risks to consider",
  "disclaimer": "Not financial advice"
}
`;

  async processPrompt(
    userPrompt: string,
    userPosition?: Record<string, any> | null,
    nodeId: string = 'default'
  ): Promise<AgentResponse> {
    const context = await this.buildContext(userPosition);
    const intent = await this.parseIntent(userPrompt, context);
    const response = await this.generateRecommendations(intent, context, userPrompt);
    return this.validateResponse(response);
  }

  private async buildContext(userPosition?: Record<string, any> | null) {
    const context: any = { position: userPosition || {}, marketData: {} };

    if (userPosition) {
      try {
        const solPrice = await oracleService.getSolPrice();
        const volatility = await oracleService.getMarketVolatility('SOL');
        context.marketData = {
          solPrice,
          volatility,
          marketStatus: volatility > 7.0 ? 'HIGH_VOLATILITY' : volatility > 4.0 ? 'MODERATE' : 'CALM',
        };
      } catch (e: any) {
        console.warn(`[DlmmAgent] Failed to fetch market data: ${e.message}`);
        context.marketData = { error: 'Unable to fetch live data' };
      }
    }
    return context;
  }

  private async parseIntent(prompt: string, context: any) {
    const llm = getLLM('gpt-4o-mini', { temperature: 0.1 }); // Fast parsing model
    const intentPrompt = `
Based on this user message and context, identify their intent.
USER MESSAGE: "${prompt}"
CONTEXT: ${JSON.stringify(context)}
Return valid JSON only matching this format:
{"category": "ANALYZE|REBALANCE|COMPOUND|HEDGE|EXIT|EDUCATE|OTHER", "confidence": 0.9, "parameters": {}, "tone": "NEUTRAL"}
    `;

    try {
      const res = await llm.invoke([{ role: 'user', content: intentPrompt }]);
      return JSON.parse(res.content as string);
    } catch {
      return { category: 'ANALYZE', confidence: 0.5, parameters: {}, tone: 'NEUTRAL' };
    }
  }

  private async generateRecommendations(intent: any, context: any, originalPrompt: string) {
    if (intent.category === 'EDUCATE') return this.handleEducation(originalPrompt);
    if (intent.category === 'ANALYZE') return this.handleAnalysis(context);
    return this.handleAction(intent, context, originalPrompt);
  }

  private async handleEducation(prompt: string) {
    const llm = getLLM('gpt-4o-mini');
    const eduPrompt = `
Educational question: "${prompt}"
Provide JSON response with { concept, explanation, example, relevance }. Keep it under 150 words.
    `;
    const res = await llm.invoke([{ role: 'user', content: eduPrompt }]);
    const data = JSON.parse(res.content as string);

    return {
      analysis: `Great question about ${data.concept}!`,
      recommendation: data.explanation,
      actions: [],
      risks: '',
      disclaimer: 'Educational content only, not financial advice',
    };
  }

  private handleAnalysis(context: any) {
    const { position, marketData } = context;

    if (!position || Object.keys(position).length === 0) {
      return {
        analysis: 'No active LP position detected.',
        recommendation: 'Would you like help choosing a pool?',
        actions: [{ label: 'Browse Pools', action: 'BROWSE_POOLS', params: {} }],
        risks: '',
        disclaimer: 'Always do your own research.',
      };
    }

    const solPrice = marketData.solPrice || 150;
    const minVal = position.minValue || 140;
    const maxVal = position.maxValue || 160;

    // Pseudo-calculation similar to Python
    const distance = Math.abs(solPrice - (minVal + maxVal) / 2);
    const ilRisk = Math.min(10, (marketData.volatility || 5.0) + distance / 10).toFixed(1);

    const isOut = solPrice < minVal || solPrice > maxVal;
    let efficiency = isOut ? Math.max(1, 5 - Math.abs(solPrice - maxVal) / 10) : 8;

    const analysisText = `
Current Position Health:
• Value: $${(position.currentValue || 0).toFixed(2)}
• Range: $${minVal} - $${maxVal}
• Impermanent Loss Risk: ${ilRisk}/10
• Range Efficiency: ${efficiency.toFixed(1)}/10
    `;

    const actions: ActionParam[] = [
      { label: 'Optimize Range', action: 'REBALANCE', params: {} },
      { label: 'Compound Rewards', action: 'COMPOUND', params: {} },
    ];

    return {
      analysis: analysisText,
      recommendation: Number(ilRisk) > 7 ? 'High IL risk detected. Consider hedging.' : 'Position healthy.',
      actions,
      risks: Number(ilRisk) > 7 ? 'High impermanent loss risk.' : 'Standard DeFi risks apply.',
      disclaimer: 'Informational only, not financial advice',
    };
  }

  private async handleAction(intent: any, context: any, prompt: string) {
    const llm = getLLM('gpt-4o');
    const actionPrompt = `
${this.systemPrompt}
INTENT: ${intent.category}
REQUEST: "${prompt}"
CONTEXT: ${JSON.stringify(context)}
Generate response using JSON format requested in System Prompt.
    `;
    
    try {
      const res = await llm.invoke([{ role: 'user', content: actionPrompt }]);
      // Regex cleanup in case LLM outputs markdown backticks
      const cleanJson = (res.content as string).replace(/```json|```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch {
      return this.handleAnalysis(context); // Fallback to basic analysis
    }
  }

  private validateResponse(response: any): AgentResponse {
    ['analysis', 'recommendation', 'actions', 'risks', 'disclaimer'].forEach(field => {
      if (!(field in response)) response[field] = field === 'actions' ? [] : '';
    });

    response.actions = (response.actions || []).map((a: any) => {
      ['withdrawAddress', 'recipient', 'owner'].forEach(k => {
        if (a.params && a.params[k]) delete a.params[k]; // Santize dangerous keys
      });
      return a;
    });

    return response;
  }
}

export const dlmmAgent = new DlmmAgentInterface();
