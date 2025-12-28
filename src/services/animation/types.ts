import type { EmotionType } from '@/types';

/**
 * 互动区域定义
 */
export interface InteractionZone {
  id: 'head' | 'body' | 'feet';
  name: string;
  x: number;      // 左上角 x (0-1 相对坐标)
  y: number;      // 左上角 y (0-1 相对坐标)
  width: number;  // 宽度 (0-1 相对坐标)
  height: number; // 高度 (0-1 相对坐标)
}

/**
 * 微互动配置
 */
export interface MicroInteractionConfig {
  enabled: boolean;
  hoverDelay: number;      // 悬停延迟（毫秒）
  responseDelay: number;   // 响应延迟（毫秒）
  cooldownEnabled: boolean;
  cooldownDuration: number; // 冷却时间（毫秒）
  showRipple: boolean;      // 显示波纹效果
  showParticles: boolean;   // 显示粒子效果
  playSound: boolean;       // 播放音效
}

/**
 * 微互动事件
 */
export interface MicroInteractionEvent {
  zone: InteractionZone;
  type: 'hover' | 'hover-start' | 'hover-end' | 'click';
  timestamp: number;
  position: { x: number; y: number };
  intensity: number; // 0-1
}

/**
 * 微互动结果
 */
export interface MicroInteractionResult {
  emotion: EmotionType;
  animation?: string;
  particles?: ParticleEffect;
  sound?: string;
  message?: string;
  ripple?: RippleEffect;
}

/**
 * 粒子效果配置
 */
export interface ParticleEffect {
  type: 'heart' | 'star' | 'sparkle' | 'bubble';
  count: number;
  color: string;
  duration: number; // 毫秒
  size: number;
  velocity: { x: number; y: number };
  gravity?: number;
  fadeOut?: boolean;
}

/**
 * 波纹效果配置
 */
export interface RippleEffect {
  x: number;
  y: number;
  color: string;
  size: number;
  duration: number;
}
