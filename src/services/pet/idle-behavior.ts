/**
 * 日常行为（Idle）
 *
 * 目标：宠物在“无事发生”时也会有轻量反应，更像活物，但不打扰。
 * - 有状态就不插话（正在说话/有气泡/刚互动过）
 * - 优先给出轻量陪伴台词（可选小动作）
 */

import type { EmotionType, PetCareStats } from '@/types';
import { getActiveExpressionPack } from '@/services/pet/expression-pack';

export type IdleGesture = 'sway' | 'bounce' | 'pulse';

export interface IdleBehaviorResult {
  message: string;
  emotion: EmotionType;
  gesture?: IdleGesture;
  bubbleDurationMs: number;
}

const pick = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)]!;

function timeHint(): string {
  const h = new Date().getHours();
  if (h >= 23 || h < 6) return 'late';
  if (h < 11) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

export function getIdleBehavior(stats: PetCareStats): IdleBehaviorResult {
  const pack = getActiveExpressionPack();
  const hint = timeHint();

  // 优先：无聊/饥饿/疲惫/脏，但只做“撒娇式轻提醒”
  if (stats.boredom > 75) {
    return {
      message: pick(pack.idle.lines.bored),
      emotion: 'confused',
      gesture: 'bounce',
      bubbleDurationMs: 4200,
    };
  }
  if (stats.satiety < 30) {
    return {
      message: pick(pack.idle.lines.hungry),
      emotion: 'sad',
      gesture: 'pulse',
      bubbleDurationMs: 4200,
    };
  }
  if (stats.energy < 30) {
    return {
      message: pick(pack.idle.lines.tired),
      emotion: 'neutral',
      gesture: 'sway',
      bubbleDurationMs: 5200,
    };
  }
  if (stats.hygiene < 35) {
    return {
      message: pick(pack.idle.lines.dirty),
      emotion: 'confused',
      gesture: 'pulse',
      bubbleDurationMs: 4200,
    };
  }

  // 纯陪伴台词（更轻）
  const baseLines = pack.idle.lines.normal;
  const timeLines =
    hint === 'morning'
      ? pack.idle.lines.morning
      : hint === 'afternoon'
        ? pack.idle.lines.afternoon
        : hint === 'evening'
          ? pack.idle.lines.evening
          : pack.idle.lines.late;

  const msg = pick([...baseLines, ...timeLines]);
  const picked: { msg: string; emotion: EmotionType; gesture?: IdleGesture } =
    hint === 'morning'
      ? { msg, emotion: 'excited', gesture: 'pulse' }
      : hint === 'late'
        ? { msg, emotion: 'sad', gesture: 'sway' }
        : { msg, emotion: 'happy', gesture: 'sway' };

  return {
    message: picked.msg,
    emotion: picked.emotion,
    gesture: picked.gesture,
    bubbleDurationMs: 3200,
  };
}

export interface IdleGestureOnlyResult {
  emotion: EmotionType;
  gesture?: IdleGesture;
}

/**
 * 仅返回“动作/情绪”，用于：
 * - 有告警/生病时不插话，但仍保持“活着”的小动作
 * - 关闭气泡时也能有轻微反应（主要给 Live2D）
 */
export function getIdleGestureOnly(stats: PetCareStats): IdleGestureOnlyResult {
  if (stats.isSick) {
    return { emotion: 'sad', gesture: 'sway' };
  }
  if (stats.energy < 25) {
    return { emotion: 'neutral', gesture: 'sway' };
  }
  if (stats.satiety < 25) {
    return { emotion: 'sad', gesture: 'pulse' };
  }
  if (stats.boredom > 80) {
    return { emotion: 'confused', gesture: 'bounce' };
  }
  if (stats.hygiene < 30) {
    return { emotion: 'confused', gesture: 'pulse' };
  }
  return { emotion: 'neutral', gesture: 'sway' };
}
