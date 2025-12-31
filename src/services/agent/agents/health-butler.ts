/**
 * 健康管家智能体
 * Health Butler Agent
 *
 * 关注用户健康，提供科学的健康提醒：
 * - 喝水提醒
 * - 久坐提醒
 * - 用眼提醒
 * - 作息建议
 * - 健康日报
 */

import { BaseAgent } from './base-agent';
import type {
  AgentMetadata,
  AgentContext,
  AgentResult,
  AgentTrigger,
} from '@/types/agent-system';
import { notificationTool } from '../tools/notification-tool';

/**
 * 健康管家智能体元数据
 */
const HEALTH_BUTLER_METADATA: AgentMetadata = {
  id: 'agent-health-butler',
  name: '健康管家智能体',
  description: '关注用户健康，提供科学的健康提醒',
  version: '1.0.0',
  icon: '💪',
  category: 'wellness',
  priority: 'normal',
  isSystem: false,
};

/**
 * 健康提醒类型
 */
type HealthReminderType = 'water' | 'stand' | 'eyes' | 'sleep';

/**
 * 健康统计数据
 */
interface HealthStats {
  /** 今日饮水次数 */
  waterCount: number;
  /** 今日站立次数 */
  standCount: number;
  /** 今日用眼休息次数 */
  eyeRestCount: number;
  /** 屏幕使用时长（分钟） */
  screenTimeMinutes: number;
  /** 上次喝水时间 */
  lastWaterTime: number;
  /** 上次站立时间 */
  lastStandTime: number;
  /** 上次眼休息时间 */
  lastEyeRestTime: number;
  /** 统计日期 */
  date: string;
}

/**
 * 默认触发器
 */
const DEFAULT_TRIGGERS: AgentTrigger[] = [
  // 喝水提醒 - 每小时
  {
    id: 'trigger-water-reminder',
    type: 'schedule',
    config: {
      intervalSeconds: 3600, // 1 小时
    },
    enabled: true,
    description: '每小时喝水提醒',
  },
  // 久坐提醒 - 每 45 分钟
  {
    id: 'trigger-stand-reminder',
    type: 'schedule',
    config: {
      intervalSeconds: 2700, // 45 分钟
    },
    enabled: true,
    description: '久坐提醒',
  },
  // 用眼提醒 - 每 30 分钟
  {
    id: 'trigger-eye-rest-reminder',
    type: 'schedule',
    config: {
      intervalSeconds: 1800, // 30 分钟
    },
    enabled: true,
    description: '用眼休息提醒',
  },
  // 晚间入睡提醒
  {
    id: 'trigger-sleep-reminder',
    type: 'condition',
    config: {
      expression: 'sleep_time',
      checkIntervalMs: 30 * 60 * 1000, // 30 分钟
      cooldownMs: 60 * 60 * 1000, // 冷却 1 小时
    },
    enabled: true,
    description: '晚间入睡提醒',
  },
  // 健康关键词触发
  {
    id: 'trigger-health-keywords',
    type: 'user_message',
    config: {
      keywords: [
        '喝水', '饮水', '健康', '运动', '睡眠',
        '休息', '眼睛', '疲劳', '累了',
      ],
    },
    enabled: true,
    description: '健康相关对话',
  },
];

/**
 * 提醒消息模板
 */
const REMINDER_MESSAGES: Record<HealthReminderType, string[]> = {
  water: [
    '喝杯水吧！保持水分很重要哦~💧',
    '该补充水分啦！来杯温水吧~',
    '滴滴~喝水时间到！今天喝够 8 杯水了吗？',
    '工作再忙也要记得喝水哦！',
    '水是生命之源，来一杯吧~',
  ],
  stand: [
    '坐太久啦！站起来活动活动吧~🧘',
    '伸个懒腰，活动一下筋骨~',
    '久坐伤身，起来走动走动吧！',
    '做几个简单的拉伸动作吧~',
    '站起来扭扭腰、动动腿~',
  ],
  eyes: [
    '眼睛需要休息啦！看看远处放松一下~👀',
    '20-20-20 法则：每 20 分钟看 20 英尺外 20 秒',
    '闭上眼睛休息一会儿吧~',
    '眨眨眼，做做眼保健操~',
    '看看窗外的绿色，放松眼睛~',
  ],
  sleep: [
    '夜深了，该准备休息啦~🌙',
    '早睡早起身体好，该睡觉咯~',
    '放下工作，好好休息，明天又是元气满满的一天！',
    '晚安时间到！祝你有个好梦~',
    '身体是革命的本钱，早点休息吧~',
  ],
};

/**
 * 健康建议
 */
const HEALTH_TIPS: string[] = [
  '每天喝 8 杯水（约 2000ml）有助于保持身体健康',
  '每坐 45 分钟站起来活动 5 分钟可以预防久坐疾病',
  '使用电子设备时，每 20 分钟休息一下眼睛',
  '保持规律的作息时间，每天睡眠 7-8 小时',
  '适当运动可以提高免疫力和工作效率',
  '工作时保持正确的坐姿可以减少腰背疼痛',
  '深呼吸可以帮助缓解压力和焦虑',
  '午休 15-30 分钟可以提高下午的工作效率',
];

/**
 * 健康管家智能体
 */
export class HealthButlerAgent extends BaseAgent {
  readonly metadata = HEALTH_BUTLER_METADATA;

  /** 健康统计 */
  private stats: HealthStats;

  /** 健康设置 */
  private settings = {
    waterIntervalMs: 60 * 60 * 1000, // 1 小时
    standIntervalMs: 45 * 60 * 1000, // 45 分钟
    eyeRestIntervalMs: 30 * 60 * 1000, // 30 分钟
    sleepHour: 23, // 23:00 提醒睡觉
    dailyWaterGoal: 8, // 每日喝水目标
    enableWater: true,
    enableStand: true,
    enableEyeRest: true,
    enableSleep: true,
  };

  constructor() {
    super({
      enabled: true,
      tools: ['notify', 'get_tip'],
      maxSteps: 3,
      timeoutMs: 10000,
    });

    this.triggers = [...DEFAULT_TRIGGERS];
    this.stats = this.initStats();
  }

  /**
   * 初始化统计数据
   */
  private initStats(): HealthStats {
    const today = new Date().toDateString();
    return {
      waterCount: 0,
      standCount: 0,
      eyeRestCount: 0,
      screenTimeMinutes: 0,
      lastWaterTime: 0,
      lastStandTime: 0,
      lastEyeRestTime: 0,
      date: today,
    };
  }

  /**
   * 检查并重置每日统计
   */
  private checkAndResetDailyStats(): void {
    const today = new Date().toDateString();
    if (this.stats.date !== today) {
      this.stats = this.initStats();
    }
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
        type: 'bubble',
        title: (args.title as string) || '健康提醒',
        body: args.message as string,
        sound: true,
      });
    });

    // 获取健康建议
    this.registerTool('get_tip', async () => {
      const tip = HEALTH_TIPS[Math.floor(Math.random() * HEALTH_TIPS.length)];
      return { success: true, data: tip };
    });
  }

  /**
   * 检查是否应该触发
   */
  async shouldTrigger(context: AgentContext): Promise<boolean> {
    const { triggerId, userMessage } = context;

    // 用户消息触发
    if (context.triggerSource === 'user_message' && userMessage) {
      return true;
    }

    // 定时触发检查
    if (triggerId === 'trigger-water-reminder') {
      return this.settings.enableWater && this.shouldRemindWater();
    }

    if (triggerId === 'trigger-stand-reminder') {
      return this.settings.enableStand && this.shouldRemindStand();
    }

    if (triggerId === 'trigger-eye-rest-reminder') {
      return this.settings.enableEyeRest && this.shouldRemindEyeRest();
    }

    if (triggerId === 'trigger-sleep-reminder') {
      return this.settings.enableSleep && this.isSleepTime();
    }

    return true;
  }

  /**
   * 执行健康提醒
   */
  protected async onExecute(context: AgentContext): Promise<AgentResult> {
    const { triggerId, userMessage } = context;

    this.checkAndResetDailyStats();

    // 用户消息处理
    if (context.triggerSource === 'user_message' && userMessage) {
      return this.handleUserMessage(userMessage);
    }

    // 定时提醒处理
    let reminderType: HealthReminderType;

    switch (triggerId) {
      case 'trigger-water-reminder':
        reminderType = 'water';
        break;
      case 'trigger-stand-reminder':
        reminderType = 'stand';
        break;
      case 'trigger-eye-rest-reminder':
        reminderType = 'eyes';
        break;
      case 'trigger-sleep-reminder':
        reminderType = 'sleep';
        break;
      default:
        return this.createResult(true, undefined, undefined, {
          data: { triggered: false },
        });
    }

    return this.sendReminder(reminderType);
  }

  /**
   * 处理用户消息
   */
  private async handleUserMessage(message: string): Promise<AgentResult> {
    const lowerMessage = message.toLowerCase();

    // 查询健康统计
    if (
      lowerMessage.includes('健康') &&
      (lowerMessage.includes('统计') || lowerMessage.includes('报告'))
    ) {
      return this.getHealthReport();
    }

    // 记录喝水
    if (lowerMessage.includes('喝水') || lowerMessage.includes('饮水')) {
      return this.recordWater();
    }

    // 获取健康建议
    const tipResult = await this.callTool<string>('get_tip', {});
    const tip = tipResult.data || '保持健康的生活习惯很重要哦~';

    return this.createResult(true, `💡 健康小贴士：${tip}`, undefined, {
      data: { type: 'tip' },
    });
  }

  /**
   * 发送提醒
   */
  private async sendReminder(type: HealthReminderType): Promise<AgentResult> {
    const messages = REMINDER_MESSAGES[type];
    const message = messages[Math.floor(Math.random() * messages.length)];

    // 发送通知
    await this.callTool('notify', { message });

    // 更新统计
    const now = Date.now();
    switch (type) {
      case 'water':
        this.stats.lastWaterTime = now;
        break;
      case 'stand':
        this.stats.lastStandTime = now;
        break;
      case 'eyes':
        this.stats.lastEyeRestTime = now;
        break;
    }

    return this.createResult(true, message, undefined, {
      shouldSpeak: true,
      data: { reminderType: type },
    });
  }

  /**
   * 记录喝水
   */
  private recordWater(): AgentResult {
    this.stats.waterCount++;
    this.stats.lastWaterTime = Date.now();

    const remaining = this.settings.dailyWaterGoal - this.stats.waterCount;
    let message: string;

    if (remaining <= 0) {
      message = `👏 太棒了！今天已经喝了 ${this.stats.waterCount} 杯水，完成每日目标啦！`;
    } else {
      message = `💧 好的，已记录！今天已喝 ${this.stats.waterCount} 杯水，还差 ${remaining} 杯达成目标~`;
    }

    return this.createResult(true, message, undefined, {
      shouldSpeak: true,
      data: {
        type: 'water_recorded',
        count: this.stats.waterCount,
        goal: this.settings.dailyWaterGoal,
      },
    });
  }

  /**
   * 获取健康报告
   */
  private getHealthReport(): AgentResult {
    const report = `📊 今日健康报告：

💧 喝水：${this.stats.waterCount}/${this.settings.dailyWaterGoal} 杯
🧘 站立活动：${this.stats.standCount} 次
👀 眼部休息：${this.stats.eyeRestCount} 次

${this.getHealthAdvice()}`;

    return this.createResult(true, report, undefined, {
      data: { type: 'report', stats: this.stats },
    });
  }

  /**
   * 获取健康建议
   */
  private getHealthAdvice(): string {
    const advices: string[] = [];

    if (this.stats.waterCount < this.settings.dailyWaterGoal / 2) {
      advices.push('今天喝水有点少哦，记得多补充水分~');
    }

    if (this.stats.standCount < 4) {
      advices.push('多站起来活动活动，对身体好~');
    }

    if (advices.length === 0) {
      advices.push('继续保持良好的健康习惯！💪');
    }

    return '💡 建议：' + advices.join('；');
  }

  /**
   * 判断是否需要喝水提醒
   */
  private shouldRemindWater(): boolean {
    if (this.stats.lastWaterTime === 0) return true;
    return Date.now() - this.stats.lastWaterTime >= this.settings.waterIntervalMs;
  }

  /**
   * 判断是否需要站立提醒
   */
  private shouldRemindStand(): boolean {
    if (this.stats.lastStandTime === 0) return true;
    return Date.now() - this.stats.lastStandTime >= this.settings.standIntervalMs;
  }

  /**
   * 判断是否需要眼休息提醒
   */
  private shouldRemindEyeRest(): boolean {
    if (this.stats.lastEyeRestTime === 0) return true;
    return Date.now() - this.stats.lastEyeRestTime >= this.settings.eyeRestIntervalMs;
  }

  /**
   * 判断是否到睡觉时间
   */
  private isSleepTime(): boolean {
    const hour = new Date().getHours();
    return hour >= this.settings.sleepHour || hour < 2;
  }

  /**
   * 更新设置
   */
  updateSettings(settings: Partial<typeof this.settings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  /**
   * 获取当前统计
   */
  getStats(): HealthStats {
    this.checkAndResetDailyStats();
    return { ...this.stats };
  }

  /**
   * 记录站立
   */
  recordStand(): void {
    this.stats.standCount++;
    this.stats.lastStandTime = Date.now();
  }

  /**
   * 记录眼休息
   */
  recordEyeRest(): void {
    this.stats.eyeRestCount++;
    this.stats.lastEyeRestTime = Date.now();
  }
}
