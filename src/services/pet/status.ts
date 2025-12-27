/**
 * Pet Status Calculation Service
 * 宠物状态计算服务
 *
 * 实现属性衰减、边界检查等核心逻辑
 * 基于时间差计算，而非定时器轮询（Linus原则）
 */

import type { PetStatus, DecayConfig } from '@/types';

/**
 * Default decay configuration
 * 默认衰减配置
 */
const DEFAULT_DECAY_CONFIG: DecayConfig = {
  moodPerHour: 2,
  energyPerHour: 1.5,
  maxMoodDecay: 50,
  maxEnergyDecay: 40,
};

/**
 * Decay calculation cache
 * 衰减计算缓存
 */
interface DecayCache {
  lastTime: number;
  currentTime: number;
  result: { mood: number; energy: number };
}

let decayCache: DecayCache | null = null;

/**
 * Cache expiry time (milliseconds)
 * 缓存过期时间（毫秒）
 */
const CACHE_EXPIRY_MS = 60000; // 1 minute

/**
 * Calculate property decay based on time elapsed
 * 基于时间差计算属性衰减
 *
 * Uses caching to avoid redundant calculations for the same timestamps
 * 使用缓存避免相同时间戳的重复计算
 *
 * @param lastTime - Last interaction timestamp (milliseconds)
 * @param currentTime - Current timestamp (milliseconds, defaults to Date.now())
 * @param config - Decay configuration
 * @returns Decay deltas for mood and energy (negative values)
 */
export function calculateDecay(
  lastTime: number,
  currentTime: number = Date.now(),
  config: DecayConfig = DEFAULT_DECAY_CONFIG
): { mood: number; energy: number } {
  // Check cache
  if (
    decayCache &&
    decayCache.lastTime === lastTime &&
    Math.abs(decayCache.currentTime - currentTime) < CACHE_EXPIRY_MS
  ) {
    return decayCache.result;
  }

  // Calculate decay
  const hoursPassed = (currentTime - lastTime) / (1000 * 60 * 60);

  const result = {
    mood: -Math.min(hoursPassed * config.moodPerHour, config.maxMoodDecay),
    energy: -Math.min(hoursPassed * config.energyPerHour, config.maxEnergyDecay),
  };

  // Update cache
  decayCache = {
    lastTime,
    currentTime,
    result,
  };

  return result;
}

/**
 * Apply decay to current status
 * 应用衰减到当前状态
 *
 * @param status - Current pet status
 * @param currentTime - Current timestamp (optional)
 * @returns New status with decay applied
 */
export function applyDecay(
  status: PetStatus,
  currentTime: number = Date.now()
): PetStatus {
  const decay = calculateDecay(status.lastInteraction, currentTime);

  return {
    ...status,
    mood: clamp(status.mood + decay.mood, 0, 100),
    energy: clamp(status.energy + decay.energy, 0, 100),
  };
}

/**
 * Clamp value within [min, max] range
 * 限制值在[min, max]范围内
 *
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Apply interaction effects to status
 * 应用互动效果到状态
 *
 * @param status - Current pet status
 * @param effects - Interaction effects (delta values)
 * @returns New status with effects applied
 */
export function applyInteractionEffects(
  status: PetStatus,
  effects: { mood?: number; energy?: number; intimacy?: number }
): PetStatus {
  return {
    ...status,
    mood: clamp((status.mood || 0) + (effects.mood || 0), 0, 100),
    energy: clamp((status.energy || 0) + (effects.energy || 0), 0, 100),
    intimacy: clamp((status.intimacy || 0) + (effects.intimacy || 0), 0, 100),
  };
}

/**
 * Check if interaction is on cooldown
 * 检查是否在冷却中
 *
 * @param lastTime - Last interaction timestamp (undefined if never interacted)
 * @param cooldownSeconds - Cooldown duration in seconds
 * @param currentTime - Current timestamp (optional)
 * @returns Cooldown status and remaining time in seconds
 */
export function checkCooldown(
  lastTime: number | null | undefined,
  cooldownSeconds: number,
  currentTime: number = Date.now()
): { onCooldown: boolean; remaining: number } {
  if (!lastTime) {
    return { onCooldown: false, remaining: 0 };
  }

  const elapsed = (currentTime - lastTime) / 1000; // Convert to seconds
  const remaining = Math.max(0, cooldownSeconds - elapsed);

  return {
    onCooldown: remaining > 0,
    remaining: Math.ceil(remaining),
  };
}

/**
 * Get mood level category
 * 获取心情等级分类
 *
 * @param mood - Mood value (0-100)
 * @returns Mood level: high (>=70) / medium (40-69) / low (0-39)
 */
export function getMoodLevel(mood: number): 'high' | 'medium' | 'low' {
  if (mood >= 70) return 'high';
  if (mood >= 40) return 'medium';
  return 'low';
}

/**
 * Get energy level category
 * 获取精力等级分类
 *
 * @param energy - Energy value (0-100)
 * @returns Energy level: high (>=70) / medium (40-69) / low (0-39)
 */
export function getEnergyLevel(energy: number): 'high' | 'medium' | 'low' {
  if (energy >= 70) return 'high';
  if (energy >= 40) return 'medium';
  return 'low';
}

/**
 * Get intimacy level category
 * 获取亲密度等级分类
 *
 * @param intimacy - Intimacy value (0-100)
 * @returns Intimacy level: high (>=70) / medium (40-69) / low (0-39)
 */
export function getIntimacyLevel(intimacy: number): 'high' | 'medium' | 'low' {
  if (intimacy >= 70) return 'high';
  if (intimacy >= 40) return 'medium';
  return 'low';
}
