/**
 * Interaction Effects Configuration
 * 交互效果配置
 *
 * Linus原则: 配置驱动，消除硬编码魔法数字
 * 所有交互的效果、冷却时间、动画都在这里统一管理
 */

import type { PetInteractionType, PetInteractionEffect } from '@/types/pet-care';

/**
 * 交互效果配置表
 *
 * 配置说明：
 * - fullness: 饱食度变化 (-100 ~ +100)
 * - energy: 精力变化 (-100 ~ +100)
 * - mood: 心情变化 (-100 ~ +100)
 * - intimacy: 亲密度变化 (0 ~ +10)
 * - cooldown: 冷却时间（秒）
 */
export const INTERACTION_EFFECTS: Record<PetInteractionType, PetInteractionEffect> = {
  /**
   * 喂食 - 恢复饱食度和少量精力
   */
  feed: {
    fullness: 15,
    energy: 5,
    mood: 8,
    intimacy: 2,
    cooldown: 120, // 2分钟
    animation: 'eat',
    voiceResponses: [
      '好好吃！',
      '谢谢主人～',
      '还要～',
      '满足了～',
    ],
  },

  /**
   * 玩耍 - 提升心情和亲密度，消耗少量精力
   */
  play: {
    mood: 15,
    energy: -5,
    intimacy: 3,
    cooldown: 90, // 1.5分钟
    animation: 'happy',
    voiceResponses: [
      '好开心！',
      '哈哈～',
      '再来！',
      '太好玩了～',
    ],
  },

  /**
   * 抚摸 - 提升心情和亲密度
   */
  pet: {
    mood: 10,
    intimacy: 5,
    cooldown: 60, // 1分钟
    animation: 'tap_head',
    voiceResponses: [
      '好舒服～',
      '嗯嗯～',
      '再摸摸我～',
      '喜欢这样～',
    ],
  },

  /**
   * 清洁 - 恢复心情，提升少量亲密度
   */
  clean: {
    mood: 10,
    intimacy: 2,
    cooldown: 300, // 5分钟
    animation: 'clean',
    voiceResponses: [
      '干净了～',
      '谢谢主人！',
      '好清爽～',
    ],
  },

  /**
   * 睡觉 - 大幅恢复精力
   */
  sleep: {
    energy: 30,
    mood: 5,
    cooldown: 3600, // 1小时
    animation: 'sleep',
    voiceResponses: [
      '好困呀～',
      '睡一会儿～',
      'Zzz...',
    ],
  },

  /**
   * 工作 - 消耗精力，降低心情，减少亲密度
   */
  work: {
    energy: -20,
    mood: -5,
    intimacy: -2,
    cooldown: 1800, // 30分钟
    animation: 'work',
    voiceResponses: [
      '好累啊...',
      '继续加油...',
      '完成了！',
    ],
  },

  /**
   * 学习 - 消耗精力，轻微降低心情，提升亲密度
   */
  study: {
    energy: -15,
    mood: -3,
    intimacy: 1,
    cooldown: 1200, // 20分钟
    animation: 'study',
    voiceResponses: [
      '学到新东西了！',
      '有点难...',
      '再努力一下～',
    ],
  },
};

/**
 * 获取交互效果配置
 * @param type 交互类型
 * @returns 效果配置，如果类型无效返回undefined
 */
export function getInteractionEffect(type: PetInteractionType): PetInteractionEffect | undefined {
  return INTERACTION_EFFECTS[type];
}

/**
 * 获取交互冷却时间（毫秒）
 * @param type 交互类型
 * @returns 冷却时间（毫秒）
 */
export function getInteractionCooldown(type: PetInteractionType): number {
  const effect = INTERACTION_EFFECTS[type];
  return effect ? effect.cooldown * 1000 : 0;
}

/**
 * 获取随机语音反馈
 * @param type 交互类型
 * @returns 随机选择的语音文本，如果没有配置返回undefined
 */
export function getRandomVoiceResponse(type: PetInteractionType): string | undefined {
  const effect = INTERACTION_EFFECTS[type];
  if (!effect?.voiceResponses || effect.voiceResponses.length === 0) {
    return undefined;
  }

  const randomIndex = Math.floor(Math.random() * effect.voiceResponses.length);
  return effect.voiceResponses[randomIndex];
}

/**
 * 检查是否为有效的交互类型
 * @param type 待检查的字符串
 * @returns 是否为有效的交互类型
 */
export function isValidInteractionType(type: string): type is PetInteractionType {
  return type in INTERACTION_EFFECTS;
}
