/**
 * Emotion Engine - Unified Exports
 * 情感引擎 - 统一导出
 */

export { SentimentAnalyzer, getSentimentAnalyzer } from './sentiment-analyzer';
export { BehaviorAnalyzer, getBehaviorAnalyzer } from './behavior-analyzer';
export { EmotionMemorySystem, getEmotionMemory } from './emotion-memory';
export { CareEngine, getCareEngine } from './care-engine';

export type {
  SentimentResult,
  BehaviorData,
  BehaviorPatternResult,
  EmotionEvent,
  EmotionMemory,
  CareOpportunity,
  CareConfig,
  InteractionContext,
  ResponseGenerationOptions,
  GeneratedResponse,
} from './types';

/**
 * 情感引擎管理器
 * 整合情绪分析、行为分析、情感记忆和关怀引擎
 */
import { getSentimentAnalyzer } from './sentiment-analyzer';
import { getBehaviorAnalyzer } from './behavior-analyzer';
import { getEmotionMemory } from './emotion-memory';
import { getCareEngine } from './care-engine';
import type { EmotionType } from '@/types';
import type {
  SentimentResult,
  BehaviorData,
  EmotionEvent,
  CareOpportunity,
  InteractionContext,
  GeneratedResponse,
} from './types';

export class EmotionEngine {
  private sentimentAnalyzer = getSentimentAnalyzer();
  private behaviorAnalyzer = getBehaviorAnalyzer();
  private emotionMemory = getEmotionMemory();
  private careEngine = getCareEngine();

  /**
   * 分析用户输入的文本
   */
  analyzeText(text: string): SentimentResult {
    const result = this.sentimentAnalyzer.analyze(text);

    // 记录到情感记忆
    const event: EmotionEvent = {
      id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type: 'chat',
      source: 'user_input',
      emotion: result.emotion,
      sentiment: result,
      context: {
        text,
        intensity: result.confidence,
      },
    };

    this.emotionMemory.recordEvent(event);

    return result;
  }

  /**
   * 分析行为数据
   */
  analyzeBehavior(behavior: BehaviorData) {
    return this.behaviorAnalyzer.analyze(behavior);
  }

  /**
   * 检测关怀机会
   */
  detectCareOpportunities(
    sentiment: SentimentResult,
    behaviorData: BehaviorData
  ): CareOpportunity[] {
    // 先分析行为模式
    const behavior = this.behaviorAnalyzer.analyze(behaviorData);

    // 获取最近的情感事件
    const recentEvents = this.emotionMemory.queryMemories({
      timeRange: {
        start: Date.now() - 60 * 60 * 1000, // 1小时内
        end: Date.now(),
      },
      limit: 100,
    });

    const emotionEvents: EmotionEvent[] = recentEvents.map(memory => ({
      id: memory.id,
      timestamp: memory.createdAt,
      type: 'system',
      source: 'memory',
      emotion: memory.emotion as EmotionType,
      sentiment: {
        sentiment: 'neutral',
        confidence: memory.intensity,
        emotion: memory.emotion as EmotionType,
        score: 0,
        keywords: memory.content.keywords,
      },
      context: memory.content.context,
    }));

    return this.careEngine.detectOpportunities(sentiment, behavior, emotionEvents);
  }

  /**
   * 生成关怀消息
   */
  generateCareMessage(opportunity: CareOpportunity) {
    return this.careEngine.generateCareMessage(opportunity);
  }

  /**
   * 生成完整回应
   */
  generateResponse(context: InteractionContext): GeneratedResponse {
    const { userInput } = context;

    // 分析用户输入
    const sentiment = userInput ? this.analyzeText(userInput) : null;

    // 如果没有用户输入，返回默认回应
    if (!sentiment) {
      return {
        text: '你好！我是你的AI伙伴，有什么我可以帮助你的吗？',
        emotion: 'neutral',
        tone: 'friendly',
        metadata: {
          generationTime: Date.now(),
          model: 'emotion-engine',
          tokensUsed: 0,
          confidence: 0.5,
        },
      };
    }

    // 基于情绪生成回应
    let responseText = this.generateTextBySentiment(sentiment);
    const targetEmotion: EmotionType = sentiment.emotion;

    // 检查关怀机会
    let careOpportunities: CareOpportunity[] = [];
    if (context.behaviorData) {
      careOpportunities = this.detectCareOpportunities(sentiment, context.behaviorData);

      // 如果有高优先级关怀机会，调整回应
      const highPriorityCare = careOpportunities.find(c => c.priority >= 8);
      if (highPriorityCare) {
        const careMessage = this.generateCareMessage(highPriorityCare);
        responseText = `${careMessage.message}\n\n${responseText}`;
      }
    }

    return {
      text: responseText,
      emotion: targetEmotion,
      tone: this.getToneBySentiment(sentiment),
      careOpportunities,
      metadata: {
        generationTime: Date.now(),
        model: 'emotion-engine',
        tokensUsed: responseText.length,
        confidence: sentiment.confidence,
      },
    };
  }

  /**
   * 获取情感洞察
   */
  getEmotionalInsights() {
    return this.emotionMemory.getInsights();
  }

  /**
   * 获取情感模式
   */
  getEmotionalPatterns(days = 30) {
    return this.emotionMemory.analyzePatterns(days);
  }

  /**
   * 获取关怀统计
   */
  getCareStatistics() {
    return this.careEngine.getCareStatistics();
  }

  /**
   * 记录关怀反馈
   */
  recordCareFeedback(
    opportunityId: string,
    response: 'accepted' | 'dismissed' | 'ignored',
    rating?: number
  ) {
    this.careEngine.recordFeedback(opportunityId, response, rating);
  }

  /**
   * 获取关怀机会列表
   */
  getCareOpportunities(): CareOpportunity[] {
    // 这是一个简化实现，实际应该基于实时数据
    return [];
  }

  /**
   * 清理过期记忆
   */
  cleanup() {
    this.emotionMemory.applyDecay();
  }

  /**
   * 获取记忆统计
   */
  getMemoryStatistics() {
    return this.emotionMemory.getStatistics();
  }

  // 私有方法

  private generateTextBySentiment(sentiment: SentimentResult): string {
    const emotion = sentiment.emotion;

    const responses = {
      happy: [
        '看到你这么开心，我也很高兴！',
        '你的好心情感染了我～',
        '继续保持这种快乐的状态！',
      ],
      excited: [
        '哇，你看起来很兴奋！',
        '有什么好事发生吗？',
        '你的热情真感染人！',
      ],
      sad: [
        '我注意到你似乎有些难过，想聊聊吗？',
        '虽然我无法完全理解你的感受，但我会在这里陪着你。',
        '要记住，难过的日子总会过去的。',
      ],
      thinking: [
        '在思考什么呢？可以和我分享吗？',
        '看起来你在想事情，需要帮助吗？',
        '思考是好事，慢慢来。',
      ],
      neutral: [
        '今天怎么样？',
        '我在这里陪着你。',
        '有什么想聊的吗？',
      ],
    };

    const emotionResponses = responses[emotion as keyof typeof responses] ?? responses.neutral;
    return emotionResponses[Math.floor(Math.random() * emotionResponses.length)] ?? '';
  }

  private getToneBySentiment(sentiment: SentimentResult): string {
    if (sentiment.confidence > 0.8) {
      return 'caring';
    }
    return 'friendly';
  }
}

/**
 * 创建全局实例
 */
let emotionEngineInstance: EmotionEngine | null = null;

export function getEmotionEngine(): EmotionEngine {
  if (!emotionEngineInstance) {
    emotionEngineInstance = new EmotionEngine();
  }
  return emotionEngineInstance;
}
