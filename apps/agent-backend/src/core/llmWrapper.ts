/**
 * core/llmWrapper.ts
 * Factory function for LangChain LLM instances with BYOK support.
 * Migrated from Python: src/tools/llm_wrapper.py
 */

import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { decryptKeySafe } from './encryption.js';
import { OPENAI_API_KEY, ANTHROPIC_API_KEY } from './config.js';

type SupportedModel =
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'gpt-4-turbo'
  | 'claude-3-5-sonnet-20241022'
  | 'claude-3-haiku-20240307'
  | string;

interface LLMOptions {
  /** Encrypted BYOK API key from agent_nodes.encrypted_api_key */
  encryptedApiKey?: string | null;
  /** Temperature override (default: 0.7) */
  temperature?: number;
  /** Max tokens override */
  maxTokens?: number;
}

/**
 * Returns a configured LangChain LLM instance.
 * Priority: BYOK decrypted key → environment key → throw
 *
 * @param modelName - e.g. "gpt-4o", "claude-3-5-sonnet-20241022"
 * @param options   - Optional BYOK key and model params
 */
export function getLLM(modelName: SupportedModel, options: LLMOptions = {}) {
  const { encryptedApiKey, temperature = 0.7, maxTokens } = options;

  // Resolve API key: BYOK first, fallback to env
  let resolvedApiKey: string | undefined;

  if (encryptedApiKey) {
    const decrypted = decryptKeySafe(encryptedApiKey);
    if (decrypted) {
      resolvedApiKey = decrypted;
    } else {
      console.warn('[LLMWrapper] Failed to decrypt BYOK key, falling back to env key.');
    }
  }

  const isGPT = modelName.toLowerCase().startsWith('gpt') || modelName.toLowerCase().startsWith('o1');
  const isClaude = modelName.toLowerCase().startsWith('claude');

  if (isGPT) {
    const apiKey = resolvedApiKey ?? OPENAI_API_KEY;
    if (!apiKey) throw new Error('[LLMWrapper] No OpenAI API key found. Set OPENAI_API_KEY in .env');
    return new ChatOpenAI({
      model: modelName,
      apiKey,
      temperature,
      ...(maxTokens ? { maxTokens } : {}),
    });
  }

  if (isClaude) {
    const apiKey = resolvedApiKey ?? ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('[LLMWrapper] No Anthropic API key found. Set ANTHROPIC_API_KEY in .env');
    return new ChatAnthropic({
      model: modelName,
      apiKey,
      temperature,
      ...(maxTokens ? { maxTokens } : {}),
    });
  }

  // Default fallback → gpt-4o-mini
  console.warn(`[LLMWrapper] Unknown model "${modelName}", defaulting to gpt-4o-mini.`);
  const apiKey = resolvedApiKey ?? OPENAI_API_KEY;
  if (!apiKey) throw new Error('[LLMWrapper] No OpenAI API key found for fallback.');
  return new ChatOpenAI({ model: 'gpt-4o-mini', apiKey, temperature });
}
