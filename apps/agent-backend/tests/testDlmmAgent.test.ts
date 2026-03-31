/**
 * tests/testDlmmAgent.test.ts
 * Test DLMM Agent Interface - Basic Q&A functionality
 * Translated from tests/test_dlmm_agent.py
 */

import { describe, it, expect } from 'vitest';
import { DlmmAgentInterface } from '../src/agents/dlmmAgent.js';

describe('Test DLMM Agent Interface', () => {
  it('should test basic QA and informational requests', async () => {
    const agent = new DlmmAgentInterface();
    
    // Test educational query
    const response: any = await agent.processPrompt(
      'What is impermanent loss?',
      null
    );
    
    expect(response).toHaveProperty('analysis');
    expect(response).toHaveProperty('recommendation');
    expect(response).toHaveProperty('disclaimer');

    console.log(`\\n✅ QA Test passed:\\n${response.recommendation.substring(0, 200)}...`);
  });

  it('should analyze existing positions when provided mock data', async () => {
    const agent = new DlmmAgentInterface();
    
    const mockPosition = {
      currentValue: 1000,
      apy: 25.5,
      minValue: 140,
      maxValue: 160
    };
    
    const response: any = await agent.processPrompt(
      "How's my position doing?",
      mockPosition
    );
    
    expect(response).toHaveProperty('analysis');
    expect(response.actions).toBeDefined();
    expect(response.actions.length).toBeGreaterThan(0);
    console.log('\\n✅ Analysis test passed');
  });
});
