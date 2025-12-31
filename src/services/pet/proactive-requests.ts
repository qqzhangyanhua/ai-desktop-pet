/**
 * Proactive Request Service
 * 主动请求服务
 *
 * 实现 Linus "Good Taste" 原则:
 * 1. 用数值计算紧急度，而非 if 分支堆叠
 * 2. 消除特殊情况 - 统一的触发逻辑
 * 3. 简洁的算法，易于测试
 *
 * 核心职责:
 * - 计算宠物状态的紧急度分数 (0-100)
 * - 根据紧急度生成主动请求
 * - 管理触发间隔和拒绝惩罚
 */

import type {
  ProactiveRequest,
  ProactiveRequestType,
  ProactiveRequestConfig,
  InteractionType,
} from '@/types/pet-status';
import type { PetCareStats } from '@/types';
import type { EmotionType } from '@/types';
import { getActiveExpressionPack } from './expression-pack';

/**
 * 紧急度权重配置
 * 可通过配置调整各属性对紧急度的影响
 */
interface UrgencyWeights {
  energy: number;
  satiety: number;
  boredom: number;
  mood: number;
}

const DEFAULT_URGENCY_WEIGHTS: UrgencyWeights = {
  energy: 0.4,   // 精力最重要 (影响工作状态)
  satiety: 0.3,  // 饥饿次之 (生理需求)
  boredom: 0.2,  // 无聊程度 (心理需求)
  mood: 0.1,     // 心情影响最小 (可通过其他互动恢复)
};

/**
 * 计算主动请求的紧急度分数 (0-100)
 *
 * Linus: "这是核心逻辑，必须简洁且可测试"
 *
 * @param stats - 宠物养成状态
 * @param weights - 紧急度权重配置 (可选)
 * @returns 紧急度分数，0表示无需求，100表示极度紧急
 *
 * @example
 * calculateUrgency({ energy: 10, satiety: 20, boredom: 80, mood: 50 })
 * // => ~72 (高紧急度)
 *
 * calculateUrgency({ energy: 80, satiety: 90, boredom: 20, mood: 85 })
 * // => ~15 (低紧急度)
 */
export function calculateUrgency(
  stats: PetCareStats,
  weights: UrgencyWeights = DEFAULT_URGENCY_WEIGHTS
): number {
  // 计算各属性的"缺失度" (0-100)
  // 精力低 → 缺失度高；饱食度低 → 缺失度高
  const energyDeficit = Math.max(0, 100 - stats.energy);
  const satietyDeficit = Math.max(0, 100 - stats.satiety);
  const boredomLevel = Math.max(0, stats.boredom);
  const moodDeficit = Math.max(0, 100 - stats.mood);

  // 加权求和
  const urgency =
    energyDeficit * weights.energy +
    satietyDeficit * weights.satiety +
    boredomLevel * weights.boredom +
    moodDeficit * weights.mood;

  // 限制在 [0, 100] 区间
  return Math.max(0, Math.min(100, Math.round(urgency)));
}

/**
 * 根据紧急度计算下次触发间隔 (毫秒)
 *
 * 算法:
 * 1. 基础间隔 = baseIntervalMs / (urgency / 50)
 *    - urgency = 100 → 间隔 = baseIntervalMs / 2 (最短)
 *    - urgency = 50  → 间隔 = baseIntervalMs
 *    - urgency = 25  → 间隔 = baseIntervalMs * 2
 *
 * 2. 拒绝惩罚 = penalty^declineCount
 *    - 每次拒绝，间隔乘以 penalty (默认 1.2)
 *
 * 3. 限制在 [minIntervalMs, maxIntervalMs] 区间
 *
 * @param urgency - 紧急度分数 (0-100)
 * @param config - 主动请求配置
 * @param declineCount - 连续拒绝次数
 * @returns 下次触发间隔 (毫秒)
 */
export function calculateNextInterval(
  urgency: number,
  config: ProactiveRequestConfig,
  declineCount: number
): number {
  // 避免除以零：urgency 最小为 1
  const normalizedUrgency = Math.max(1, urgency);

  // 基础间隔：紧急度越高，间隔越短
  const baseInterval = config.baseIntervalMs / (normalizedUrgency / 50);

  // 拒绝惩罚：指数增长
  const penalty = Math.pow(config.declinePenalty, declineCount);

  // 最终间隔
  const finalInterval = baseInterval * penalty;

  // 限制在配置的最小/最大区间内
  return Math.max(
    config.minIntervalMs,
    Math.min(config.maxIntervalMs, Math.round(finalInterval))
  );
}

/**
 * 根据宠物状态确定请求类型
 *
 * Linus: "消除特殊情况 - 只选最紧急的一个"
 *
 * @param stats - 宠物养成状态
 * @returns 请求类型 + 优先级分数
 */
function determineRequestType(stats: PetCareStats): {
  type: ProactiveRequestType;
  priority: number;
} {
  // 计算各类型的优先级分数 (越高越优先)
  const priorities = {
    need_attention: Math.max(100 - stats.energy, 100 - stats.mood),
    hungry: 100 - stats.satiety,
    bored: stats.boredom,
  };

  // 找出最高优先级
  const entries = Object.entries(priorities) as Array<[ProactiveRequestType, number]>;
  const sorted = entries.sort((a, b) => b[1] - a[1]);

  return {
    type: sorted[0]![0],
    priority: sorted[0]![1],
  };
}

/**
 * 生成请求的文案和情绪
 *
 * @param type - 请求类型
 * @param stats - 宠物状态 (用于个性化文案)
 * @returns 文案 + 情绪 + 推荐互动
 */
function generateRequestContent(
  type: ProactiveRequestType,
  stats: PetCareStats
): {
  message: string;
  emotion: EmotionType;
  suggestedInteraction: InteractionType;
} {
  const pack = getActiveExpressionPack();

  switch (type) {
    case 'need_attention': {
      // 根据精力和心情决定具体原因
      const isLowEnergy = stats.energy < 30;
      const isLowMood = stats.mood < 30;

      let message: string;
      if (isLowEnergy && isLowMood) {
        message = '好累呀...心情也不太好，能陪陪我吗？';
      } else if (isLowEnergy) {
        message = '主人，我好累呀~ 要不要一起休息一下？';
      } else {
        message = '心情不太好...能抱抱我吗？';
      }

      return {
        message,
        emotion: 'sad',
        suggestedInteraction: 'pet',
      };
    }

    case 'hungry': {
      // 从表情包抽取饥饿相关文案
      const hungerMessages = pack.idle.lines.hungry || [
        '肚子有点饿了...想吃零食~',
        '好饿呀，主人能喂我吗？',
        '闻到好香的味道，是零食吗？',
      ];
      return {
        message: hungerMessages[Math.floor(Math.random() * hungerMessages.length)]!,
        emotion: 'confused',
        suggestedInteraction: 'feed',
      };
    }

    case 'bored': {
      // 从表情包抽取无聊相关文案
      const boredMessages = pack.idle.lines.bored || [
        '好无聊呀，陪我玩一会儿嘛~',
        '主人主人，我们一起玩吧！',
        '无聊死了...要不要做点有趣的事？',
      ];
      return {
        message: boredMessages[Math.floor(Math.random() * boredMessages.length)]!,
        emotion: 'neutral',
        suggestedInteraction: 'play',
      };
    }
  }
}

/**
 * 判断是否可以触发主动请求
 *
 * @param stats - 宠物状态
 * @param lastRequestTime - 上次请求时间戳
 * @param config - 主动请求配置
 * @param declineCount - 连续拒绝次数
 * @returns 是否可以触发 + 阻塞原因
 */
export function canTriggerRequest(
  stats: PetCareStats,
  lastRequestTime: number,
  config: ProactiveRequestConfig,
  declineCount: number
): { allowed: boolean; reason?: string } {
  // 1. 检查功能开关
  if (!config.enabled) {
    return { allowed: false, reason: 'disabled' };
  }

  // 2. 检查时间间隔
  const urgency = calculateUrgency(stats);
  const requiredInterval = calculateNextInterval(urgency, config, declineCount);
  const elapsed = Date.now() - lastRequestTime;

  if (elapsed < requiredInterval) {
    return {
      allowed: false,
      reason: `interval_not_met (${Math.round((requiredInterval - elapsed) / 1000)}s remaining)`,
    };
  }

  // 3. 检查紧急度阈值 (低于20不触发)
  if (urgency < 20) {
    return { allowed: false, reason: 'urgency_too_low' };
  }

  return { allowed: true };
}

/**
 * 生成主动请求
 *
 * @param stats - 宠物养成状态
 * @returns 主动请求对象
 */
export function createProactiveRequest(stats: PetCareStats): ProactiveRequest {
  const urgency = calculateUrgency(stats);
  const { type } = determineRequestType(stats);
  const content = generateRequestContent(type, stats);

  return {
    id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    type,
    suggestedInteraction: content.suggestedInteraction,
    message: content.message,
    emotion: content.emotion,
    timestamp: Date.now(),
    responded: false,
    urgency,
  };
}

/**
 * 主入口：检查并生成主动请求
 *
 * @param stats - 宠物状态
 * @param lastRequestTime - 上次请求时间
 * @param config - 配置
 * @param declineCount - 拒绝次数
 * @returns 主动请求对象，如果不应触发则返回 null
 */
export function shouldTriggerProactiveRequest(
  stats: PetCareStats,
  lastRequestTime: number,
  config: ProactiveRequestConfig,
  declineCount: number
): ProactiveRequest | null {
  const check = canTriggerRequest(stats, lastRequestTime, config, declineCount);

  if (!check.allowed) {
    // console.log('[ProactiveRequest] Cannot trigger:', check.reason);
    return null;
  }

  const request = createProactiveRequest(stats);
  console.log('[ProactiveRequest] Generated:', {
    type: request.type,
    urgency: request.urgency,
    message: request.message,
  });

  return request;
}
