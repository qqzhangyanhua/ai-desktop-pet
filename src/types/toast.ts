// Toast types

import type { InteractionType } from './pet-status';

export type ToastType = 'info' | 'success' | 'warning' | 'error' | 'interaction';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  timestamp: number;
  /** 互动类型 (仅 type='interaction' 时有效) */
  interactionType?: InteractionType;
  /** 属性变化 (仅 type='interaction' 时有效) */
  statChanges?: StatChange[];
}

/** 属性变化 */
export interface StatChange {
  stat: 'mood' | 'energy' | 'intimacy' | 'satiety' | 'boredom';
  delta: number;
}

export interface ToastOptions {
  type?: ToastType;
  duration?: number;
  /** 互动类型 (仅 type='interaction' 时有效) */
  interactionType?: InteractionType;
  /** 属性变化 (仅 type='interaction' 时有效) */
  statChanges?: StatChange[];
}
