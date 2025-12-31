// LLM Chat Service

import { streamText, generateText, type CoreMessage } from 'ai';
import { createModel } from './providers';
import type {
  ChatCompletionOptions,
  ChatCompletionResult,
  StreamingChatOptions,
} from './types';
import type { Message } from '../../types';

function convertToAIMessages(
  messages: Message[],
  systemPrompt?: string
): CoreMessage[] {
  const result: CoreMessage[] = [];

  if (systemPrompt) {
    result.push({
      role: 'system',
      content: systemPrompt,
    });
    console.log('[LLM] System prompt added, length:', systemPrompt.length);
  } else {
    console.warn('[LLM] No system prompt provided!');
  }

  for (const msg of messages) {
    if (msg.role === 'user') {
      result.push({
        role: 'user',
        content: msg.content,
      });
    } else if (msg.role === 'assistant') {
      result.push({
        role: 'assistant',
        content: msg.content,
      });
    } else if (msg.role === 'system') {
      result.push({
        role: 'system',
        content: msg.content,
      });
    }
    // Skip tool messages for now as they need special handling
  }

  console.log('[LLM] Total messages to send:', result.length, '| Roles:', result.map(m => m.role).join(', '));
  return result;
}

export async function chatCompletion(
  options: ChatCompletionOptions
): Promise<ChatCompletionResult> {
  const { messages, systemPrompt, config, signal } = options;

  const model = createModel(config);
  const aiMessages = convertToAIMessages(messages, systemPrompt);

  try {
    const result = await generateText({
      model,
      messages: aiMessages,
      temperature: config.temperature ?? 0.7,
      maxOutputTokens: config.maxTokens ?? 2048,
      abortSignal: signal,
    });

    return {
      content: result.text,
      finishReason: result.finishReason ?? null,
      usage: result.usage
        ? {
            promptTokens: result.usage.inputTokens ?? 0,
            completionTokens: result.usage.outputTokens ?? 0,
            totalTokens: result.usage.totalTokens ?? 0,
          }
        : undefined,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        content: '',
        finishReason: 'cancelled',
      };
    }
    throw error;
  }
}

export async function streamChatCompletion(
  options: StreamingChatOptions
): Promise<ChatCompletionResult> {
  const { messages, systemPrompt, config, onToken, onComplete, onError, signal } =
    options;

  console.log('[LLM] streamChatCompletion called');
  console.log('[LLM] Config:', { provider: config.provider, model: config.model, baseUrl: config.baseUrl?.slice(0, 50) });
  console.log('[LLM] systemPrompt received:', systemPrompt ? `${systemPrompt.slice(0, 80)}... (${systemPrompt.length} chars)` : 'NONE');

  const model = createModel(config);
  const aiMessages = convertToAIMessages(messages, systemPrompt);

  let fullContent = '';

  try {
    const result = streamText({
      model,
      messages: aiMessages,
      temperature: config.temperature ?? 0.7,
      maxOutputTokens: config.maxTokens ?? 2048,
      abortSignal: signal,
    });

    for await (const chunk of result.textStream) {
      fullContent += chunk;
      onToken(chunk);
    }

    // Await the final properties
    const [finishReason, usage] = await Promise.all([
      result.finishReason,
      result.usage,
    ]);

    if (onComplete) {
      onComplete(fullContent);
    }

    return {
      content: fullContent,
      finishReason: finishReason ?? null,
      usage: usage
        ? {
            promptTokens: usage.inputTokens ?? 0,
            completionTokens: usage.outputTokens ?? 0,
            totalTokens: usage.totalTokens ?? 0,
          }
        : undefined,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          content: fullContent,
          finishReason: 'cancelled',
        };
      }
      if (onError) {
        onError(error);
      }
    }
    throw error;
  }
}

export class ChatSession {
  private abortController: AbortController | null = null;

  async sendMessage(options: StreamingChatOptions): Promise<ChatCompletionResult> {
    this.abortController = new AbortController();

    return streamChatCompletion({
      ...options,
      signal: this.abortController.signal,
    });
  }

  async sendMessageSync(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
    this.abortController = new AbortController();

    return chatCompletion({
      ...options,
      signal: this.abortController.signal,
    });
  }

  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  isActive(): boolean {
    return this.abortController !== null;
  }
}
