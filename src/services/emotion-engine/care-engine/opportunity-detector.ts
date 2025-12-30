/**
 * Opportunity Detector
 * 关怀机会检测器
 *
 * P1-3: Extracted from care-engine.ts (705 lines)
 * Linus原则: 单一职责 - 只负责检测关怀时机
 */

import type {
  CareOpportunity,
  CareConfig,
  SentimentResult,
  BehaviorPatternResult,
  EmotionEvent,
} from '../types';
import { getCarePriority } from './care-rules';

/**
 * 关怀机会检测器类
 */
export class OpportunityDetector {
  constructor(private config: CareConfig) {}

  /**
   * 检测所有关怀机会
   */
  detectAll(
    sentiment: SentimentResult,
    behavior: BehaviorPatternResult,
    emotionEvents: EmotionEvent[]
  ): CareOpportunity[] {
    if (!this.config.enabled) {
      return [];
    }

    const opportunities: CareOpportunity[] = [];

    // 1. 低心情检测
    if (
      sentiment.sentiment === 'negative' &&
      sentiment.confidence > this.config.careTypes.low_mood.threshold
    ) {
      opportunities.push(this.createLowMoodOpportunity(sentiment));
    }

    // 2. 高压力检测
    if (behavior.characteristics.stressLevel > this.config.careTypes.high_stress.threshold) {
      opportunities.push(this.createHighStressOpportunity(behavior));
    }

    // 3. 长时间工作检测
    const workHours = behavior.characteristics.stressLevel > 0 ? 1 : 0; // 简化计算
    if (workHours > this.config.careTypes.long_work.threshold) {
      opportunities.push(this.createLongWorkOpportunity(behavior));
    }

    // 4. 低精力检测
    if (behavior.characteristics.energyLevel < this.config.careTypes.low_energy.threshold) {
      opportunities.push(this.createLowEnergyOpportunity(behavior));
    }

    // 5. 休息提醒检测
    const lastBreak = this.getLastBreakTime(emotionEvents);
    const timeSinceBreak = Date.now() - lastBreak;
    const minutesSinceBreak = timeSinceBreak / (1000 * 60);

    if (minutesSinceBreak > this.config.careTypes.break_reminder.threshold * 15) {
      opportunities.push(this.createBreakReminderOpportunity(minutesSinceBreak));
    }

    // 6. 健康警告
    if (this.shouldTriggerHealthWarning(behavior)) {
      opportunities.push(this.createHealthWarningOpportunity(behavior));
    }

    // 7. 情感支持
    if (this.shouldTriggerEmotionalSupport(emotionEvents)) {
      opportunities.push(this.createEmotionalSupportOpportunity(emotionEvents));
    }

    // 8. 成就庆祝
    if (this.shouldTriggerCelebration(emotionEvents)) {
      opportunities.push(this.createAchievementOpportunity(emotionEvents));
    }

    return this.filterAndRank(opportunities);
  }

  /**
   * 创建低心情关怀机会
   */
  private createLowMoodOpportunity(sentiment: SentimentResult): CareOpportunity {
    return {
      id: `low_mood_${Date.now()}`,
      timestamp: Date.now(),
      type: 'low_mood',
      priority: getCarePriority('low_mood', this.config),
      trigger: {
        condition: 'negative_sentiment',
        value: sentiment.confidence,
        threshold: this.config.careTypes.low_mood.threshold,
      },
      suggestion: {
        title: '需要陪伴',
        message: '我注意到你心情不太好，需要我陪陪你吗？',
        tone: 'supportive',
      },
      relatedData: { sentiment },
    };
  }

  /**
   * 创建高压力关怀机会
   */
  private createHighStressOpportunity(behavior: BehaviorPatternResult): CareOpportunity {
    return {
      id: `high_stress_${Date.now()}`,
      timestamp: Date.now(),
      type: 'high_stress',
      priority: getCarePriority('high_stress', this.config),
      trigger: {
        condition: 'high_stress_level',
        value: behavior.characteristics.stressLevel,
        threshold: this.config.careTypes.high_stress.threshold,
      },
      suggestion: {
        title: '休息一下吧',
        message: '你看起来压力很大，建议休息一下。试试深呼吸或简单的伸展运动？',
        action: 'rest_suggestion',
        tone: 'gentle',
      },
      relatedData: { behavior },
    };
  }

  /**
   * 创建长时间工作关怀机会
   */
  private createLongWorkOpportunity(behavior: BehaviorPatternResult): CareOpportunity {
    return {
      id: `long_work_${Date.now()}`,
      timestamp: Date.now(),
      type: 'long_work',
      priority: getCarePriority('long_work', this.config),
      trigger: {
        condition: 'long_work_duration',
        value: 8, // 简化值
        threshold: this.config.careTypes.long_work.threshold,
      },
      suggestion: {
        title: '工作时间过长',
        message: '已经连续工作很久了，休息一下吧！你的健康很重要。',
        action: 'take_break',
        tone: 'gentle',
      },
      relatedData: { behavior },
    };
  }

  /**
   * 创建低精力关怀机会
   */
  private createLowEnergyOpportunity(behavior: BehaviorPatternResult): CareOpportunity {
    return {
      id: `low_energy_${Date.now()}`,
      timestamp: Date.now(),
      type: 'low_energy',
      priority: getCarePriority('low_energy', this.config),
      trigger: {
        condition: 'low_energy_level',
        value: behavior.characteristics.energyLevel,
        threshold: this.config.careTypes.low_energy.threshold,
      },
      suggestion: {
        title: '补充能量',
        message: '看起来有点累，要不要喝杯水或吃个小点心？',
        action: 'energy_boost',
        tone: 'gentle',
      },
      relatedData: { behavior },
    };
  }

  /**
   * 创建休息提醒关怀机会
   */
  private createBreakReminderOpportunity(minutesSinceBreak: number): CareOpportunity {
    return {
      id: `break_reminder_${Date.now()}`,
      timestamp: Date.now(),
      type: 'break_reminder',
      priority: getCarePriority('break_reminder', this.config),
      trigger: {
        condition: 'long_since_break',
        value: minutesSinceBreak,
        threshold: this.config.careTypes.break_reminder.threshold,
      },
      suggestion: {
        title: '休息时间',
        message: `已经工作了${Math.floor(minutesSinceBreak)}分钟，起来活动一下吧！`,
        action: 'take_break',
        tone: 'gentle',
      },
      relatedData: { minutesSinceBreak },
    };
  }

  /**
   * 创建健康警告关怀机会
   */
  private createHealthWarningOpportunity(behavior: BehaviorPatternResult): CareOpportunity {
    return {
      id: `health_warning_${Date.now()}`,
      timestamp: Date.now(),
      type: 'health_warning',
      priority: getCarePriority('health_warning', this.config),
      trigger: {
        condition: 'health_risk',
        value: 1,
        threshold: this.config.careTypes.health_warning.threshold,
      },
      suggestion: {
        title: '健康提醒',
        message: '长时间的紧张工作可能影响健康，请注意劳逸结合！',
        action: 'health_check',
        tone: 'urgent',
      },
      relatedData: { behavior },
    };
  }

  /**
   * 创建情感支持关怀机会
   */
  private createEmotionalSupportOpportunity(events: EmotionEvent[]): CareOpportunity {
    return {
      id: `emotional_support_${Date.now()}`,
      timestamp: Date.now(),
      type: 'emotional_support',
      priority: getCarePriority('emotional_support', this.config),
      trigger: {
        condition: 'emotional_distress',
        value: events.length,
        threshold: this.config.careTypes.emotional_support.threshold,
      },
      suggestion: {
        title: '需要支持',
        message: '我在这里陪着你。如果需要聊天或只是静静坐着，我都在。',
        tone: 'supportive',
      },
      relatedData: { events },
    };
  }

  /**
   * 创建成就庆祝关怀机会
   */
  private createAchievementOpportunity(events: EmotionEvent[]): CareOpportunity {
    return {
      id: `achievement_${Date.now()}`,
      timestamp: Date.now(),
      type: 'achievement_celebration',
      priority: getCarePriority('achievement_celebration', this.config),
      trigger: {
        condition: 'positive_achievement',
        value: events.length,
        threshold: this.config.careTypes.achievement_celebration.threshold,
      },
      suggestion: {
        title: '太棒了！',
        message: '我为你感到高兴！继续保持这种积极的状态！',
        action: 'celebrate',
        tone: 'celebratory',
      },
      relatedData: { events },
    };
  }

  /**
   * 检查是否应触发健康警告
   */
  private shouldTriggerHealthWarning(behavior: BehaviorPatternResult): boolean {
    return (
      behavior.characteristics.stressLevel > 0.9 ||
      behavior.characteristics.energyLevel < 0.1 ||
      behavior.characteristics.focusLevel < 0.2
    );
  }

  /**
   * 检查是否应触发情感支持
   */
  private shouldTriggerEmotionalSupport(events: EmotionEvent[]): boolean {
    const recentNegativeEvents = events.filter(
      (e) =>
        e.sentiment.sentiment === 'negative' &&
        Date.now() - e.timestamp < 30 * 60 * 1000 // 30分钟内
    );
    return recentNegativeEvents.length >= 3;
  }

  /**
   * 检查是否应触发庆祝
   */
  private shouldTriggerCelebration(events: EmotionEvent[]): boolean {
    const recentPositiveEvents = events.filter(
      (e) =>
        e.sentiment.sentiment === 'positive' &&
        Date.now() - e.timestamp < 60 * 60 * 1000 // 1小时内
    );
    return recentPositiveEvents.length >= 5;
  }

  /**
   * 过滤并排序关怀机会
   */
  private filterAndRank(opportunities: CareOpportunity[]): CareOpportunity[] {
    // 过滤禁用的类型
    const filtered = opportunities.filter((opp) => {
      const config = this.config.careTypes[opp.type];
      return config && config.enabled;
    });

    // 按优先级排序
    filtered.sort((a, b) => b.priority - a.priority);

    // 去重（相同类型的取最高优先级）
    const unique: CareOpportunity[] = [];
    const seenTypes = new Set<string>();

    for (const opp of filtered) {
      if (!seenTypes.has(opp.type)) {
        unique.push(opp);
        seenTypes.add(opp.type);
      }
    }

    return unique;
  }

  /**
   * 获取最后休息时间
   *
   * 从情感事件中查找最近一次休息事件的时间
   * 休息事件定义：interaction类型的事件，且context包含休息相关元数据
   */
  private getLastBreakTime(events: EmotionEvent[]): number {
    // 过滤休息相关的事件
    // 休息事件特征：
    // 1. type === 'interaction'
    // 2. context.metadata 包含 action === 'rest' 或相关操作
    const breakEvents = events.filter((e) => {
      if (e.type !== 'interaction') return false;

      const metadata = e.context.metadata;
      if (!metadata) return false;

      // 检查是否是休息相关的操作
      const action = metadata.action as string | undefined;
      return (
        action === 'rest' ||
        action === 'sleep' ||
        action === 'break' ||
        action === 'relax'
      );
    });

    // 如果找到休息事件，返回最近一次的时间
    if (breakEvents.length > 0) {
      // 按时间倒序排序，取最新的
      const sorted = breakEvents.sort((a, b) => b.timestamp - a.timestamp);
      return sorted[0]!.timestamp;
    }

    // 如果没有找到休息事件，假设45分钟前休息过
    return Date.now() - 45 * 60 * 1000;
  }
}
