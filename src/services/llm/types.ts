// LLM Service Types

import type { Message } from '../../types';

export type LLMProvider = 'openai' | 'anthropic' | 'ollama';

/**
 * 情绪驱动的对话上下文
 * Emotion-driven dialogue context
 */
export interface EmotionDialogueContext {
  /** 用户输入 */
  userInput: string;
  /** 宠物状态 */
  petState: {
    mood: number; // 0-100
    energy: number; // 0-100
    intimacy: number; // 0-100
  };
  /** 用户情绪分析结果 */
  userSentiment?: {
    emotion: string;
    confidence: number;
    sentiment: 'positive' | 'negative' | 'neutral';
  };
  /** 用户行为模式 */
  behaviorPattern?: string;
  /** 环境信息 */
  environment: {
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    dayOfWeek: number;
    isWeekend: boolean;
    isWorkingHours: boolean;
  };
  /** 情感洞察 */
  insights?: {
    dominantEmotion: string;
    moodTrend: 'improving' | 'declining' | 'stable';
    recommendations: string[];
  };
  /** 关怀机会 */
  careOpportunities?: Array<{
    type: string;
    priority: number;
  }>;
}

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

/**
 * 情绪对话选项
 * Emotion dialogue options
 */
export interface EmotionDialogueOptions {
  /** 对话上下文 */
  context: EmotionDialogueContext;
  /** LLM配置 */
  config: LLMProviderConfig;
  /** 是否流式输出 */
  stream?: boolean;
  /** Token回调 */
  onToken?: (token: string) => void;
  /** 完成回调 */
  onComplete?: (result: EmotionDialogueResult) => void;
  /** 错误回调 */
  onError?: (error: Error) => void;
  /** 中止信号 */
  signal?: AbortSignal;
}

/**
 * 情绪对话结果
 * Emotion dialogue result
 */
export interface EmotionDialogueResult {
  /** 生成的回复文本 */
  text: string;
  /** 宠物应该展示的情绪 */
  petEmotion: string;
  /** 回复的语调 */
  tone: 'friendly' | 'caring' | 'playful' | 'concerned' | 'excited' | 'calm';
  /** 是否包含关怀建议 */
  hasCareSuggestion: boolean;
  /** 使用的系统提示 */
  systemPrompt: string;
  /** Token使用情况 */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** 完成原因 */
  finishReason: string | null;
}

/**
 * 系统提示模板类型
 * System prompt template type
 */
export type SystemPromptTemplate =
  | 'default'
  | 'emotional-support'
  | 'playful'
  | 'focused-work'
  | 'break-reminder'
  | 'celebration'
  | 'concerned';
