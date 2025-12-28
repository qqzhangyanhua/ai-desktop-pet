/**
 * PetCore Service Types
 * 宠物核心服务类型定义
 *
 * Linus 准则: 消除特殊情况，用更好的数据结构解决问题
 */

import type { EmotionType } from '@/types';

/**
 * 宠物核心状态
 * 包含视觉状态和养成状态的联合类型
 */
export interface PetCoreState {
  // 视觉状态
  visual: {
    emotion: EmotionType;
    isVisible: boolean;
    currentSkinId: string;
    isListening: boolean;
    isSpeaking: boolean;
    bubbleText: string | null;
    position: { x: number; y: number };
    scale: number;
  };

  // 养成状态
  care: {
    mood: number;      // 心情 (0-100)
    energy: number;    // 精力 (0-100)
    intimacy: number;  // 亲密度 (0-100)
    coins: number;     // 金币
    experience: number; // 经验
    totalInteractions: number; // 累计互动次数
    createdAt: number; // 创建时间
  };

  // 时间戳
  timestamps: {
    lastInteraction: number;     // 上次任意互动
    lastDecayApplied: number;    // 上次衰减应用
    createdAt: number;           // 创建时间
  };
}

/**
 * 互动事件类型
 * 替代分散的 lastFeed、lastPlay 字段
 */
export interface InteractionEvent {
  id: string;
  type: 'pet' | 'feed' | 'play' | 'chat';
  timestamp: number;
  intensity: number;    // 互动强度 (1-10)
  moodChange: number;   // 心情变化
  energyChange: number; // 精力变化
  intimacyChange: number; // 亲密度变化
  context?: {
    userMessage?: string;
    aiResponse?: string;
    animation?: string;
    location?: { x: number; y: number };
  };
}

/**
 * 状态转换事件
 */
export type StateTransitionEvent =
  | { type: 'INTERACTION'; payload: { type: 'pet' | 'feed' | 'play' } }
  | { type: 'DECAY_APPLY' }
  | { type: 'EMOTION_UPDATE'; payload: { emotion: EmotionType } }
  | { type: 'INTIMACY_UPDATE'; payload: { intimacy: number } }
  | { type: 'STAGE_UPGRADE'; payload: { fromStage: string; toStage: string } };

/**
 * 状态变更监听器
 */
export interface StateChangeListener {
  (oldState: PetCoreState, newState: PetCoreState, event: StateTransitionEvent): void;
}

/**
 * 衰减配置
 */
export interface DecayConfig {
  moodPerHour: number;
  energyPerHour: number;
  maxMoodDecay: number;
  maxEnergyDecay: number;
}

/**
 * 默认配置
 */
export const DEFAULT_DECAY_CONFIG: DecayConfig = {
  moodPerHour: 2,
  energyPerHour: 1.5,
  maxMoodDecay: 50,
  maxEnergyDecay: 40,
};

/**
 * 互动配置
 */
export interface InteractionConfig {
  cooldown: number; // 冷却时间（秒）
  effects: {
    mood: number;
    energy: number;
    intimacy: number;
  };
  animation: string;
  voiceResponses: string[];
}

/**
 * 互动结果
 */
export interface InteractionResult {
  success: boolean;
  message?: string;
  newState: PetCoreState;
  animation?: string;
  voice?: string;
  effects?: {
    mood: number;
    energy: number;
    intimacy: number;
  };
}
export type InteractionType = "pet" | "feed" | "play" | "clean" | "brush" | "sleep";
