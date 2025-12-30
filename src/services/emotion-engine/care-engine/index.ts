/**
 * Care Engine Main Module
 * 智能关怀引擎主模块
 *
 * P1-6: Refactored from monolithic care-engine.ts (705 lines)
 * Linus原则: 好品味 - 组合优于继承，模块化优于单体
 *
 * 架构：
 * - OpportunityDetector: 关怀时机检测
 * - MessageGenerator: 消息生成
 * - NotificationController: 通知控制
 * - CareEngine: 协调器（Facade模式）
 */

import type {
  CareConfig,
  CareOpportunity,
  SentimentResult,
  BehaviorPatternResult,
  EmotionEvent,
} from '../types';
import { DEFAULT_CARE_CONFIG } from './care-rules';
import { OpportunityDetector } from './opportunity-detector';
import { MessageGenerator } from './message-generator';
import { NotificationController } from './notification-controller';
import type { GeneratedCareMessage } from './types';

/**
 * CareEngine 主类
 *
 * 采用Facade模式，协调各个子模块
 */
export class CareEngine {
  private config: CareConfig;
  private detector: OpportunityDetector;
  private generator: MessageGenerator;
  private controller: NotificationController;

  constructor(config?: Partial<CareConfig>) {
    this.config = { ...DEFAULT_CARE_CONFIG, ...config };
    this.detector = new OpportunityDetector(this.config);
    this.generator = new MessageGenerator();
    this.controller = new NotificationController(this.config);
  }

  /**
   * 检测关怀机会
   */
  detectOpportunities(
    sentiment: SentimentResult,
    behavior: BehaviorPatternResult,
    emotionEvents: EmotionEvent[]
  ): CareOpportunity[] {
    return this.detector.detectAll(sentiment, behavior, emotionEvents);
  }

  /**
   * 生成关怀消息
   */
  generateCareMessage(opportunity: CareOpportunity): GeneratedCareMessage {
    return this.generator.generate(opportunity);
  }

  /**
   * 检查是否可以通知
   */
  canNotify(): boolean {
    return this.controller.canNotify();
  }

  /**
   * 记录通知已发送
   */
  recordNotification(opportunityId: string, type: CareOpportunity['type']): void {
    this.controller.recordNotification(opportunityId, type);
  }

  /**
   * 记录用户反馈
   */
  recordFeedback(
    opportunityId: string,
    response: 'accepted' | 'dismissed' | 'ignored',
    rating?: number
  ): void {
    this.controller.recordFeedback(opportunityId, response, rating);

    // 同步学习到消息生成器
    if (rating !== undefined) {
      this.generator.learnPreference(opportunityId, rating);
    }
  }

  /**
   * 获取关怀统计
   */
  getCareStatistics(): {
    totalOpportunities: number;
    acceptedRate: number;
    dismissedRate: number;
    averageRating: number;
    topCareTypes: Array<{ type: string; count: number }>;
  } {
    return this.controller.getStatistics();
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<CareConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.detector = new OpportunityDetector(this.config);
    this.controller.updateConfig(this.config);
  }

  /**
   * 获取当前配置
   */
  getConfig(): CareConfig {
    return { ...this.config };
  }
}

/**
 * 全局单例
 */
let careInstance: CareEngine | null = null;

/**
 * 获取全局CareEngine实例
 */
export function getCareEngine(): CareEngine {
  if (!careInstance) {
    careInstance = new CareEngine();
  }
  return careInstance;
}

// Re-export types and utilities
export { DEFAULT_CARE_CONFIG } from './care-rules';
export type { CareHistory, MessageTemplate, GeneratedCareMessage } from './types';
