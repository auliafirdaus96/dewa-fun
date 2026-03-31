/**
 * tests/testMain.test.ts
 * Backend API Tests for Dewa AI Agent (Vitest + Hono)
 * Translated from tests/test_main.py
 */

import { describe, it, expect } from 'vitest';
import app from '../src/index.js'; // The Hono app instance

describe('TestHealthEndpoints', () => {
  it('should return running message for root endpoint', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toBe('Dewa AI Agent Backend is running');
  });

  it('should return healthy status for health check', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('healthy');
  });
});

describe('TestAgentExecution', () => {
  it('should run agent with user message', async () => {
    const payload = {
      node_id: 'test-node-123',
      persona: 'Helpful assistant',
      message: 'Hello, how are you?'
    };

    const res = await app.request('/run-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('success');
    expect(data).toHaveProperty('response');
  });

  it('should run agent without message (idle mode)', async () => {
    const payload = {
      node_id: 'test-node-456',
      persona: 'Autonomous agent'
    };

    const res = await app.request('/run-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('success');
  });

  it('should fail validation for invalid payload', async () => {
    const payload = {
      node_id: '', // Empty node_id
      persona: 'Test'
    };

    const res = await app.request('/run-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    // In Zod/Hono strict mode, invalid payload returns 400 or 422
    expect(res.status).toBeGreaterThanOrEqual(400); 
  });
});

describe('TestSocialMediaIntegration', () => {
  it('should update social media persona configuration', async () => {
    const nodeId = 'test-node-789';
    const config = {
      social_persona_prompt: 'You are a witty crypto analyst',
      social_posting_frequency: 5,
      social_tone: 'witty',
      social_platforms: ['twitter', 'telegram'],
      social_enabled: true
    };

    const res = await app.request(`/api/agents/${nodeId}/social-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });

    expect(res.status).toBe(200);
  });

  it('should get social config', async () => {
    const nodeId = 'test-node-789';
    const res = await app.request(`/api/agents/${nodeId}/social-config`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('social_persona_prompt');
  });
});

describe('TestCorsMiddleware', () => {
  it('should allow whitelisted origin', async () => {
    const origin = 'http://localhost:3000';
    const res = await app.request('/health', {
      method: 'OPTIONS',
      headers: { 
        'Origin': origin, 
        'Access-Control-Request-Method': 'GET' 
      }
    });
    
    expect(res.status).toBe(204); // Hono OPTIONS success
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(origin);
  });
});

describe('TestErrorHandling', () => {
  it('should return 404 for unknown route', async () => {
    const res = await app.request('/api/unknown-route');
    expect(res.status).toBe(404);
  });

  it('should return 404 or 405 for method not allowed', async () => {
    const res = await app.request('/health', { method: 'POST' });
    expect(res.status).toBeGreaterThanOrEqual(400); // Usually 404 in simple maps, 405 if strict
  });
});
