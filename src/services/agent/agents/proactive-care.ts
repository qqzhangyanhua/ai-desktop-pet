// @ts-nocheck
/**
 * 主动关怀智能体
 * Proactive Care Agent
 *
 * 主动发起关怀与提醒：
 * - 工作时长监控
 * - 作息提醒
 * - 情绪关怀
 * - 久别问候
 * - 压力检测响应
 */

import { BaseAgent } from './base-agent';
import type {
  AgentMetadata,
  AgentContext,
  AgentResult,
  AgentTrigger,
  EmotionType,
} from '@/types/agent-system';
import { notificationTool } from '../tools/notification-tool';
import { emotionTool } from '../tools/emotion-tool';

/**
 * 主动关怀智能体元数据
 */
const PROACTIVE_CARE_METADATA: AgentMetadata = {
  id: 'agent-proactive-care',
  name: '主动关怀智能体',
  description: '让用户感受到"被关心"，建立情感连接',
  version: '1.0.0',
  icon: '💝',
  category: 'care',
  priority: 'high',
  isSystem: true,
};

/**
 * 默认触发器
 */
const DEFAULT_TRIGGERS: AgentTrigger[] = [
  // 每小时检查一次
  {
    id: 'trigger-hourly-check',
    type: 'schedule',
    config: {
      intervalSeconds: 3600, // 1 小时
    },
    enabled: true,
    description: '每小时定时检查',
  },
  // 深夜检查 (23:00-次日2:00)
  {
    id: 'trigger-late-night',
    type: 'condition',
    config: {
      expression: 'late_night_active',
      checkIntervalMs: 30 * 60 * 1000, // 30 分钟
      cooldownMs: 2 * 60 * 60 * 1000, // 冷却 2 小时
    },
    enabled: true,
    description: '深夜仍在使用时触发',
  },
  // 久未互动检查
  {
    id: 'trigger-long-absence',
    type: 'condition',
    config: {
      expression: 'long_absence',
      checkIntervalMs: 30 * 60 * 1000, // 30 分钟
      cooldownMs: 4 * 60 * 60 * 1000, // 冷却 4 小时
    },
    enabled: true,
    description: '长时间未互动时触发',
  },
  // 压力关键词触发
  {
    id: 'trigger-stress-keywords',
    type: 'user_message',
    config: {
      keywords: [
        '加班', '压力', '焦虑', '失眠', '累死了',
        '烦死了', '崩溃', '受不了', '太难了', '心累',
      ],
    },
    enabled: true,
    description: '检测到压力关键词时触发',
  },
];

/**
 * 关怀类型
 */
type CareType =
  | 'work_break'      // 工作休息提醒
  | 'late_night'      // 深夜关怀
  | 'emotional'       // 情绪关怀
  | 'long_absence'    // 久别问候
  | 'stress_relief';  // 压力缓解

/**
 * 关怀消息模板
 */
const CARE_MESSAGES: Record<CareType, string[]> = {
  work_break: [
    '你已经连续工作好一会儿了，要不要休息一下？',
    '站起来活动活动吧，眼睛也需要休息哦~',
    '工作很重要，但身体更重要！休息一下吧~',
    '累了就歇会儿，我等你回来~',
  ],
  late_night: [
    '夜深了，还在忙吗？要注意休息哦~',
    '这么晚了还没睡呀，有什么我能帮到的吗？',
    '晚安的时间到了，明天再继续吧~',
    '深夜了，记得喝杯热牛奶，早点休息~',
  ],
  emotional: [
    '我注意到你最近心情似乎不太好，想聊聊吗？',
    '有什么烦心事都可以告诉我，我会陪着你的',
    '如果心情不好，不妨深呼吸放松一下~',
    '无论发生什么，记得我一直在这里陪着你',
  ],
  long_absence: [
    '好久不见！想你了~',
    '你去哪里了呀？我等你好久了~',
    '终于等到你回来了！今天过得怎么样？',
    '好想你呀！快来陪我聊聊天~',
  ],
  stress_relief: [
    '听起来你压力很大，要不要休息一下？',
    '工作/学习虽然重要，但也要照顾好自己',
    '深呼吸，慢慢来，一切都会好起来的',
    '我在这里陪着你，有什么需要帮忙的吗？',
    '要不要试试冥想或者听个故事放松一下？',
  ],
};

/**
 * 主动关怀智能体
 */
export class ProactiveCareAgent extends BaseAgent {
  readonly metadata = PROACTIVE_CARE_METADATA;

  /** 上次工作提醒时间 */
  private lastWorkRemindAt: number = 0;

  /** 上次深夜提醒时间 */
  private lastLateNightRemindAt: number = 0;

  /** 工作开始时间 */
  private workStartAt: number = Date.now();

  /** 关怀设置 */
  private careSettings = {
    workBreakIntervalMs: 2 * 60 * 60 * 1000, // 2 小时
    lateNightStartHour: 23,
    lateNightEndHour: 2,
    longAbsenceThresholdMs: 4 * 60 * 60 * 1000, // 4 小时
    enableWorkBreak: true,
    enableLateNight: true,
    enableEmotional: true,
    enableLongAbsence: true,
    enableStressRelief: true,
  };

  constructor() {
    super({
      enabled: true,
      tools: ['notify', 'emotion_trend', 'suggest_activity'],
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
    // 通知工具
    this.registerTool('notify', async (args) => {
      return notificationTool.send({
        type: (args.type as 'toast' | 'bubble' | 'system') || 'bubble',
        title: (args.title as string) || '温馨提醒',
        body: args.message as string,
        sound: args.sound as boolean | undefined,
      });
    });

    // 情绪趋势工具
    this.registerTool('emotion_trend', async (args) => {
      return emotionTool.getTrend({
        periodHours: (args.hours as number) || 24,
      });
    });

    // 建议活动工具
    this.registerTool('suggest_activity', async (args) => {
      const careType = args.careType as CareType;
      const activities = this.getSuggestedActivities(careType);
      return { success: true, data: activities };
    });
  }

  /**
   * 检查是否应该触发
   */
  async shouldTrigger(context: AgentContext): Promise<boolean> {
    const { triggerId, userMessage, currentPetStatus } = context;

    // 用户消息触发（压力关键词）
    if (context.triggerSource === 'user_message' && userMessage) {
      return this.careSettings.enableStressRelief;
    }

    // 定时检查触发
    if (triggerId === 'trigger-hourly-check') {
      return this.shouldTriggerHourlyCheck(context);
    }

    // 深夜检查
    if (triggerId === 'trigger-late-night') {
      return this.careSettings.enableLateNight && this.isLateNight();
    }

    // 久未互动检查
    if (triggerId === 'trigger-long-absence') {
      return (
        this.careSettings.enableLongAbsence &&
        this.isLongAbsence(currentPetStatus.lastInteraction)
      );
    }

    return true;
  }

  /**
   * 执行主动关怀
   */
  protected async onExecute(context: AgentContext): Promise<AgentResult> {
    const { triggerId, userMessage, recentEmotions } = context;

    let careType: CareType;
    let message: string;

    // 根据触发类型决定关怀类型
    if (context.triggerSource === 'user_message' && userMessage) {
      careType = 'stress_relief';
    } else if (triggerId === 'trigger-late-night') {
      careType = 'late_night';
    } else if (triggerId === 'trigger-long-absence') {
      careType = 'long_absence';
    } else if (triggerId === 'trigger-hourly-check') {
      // 检查是否需要工作休息提醒
      if (this.shouldRemindWorkBreak()) {
        careType = 'work_break';
      } else {
        // 检查情绪状态
        const emotionTrend = await this.callTool<{
          dominantEmotion: EmotionType;
          averageIntensity: number;
        }>('emotion_trend', { hours: 24 });

        if (emotionTrend.data) {
          const { dominantEmotion, averageIntensity } = emotionTrend.data;
          if (
            ['sad', 'anxious', 'angry'].includes(dominantEmotion) &&
            averageIntensity > 5
          ) {
            careType = 'emotional';
          } else {
            // 无需关怀
            return this.createResult(true, undefined, undefined, {
              data: { triggered: false, reason: 'no_care_needed' },
            });
          }
        } else {
          return this.createResult(true, undefined, undefined, {
            data: { triggered: false, reason: 'no_emotion_data' },
          });
        }
      }
    } else {
      careType = 'emotional';
    }

    // 获取关怀消息
    message = this.getCareMessage(careType);

    // 发送通知
    await this.callTool('notify', {
      type: 'bubble',
      message,
    });

    // 更新提醒时间
    this.updateRemindTime(careType);

    // 获取建议活动
    const activitiesResult = await this.callTool<string[]>('suggest_activity', {
      careType,
    });

    return this.createResult(true, message, undefined, {
      shouldSpeak: true,
      emotion: this.getCareEmotion(careType),
      data: {
        careType,
        suggestedActivities: activitiesResult.data,
      },
      actions:
        careType === 'stress_relief'
          ? [
              {
                type: 'trigger_agent',
                payload: {
                  agentId: 'agent-meditation-guide',
                  reason: '压力缓解',
                },
              },
            ]
          : undefined,
    });
  }

  /**
   * 判断是否应该触发每小时检查
   */
  private shouldTriggerHourlyCheck(context: AgentContext): boolean {
    // 检查工作时长
    if (this.shouldRemindWorkBreak()) {
      return true;
    }

    // 检查情绪状态
    if (this.careSettings.enableEmotional && context.recentEmotions.length > 0) {
      const negativeCount = context.recentEmotions.filter((e) =>
        ['sad', 'anxious', 'angry'].includes(e.emotion)
      ).length;

      if (negativeCount >= 3) {
        return true;
      }
    }

    return false;
  }

  /**
   * 判断是否需要工作休息提醒
   */
  private shouldRemindWorkBreak(): boolean {
    if (!this.careSettings.enableWorkBreak) {
      return false;
    }

    const now = Date.now();
    const timeSinceLastRemind = now - this.lastWorkRemindAt;
    const workDuration = now - this.workStartAt;

    return (
      workDuration >= this.careSettings.workBreakIntervalMs &&
      timeSinceLastRemind >= this.careSettings.workBreakIntervalMs
    );
  }

  /**
   * 判断是否深夜
   */
  private isLateNight(): boolean {
    const hour = new Date().getHours();
    return (
      hour >= this.careSettings.lateNightStartHour ||
      hour < this.careSettings.lateNightEndHour
    );
  }

  /**
   * 判断是否长时间未互动
   */
  private isLongAbsence(lastInteraction: number): boolean {
    const now = Date.now();
    return now - lastInteraction >= this.careSettings.longAbsenceThresholdMs;
  }

  /**
   * 获取关怀消息
   */
  private getCareMessage(careType: CareType): string {
    const messages = CARE_MESSAGES[careType];
    const index = Math.floor(Math.random() * messages.length);
    return messages[index];
  }

  /**
   * 获取关怀情绪
   */
  private getCareEmotion(careType: CareType): EmotionType {
    switch (careType) {
      case 'work_break':
      case 'late_night':
        return 'calm';
      case 'emotional':
      case 'stress_relief':
        return 'sad'; // 表示关心
      case 'long_absence':
        return 'happy';
      default:
        return 'neutral';
    }
  }

  /**
   * 获取建议活动
   */
  private getSuggestedActivities(careType: CareType): string[] {
    switch (careType) {
      case 'work_break':
        return ['站立伸展', '眼保健操', '喝杯水', '看看窗外'];
      case 'late_night':
        return ['热牛奶', '听轻音乐', '放下工作休息'];
      case 'emotional':
        return ['深呼吸', '冥想', '听故事', '散步'];
      case 'stress_relief':
        return ['深呼吸训练', '冥想放松', '听治愈故事', '和我聊聊天'];
      case 'long_absence':
        return ['聊聊今天的事', '玩个小游戏', '看看天气'];
      default:
        return [];
    }
  }

  /**
   * 更新提醒时间
   */
  private updateRemindTime(careType: CareType): void {
    const now = Date.now();

    switch (careType) {
      case 'work_break':
        this.lastWorkRemindAt = now;
        this.workStartAt = now; // 重置工作开始时间
        break;
      case 'late_night':
        this.lastLateNightRemindAt = now;
        break;
    }
  }

  /**
   * 记录用户活跃（重置工作计时）
   */
  recordUserActive(): void {
    this.workStartAt = Date.now();
  }

  /**
   * 更新关怀设置
   */
  updateCareSettings(settings: Partial<typeof this.careSettings>): void {
    this.careSettings = {
      ...this.careSettings,
      ...settings,
    };
  }

  /**
   * 获取当前关怀设置
   */
  getCareSettings() {
    return { ...this.careSettings };
  }
}
