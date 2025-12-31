/**
 * Feedback Type Definitions
 * 反馈类型定义
 *
 * 用于互动反馈动画和效果展示
 */

import type { InteractionType } from './pet-status';
import type { EmotionType } from './pet';

/**
 * 动画类型
 */
export type FeedbackAnimationType = 'float' | 'bounce' | 'shake' | 'sparkle' | 'heart';

/**
 * 单个属性变化效果
 */
export interface StatEffect {
  /** 属性名称 */
  stat: string;
  /** 变化值 (正数增加，负数减少) */
  delta: number;
  /** 图标类型 */
  icon: 'mood' | 'energy' | 'intimacy' | 'satiety' | 'boredom';
}

/**
 * 互动反馈数据
 */
export interface InteractionFeedbackData {
  /** 唯一ID */
  id: string;
  /** 互动类型 */
  type: InteractionType;
  /** 是否成功 */
  success: boolean;
  /** 属性变化列表 */
  effects: StatEffect[];
  /** 反馈文案 */
  message: string;
  /** 表情变化 */
  emotion: EmotionType;
  /** 动画类型 */
  animation: FeedbackAnimationType;
  /** 位置 */
  position: { x: number; y: number };
  /** 时间戳 */
  timestamp: number;
}

/**
 * 创建互动反馈数据
 */
export function createInteractionFeedback(
  partial: Omit<InteractionFeedbackData, 'id' | 'timestamp'>
): InteractionFeedbackData {
  return {
    ...partial,
    id: `feedback-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: Date.now(),
  };
}

/**
 * 互动类型对应的默认动画
 */
export const DEFAULT_FEEDBACK_ANIMATIONS: Record<InteractionType, FeedbackAnimationType> = {
  pet: 'heart',
  feed: 'sparkle',
  play: 'bounce',
};

/**
 * 互动类型对应的颜色
 */
export const FEEDBACK_COLORS: Record<InteractionType, string> = {
  pet: '#FF6B9D', // 粉色 - 亲密
  feed: '#6BCB77', // 绿色 - 精力/饱腹
  play: '#FFD93D', // 黄色 - 心情
};

/**
 * 互动类型对应的图标属性
 */
export const FEEDBACK_ICONS: Record<InteractionType, StatEffect['icon']> = {
  pet: 'mood',
  feed: 'satiety',
  play: 'mood',
};
