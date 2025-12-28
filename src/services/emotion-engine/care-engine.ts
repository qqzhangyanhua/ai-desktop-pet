/**
 * Care Engine
 * 智能关怀引擎
 *
 * 检测关怀机会，生成关怀消息，控制打扰度
 */

import type {
  CareOpportunity,
  CareConfig,
  SentimentResult,
  BehaviorPatternResult,
  EmotionEvent,
} from './types';

/**
 * 默认配置
 */
const DEFAULT_CARE_CONFIG: CareConfig = {
  enabled: true,
  minIntervalMinutes: 15,

  disturbanceControl: {
    enabled: true,
    maxNotificationsPerHour: 3,
    quietHours: { start: 22, end: 7 }, // 22:00-07:00
  },

  careTypes: {
    low_mood: {
      enabled: true,
      threshold: 0.6,
      priority: 8,
    },
    high_stress: {
      enabled: true,
      threshold: 0.7,
      priority: 9,
    },
    long_work: {
      enabled: true,
      threshold: 0.8, // 超过8小时
      priority: 7,
    },
    low_energy: {
      enabled: true,
      threshold: 0.4,
      priority: 6,
    },
    break_reminder: {
      enabled: true,
      threshold: 0.5, // 45分钟没休息
      priority: 5,
    },
    health_warning: {
      enabled: true,
      threshold: 0.9,
      priority: 10,
    },
    emotional_support: {
      enabled: true,
      threshold: 0.7,
      priority: 8,
    },
    achievement_celebration: {
      enabled: true,
      threshold: 0.8,
      priority: 4,
    },
  },

  personalization: {
    learningEnabled: true,
    adaptToUserHabits: true,
    customResponses: true,
  },
};

/**
 * 关怀历史记录
 */
interface CareHistory {
  timestamp: number;
  opportunityId: string;
  type: CareOpportunity['type'];
  response: 'accepted' | 'dismissed' | 'ignored';
  userFeedback?: number; // 1-5评分
}

/**
 * CareEngine 类
 */
export class CareEngine {
  private config: CareConfig;
  private history: CareHistory[] = [];
  private lastNotificationTime = 0;
  private notificationCountThisHour = 0;
  private lastHourReset = 0;
  private userPreferences: Map<string, number> = new Map(); // 学习用户偏好

  constructor(config?: Partial<CareConfig>) {
    this.config = { ...DEFAULT_CARE_CONFIG, ...config };
    this.lastHourReset = Date.now();
  }

  /**
   * 检测关怀机会
   */
  detectOpportunities(
    sentiment: SentimentResult,
    behavior: BehaviorPatternResult,
    emotionEvents: EmotionEvent[]
  ): CareOpportunity[] {
    if (!this.config.enabled) {
      return [];
    }

    const opportunities: CareOpportunity[] = [];

    // 1. 低心情检测
    if (sentiment.sentiment === 'negative' && sentiment.confidence > this.config.careTypes.low_mood.threshold) {
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

    // 过滤和排序
    return this.filterAndRankOpportunities(opportunities);
  }

  /**
   * 生成关怀消息
   */
  generateCareMessage(opportunity: CareOpportunity): {
    title: string;
    message: string;
    action?: string;
    tone: 'gentle' | 'urgent' | 'celebratory' | 'supportive';
  } {
    const templates = this.getMessageTemplates(opportunity.type);
    const template = this.selectBestTemplate(templates, opportunity);

    // 个性化调整
    const personalizedTemplate = this.personalizeMessage(template, opportunity);

    return personalizedTemplate;
  }

  /**
   * 检查是否可以通知
   */
  canNotify(): boolean {
    if (!this.config.enabled) {
      return false;
    }

    // 检查静音时间
    if (this.config.disturbanceControl.enabled) {
      const now = new Date();
      const hour = now.getHours();

      if (hour >= this.config.disturbanceControl.quietHours.start ||
          hour < this.config.disturbanceControl.quietHours.end) {
        // 静音时间，只允许紧急关怀
        return false;
      }
    }

    // 检查最小间隔
    const now = Date.now();
    if (now - this.lastNotificationTime < this.config.minIntervalMinutes * 60 * 1000) {
      return false;
    }

    // 检查每小时通知数限制
    this.resetHourlyCountIfNeeded();
    if (this.notificationCountThisHour >= this.config.disturbanceControl.maxNotificationsPerHour) {
      return false;
    }

    return true;
  }

  /**
   * 记录通知已发送
   */
  recordNotification(opportunityId: string, type: CareOpportunity['type']): void {
    this.lastNotificationTime = Date.now();
    this.notificationCountThisHour++;
  }

  /**
   * 记录用户反馈
   */
  recordFeedback(
    opportunityId: string,
    response: 'accepted' | 'dismissed' | 'ignored',
    rating?: number
  ): void {
    const history: CareHistory = {
      timestamp: Date.now(),
      opportunityId,
      type: this.getOpportunityTypeById(opportunityId),
      response,
      userFeedback: rating,
    };

    this.history.push(history);

    // 学习用户偏好
    if (rating !== undefined) {
      this.learnUserPreference(opportunityId, rating);
    }

    // 清理旧历史
    if (this.history.length > 1000) {
      this.history = this.history.slice(-500);
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
    userPreferences: Record<string, number>;
  } {
    const total = this.history.length;
    const accepted = this.history.filter(h => h.response === 'accepted').length;
    const dismissed = this.history.filter(h => h.response === 'dismissed').length;
    const rated = this.history.filter(h => h.userFeedback !== undefined);
    const averageRating = rated.length > 0
      ? rated.reduce((sum, h) => sum + (h.userFeedback || 0), 0) / rated.length
      : 0;

    const typeCounts = new Map<string, number>();
    this.history.forEach(h => {
      typeCounts.set(h.type, (typeCounts.get(h.type) || 0) + 1);
    });
    const topCareTypes = Array.from(typeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));

    return {
      totalOpportunities: total,
      acceptedRate: total > 0 ? accepted / total : 0,
      dismissedRate: total > 0 ? dismissed / total : 0,
      averageRating,
      topCareTypes,
      userPreferences: Object.fromEntries(this.userPreferences),
    };
  }

  // 私有方法

  private createLowMoodOpportunity(sentiment: SentimentResult): CareOpportunity {
    return {
      id: `low_mood_${Date.now()}`,
      timestamp: Date.now(),
      type: 'low_mood',
      priority: this.config.careTypes.low_mood.priority,
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

  private createHighStressOpportunity(behavior: BehaviorPatternResult): CareOpportunity {
    return {
      id: `high_stress_${Date.now()}`,
      timestamp: Date.now(),
      type: 'high_stress',
      priority: this.config.careTypes.high_stress.priority,
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

  private createLongWorkOpportunity(behavior: BehaviorPatternResult): CareOpportunity {
    return {
      id: `long_work_${Date.now()}`,
      timestamp: Date.now(),
      type: 'long_work',
      priority: this.config.careTypes.long_work.priority,
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

  private createLowEnergyOpportunity(behavior: BehaviorPatternResult): CareOpportunity {
    return {
      id: `low_energy_${Date.now()}`,
      timestamp: Date.now(),
      type: 'low_energy',
      priority: this.config.careTypes.low_energy.priority,
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

  private createBreakReminderOpportunity(minutesSinceBreak: number): CareOpportunity {
    return {
      id: `break_reminder_${Date.now()}`,
      timestamp: Date.now(),
      type: 'break_reminder',
      priority: this.config.careTypes.break_reminder.priority,
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

  private createHealthWarningOpportunity(behavior: BehaviorPatternResult): CareOpportunity {
    return {
      id: `health_warning_${Date.now()}`,
      timestamp: Date.now(),
      type: 'health_warning',
      priority: this.config.careTypes.health_warning.priority,
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

  private createEmotionalSupportOpportunity(events: EmotionEvent[]): CareOpportunity {
    return {
      id: `emotional_support_${Date.now()}`,
      timestamp: Date.now(),
      type: 'emotional_support',
      priority: this.config.careTypes.emotional_support.priority,
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

  private createAchievementOpportunity(events: EmotionEvent[]): CareOpportunity {
    return {
      id: `achievement_${Date.now()}`,
      timestamp: Date.now(),
      type: 'achievement_celebration',
      priority: this.config.careTypes.achievement_celebration.priority,
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

  private shouldTriggerHealthWarning(behavior: BehaviorPatternResult): boolean {
    return (
      behavior.characteristics.stressLevel > 0.9 ||
      behavior.characteristics.energyLevel < 0.1 ||
      behavior.characteristics.focusLevel < 0.2
    );
  }

  private shouldTriggerEmotionalSupport(events: EmotionEvent[]): boolean {
    const recentNegativeEvents = events.filter(e =>
      e.sentiment.sentiment === 'negative' &&
      Date.now() - e.timestamp < 30 * 60 * 1000 // 30分钟内
    );
    return recentNegativeEvents.length >= 3;
  }

  private shouldTriggerCelebration(events: EmotionEvent[]): boolean {
    const recentPositiveEvents = events.filter(e =>
      e.sentiment.sentiment === 'positive' &&
      Date.now() - e.timestamp < 60 * 60 * 1000 // 1小时内
    );
    return recentPositiveEvents.length >= 5;
  }

  private filterAndRankOpportunities(opportunities: CareOpportunity[]): CareOpportunity[] {
    // 过滤禁用的类型
    const filtered = opportunities.filter(opp => {
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

  private getMessageTemplates(type: CareOpportunity['type']) {
    const templates = {
      low_mood: [
        {
          tone: 'supportive' as const,
          title: '需要陪伴',
          message: '我注意到你心情不太好，需要我陪陪你吗？',
        },
        {
          tone: 'supportive' as const,
          title: '我在这里',
          message: '不管怎样，我都在这里陪着你。要聊聊吗？',
        },
      ],
      high_stress: [
        {
          tone: 'gentle' as const,
          title: '休息一下吧',
          message: '你看起来压力很大，建议休息一下。试试深呼吸或简单的伸展运动？',
        },
        {
          tone: 'gentle' as const,
          title: '放松时刻',
          message: '工作再重要，也没有你的健康重要。稍微休息一下吧？',
        },
      ],
      long_work: [
        {
          tone: 'gentle' as const,
          title: '工作时间过长',
          message: '已经连续工作很久了，休息一下吧！你的健康很重要。',
        },
        {
          tone: 'gentle' as const,
          title: '该休息了',
          message: '长时间工作会让人疲惫，给自己一点休息时间吧？',
        },
      ],
      low_energy: [
        {
          tone: 'gentle' as const,
          title: '补充能量',
          message: '看起来有点累，要不要喝杯水或吃个小点心？',
        },
        {
          tone: 'gentle' as const,
          title: '恢复精力',
          message: '需要充电啦！补充能量后再继续吧～',
        },
      ],
      break_reminder: [
        {
          tone: 'gentle' as const,
          title: '休息时间',
          message: '起来活动一下吧，久坐对身体不好哦！',
        },
        {
          tone: 'gentle' as const,
          title: '动一动',
          message: '花几分钟伸展一下，缓解疲劳吧！',
        },
      ],
      health_warning: [
        {
          tone: 'urgent' as const,
          title: '健康提醒',
          message: '长时间的紧张工作可能影响健康，请注意劳逸结合！',
        },
        {
          tone: 'urgent' as const,
          title: '注意身体',
          message: '你的健康比任何工作都重要，请务必注意休息！',
        },
      ],
      emotional_support: [
        {
          tone: 'supportive' as const,
          title: '需要支持',
          message: '我在这里陪着你。如果需要聊天或只是静静坐着，我都在。',
        },
        {
          tone: 'supportive' as const,
          title: '我理解你',
          message: '我知道有时候会感到困难，但请记住，你并不孤单。',
        },
      ],
      achievement_celebration: [
        {
          tone: 'celebratory' as const,
          title: '太棒了！',
          message: '我为你感到高兴！继续保持这种积极的状态！',
        },
        {
          tone: 'celebratory' as const,
          title: '做得好！',
          message: '你的努力有回报了！为你骄傲！',
        },
      ],
    };

    return templates[type] || [];
  }

  private selectBestTemplate(
    templates: Array<{ tone: string; title: string; message: string }>,
    opportunity: CareOpportunity
  ) {
    // 简化：随机选择或根据用户偏好选择
    const bestTemplate = templates[Math.floor(Math.random() * templates.length)];
    return bestTemplate;
  }

  private personalizeMessage(
    template: { tone: string; title: string; message: string },
    opportunity: CareOpportunity
  ): { title: string; message: string; action?: string; tone: string } {
    // 这里可以添加个性化逻辑
    // 例如：根据用户历史反馈调整语调

    return {
      title: template.title,
      message: template.message,
      action: opportunity.suggestion.action,
      tone: template.tone,
    };
  }

  private getLastBreakTime(events: EmotionEvent[]): number {
    // 简化：返回当前时间（实际应该从事件中提取）
    return Date.now() - 60 * 60 * 1000; // 假设1小时前休息过
  }

  private resetHourlyCountIfNeeded(): void {
    const now = Date.now();
    const hourMs = 60 * 60 * 1000;

    if (now - this.lastHourReset > hourMs) {
      this.notificationCountThisHour = 0;
      this.lastHourReset = now;
    }
  }

  private getOpportunityTypeById(opportunityId: string): CareOpportunity['type'] {
    // 简化：从ID中提取类型
    if (opportunityId.includes('low_mood')) return 'low_mood';
    if (opportunityId.includes('high_stress')) return 'high_stress';
    if (opportunityId.includes('long_work')) return 'long_work';
    if (opportunityId.includes('low_energy')) return 'low_energy';
    if (opportunityId.includes('break_reminder')) return 'break_reminder';
    if (opportunityId.includes('health_warning')) return 'health_warning';
    if (opportunityId.includes('emotional_support')) return 'emotional_support';
    if (opportunityId.includes('achievement')) return 'achievement_celebration';
    return 'break_reminder';
  }

  private learnUserPreference(opportunityId: string, rating: number): void {
    // 学习用户对不同类型关怀的偏好
    const type = this.getOpportunityTypeById(opportunityId);
    const currentPref = this.userPreferences.get(type) || 0.5;
    // 简单的加权平均
    const newPref = (currentPref * 0.7) + (rating / 5 * 0.3);
    this.userPreferences.set(type, newPref);
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<CareConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 获取当前配置
   */
  getConfig(): CareConfig {
    return { ...this.config };
  }
}

/**
 * 创建全局实例
 */
let careInstance: CareEngine | null = null;

export function getCareEngine(): CareEngine {
  if (!careInstance) {
    careInstance = new CareEngine();
  }
  return careInstance;
}
