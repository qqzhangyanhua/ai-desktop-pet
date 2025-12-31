// @ts-nocheck
/**
 * 每日总结智能体
 * Daily Summary Agent
 *
 * 回顾一天，帮助用户反思和成长：
 * - 互动统计
 * - 情绪回顾
 * - 成长进度
 * - 明日建议
 * - 总结报告
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
import { notificationTool } from '../tools/notification-tool';
import { emotionTool } from '../tools/emotion-tool';
import { scheduleTool } from '../tools/schedule-tool';

/**
 * 每日总结智能体元数据
 */
const DAILY_SUMMARY_METADATA: AgentMetadata = {
  id: 'agent-daily-summary',
  name: '每日总结智能体',
  description: '回顾一天，帮助用户反思和成长',
  version: '1.0.0',
  icon: '📊',
  category: 'productivity',
  priority: 'normal',
  isSystem: false,
};

/**
 * 每日统计数据
 */
interface DailyStats {
  date: string;
  /** 对话次数 */
  chatCount: number;
  /** 互动类型分布 */
  interactionTypes: Record<string, number>;
  /** 情绪记录 */
  emotions: EmotionRecord[];
  /** 主导情绪 */
  dominantEmotion: EmotionType;
  /** 情绪分数 (0-100) */
  emotionScore: number;
  /** 亲密度变化 */
  intimacyChange: number;
  /** 完成的任务数 */
  tasksCompleted: number;
  /** 解锁的成就 */
  achievementsUnlocked: string[];
  /** 使用时长（分钟） */
  usageMinutes: number;
}

/**
 * 总结报告
 */
interface SummaryReport {
  date: string;
  greeting: string;
  statsSection: string;
  emotionSection: string;
  achievementSection: string;
  tomorrowSection: string;
  closingWords: string;
}

/**
 * 默认触发器
 */
const DEFAULT_TRIGGERS: AgentTrigger[] = [
  // 每晚定时触发
  {
    id: 'trigger-evening-summary',
    type: 'condition',
    config: {
      expression: 'evening_summary',
      checkIntervalMs: 30 * 60 * 1000, // 30 分钟
      cooldownMs: 12 * 60 * 60 * 1000, // 12 小时
    },
    enabled: true,
    description: '每晚定时推送日总结',
  },
  // 用户主动查询
  {
    id: 'trigger-summary-keywords',
    type: 'user_message',
    config: {
      keywords: [
        '总结', '回顾', '今天', '统计',
        '报告', '日报', '今日',
      ],
    },
    enabled: true,
    description: '总结相关查询',
  },
];

/**
 * 情绪评价模板
 */
const EMOTION_COMMENTS: Record<EmotionType, string[]> = {
  happy: [
    '今天心情很不错呀，开心的一天！',
    '感受到了你的好心情，希望每天都这么开心~',
    '满满的正能量，继续保持！',
  ],
  sad: [
    '今天似乎有些低落，明天会更好的！',
    '不开心的日子也会过去的，我陪着你~',
    '有什么烦恼都可以告诉我哦',
  ],
  anxious: [
    '感觉你今天有些焦虑，记得放松一下',
    '压力大的时候试试深呼吸~',
    '别太紧张，一切都会好起来的',
  ],
  excited: [
    '今天充满活力呀！发生了什么好事吗？',
    '能感受到你的兴奋，真棒！',
    '激动人心的一天！',
  ],
  calm: [
    '平静的一天，这样很好~',
    '心如止水，难得的平静',
    '保持这份淡定，很棒！',
  ],
  angry: [
    '今天好像有些生气，深呼吸，慢慢来~',
    '希望明天会更顺利',
    '有什么不开心的事可以说出来',
  ],
  confused: [
    '今天有些迷茫？慢慢理清思路吧',
    '困惑的时候休息一下，明天再想',
    '没关系，想不明白的事睡一觉就好了',
  ],
  neutral: [
    '平淡的一天，也是一种幸福~',
    '没有太多波澜，平平安安就好',
    '普普通通的一天，但也很珍贵',
  ],
};

/**
 * 每日总结智能体
 */
export class DailySummaryAgent extends BaseAgent {
  readonly metadata = DAILY_SUMMARY_METADATA;

  /** 今日统计 */
  private todayStats: DailyStats;

  /** 历史报告 */
  private historyReports: SummaryReport[] = [];

  /** 设置 */
  private settings = {
    summaryHour: 22, // 晚上 10 点
    enableAutoSummary: true,
    includeEmotionChart: true,
    includeTomorrowTips: true,
  };

  constructor() {
    super({
      enabled: true,
      tools: ['get_emotions', 'get_schedules', 'notify'],
      maxSteps: 5,
      timeoutMs: 15000,
    });

    this.triggers = [...DEFAULT_TRIGGERS];
    this.todayStats = this.initDailyStats();
  }

  /**
   * 初始化每日统计
   */
  private initDailyStats(): DailyStats {
    return {
      date: new Date().toDateString(),
      chatCount: 0,
      interactionTypes: {},
      emotions: [],
      dominantEmotion: 'neutral',
      emotionScore: 50,
      intimacyChange: 0,
      tasksCompleted: 0,
      achievementsUnlocked: [],
      usageMinutes: 0,
    };
  }

  /**
   * 检查并重置每日统计
   */
  private checkAndResetDailyStats(): void {
    const today = new Date().toDateString();
    if (this.todayStats.date !== today) {
      this.todayStats = this.initDailyStats();
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
    this.registerTool('get_emotions', async (args) => {
      return emotionTool.getTrend({
        periodHours: (args.hours as number) || 24,
      });
    });

    this.registerTool('get_schedules', async () => {
      return scheduleTool.getToday();
    });

    this.registerTool('notify', async (args) => {
      return notificationTool.send({
        type: 'bubble',
        title: (args.title as string) || '📊 每日总结',
        body: args.message as string,
      });
    });
  }

  /**
   * 检查是否应该触发
   */
  async shouldTrigger(context: AgentContext): Promise<boolean> {
    const { triggerId, userMessage } = context;

    if (triggerId === 'trigger-evening-summary') {
      return this.settings.enableAutoSummary && this.isSummaryTime();
    }

    return !!userMessage;
  }

  /**
   * 执行每日总结
   */
  protected async onExecute(context: AgentContext): Promise<AgentResult> {
    const { triggerId, userMessage } = context;

    this.checkAndResetDailyStats();

    // 定时总结
    if (triggerId === 'trigger-evening-summary') {
      return this.generateDailySummary(context);
    }

    // 用户查询
    if (userMessage) {
      return this.handleUserMessage(userMessage);
    }

    return this.createResult(false, '无法处理请求');
  }

  /**
   * 处理用户消息
   */
  private async handleUserMessage(message: string): Promise<AgentResult> {
    const lowerMessage = message.toLowerCase();

    // 查看历史报告
    if (lowerMessage.includes('历史') || lowerMessage.includes('之前')) {
      return this.showHistoryReports();
    }

    // 生成今日总结
    return this.generateDailySummary();
  }

  /**
   * 生成每日总结
   */
  private async generateDailySummary(
    context?: AgentContext
  ): Promise<AgentResult> {
    // 获取情绪趋势
    const emotionResult = await this.callTool<{
      dominantEmotion: EmotionType;
      averageIntensity: number;
      distribution: Record<EmotionType, number>;
    }>('get_emotions', { hours: 24 });

    // 获取今日日程
    const scheduleResult = await this.callTool<Array<{
      title: string;
      completed: boolean;
    }>>('get_schedules', {});

    // 更新统计
    if (emotionResult.data) {
      this.todayStats.dominantEmotion = emotionResult.data.dominantEmotion;
      this.todayStats.emotionScore = Math.round(
        emotionResult.data.averageIntensity * 10
      );
    }

    // 生成报告
    const report = this.buildReport(
      this.todayStats,
      emotionResult.data,
      scheduleResult.data,
      context?.currentPetStatus
    );

    // 保存报告
    this.historyReports.push(report);
    if (this.historyReports.length > 30) {
      this.historyReports.shift();
    }

    const fullReport = this.formatReport(report);

    // 发送通知
    await this.callTool('notify', {
      title: '📊 今日总结',
      message: '点击查看今日回顾~',
    });

    return this.createResult(true, fullReport, undefined, {
      shouldSpeak: false,
      data: { type: 'summary', report },
    });
  }

  /**
   * 构建报告
   */
  private buildReport(
    stats: DailyStats,
    emotionData?: {
      dominantEmotion: EmotionType;
      averageIntensity: number;
      distribution: Record<EmotionType, number>;
    },
    schedules?: Array<{ title: string; completed: boolean }>,
    petStatus?: AgentContext['currentPetStatus']
  ): SummaryReport {
    const now = new Date();
    const greeting = this.getGreeting();

    // 统计部分
    const statsSection = this.buildStatsSection(stats, schedules);

    // 情绪部分
    const emotionSection = this.buildEmotionSection(emotionData);

    // 成就部分
    const achievementSection = this.buildAchievementSection(stats, petStatus);

    // 明日建议
    const tomorrowSection = this.buildTomorrowSection(emotionData);

    // 结语
    const closingWords = this.getClosingWords();

    return {
      date: now.toLocaleDateString('zh-CN'),
      greeting,
      statsSection,
      emotionSection,
      achievementSection,
      tomorrowSection,
      closingWords,
    };
  }

  /**
   * 构建统计部分
   */
  private buildStatsSection(
    stats: DailyStats,
    schedules?: Array<{ title: string; completed: boolean }>
  ): string {
    const completedTasks = schedules?.filter((s) => s.completed).length || 0;
    const totalTasks = schedules?.length || 0;

    return `📈 今日数据：
• 对话次数：${stats.chatCount} 次
• 互动时长：约 ${stats.usageMinutes} 分钟
• 任务完成：${completedTasks}/${totalTasks}`;
  }

  /**
   * 构建情绪部分
   */
  private buildEmotionSection(emotionData?: {
    dominantEmotion: EmotionType;
    averageIntensity: number;
    distribution: Record<EmotionType, number>;
  }): string {
    if (!emotionData) {
      return '💭 今天还没有记录到情绪数据~';
    }

    const emotion = emotionData.dominantEmotion;
    const comments = EMOTION_COMMENTS[emotion];
    const comment = comments[Math.floor(Math.random() * comments.length)];

    const emotionEmoji = this.getEmotionEmoji(emotion);
    const emotionName = this.getEmotionName(emotion);

    // 情绪分布图（简化版）
    let distribution = '';
    if (this.settings.includeEmotionChart) {
      const sorted = Object.entries(emotionData.distribution)
        .filter(([_, v]) => v > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      if (sorted.length > 0) {
        distribution =
          '\n情绪分布：\n' +
          sorted
            .map(
              ([e, v]) =>
                `  ${this.getEmotionEmoji(e as EmotionType)} ${Math.round(v * 100)}%`
            )
            .join('\n');
      }
    }

    return `💭 情绪回顾：
主要情绪：${emotionEmoji} ${emotionName}
情绪分数：${Math.round(emotionData.averageIntensity * 10)}/100
${comment}${distribution}`;
  }

  /**
   * 构建成就部分
   */
  private buildAchievementSection(
    stats: DailyStats,
    petStatus?: AgentContext['currentPetStatus']
  ): string {
    const lines: string[] = [];

    // 亲密度变化
    if (petStatus) {
      lines.push(`❤️ 当前亲密度：${petStatus.intimacy}`);
      if (stats.intimacyChange > 0) {
        lines.push(`  ↑ 今日增长 ${stats.intimacyChange}`);
      }
    }

    // 解锁的成就
    if (stats.achievementsUnlocked.length > 0) {
      lines.push(
        `🏆 今日成就：${stats.achievementsUnlocked.length} 个`
      );
    }

    return lines.length > 0
      ? '🎯 成长进度：\n' + lines.join('\n')
      : '🎯 继续努力，明天会解锁更多成就！';
  }

  /**
   * 构建明日建议
   */
  private buildTomorrowSection(emotionData?: {
    dominantEmotion: EmotionType;
  }): string {
    if (!this.settings.includeTomorrowTips) {
      return '';
    }

    const tips: string[] = [];

    if (emotionData) {
      const emotion = emotionData.dominantEmotion;
      if (['sad', 'anxious', 'angry'].includes(emotion)) {
        tips.push('• 明天试试冥想或深呼吸，放松一下');
      }
      if (emotion === 'happy' || emotion === 'excited') {
        tips.push('• 继续保持好心情！');
      }
    }

    tips.push('• 记得多喝水，保持健康');
    tips.push('• 每小时起来活动一下');

    return `\n💡 明日小贴士：\n${tips.slice(0, 3).join('\n')}`;
  }

  /**
   * 格式化报告
   */
  private formatReport(report: SummaryReport): string {
    return `📊 ${report.date} 每日总结

${report.greeting}

---

${report.statsSection}

---

${report.emotionSection}

---

${report.achievementSection}
${report.tomorrowSection}

---

${report.closingWords}`;
  }

  /**
   * 显示历史报告
   */
  private showHistoryReports(): AgentResult {
    if (this.historyReports.length === 0) {
      return this.createResult(
        true,
        '还没有历史报告哦，今晚我会给你生成第一份总结~'
      );
    }

    const recent = this.historyReports.slice(-5).reverse();
    const list = recent
      .map((r) => `📅 ${r.date}`)
      .join('\n');

    const message = `📚 最近的总结报告：

${list}

共有 ${this.historyReports.length} 份历史报告`;

    return this.createResult(true, message, undefined, {
      data: { type: 'history', count: this.historyReports.length },
    });
  }

  /**
   * 获取问候语
   */
  private getGreeting(): string {
    const hour = new Date().getHours();
    if (hour >= 22 || hour < 5) {
      return '🌙 夜深了，来看看今天的收获吧~';
    }
    if (hour < 12) {
      return '☀️ 早上好！来回顾一下昨天吧~';
    }
    return '🌤️ 来看看今天到目前的总结~';
  }

  /**
   * 获取结语
   */
  private getClosingWords(): string {
    const words = [
      '今天辛苦了，好好休息吧 💤',
      '感谢今天的陪伴，晚安 🌙',
      '明天又是新的一天，加油！✨',
      '无论今天怎样，明天都是新的开始 🌈',
      '期待明天继续和你一起成长 🌱',
    ];
    return words[Math.floor(Math.random() * words.length)];
  }

  /**
   * 获取情绪表情
   */
  private getEmotionEmoji(emotion: EmotionType): string {
    const emojis: Record<EmotionType, string> = {
      happy: '😊',
      sad: '😢',
      anxious: '😰',
      excited: '🤩',
      calm: '😌',
      angry: '😠',
      confused: '😕',
      neutral: '😐',
    };
    return emojis[emotion];
  }

  /**
   * 获取情绪名称
   */
  private getEmotionName(emotion: EmotionType): string {
    const names: Record<EmotionType, string> = {
      happy: '开心',
      sad: '难过',
      anxious: '焦虑',
      excited: '兴奋',
      calm: '平静',
      angry: '生气',
      confused: '困惑',
      neutral: '平静',
    };
    return names[emotion];
  }

  /**
   * 判断是否是总结时间
   */
  private isSummaryTime(): boolean {
    const hour = new Date().getHours();
    return hour === this.settings.summaryHour;
  }

  /**
   * 记录对话
   */
  recordChat(): void {
    this.checkAndResetDailyStats();
    this.todayStats.chatCount++;
  }

  /**
   * 记录互动
   */
  recordInteraction(type: string): void {
    this.checkAndResetDailyStats();
    this.todayStats.interactionTypes[type] =
      (this.todayStats.interactionTypes[type] || 0) + 1;
  }

  /**
   * 记录亲密度变化
   */
  recordIntimacyChange(change: number): void {
    this.checkAndResetDailyStats();
    this.todayStats.intimacyChange += change;
  }

  /**
   * 记录成就解锁
   */
  recordAchievement(achievementId: string): void {
    this.checkAndResetDailyStats();
    this.todayStats.achievementsUnlocked.push(achievementId);
  }

  /**
   * 记录使用时长
   */
  recordUsage(minutes: number): void {
    this.checkAndResetDailyStats();
    this.todayStats.usageMinutes += minutes;
  }

  /**
   * 更新设置
   */
  updateSettings(settings: Partial<typeof this.settings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  /**
   * 获取今日统计
   */
  getTodayStats(): DailyStats {
    this.checkAndResetDailyStats();
    return { ...this.todayStats };
  }
}
