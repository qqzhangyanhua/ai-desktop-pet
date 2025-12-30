/**
 * Emotion-Driven Dialogue Engine
 * 情绪驱动对话引擎
 *
 * 将LLM与情感引擎深度整合，实现情绪感知的智能对话
 *
 * Linus准则：
 * - 数据结构优先：对话上下文清晰定义
 * - 消除特殊情况：统一的对话处理流程
 * - 简洁实现：直接调用LLM，不过度抽象
 */

import { streamChatCompletion, chatCompletion } from './chat';
import { getEmotionEngine } from '../emotion-engine';
import {
  getSystemPrompt,
  selectSystemPromptTemplate,
} from './system-prompts';
import type {
  EmotionDialogueContext,
  EmotionDialogueOptions,
  EmotionDialogueResult,
} from './types';

/**
 * 对话历史（用于多轮对话）
 */
const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

/**
 * 最大历史记录数
 */
const MAX_HISTORY_LENGTH = 10;

/**
 * 生成情绪驱动的对话回复
 */
export async function generateEmotionDialogue(
  options: EmotionDialogueOptions
): Promise<EmotionDialogueResult> {
  const { context, config, stream = false, onToken, onComplete, onError, signal } = options;

  // 1. 分析用户情绪（使用情感引擎）
  const sentiment = context.userSentiment
    ? context.userSentiment
    : getEmotionEngine().analyzeText(context.userInput);

  // 2. 选择合适的系统提示模板
  const template = selectSystemPromptTemplate(context);
  const systemPrompt = getSystemPrompt(template, {
    ...context,
    userSentiment: sentiment,
  });

  // 3. 构建消息列表（包含历史记录）
  const messages = buildMessagesWithHistory(context.userInput);

  // 4. 调用LLM生成回复
  try {
    let baseResult: { text: string; usage: any; finishReason: string };

    if (stream) {
      // 流式输出
      baseResult = await streamDialogue({
        messages,
        systemPrompt,
        config,
        onToken,
        signal,
      });
    } else {
      // 非流式输出
      baseResult = await generateDialogue({
        messages,
        systemPrompt,
        config,
        signal,
      });
    }

    // 5. 分析回复文本，提取宠物情绪和语调
    const analyzed = analyzeResponseText(baseResult.text, sentiment);

    // 6. 更新对话历史
    updateHistory(context.userInput, baseResult.text);

    // 7. 构建完整结果
    const result: EmotionDialogueResult = {
      text: baseResult.text,
      usage: baseResult.usage,
      finishReason: baseResult.finishReason,
      ...analyzed,
      systemPrompt: template,
      hasCareSuggestion: (context.careOpportunities?.length ?? 0) > 0,
    };

    // 8. 完成回调
    if (onComplete) {
      onComplete(result);
    }

    return result;
  } catch (error) {
    if (onError && error instanceof Error) {
      onError(error);
    }
    throw error;
  }
}

/**
 * 流式对话
 */
async function streamDialogue(params: {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  systemPrompt: string;
  config: EmotionDialogueOptions['config'];
  onToken?: (token: string) => void;
  signal?: AbortSignal;
}): Promise<{ text: string; usage: any; finishReason: string }> {
  const { messages, systemPrompt, config, onToken, signal } = params;

  const result = await streamChatCompletion({
    messages: messages as any,
    systemPrompt,
    config,
    onToken: onToken || (() => {}),
    signal,
  });

  return {
    text: result.content,
    usage: result.usage,
    finishReason: result.finishReason ?? 'stop',
  };
}

/**
 * 非流式对话
 */
async function generateDialogue(params: {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  systemPrompt: string;
  config: EmotionDialogueOptions['config'];
  signal?: AbortSignal;
}): Promise<{ text: string; usage: any; finishReason: string }> {
  const { messages, systemPrompt, config, signal } = params;

  const result = await chatCompletion({
    messages: messages as any,
    systemPrompt,
    config,
    signal,
  });

  return {
    text: result.content,
    usage: result.usage,
    finishReason: result.finishReason ?? 'stop',
  };
}

/**
 * 构建带历史记录的消息列表
 */
function buildMessagesWithHistory(
  userInput: string
): Array<{ role: 'user' | 'assistant'; content: string }> {
  // 取最近的历史记录
  const recentHistory = conversationHistory.slice(-MAX_HISTORY_LENGTH);

  // 添加当前用户输入
  return [...recentHistory, { role: 'user', content: userInput }];
}

/**
 * 更新对话历史
 */
function updateHistory(userInput: string, assistantResponse: string): void {
  conversationHistory.push(
    { role: 'user', content: userInput },
    { role: 'assistant', content: assistantResponse }
  );

  // 限制历史记录长度
  if (conversationHistory.length > MAX_HISTORY_LENGTH * 2) {
    conversationHistory.splice(0, 2);
  }
}

/**
 * 分析回复文本，提取宠物情绪和语调
 */
function analyzeResponseText(
  text: string,
  userSentiment: EmotionDialogueContext['userSentiment']
): Pick<EmotionDialogueResult, 'petEmotion' | 'tone'> {
  // 简化的情绪分析（实际可以使用更复杂的NLP）
  const lowerText = text.toLowerCase();

  // 检测宠物情绪
  let petEmotion = 'neutral';

  if (containsAny(lowerText, ['开心', '高兴', '太棒', 'happy', 'yay', 'hurray'])) {
    petEmotion = 'happy';
  } else if (containsAny(lowerText, ['担心', '难过', 'sorry', 'worried'])) {
    petEmotion = 'sad';
  } else if (containsAny(lowerText, ['思考', '想想', 'hmm', 'thinking'])) {
    petEmotion = 'thinking';
  } else if (containsAny(lowerText, ['惊讶', '哇', 'wow', 'amazing'])) {
    petEmotion = 'surprised';
  }

  // 检测语调
  let tone: EmotionDialogueResult['tone'] = 'friendly';

  if (containsAny(lowerText, ['乖', '放心', '会好的', '陪伴', '陪着'])) {
    tone = 'caring';
  } else if (containsAny(lowerText, ['玩', '一起', '有趣', '好玩'])) {
    tone = 'playful';
  } else if (containsAny(lowerText, ['担心', '要注意', '休息', '健康'])) {
    tone = 'concerned';
  } else if (containsAny(lowerText, ['太棒', '恭喜', '骄傲', '庆祝'])) {
    tone = 'excited';
  } else if (containsAny(lowerText, ['平静', '安静', '慢慢来'])) {
    tone = 'calm';
  }

  // 如果用户情绪消极，调整为关怀语调
  if (userSentiment?.sentiment === 'negative' && tone === 'friendly') {
    tone = 'caring';
  }

  return { petEmotion, tone };
}

/**
 * 检查文本是否包含任意关键词
 */
function containsAny(text: string, keywords: string[]): boolean {
  return keywords.some(keyword => text.includes(keyword));
}

/**
 * 清空对话历史
 */
export function clearDialogueHistory(): void {
  conversationHistory.length = 0;
}

/**
 * 获取对话历史
 */
export function getDialogueHistory(): ReadonlyArray<typeof conversationHistory> {
  return conversationHistory as any;
}

/**
 * 设置对话历史
 */
export function setDialogueHistory(history: typeof conversationHistory): void {
  conversationHistory.length = 0;
  conversationHistory.push(...history);
}
