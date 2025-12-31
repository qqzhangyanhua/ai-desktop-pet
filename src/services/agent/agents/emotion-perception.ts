/**
 * 情绪感知智能体
 * Emotion Perception Agent
 *
 * 实时分析用户情绪并做出响应：
 * - 文本情绪分析
 * - 表情联动
 * - 情绪日记记录
 * - 情绪趋势分析
 * - 个性化响应生成
 */

import { BaseAgent } from './base-agent';
import type {
  AgentMetadata,
  AgentContext,
  AgentResult,
  AgentTrigger,
  EmotionType,
  EmotionRecord,
} from '@/types/agent-system';
import { emotionTool } from '../tools/emotion-tool';

/**
 * 情绪感知智能体元数据
 */
const EMOTION_PERCEPTION_METADATA: AgentMetadata = {
  id: 'agent-emotion-perception',
  name: '情绪感知智能体',
  description: '理解用户情绪，让对话更有温度',
  version: '1.0.0',
  icon: '💭',
  category: 'care',
  priority: 'high',
  isSystem: true,
};

/**
 * 默认触发器
 */
const DEFAULT_TRIGGERS: AgentTrigger[] = [
  {
    id: 'trigger-user-message',
    type: 'user_message',
    config: {
      isDefault: true, // 作为默认消息处理器
    },
    enabled: true,
    description: '每次用户消息后触发',
  },
];

/**
 * 情绪到表情的映射
 */
const EMOTION_TO_EXPRESSION: Record<EmotionType, string> = {
  happy: 'happy',
  sad: 'sad',
  anxious: 'confused',
  excited: 'happy',
  calm: 'normal',
  angry: 'angry',
  confused: 'confused',
  neutral: 'normal',
};

/**
 * 情绪到动画的映射
 */
const EMOTION_TO_ANIMATION: Record<EmotionType, string | undefined> = {
  happy: 'happy',
  sad: undefined,
  anxious: undefined,
  excited: 'happy',
  calm: undefined,
  angry: undefined,
  confused: 'thinking',
  neutral: undefined,
};

/**
 * 情绪感知智能体
 */
export class EmotionPerceptionAgent extends BaseAgent {
  readonly metadata = EMOTION_PERCEPTION_METADATA;

  /** 最近分析的情绪 */
  private lastEmotion: EmotionType = 'neutral';

  /** 最近的情绪强度 */
  private lastIntensity: number = 5;

  /** 连续负面情绪计数 */
  private negativeEmotionCount: number = 0;

  constructor() {
    super({
      enabled: true,
      tools: ['emotion_analyze', 'emotion_record', 'emotion_suggest'],
      maxSteps: 3,
      timeoutMs: 10000,
    });

    this.triggers = [...DEFAULT_TRIGGERS];
  }

  /**
   * 初始化钩子
   */
  protected async onInitialize(): Promise<void> {
    this.registerBuiltinTools();
  }

  /**
   * 注册内置工具
   */
  protected registerBuiltinTools(): void {
    // 情绪分析工具
    this.registerTool('emotion_analyze', async (args) => {
      const text = args.text as string;
      return emotionTool.analyze(text);
    });

    // 情绪记录工具
    this.registerTool('emotion_record', async (args) => {
      return emotionTool.record({
        emotion: args.emotion as EmotionType,
        intensity: args.intensity as number,
        trigger: args.trigger as string | undefined,
        conversationId: args.conversationId as string | undefined,
      });
    });

    // 情绪建议工具
    this.registerTool('emotion_suggest', async (args) => {
      return emotionTool.getSuggestion(
        args.emotion as EmotionType,
        args.intensity as number
      );
    });
  }

  /**
   * 检查是否应该触发
   */
  async shouldTrigger(context: AgentContext): Promise<boolean> {
    // 只有在有用户消息时才触发
    return !!context.userMessage && context.userMessage.length > 0;
  }

  /**
   * 执行情绪感知
   */
  protected async onExecute(context: AgentContext): Promise<AgentResult> {
    const { userMessage } = context;

    if (!userMessage) {
      return this.createResult(false, '没有用户消息');
    }

    this.log('info', '开始情绪分析', { messageLength: userMessage.length });

    // 1. 分析情绪
    const analyzeResult = await this.callTool<{
      emotion: EmotionType;
      intensity: number;
      keywords: string[];
    }>('emotion_analyze', { text: userMessage });

    if (!analyzeResult.success || !analyzeResult.data) {
      return this.createResult(false, '情绪分析失败', analyzeResult.error);
    }

    const { emotion, intensity, keywords } = analyzeResult.data;

    this.log('info', '情绪分析完成', { emotion, intensity, keywords });

    // 2. 更新状态
    this.lastEmotion = emotion;
    this.lastIntensity = intensity;

    // 统计连续负面情绪
    if (['sad', 'anxious', 'angry'].includes(emotion)) {
      this.negativeEmotionCount++;
    } else {
      this.negativeEmotionCount = 0;
    }

    // 3. 记录情绪日记
    await this.callTool('emotion_record', {
      emotion,
      intensity,
      trigger: keywords.join(', ') || undefined,
    });

    // 4. 获取情绪建议
    const suggestionResult = await this.callTool<string>('emotion_suggest', {
      emotion,
      intensity,
    });

    // 5. 构建结果
    const expression = EMOTION_TO_EXPRESSION[emotion];
    const animation = EMOTION_TO_ANIMATION[emotion];

    // 检查是否需要特别关怀（连续 3 次负面情绪）
    const needsSpecialCare = this.negativeEmotionCount >= 3;

    let message = suggestionResult.data || '';

    if (needsSpecialCare) {
      message =
        '我注意到你最近心情不太好，有什么我能帮到你的吗？或者我们可以试试深呼吸放松一下~';
      this.negativeEmotionCount = 0; // 重置计数
    }

    return this.createResult(true, message, undefined, {
      emotion,
      animation,
      shouldSpeak: intensity >= 7, // 强烈情绪时语音反馈
      data: {
        emotion,
        intensity,
        keywords,
        expression,
        needsSpecialCare,
      },
      actions:
        emotion === 'anxious' && intensity >= 7
          ? [
              {
                type: 'trigger_agent',
                payload: {
                  agentId: 'agent-meditation-guide',
                  reason: '检测到焦虑情绪',
                },
              },
            ]
          : undefined,
    });
  }

  /**
   * 获取当前情绪状态
   */
  getCurrentEmotion(): { emotion: EmotionType; intensity: number } {
    return {
      emotion: this.lastEmotion,
      intensity: this.lastIntensity,
    };
  }

  /**
   * 获取最近情绪记录
   */
  async getRecentEmotions(limit: number = 10): Promise<EmotionRecord[]> {
    const result = await emotionTool.getRecent(limit);
    return result.data || [];
  }

  /**
   * 获取情绪趋势
   */
  async getEmotionTrend(periodHours: number = 24) {
    const result = await emotionTool.getTrend({ periodHours });
    return result.data;
  }
}
