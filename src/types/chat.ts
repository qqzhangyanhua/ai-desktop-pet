// Chat types

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  result: unknown;
  error?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  createdAt: number;
  suggestions?: string[]; // 可点击的建议列表（例如：搜索建议、快捷操作等）
}

export interface Conversation {
  id: string;
  title: string;
  systemPrompt: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface ChatState {
  messages: Message[];
  currentConversationId: string | null;
  isLoading: boolean;
  isStreaming: boolean;
}

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'ollama';
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}
