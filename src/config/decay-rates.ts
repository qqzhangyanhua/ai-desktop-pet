/**
 * Decay Rates Configuration
 * 属性衰减速率配置
 *
 * Linus原则: 消除魔法数字，集中管理衰减参数
 */

import type { PetDecayConfig } from '@/types/pet-care';

/**
 * 默认衰减配置
 *
 * 说明：
 * - 每小时衰减量基于正常游戏节奏调整
 * - 饱食度衰减最快，鼓励频繁喂食互动
 * - 精力衰减中等，需要适时休息
 * - 心情衰减最慢，避免过度负面体验
 */
export const DEFAULT_DECAY_CONFIG: PetDecayConfig = {
  fullnessDecay: 8,   // 每小时减少8点 (12.5小时从100到0)
  energyDecay: 5,     // 每小时减少5点 (20小时从100到0)
  moodDecay: 3,       // 每小时减少3点 (33小时从100到0)
  maxFullnessDecay: 40,  // 单次最多减少40点
  maxEnergyDecay: 30,    // 单次最多减少30点
  maxMoodDecay: 20,      // 单次最多减少20点
};

/**
 * 快速衰减配置（测试用）
 * 用于快速验证衰减逻辑
 */
export const FAST_DECAY_CONFIG: PetDecayConfig = {
  fullnessDecay: 20,
  energyDecay: 15,
  moodDecay: 10,
  maxFullnessDecay: 50,
  maxEnergyDecay: 40,
  maxMoodDecay: 30,
};

/**
 * 慢速衰减配置（轻度玩家）
 * 降低游戏压力，适合不常在线的用户
 */
export const SLOW_DECAY_CONFIG: PetDecayConfig = {
  fullnessDecay: 4,
  energyDecay: 2,
  moodDecay: 1,
  maxFullnessDecay: 30,
  maxEnergyDecay: 20,
  maxMoodDecay: 15,
};

/**
 * 根据难度级别获取衰减配置
 * @param difficulty 难度级别
 * @returns 对应的衰减配置
 */
export function getDecayConfig(difficulty: 'easy' | 'normal' | 'hard' = 'normal'): PetDecayConfig {
  switch (difficulty) {
    case 'easy':
      return SLOW_DECAY_CONFIG;
    case 'hard':
      return FAST_DECAY_CONFIG;
    case 'normal':
    default:
      return DEFAULT_DECAY_CONFIG;
  }
}

/**
 * 衰减阈值配置
 * 定义各属性的危险阈值
 */
export const DECAY_THRESHOLDS = {
  /** 饱食度低于此值触发警告 */
  FULLNESS_WARNING: 30,
  /** 饱食度低于此值触发危险 */
  FULLNESS_CRITICAL: 10,

  /** 精力低于此值触发警告 */
  ENERGY_WARNING: 25,
  /** 精力低于此值触发危险 */
  ENERGY_CRITICAL: 10,

  /** 心情低于此值触发警告 */
  MOOD_WARNING: 30,
  /** 心情低于此值触发危险 */
  MOOD_CRITICAL: 15,

  /** 任一属性低于此值判定为生病状态 */
  SICK_THRESHOLD: 20,
} as const;
