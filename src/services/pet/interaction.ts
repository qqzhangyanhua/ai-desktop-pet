/**
 * Pet Interaction Service
 * 宠物互动处理服务
 *
 * 处理用户互动逻辑，包括冷却检查、效果应用、语音反馈
 */

import type {
  InteractionType,
  InteractionConfig,
  InteractionResult,
  PetStatus,
} from '@/types';
import { applyInteractionEffects, checkCooldown } from './status';
import { recordInteraction } from '@/services/statistics';
import { checkAndUnlockAchievements } from '@/services/achievements';
import { getStatsSummary } from '@/services/statistics';

/**
 * Interaction configuration table
 * 互动配置表
 */
const INTERACTION_CONFIGS: Record<InteractionType, InteractionConfig> = {
  pet: {
    type: 'pet',
    cooldown: 60, // 60 seconds
    effects: {
      mood: 10,
      energy: 0,
      intimacy: 2,
    },
    animation: 'tap_head',
    voiceResponses: ['好舒服~', '嘿嘿~', '喜欢被摸头~', '主人真好~'],
  },
  feed: {
    type: 'feed',
    cooldown: 120, // 120 seconds
    effects: {
      mood: 8,
      energy: 15,
      intimacy: 1,
    },
    animation: 'eat',
    voiceResponses: ['谢谢主人!', '好好吃!', '还要还要~', '真美味~'],
  },
  play: {
    type: 'play',
    cooldown: 90, // 90 seconds
    effects: {
      mood: 12,
      energy: -5,
      intimacy: 3,
    },
    animation: 'happy',
    voiceResponses: ['好开心!', '再来一次!', '玩得真开心~', '和主人一起玩最开心了~'],
  },
};

/**
 * Handle interaction request
 * 处理互动请求
 *
 * @param type - Interaction type (pet/feed/play)
 * @param currentStatus - Current pet status
 * @returns Interaction result with success status, new status, and feedback
 */
export async function handleInteraction(
  type: InteractionType,
  currentStatus: PetStatus
): Promise<InteractionResult> {
  const config = INTERACTION_CONFIGS[type];

  // 1. Check cooldown
  const lastTime = getLastInteractionTime(type, currentStatus);
  const cooldownCheck = checkCooldown(lastTime, config.cooldown);

  if (cooldownCheck.onCooldown) {
    return {
      success: false,
      message: `还需要等待 ${cooldownCheck.remaining} 秒`,
      newStatus: currentStatus,
    };
  }

  // 2. Apply effects
  const newStatus = applyInteractionEffects(currentStatus, config.effects);

  // 3. Record interaction for statistics
  void recordInteraction(type);

  // 4. Check and unlock achievements (non-blocking)
  void (async () => {
    try {
      const stats = await getStatsSummary();
      const unlockedAchievements = await checkAndUnlockAchievements(
        stats,
        newStatus.intimacy
      );

      if (unlockedAchievements.length > 0) {
        console.log(
          `[InteractionService] Unlocked ${unlockedAchievements.length} achievement(s):`,
          unlockedAchievements.map((a) => a.name).join(', ')
        );
        // TODO: 触发成就解锁 Toast 通知
      }
    } catch (error) {
      console.error('[InteractionService] Failed to check achievements:', error);
    }
  })();

  // 5. Randomly select voice response
  const voice =
    config.voiceResponses[
      Math.floor(Math.random() * config.voiceResponses.length)
    ];

  return {
    success: true,
    newStatus,
    animation: config.animation,
    voice,
  };
}

/**
 * Get last interaction time for specific type
 * 获取特定类型的上次互动时间
 *
 * @param type - Interaction type
 * @param status - Current pet status
 * @returns Last interaction timestamp or null
 */
function getLastInteractionTime(
  type: InteractionType,
  status: PetStatus
): number | null {
  switch (type) {
    case 'pet':
      return status.lastInteraction;
    case 'feed':
      return status.lastFeed;
    case 'play':
      return status.lastPlay;
    default:
      return null;
  }
}

/**
 * Get interaction configuration
 * 获取互动配置
 *
 * @param type - Interaction type
 * @returns Interaction configuration
 */
export function getInteractionConfig(type: InteractionType): InteractionConfig {
  return INTERACTION_CONFIGS[type];
}

/**
 * Get all cooldown states
 * 获取所有冷却状态
 *
 * @param status - Current pet status
 * @returns Cooldown remaining time for each interaction type (in seconds)
 */
export function getAllCooldowns(
  status: PetStatus
): Record<InteractionType, number> {
  return {
    pet: checkCooldown(
      status.lastInteraction,
      INTERACTION_CONFIGS.pet.cooldown
    ).remaining,
    feed: checkCooldown(status.lastFeed, INTERACTION_CONFIGS.feed.cooldown)
      .remaining,
    play: checkCooldown(status.lastPlay, INTERACTION_CONFIGS.play.cooldown)
      .remaining,
  };
}

/**
 * Check if any interaction is available (not on cooldown)
 * 检查是否有任何互动可用（非冷却中）
 *
 * @param status - Current pet status
 * @returns True if at least one interaction is available
 */
export function hasAvailableInteraction(status: PetStatus): boolean {
  const cooldowns = getAllCooldowns(status);
  return Object.values(cooldowns).some((remaining) => remaining === 0);
}

/**
 * Get recommended interaction based on current status
 * 根据当前状态推荐互动
 *
 * @param status - Current pet status
 * @returns Recommended interaction type or null if all on cooldown
 */
export function getRecommendedInteraction(
  status: PetStatus
): InteractionType | null {
  const cooldowns = getAllCooldowns(status);

  // Filter available interactions (not on cooldown)
  const available: InteractionType[] = (
    Object.keys(cooldowns) as InteractionType[]
  ).filter((type) => cooldowns[type] === 0);

  if (available.length === 0) {
    return null; // All on cooldown
  }

  // Recommend based on status needs
  if (status.energy < 40 && available.includes('feed')) {
    return 'feed'; // Low energy → feed
  }

  if (status.mood < 40 && available.includes('play')) {
    return 'play'; // Low mood → play (highest mood boost)
  }

  if (available.includes('pet')) {
    return 'pet'; // Default → pet (lowest cooldown)
  }

  // Return first available
  return available[0] || null;
}
