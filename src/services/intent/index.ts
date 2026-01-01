/**
 * Intent Service - Main Entry Point
 * 意图识别服务主入口
 */

export { detectIntentByKeywords, getSupportedIntents } from './keyword-detector';
export { executeIntent } from './executor';
export type {
  IntentType,
  IntentResult,
  ExecutionResult,
  IntentExecutionContext,
  KeywordConfig,
} from './types';

/**
 * 检测用户消息意图（主入口）
 */
import type { IntentResult } from './types';
import { detectIntentByKeywords } from './keyword-detector';

export async function detectIntent(message: string): Promise<IntentResult | null> {
  // 当前版本：仅使用关键词匹配
  // 未来可扩展：关键词未匹配时调用 LLM 分类
  const keywordResult = detectIntentByKeywords(message);

  if (keywordResult) {
    return keywordResult;
  }

  // TODO: 未来版本 - LLM 意图分类
  // const llmResult = await detectIntentByLLM(message);
  // return llmResult;

  // 未识别到意图，返回普通对话
  return {
    intent: 'chat',
    confidence: 1.0,
    params: {},
    matchMethod: 'keyword',
    originalMessage: message,
  };
}
