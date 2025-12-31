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

/**
 * 主动请求类型
 * 宠物根据自身状态主动发起的互动请求
 *
 * Linus 原则: 合并相似情况，减少分支
 * - need_attention: 合并了"需要休息"和"需要安抚"(都推荐pet互动)
 */
export type ProactiveRequestType =
  | 'need_attention'  // 需要关注 (精力低或心情差)
  | 'hungry'          // 饥饿 (饱食度低)
  | 'bored';          // 无聊 (无聊度高)

/**
 * 主动请求数据结构
 */
export interface ProactiveRequest {
  /** 请求ID (用于追踪和去重) */
  id: string;

  /** 请求类型 */
  type: ProactiveRequestType;

  /** 推荐的互动方式 */
  suggestedInteraction: InteractionType;

  /** 气泡显示文案 */
  message: string;

  /** 情绪表现 */
  emotion: EmotionType;

  /** 创建时间戳 (毫秒) */
  timestamp: number;

  /** 用户是否已响应 */
  responded: boolean;

  /** 用户响应方式 (接受/拒绝/忽略) */
  response?: 'accepted' | 'declined' | 'ignored';

  /** 紧急度分数 (0-100) - 用于计算触发间隔 */
  urgency: number;
}

/**
 * 主动请求配置
 */
export interface ProactiveRequestConfig {
  /** 是否启用主动请求 */
  enabled: boolean;

  /** 频率档位 (UI快捷选项) */
  frequency: 'low' | 'standard' | 'high';

  /** 基础触发间隔 (毫秒) */
  baseIntervalMs: number;

  /** 最小触发间隔 (毫秒) - 紧急情况下的最短间隔 */
  minIntervalMs: number;

  /** 最大触发间隔 (毫秒) - 低紧急度或被拒绝后的最长间隔 */
  maxIntervalMs: number;

  /** 连续拒绝多少次后触发惩罚 */
  declineThreshold: number;

  /** 拒绝后频率降低系数 (每次拒绝间隔 *= 此系数) */
  declinePenalty: number;
}

/**
 * 默认主动请求配置
 */
export const DEFAULT_PROACTIVE_CONFIG: ProactiveRequestConfig = {
  enabled: true,
  frequency: 'standard',
  baseIntervalMs: 30 * 60 * 1000,  // 30分钟
  minIntervalMs: 15 * 60 * 1000,   // 15分钟
  maxIntervalMs: 120 * 60 * 1000,  // 2小时
  declineThreshold: 3,
  declinePenalty: 1.2,
};

/**
 * EmotionType 引用 (避免循环依赖)
 * 实际定义在 emotion.ts
 */
type EmotionType = 'happy' | 'sad' | 'excited' | 'confused' | 'thinking' | 'neutral' | 'surprised';
