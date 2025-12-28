/**
 * 经济系统类型定义
 * Economy System Type Definitions
 */

/**
 * 金币来源类型
 * Coin source types for tracking
 */
export type CoinSource =
  | 'interaction'      // 互动奖励
  | 'auto_work'        // 自动打工
  | 'achievement'      // 成就奖励
  | 'daily_bonus'      // 每日签到
  | 'gift';            // 礼物/特殊奖励

/**
 * 经验来源类型
 * Experience source types
 */
export type ExperienceSource =
  | 'interaction'      // 互动获得
  | 'auto_work'        // 自动打工
  | 'achievement'      // 成就获得
  | 'level_up';        // 升级奖励

/**
 * 金币变化记录
 * Coin change record for history tracking
 */
export interface CoinTransaction {
  /** 变化数量（正数为增加，负数为减少） */
  amount: number;

  /** 来源类型 */
  source: CoinSource;

  /** 来源描述（如"自动打工 - 2小时"） */
  description: string;

  /** 时间戳 */
  timestamp: number;
}

/**
 * 经验变化记录
 */
export interface ExperienceTransaction {
  /** 变化数量 */
  amount: number;

  /** 来源类型 */
  source: ExperienceSource;

  /** 来源描述 */
  description: string;

  /** 时间戳 */
  timestamp: number;
}

/**
 * 等级计算配置
 * Level calculation config
 */
export interface LevelConfig {
  /** 升级所需经验基数 */
  baseExp: number;

  /** 每级递增系数 */
  growthFactor: number;

  /** 最大等级 */
  maxLevel: number;
}

/**
 * 等级信息
 */
export interface LevelInfo {
  /** 当前等级 (1-max) */
  level: number;

  /** 当前等级经验 */
  currentExp: number;

  /** 升级所需经验 */
  requiredExp: number;

  /** 升级进度 (0-1) */
  progress: number;

  /** 是否已达到最高等级 */
  isMaxLevel: boolean;
}
