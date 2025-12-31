/**
 * Status Bubble Type Definitions
 * 状态气泡类型定义
 *
 * 用于显示宠物状态提示、主动请求和互动反馈
 */

import type { EmotionType } from './pet';
import type { InteractionType } from './pet-status';

/**
 * 气泡类型
 * - need: 需求提示（饿了、累了等）
 * - chat: 普通闲聊
 * - action: 互动反馈
 * - cooldown: 冷却提示
 */
export type BubbleType = 'need' | 'chat' | 'action' | 'cooldown';

/**
 * 气泡按钮动作
 */
export interface BubbleAction {
  /** 按钮标签 */
  label: string;
  /** 动作类型 */
  type: InteractionType | 'dismiss';
  /** 图标名称 (Lucide icon) */
  icon?: string;
}

/**
 * 状态气泡数据结构
 */
export interface StatusBubble {
  /** 唯一标识 */
  id: string;

  /** 气泡类型 */
  type: BubbleType;

  /** 优先级 (1-10, 越高越紧急) */
  priority: number;

  /** 显示文案 */
  message: string;

  /** 情绪表现 */
  emotion: EmotionType;

  /** 可选的操作按钮 */
  actions?: BubbleAction[];

  /** 显示时长 (毫秒, 0表示不自动消失) */
  duration: number;

  /** 是否可手动关闭 */
  dismissible: boolean;

  /** 创建时间戳 */
  timestamp: number;
}

/**
 * 气泡队列配置
 */
export interface BubbleQueueConfig {
  /** 最大队列长度 */
  maxQueueSize: number;

  /** 默认显示时长 (毫秒) */
  defaultDuration: number;

  /** 气泡切换动画时长 (毫秒) */
  transitionDuration: number;
}

/**
 * 默认气泡队列配置
 */
export const DEFAULT_BUBBLE_QUEUE_CONFIG: BubbleQueueConfig = {
  maxQueueSize: 5,
  defaultDuration: 5000,
  transitionDuration: 300,
};

/**
 * 创建状态气泡的辅助函数
 */
export function createStatusBubble(
  partial: Omit<StatusBubble, 'id' | 'timestamp'>
): StatusBubble {
  return {
    ...partial,
    id: `bubble-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: Date.now(),
  };
}

/**
 * 气泡优先级常量
 */
export const BUBBLE_PRIORITY = {
  /** 紧急状态（生病、严重饥饿） */
  URGENT: 10,
  /** 高优先级（需要关注） */
  HIGH: 8,
  /** 中等优先级（一般提示） */
  MEDIUM: 5,
  /** 低优先级（闲聊） */
  LOW: 3,
  /** 最低优先级（装饰性） */
  MINIMAL: 1,
} as const;
