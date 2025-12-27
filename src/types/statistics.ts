/**
 * 统计与成就类型定义
 * Statistics and Achievement Type Definitions
 *
 * 根据 PRD Phase 2 - 3.3 节定义
 */

/**
 * 每日统计数据
 * Daily statistics for pet interactions
 */
export interface DailyStats {
  /** 统计日期 (YYYY-MM-DD 格式) */
  date: string;

  /** 抚摸次数 */
  petCount: number;

  /** 喂食次数 */
  feedCount: number;

  /** 玩耍次数 */
  playCount: number;

  /** 对话次数 */
  chatCount: number;

  /** 互动总时长 (秒) */
  totalDuration: number;

  /** 当日平均心情值 */
  moodAvg: number | null;

  /** 当日平均精力值 */
  energyAvg: number | null;

  /** 创建时间戳 */
  createdAt: number;
}

/**
 * 成就类型枚举
 */
export enum AchievementType {
  INTERACTION = 'interaction', // 互动类成就
  DURATION = 'duration', // 时长类成就
  INTIMACY = 'intimacy', // 亲密度类成就
  SPECIAL = 'special', // 特殊成就
}

/**
 * 成就定义
 */
export interface Achievement {
  /** 成就 ID */
  id: string;

  /** 成就类型 */
  type: AchievementType;

  /** 成就名称 */
  name: string;

  /** 成就描述 */
  description: string;

  /** 成就图标 (emoji 或图片 URL) */
  icon: string;

  /** 解锁条件 (JSON 字符串) */
  unlockCondition: string;

  /** 是否已解锁 */
  isUnlocked: boolean;

  /** 解锁时间戳 (null 表示未解锁) */
  unlockedAt: number | null;

  /** 创建时间戳 */
  createdAt: number;
}

/**
 * 成就解锁条件类型
 */
export type AchievementCondition =
  | { type: 'total_interactions'; count: number }
  | { type: 'consecutive_days'; days: number }
  | { type: 'companion_days'; days: number }
  | { type: 'intimacy_level'; level: number }
  | { type: 'specific_interaction'; interactionType: string; count: number }
  | { type: 'custom'; check: () => boolean };

/**
 * 统计汇总数据
 * 用于 UI 展示
 */
export interface StatsSummary {
  /** 总陪伴天数 */
  totalDays: number;

  /** 总互动次数 */
  totalInteractions: number;

  /** 连续互动天数 */
  consecutiveDays: number;

  /** 今日互动统计 */
  today: {
    pet: number;
    feed: number;
    play: number;
    chat: number;
  };

  /** 本周活跃天数 */
  weeklyActiveDays: number;

  /** 已解锁成就数量 */
  unlockedAchievements: number;

  /** 总成就数量 */
  totalAchievements: number;
}

/**
 * 趋势数据点
 * 用于绘制图表
 */
export interface TrendDataPoint {
  /** 日期 (YYYY-MM-DD) */
  date: string;

  /** 数值 */
  value: number;
}
