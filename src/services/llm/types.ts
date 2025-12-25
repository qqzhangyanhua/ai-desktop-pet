// LLM Service Types

import type { Message } from '../../types';

export type LLMProvider = 'openai' | 'anthropic' | 'ollama';

export interface LLMProviderConfig {
  provider: LLMProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatCompletionOptions {
  messages: Message[];
  systemPrompt?: string;
  config: LLMProviderConfig;
  onToken?: (token: string) => void;
  onComplete?: (content: string) => void;
  onError?: (error: Error) => void;
  signal?: AbortSignal;
}

export interface ChatCompletionResult {
  content: string;
  finishReason: string | null;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface StreamingChatOptions extends ChatCompletionOptions {
  onToken: (token: string) => void;
}
