/**
 * PetCore Interaction Handler
 * 基于PetCore的新互动处理系统
 *
 * Linus 准则: 消除特殊情况
 * 替代: 不再使用 lastFeed、lastPlay 等分散字段
 */

import { petCoreService } from './service';
import type {
  InteractionType,
  InteractionResult as CoreInteractionResult,
  PetCoreState,
} from './types';

/**
 * 互动结果（兼容旧接口）
 */
export interface LegacyInteractionResult {
  success: boolean;
  message?: string;
  newStatus: {
    mood: number;
    energy: number;
    intimacy: number;
    lastInteraction: number;
    lastFeed: number | null;
    lastPlay: number | null;
    totalInteractions: number;
    coins: number;
    experience: number;
    createdAt: number;
  };
  animation?: string;
  voice?: string;
}

/**
 * 处理互动请求 - 新实现
 * 使用PetCore Service统一管理
 */
export async function handleInteractionNew(
  type: 'pet' | 'feed' | 'play'
): Promise<LegacyInteractionResult> {
  // 使用PetCore处理互动
  const result: CoreInteractionResult = await petCoreService.handleInteraction(type);

  if (!result.success) {
    return {
      success: false,
      message: result.message,
      newStatus: mapStateToLegacyStatus(result.newState),
    };
  }

  return {
    success: true,
    message: result.message,
    newStatus: mapStateToLegacyStatus(result.newState),
    animation: result.animation,
    voice: result.voice,
  };
}

/**
 * 检查冷却时间
 */
export function checkCooldown(type: 'pet' | 'feed' | 'play'): { onCooldown: boolean; remaining: number } {
  return petCoreService.checkCooldown(type);
}

/**
 * 获取所有冷却状态
 */
export function getAllCooldowns(): Partial<Record<InteractionType, number>> {
  const cooldowns = {
    pet: petCoreService.checkCooldown('pet'),
    feed: petCoreService.checkCooldown('feed'),
    play: petCoreService.checkCooldown('play'),
  };

  return {
    pet: cooldowns.pet.remaining,
    feed: cooldowns.feed.remaining,
    play: cooldowns.play.remaining,
  };
}

/**
 * 检查是否有可用互动
 */
export function hasAvailableInteraction(): boolean {
  const cooldowns = getAllCooldowns();
  return Object.values(cooldowns).some((remaining) => remaining === 0);
}

/**
 * 根据当前状态推荐互动
 */
export function getRecommendedInteraction(): 'pet' | 'feed' | 'play' | null {
  const state = petCoreService.getState();
  const cooldowns = getAllCooldowns();

  // Filter available interactions
  const available: Array<'pet' | 'feed' | 'play'> = (['pet', 'feed', 'play'] as const).filter(
    (type) => cooldowns[type] === 0
  );

  if (available.length === 0) {
    return null;
  }

  // 基于状态需求推荐
  if (state.care.energy < 40 && available.includes('feed')) {
    return 'feed';
  }

  if (state.care.mood < 40 && available.includes('play')) {
    return 'play';
  }

  if (available.includes('pet')) {
    return 'pet';
  }

  return available[0] || null;
}

/**
 * 应用衰减
 */
export async function applyDecay(): Promise<void> {
  await petCoreService.applyDecay();
}

/**
 * 获取当前状态
 */
export function getCurrentState(): PetCoreState {
  return petCoreService.getState();
}

/**
 * 订阅状态变更
 */
export function subscribeToStateChanges(
  listener: (oldState: PetCoreState, newState: PetCoreState) => void
): () => void {
  return petCoreService.subscribe((oldState, newState) => {
    listener(oldState, newState);
  });
}

/**
 * 将PetCoreState映射为旧接口格式
 * 保持向后兼容性
 */
function mapStateToLegacyStatus(state: PetCoreState) {
  return {
    mood: state.care.mood,
    energy: state.care.energy,
    intimacy: state.care.intimacy,
    lastInteraction: state.timestamps.lastInteraction,
    // 这些字段不再使用，但保持接口兼容
    lastFeed: null,
    lastPlay: null,
    totalInteractions: state.care.totalInteractions,
    coins: state.care.coins,
    experience: state.care.experience,
    createdAt: state.care.createdAt,
  };
}
