/**
 * 成就解锁智能体
 * Achievement Agent
 *
 * 游戏化激励系统：
 * - 成就检测
 * - 解锁庆祝
 * - 成就展示
 * - 目标推荐
 * - 稀有成就
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
 * 成就智能体元数据
 */
const ACHIEVEMENT_METADATA: AgentMetadata = {
  id: 'agent-achievement',
  name: '成就解锁智能体',
  description: '游戏化激励，增强用户粘性',
  version: '1.0.0',
  icon: '🏆',
  category: 'entertainment',
  priority: 'low',
  isSystem: false,
};

/**
 * 成就稀有度
 */
type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

/**
 * 成就分类
 */
type AchievementCategory =
  | 'interaction' // 互动相关
  | 'care' // 养成相关
  | 'wellness' // 健康相关
  | 'exploration' // 探索相关
  | 'special'; // 特殊成就

/**
 * 成就定义
 */
interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  condition: AchievementCondition;
  reward?: {
    coins?: number;
    experience?: number;
    title?: string;
  };
  hidden?: boolean; // 隐藏成就
}

/**
 * 成就条件
 */
interface AchievementCondition {
  type: 'count' | 'streak' | 'total' | 'special';
  metric: string;
  target: number;
}

/**
 * 已解锁成就
 */
interface UnlockedAchievement {
  id: string;
  unlockedAt: number;
  progress: number;
}

/**
 * 成就进度
 */
interface AchievementProgress {
  achievementId: string;
  current: number;
  target: number;
  percentage: number;
}

/**
 * 默认触发器
 */
const DEFAULT_TRIGGERS: AgentTrigger[] = [
  // 事件触发
  {
    id: 'trigger-check-achievement',
    type: 'event',
    config: {
      eventName: 'user_action',
    },
    enabled: true,
    description: '用户行为触发成就检测',
  },
  // 查看成就关键词
  {
    id: 'trigger-achievement-keywords',
    type: 'user_message',
    config: {
      keywords: ['成就', '奖杯', '解锁', '徽章', '称号'],
    },
    enabled: true,
    description: '成就相关查询',
  },
];

/**
 * 成就定义列表
 */
const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // 互动成就
  {
    id: 'first_chat',
    name: '初次见面',
    description: '与宠物进行第一次对话',
    icon: '👋',
    category: 'interaction',
    rarity: 'common',
    condition: { type: 'count', metric: 'chat_count', target: 1 },
    reward: { coins: 10 },
  },
  {
    id: 'chat_10',
    name: '话匣子',
    description: '累计对话 10 次',
    icon: '💬',
    category: 'interaction',
    rarity: 'common',
    condition: { type: 'count', metric: 'chat_count', target: 10 },
    reward: { coins: 20 },
  },
  {
    id: 'chat_100',
    name: '老朋友',
    description: '累计对话 100 次',
    icon: '🤝',
    category: 'interaction',
    rarity: 'rare',
    condition: { type: 'count', metric: 'chat_count', target: 100 },
    reward: { coins: 100, title: '老朋友' },
  },
  {
    id: 'chat_1000',
    name: '灵魂伴侣',
    description: '累计对话 1000 次',
    icon: '💕',
    category: 'interaction',
    rarity: 'legendary',
    condition: { type: 'count', metric: 'chat_count', target: 1000 },
    reward: { coins: 500, title: '灵魂伴侣' },
  },

  // 养成成就
  {
    id: 'intimacy_50',
    name: '知心好友',
    description: '亲密度达到 50',
    icon: '💛',
    category: 'care',
    rarity: 'common',
    condition: { type: 'total', metric: 'intimacy', target: 50 },
    reward: { coins: 30 },
  },
  {
    id: 'intimacy_100',
    name: '形影不离',
    description: '亲密度达到 100',
    icon: '❤️',
    category: 'care',
    rarity: 'epic',
    condition: { type: 'total', metric: 'intimacy', target: 100 },
    reward: { coins: 200, title: '挚友' },
  },
  {
    id: 'feed_10',
    name: '小小美食家',
    description: '喂食 10 次',
    icon: '🍎',
    category: 'care',
    rarity: 'common',
    condition: { type: 'count', metric: 'feed_count', target: 10 },
    reward: { coins: 15 },
  },
  {
    id: 'play_10',
    name: '玩伴',
    description: '玩耍 10 次',
    icon: '🎮',
    category: 'care',
    rarity: 'common',
    condition: { type: 'count', metric: 'play_count', target: 10 },
    reward: { coins: 15 },
  },

  // 健康成就
  {
    id: 'meditation_7',
    name: '冥想新手',
    description: '连续 7 天冥想',
    icon: '🧘',
    category: 'wellness',
    rarity: 'rare',
    condition: { type: 'streak', metric: 'meditation_days', target: 7 },
    reward: { coins: 50 },
  },
  {
    id: 'water_goal_7',
    name: '水润达人',
    description: '连续 7 天完成喝水目标',
    icon: '💧',
    category: 'wellness',
    rarity: 'rare',
    condition: { type: 'streak', metric: 'water_goal_days', target: 7 },
    reward: { coins: 50 },
  },

  // 探索成就
  {
    id: 'use_agent_5',
    name: '探索者',
    description: '使用 5 种不同的智能体',
    icon: '🔍',
    category: 'exploration',
    rarity: 'common',
    condition: { type: 'count', metric: 'agent_types_used', target: 5 },
    reward: { coins: 30 },
  },
  {
    id: 'story_10',
    name: '故事收藏家',
    description: '收藏 10 个睡前故事',
    icon: '📚',
    category: 'exploration',
    rarity: 'rare',
    condition: { type: 'count', metric: 'story_favorites', target: 10 },
    reward: { coins: 60 },
  },

  // 特殊成就
  {
    id: 'night_owl',
    name: '夜猫子',
    description: '凌晨 3 点还在与宠物聊天',
    icon: '🦉',
    category: 'special',
    rarity: 'rare',
    condition: { type: 'special', metric: 'late_night_chat', target: 1 },
    reward: { coins: 30 },
    hidden: true,
  },
  {
    id: 'early_bird',
    name: '早起的鸟儿',
    description: '早上 5 点与宠物问好',
    icon: '🐦',
    category: 'special',
    rarity: 'rare',
    condition: { type: 'special', metric: 'early_morning_chat', target: 1 },
    reward: { coins: 30 },
    hidden: true,
  },
  {
    id: 'birthday',
    name: '生日快乐',
    description: '在宠物生日当天互动',
    icon: '🎂',
    category: 'special',
    rarity: 'epic',
    condition: { type: 'special', metric: 'birthday_interaction', target: 1 },
    reward: { coins: 100 },
    hidden: true,
  },
];

/**
 * 成就解锁智能体
 */
export class AchievementAgent extends BaseAgent {
  readonly metadata = ACHIEVEMENT_METADATA;

  /** 已解锁成就 */
  private unlockedAchievements: Map<string, UnlockedAchievement> = new Map();

  /** 用户指标 */
  private metrics: Map<string, number> = new Map();

  /** 最近解锁的成就 */
  private recentUnlocks: UnlockedAchievement[] = [];

  constructor() {
    super({
      enabled: true,
      tools: ['notify', 'celebrate'],
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
    this.registerTool('notify', async (args) => {
      return notificationTool.send({
        type: 'toast',
        title: (args.title as string) || '🏆 成就解锁！',
        body: args.message as string,
        sound: true,
      });
    });

    this.registerTool('celebrate', async (args) => {
      // 触发庆祝动画事件
      const event = new CustomEvent('achievement-unlocked', {
        detail: {
          achievementId: args.achievementId,
          name: args.name,
          icon: args.icon,
        },
      });
      window.dispatchEvent(event);
      return { success: true };
    });
  }

  /**
   * 检查是否应该触发
   */
  async shouldTrigger(context: AgentContext): Promise<boolean> {
    return (
      context.triggerSource === 'event' ||
      (context.triggerSource === 'user_message' && !!context.userMessage)
    );
  }

  /**
   * 执行成就检测
   */
  protected async onExecute(context: AgentContext): Promise<AgentResult> {
    const { triggerSource, userMessage, metadata } = context;

    // 事件触发 - 检测成就
    if (triggerSource === 'event' && metadata) {
      return this.checkAchievements(metadata);
    }

    // 用户消息 - 成就查询
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

    // 查看所有成就
    if (
      lowerMessage.includes('所有') ||
      lowerMessage.includes('全部') ||
      lowerMessage.includes('列表')
    ) {
      return this.showAllAchievements();
    }

    // 查看进度
    if (lowerMessage.includes('进度')) {
      return this.showProgress();
    }

    // 默认：展示已解锁成就
    return this.showUnlockedAchievements();
  }

  /**
   * 检测成就
   */
  private async checkAchievements(
    metadata: Record<string, unknown>
  ): Promise<AgentResult> {
    const actionType = metadata.actionType as string;
    const value = metadata.value as number | undefined;

    // 更新指标
    this.updateMetric(actionType, value);

    // 检查所有成就
    const newUnlocks: AchievementDefinition[] = [];

    for (const def of ACHIEVEMENT_DEFINITIONS) {
      // 已解锁跳过
      if (this.unlockedAchievements.has(def.id)) {
        continue;
      }

      // 检查条件
      if (this.checkCondition(def.condition)) {
        // 解锁成就
        const unlock: UnlockedAchievement = {
          id: def.id,
          unlockedAt: Date.now(),
          progress: def.condition.target,
        };

        this.unlockedAchievements.set(def.id, unlock);
        this.recentUnlocks.push(unlock);
        newUnlocks.push(def);
      }
    }

    // 如果有新解锁，发送通知
    if (newUnlocks.length > 0) {
      return this.celebrateUnlocks(newUnlocks);
    }

    return this.createResult(true, undefined, undefined, {
      data: { checked: true, newUnlocks: 0 },
    });
  }

  /**
   * 更新指标
   */
  private updateMetric(metricName: string, value?: number): void {
    const current = this.metrics.get(metricName) || 0;
    this.metrics.set(metricName, current + (value || 1));
  }

  /**
   * 检查条件是否满足
   */
  private checkCondition(condition: AchievementCondition): boolean {
    const current = this.metrics.get(condition.metric) || 0;

    switch (condition.type) {
      case 'count':
      case 'total':
      case 'streak':
        return current >= condition.target;
      case 'special':
        return current >= condition.target;
      default:
        return false;
    }
  }

  /**
   * 庆祝解锁
   */
  private async celebrateUnlocks(
    achievements: AchievementDefinition[]
  ): Promise<AgentResult> {
    const messages: string[] = [];

    for (const achievement of achievements) {
      // 发送通知
      await this.callTool('notify', {
        title: '🏆 成就解锁！',
        message: `${achievement.icon} ${achievement.name}`,
      });

      // 触发庆祝
      await this.callTool('celebrate', {
        achievementId: achievement.id,
        name: achievement.name,
        icon: achievement.icon,
      });

      // 构建消息
      let msg = `🎉 恭喜解锁成就：${achievement.icon} ${achievement.name}！\n${achievement.description}`;

      if (achievement.reward) {
        const rewards: string[] = [];
        if (achievement.reward.coins) {
          rewards.push(`${achievement.reward.coins} 金币`);
        }
        if (achievement.reward.title) {
          rewards.push(`「${achievement.reward.title}」称号`);
        }
        msg += `\n🎁 获得奖励：${rewards.join('、')}`;
      }

      messages.push(msg);
    }

    return this.createResult(true, messages.join('\n\n'), undefined, {
      shouldSpeak: true,
      emotion: 'happy',
      data: {
        type: 'unlock',
        count: achievements.length,
        achievements: achievements.map((a) => a.id),
      },
    });
  }

  /**
   * 显示已解锁成就
   */
  private showUnlockedAchievements(): AgentResult {
    const unlocked = Array.from(this.unlockedAchievements.values());
    const count = unlocked.length;
    const total = ACHIEVEMENT_DEFINITIONS.filter((d) => !d.hidden).length;

    if (count === 0) {
      return this.createResult(
        true,
        '你还没有解锁任何成就，继续努力吧！💪',
        undefined,
        { data: { type: 'list', count: 0 } }
      );
    }

    // 获取成就详情
    const achievementList = unlocked
      .slice(-10)
      .map((u) => {
        const def = ACHIEVEMENT_DEFINITIONS.find((d) => d.id === u.id);
        if (!def) return null;
        const time = new Date(u.unlockedAt).toLocaleDateString('zh-CN');
        return `${def.icon} ${def.name} (${time})`;
      })
      .filter(Boolean)
      .join('\n');

    const message = `🏆 你的成就（${count}/${total}）

${achievementList}

${this.getEncouragement(count, total)}`;

    return this.createResult(true, message, undefined, {
      data: { type: 'list', count, total },
    });
  }

  /**
   * 显示所有成就
   */
  private showAllAchievements(): AgentResult {
    const categories: Record<AchievementCategory, string> = {
      interaction: '💬 互动成就',
      care: '❤️ 养成成就',
      wellness: '💪 健康成就',
      exploration: '🔍 探索成就',
      special: '✨ 特殊成就',
    };

    const sections: string[] = [];

    for (const [category, title] of Object.entries(categories)) {
      const achievements = ACHIEVEMENT_DEFINITIONS.filter(
        (d) => d.category === category && !d.hidden
      );

      const list = achievements
        .map((a) => {
          const unlocked = this.unlockedAchievements.has(a.id);
          const status = unlocked ? '✅' : '🔒';
          return `  ${status} ${a.icon} ${a.name}`;
        })
        .join('\n');

      sections.push(`${title}\n${list}`);
    }

    const message = `🏆 成就大全\n\n${sections.join('\n\n')}`;

    return this.createResult(true, message, undefined, {
      data: { type: 'all' },
    });
  }

  /**
   * 显示进度
   */
  private showProgress(): AgentResult {
    // 找出进度最高的未解锁成就
    const progressList: AchievementProgress[] = [];

    for (const def of ACHIEVEMENT_DEFINITIONS) {
      if (this.unlockedAchievements.has(def.id) || def.hidden) {
        continue;
      }

      const current = this.metrics.get(def.condition.metric) || 0;
      const target = def.condition.target;
      const percentage = Math.min(100, Math.round((current / target) * 100));

      progressList.push({
        achievementId: def.id,
        current,
        target,
        percentage,
      });
    }

    // 按进度排序
    progressList.sort((a, b) => b.percentage - a.percentage);

    // 取前 5 个
    const topProgress = progressList.slice(0, 5);

    if (topProgress.length === 0) {
      return this.createResult(
        true,
        '🎉 太厉害了！你已经解锁了所有可见成就！',
        undefined,
        { data: { type: 'progress' } }
      );
    }

    const list = topProgress
      .map((p) => {
        const def = ACHIEVEMENT_DEFINITIONS.find(
          (d) => d.id === p.achievementId
        )!;
        const bar = this.createProgressBar(p.percentage);
        return `${def.icon} ${def.name}\n  ${bar} ${p.current}/${p.target} (${p.percentage}%)`;
      })
      .join('\n\n');

    const message = `📊 成就进度（最接近解锁的 5 个）：

${list}

继续加油，下一个成就就快解锁了！💪`;

    return this.createResult(true, message, undefined, {
      data: { type: 'progress', list: topProgress },
    });
  }

  /**
   * 创建进度条
   */
  private createProgressBar(percentage: number): string {
    const filled = Math.round(percentage / 10);
    const empty = 10 - filled;
    return '▓'.repeat(filled) + '░'.repeat(empty);
  }

  /**
   * 获取鼓励语
   */
  private getEncouragement(count: number, total: number): string {
    const percentage = Math.round((count / total) * 100);

    if (percentage >= 100) {
      return '🎊 太厉害了！你已经收集了所有成就！';
    }
    if (percentage >= 80) {
      return '⭐ 即将集齐所有成就，继续加油！';
    }
    if (percentage >= 50) {
      return '🌟 已经收集了一半以上，继续探索吧！';
    }
    if (percentage >= 20) {
      return '💫 还有很多成就等待你去解锁！';
    }
    return '🌱 成就收集之旅才刚刚开始~';
  }

  /**
   * 手动触发指标更新
   */
  triggerMetric(metric: string, value?: number): void {
    this.updateMetric(metric, value);
  }

  /**
   * 获取成就统计
   */
  getStats(): {
    unlocked: number;
    total: number;
    byCategory: Record<AchievementCategory, { unlocked: number; total: number }>;
  } {
    const byCategory: Record<
      AchievementCategory,
      { unlocked: number; total: number }
    > = {
      interaction: { unlocked: 0, total: 0 },
      care: { unlocked: 0, total: 0 },
      wellness: { unlocked: 0, total: 0 },
      exploration: { unlocked: 0, total: 0 },
      special: { unlocked: 0, total: 0 },
    };

    for (const def of ACHIEVEMENT_DEFINITIONS) {
      if (!def.hidden) {
        byCategory[def.category].total++;
        if (this.unlockedAchievements.has(def.id)) {
          byCategory[def.category].unlocked++;
        }
      }
    }

    const total = ACHIEVEMENT_DEFINITIONS.filter((d) => !d.hidden).length;
    const unlocked = this.unlockedAchievements.size;

    return { unlocked, total, byCategory };
  }
}
