/**
 * Care Rules Configuration
 * 关怀规则配置
 *
 * P1-2: Extracted from care-engine.ts (705 lines)
 * Linus原则: 配置驱动，消除硬编码
 */

import type { CareConfig } from '../types';

/**
 * 默认关怀配置
 */
export const DEFAULT_CARE_CONFIG: CareConfig = {
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
    breathing_exercise: {
      enabled: true,
      threshold: 0.6, // 压力达到0.6时推荐
      priority: 7,
    },
    bedtime_story: {
      enabled: true,
      threshold: 0.5, // 夜间时段触发
      priority: 5,
    },
    meditation_suggestion: {
      enabled: true,
      threshold: 0.7, // 持续紧张时推荐
      priority: 6,
    },
  },

  personalization: {
    learningEnabled: true,
    adaptToUserHabits: true,
    customResponses: true,
  },
};

/**
 * 获取关怀类型的优先级
 */
export function getCarePriority(
  type: keyof CareConfig['careTypes'],
  config: CareConfig = DEFAULT_CARE_CONFIG
): number {
  return config.careTypes[type].priority;
}

/**
 * 检查关怀类型是否启用
 */
export function isCareTypeEnabled(
  type: keyof CareConfig['careTypes'],
  config: CareConfig = DEFAULT_CARE_CONFIG
): boolean {
  return config.careTypes[type].enabled;
}

/**
 * 获取关怀阈值
 */
export function getCareThreshold(
  type: keyof CareConfig['careTypes'],
  config: CareConfig = DEFAULT_CARE_CONFIG
): number {
  return config.careTypes[type].threshold;
}
