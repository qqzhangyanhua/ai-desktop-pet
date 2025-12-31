// LLM Provider Factory

import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOllama } from 'ollama-ai-provider';
import type { LanguageModel } from 'ai';
import type { LLMProviderConfig } from './types';

type OpenAIProvider = ReturnType<typeof createOpenAI>;
type AnthropicProvider = ReturnType<typeof createAnthropic>;
type OllamaProvider = ReturnType<typeof createOllama>;

type ProviderInstance = OpenAIProvider | AnthropicProvider | OllamaProvider;

const providerCache = new Map<string, ProviderInstance>();

function getCacheKey(config: LLMProviderConfig): string {
  return `${config.provider}:${config.apiKey ?? ''}:${config.baseUrl ?? ''}`;
}

export function createProvider(config: LLMProviderConfig): ProviderInstance {
  const cacheKey = getCacheKey(config);
  const cached = providerCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  let provider: ProviderInstance;

  switch (config.provider) {
    case 'openai': {
      provider = createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
      });
      break;
    }
    case 'anthropic': {
      provider = createAnthropic({
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
      });
      break;
    }
    case 'ollama': {
      provider = createOllama({
        baseURL: config.baseUrl ?? 'http://localhost:11434/api',
      });
      break;
    }
    default: {
      const exhaustiveCheck: never = config.provider;
      throw new Error(`Unknown provider: ${exhaustiveCheck}`);
    }
  }

  providerCache.set(cacheKey, provider);
  return provider;
}

export function createModel(config: LLMProviderConfig): LanguageModel {
  const provider = createProvider(config);

  // OpenAI provider: use .chat() to force Chat Completions API (/chat/completions)
  // instead of Responses API (/responses) which is the default in AI SDK 5.0
  if (config.provider === 'openai') {
    const openaiProvider = provider as OpenAIProvider;
    return openaiProvider.chat(config.model) as LanguageModel;
  }

  return provider(config.model) as LanguageModel;
}

export function clearProviderCache(): void {
  providerCache.clear();
}
