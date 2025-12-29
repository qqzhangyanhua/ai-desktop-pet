/**
 * 宠物状态类型定义
 * Pet Status Type Definitions
 */

/**
 * 宠物状态接口
 * 包含宠物的核心属性值和时间戳信息
 */
export interface PetStatus {
  /** 宠物昵称 */
  nickname: string;

  /** 心情值 (0-100) - 影响表情和互动反馈 */
  mood: number;

  /** 精力值 (0-100) - 影响响应速度和睡眠状态 */
  energy: number;

  /** 亲密度 (0-100) - 影响AI人格和解锁功能 */
  intimacy: number;

  /** 上次任意互动时间戳 (毫秒) */
  lastInteraction: number;

  /** 上次喂食时间戳 (毫秒) */
  lastFeed: number | null;

  /** 上次玩耍时间戳 (毫秒) */
  lastPlay: number | null;

  /** 累计互动次数 */
  totalInteractions: number;

  /** 金币数 */
  coins: number;

  /** 经验值 */
  experience: number;

  /** 首次创建时间戳 (毫秒) */
  createdAt: number;
}

/**
 * 默认宠物状态
 * Default pet status values
 *
 * Linus 准则: "消除特殊情况 - 永远有值"
 */
export const DEFAULT_PET_STATUS: PetStatus = {
  nickname: '我的宠物',
  mood: 100,
  energy: 100,
  intimacy: 20,
  lastInteraction: Date.now(),
  lastFeed: null,
  lastPlay: null,
  totalInteractions: 0,
  coins: 0,
  experience: 0,
  createdAt: Date.now(),
};

/**
 * 互动类型
 * - pet: 抚摸 (点击头部)
 * - feed: 喂食 (点击身体)
 * - play: 玩耍 (点击下半身)
 */
export type InteractionType = 'pet' | 'feed' | 'play';

/**
 * 互动配置接口
 * 定义每种互动的效果、冷却时间和反馈
 */
export interface InteractionConfig {
  /** 互动类型 */
  type: InteractionType;

  /** 冷却时间 (秒) */
  cooldown: number;

  /** 属性效果 (增量值) */
  effects: {
    /** 心情值变化 */
    mood: number;

    /** 精力值变化 */
    energy: number;

    /** 亲密度变化 */
    intimacy: number;
  };

  /** Live2D动画名称 (可选) */
  animation: string;

  /** TTS语音回复列表 (随机选择一个) */
  voiceResponses: string[];
}

/**
 * 互动结果接口
 * 包含互动是否成功、新状态和反馈信息
 */
export interface InteractionResult {
  /** 互动是否成功 */
  success: boolean;

  /** 失败原因或提示消息 */
  message?: string;

  /** 互动后的新状态 */
  newStatus: PetStatus;

  /** 触发的动画名称 */
  animation?: string;

  /** 语音回复内容 */
  voice?: string;
}

/**
 * 属性衰减配置接口
 * 定义属性随时间自动衰减的规则
 */
export interface DecayConfig {
  /** 心情值每小时衰减量 */
  moodPerHour: number;

  /** 精力值每小时衰减量 */
  energyPerHour: number;

  /** 心情值最大衰减量 (上限) */
  maxMoodDecay: number;

  /** 精力值最大衰减量 (上限) */
  maxEnergyDecay: number;
}
