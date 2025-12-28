/**
 * Idle Animation System
 * 待机动画系统
 *
 * 让宠物"活"在桌面上 - 呼吸、眨眼、微动
 */

import type { EmotionType } from '@/types';

/**
 * 待机动画类型
 */
export type IdleAnimationType =
  | 'breathing'      // 呼吸
  | 'blinking'       // 眨眼
  | 'swaying'        // 摇摆
  | 'looking-around' // 左顾右盼
  | 'sleepy'         // 困倦
  | 'excited'        // 兴奋
  | 'thinking';      // 思考

/**
 * 待机动画配置
 */
export interface IdleAnimationConfig {
  enabled: boolean;
  breathingInterval: number;      // 呼吸间隔（毫秒）
  blinkInterval: number;          // 眨眼间隔（毫秒）
  blinkDuration: number;          // 眨眼持续时间（毫秒）
  swayInterval: number;           // 摇摆间隔（毫秒）
  lookAroundInterval: number;     // 左顾右盼间隔（毫秒）
  randomVariation: number;        // 随机变化系数 (0-1)
  intensity: number;              // 动画强度 (0-1)
}

/**
 * 待机动画状态
 */
export interface IdleAnimationState {
  type: IdleAnimationType;
  isActive: boolean;
  startTime: number;
  duration: number;
  progress: number; // 0-1
  emotion: EmotionType;
}

/**
 * 动画事件
 */
export interface IdleAnimationEvent {
  type: IdleAnimationType;
  timestamp: number;
  emotion?: EmotionType;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: IdleAnimationConfig = {
  enabled: true,
  breathingInterval: 4000,
  blinkInterval: 15000,
  blinkDuration: 150,
  swayInterval: 3000,
  lookAroundInterval: 8000,
  randomVariation: 0.3,
  intensity: 0.5,
};

/**
 * 待机动画管理器
 */
export class IdleAnimationManager {
  private config: IdleAnimationConfig;
  private currentAnimation: IdleAnimationState | null = null;
  private timers: Map<string, number> = new Map();
  private listeners: Set<(event: IdleAnimationEvent) => void> = new Set();
  private isBlinking = false;
  private lastBreathTime = 0;
  private lastBlinkTime = 0;
  private lastSwayTime = 0;
  private lastLookAroundTime = 0;
  private emotion: EmotionType = 'neutral';
  private energy = 100; // 精力值（影响动画）

  constructor(config?: Partial<IdleAnimationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.lastBreathTime = Date.now();
    this.lastBlinkTime = Date.now();
    this.lastSwayTime = Date.now();
    this.lastLookAroundTime = Date.now();
  }

  /**
   * 更新精力值（影响动画表现）
   */
  updateEnergy(energy: number): void {
    this.energy = Math.max(0, Math.min(100, energy));
  }

  /**
   * 更新心情（影响动画类型）
   */
  updateEmotion(emotion: EmotionType): void {
    this.emotion = emotion;
  }

  /**
   * 主更新循环
   * 在动画帧中调用
   */
  update(): void {
    if (!this.config.enabled) return;

    const now = Date.now();

    // 呼吸动画（最基本）
    this.updateBreathing(now);

    // 眨眼动画
    this.updateBlinking(now);

    // 摇摆动画
    this.updateSwaying(now);

    // 左顾右盼
    this.updateLookAround(now);

    // 更新当前动画进度
    this.updateCurrentAnimation(now);
  }

  /**
   * 更新呼吸动画
   */
  private updateBreathing(now: number): void {
    const interval = this.getRandomInterval(this.config.breathingInterval);
    if (now - this.lastBreathTime >= interval) {
      this.triggerAnimation('breathing');
      this.lastBreathTime = now;
    }
  }

  /**
   * 更新眨眼动画
   */
  private updateBlinking(now: number): void {
    if (this.isBlinking) return;

    const interval = this.getRandomInterval(this.config.blinkInterval);
    if (now - this.lastBlinkTime >= interval) {
      this.isBlinking = true;
      this.triggerAnimation('blinking');

      // 眨眼持续时间
      setTimeout(() => {
        this.isBlinking = false;
      }, this.config.blinkDuration);

      this.lastBlinkTime = now;
    }
  }

  /**
   * 更新摇摆动画
   */
  private updateSwaying(now: number): void {
    const interval = this.getRandomInterval(this.config.swayInterval);
    if (now - this.lastSwayTime >= interval) {
      this.triggerAnimation('swaying');
      this.lastSwayTime = now;
    }
  }

  /**
   * 更新左顾右盼动画
   */
  private updateLookAround(now: number): void {
    const interval = this.getRandomInterval(this.config.lookAroundInterval);
    if (now - this.lastLookAroundTime >= interval) {
      this.triggerAnimation('looking-around');
      this.lastLookAroundTime = now;
    }
  }

  /**
   * 触发动画
   */
  private triggerAnimation(type: IdleAnimationType): void {
    const emotion = this.getEmotionForAnimation(type);
    const duration = this.getAnimationDuration(type);

    this.currentAnimation = {
      type,
      isActive: true,
      startTime: Date.now(),
      duration,
      progress: 0,
      emotion,
    };

    // 通知监听器
    this.notifyListeners({ type, timestamp: Date.now(), emotion });

    // 设置定时器自动结束
    const timer = setTimeout(() => {
      this.endCurrentAnimation();
    }, duration);

    this.timers.set(type, timer);
  }

  /**
   * 更新当前动画进度
   */
  private updateCurrentAnimation(now: number): void {
    if (!this.currentAnimation || !this.currentAnimation.isActive) return;

    const elapsed = now - this.currentAnimation.startTime;
    this.currentAnimation.progress = Math.min(1, elapsed / this.currentAnimation.duration);

    // 动画结束
    if (this.currentAnimation.progress >= 1) {
      this.endCurrentAnimation();
    }
  }

  /**
   * 结束当前动画
   */
  private endCurrentAnimation(): void {
    if (this.currentAnimation) {
      this.currentAnimation.isActive = false;
    }
  }

  /**
   * 获取动画对应的情绪
   */
  private getEmotionForAnimation(type: IdleAnimationType): EmotionType {
    // 基于当前心情调整
    switch (type) {
      case 'breathing':
        return this.energy < 30 ? 'sleepy' : this.emotion;
      case 'blinking':
        return this.emotion;
      case 'swaying':
        return 'neutral';
      case 'looking-around':
        return 'thinking';
      case 'sleepy':
        return 'sleepy';
      case 'excited':
        return 'excited';
      case 'thinking':
        return 'thinking';
      default:
        return 'neutral';
    }
  }

  /**
   * 获取动画持续时间
   */
  private getAnimationDuration(type: IdleAnimationType): number {
    const baseDuration = {
      breathing: 2000,
      blinking: this.config.blinkDuration,
      swaying: 1500,
      lookingAround: 1000,
      sleepy: 3000,
      excited: 2000,
      thinking: 2500,
    };

    const variation = 1 + (Math.random() - 0.5) * this.config.randomVariation;
    return Math.floor((baseDuration[type] || 1000) * variation);
  }

  /**
   * 获取随机间隔
   */
  private getRandomInterval(baseInterval: number): number {
    const variation = 1 + (Math.random() - 0.5) * this.config.randomVariation * 2;
    return Math.floor(baseInterval * variation);
  }

  /**
   * 获取当前动画状态
   */
  getCurrentAnimation(): IdleAnimationState | null {
    return this.currentAnimation ? { ...this.currentAnimation } : null;
  }

  /**
   * 获取呼吸动画的数值（0-1）
   */
  getBreathingValue(): number {
    if (!this.currentAnimation || this.currentAnimation.type !== 'breathing') {
      return 0;
    }

    const progress = this.currentAnimation.progress;
    // 呼吸周期：吸气 -> 呼气
    if (progress < 0.5) {
      return progress * 2; // 0 -> 1
    } else {
      return (1 - progress) * 2; // 1 -> 0
    }
  }

  /**
   * 获取眨眼状态
   */
  isCurrentlyBlinking(): boolean {
    return this.isBlinking;
  }

  /**
   * 获取摇摆角度（度）
   */
  getSwayAngle(): number {
    if (!this.currentAnimation || this.currentAnimation.type !== 'swaying') {
      return 0;
    }

    const progress = this.currentAnimation.progress;
    const angle = Math.sin(progress * Math.PI * 2) * 3; // 最大3度摇摆
    return angle * this.config.intensity;
  }

  /**
   * 获取注视方向（-1 左，0 中，1 右）
   */
  getLookDirection(): number {
    if (!this.currentAnimation || this.currentAnimation.type !== 'looking-around') {
      return 0;
    }

    const progress = this.currentAnimation.progress;
    // 左 -> 右 -> 中
    if (progress < 0.33) {
      return -progress * 3; // 0 -> -1
    } else if (progress < 0.66) {
      return (progress - 0.33) * 6 - 1; // -1 -> 1
    } else {
      return (1 - progress) * 3; // 1 -> 0
    }
  }

  /**
   * 订阅动画事件
   */
  subscribe(listener: (event: IdleAnimationEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 通知监听器
   */
  private notifyListeners(event: IdleAnimationEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('[IdleAnimation] Listener error:', error);
      }
    });
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<IdleAnimationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 获取当前配置
   */
  getConfig(): IdleAnimationConfig {
    return { ...this.config };
  }

  /**
   * 启用/禁用
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    if (!enabled) {
      this.endCurrentAnimation();
    }
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this.listeners.clear();
  }
}

/**
 * 表情映射到待机动画
 */
export function getIdleAnimationByEmotion(emotion: EmotionType): IdleAnimationType {
  const mapping: Record<EmotionType, IdleAnimationType> = {
    happy: 'excited',
    excited: 'excited',
    thinking: 'thinking',
    confused: 'looking-around',
    surprised: 'looking-around',
    neutral: 'breathing',
    sad: 'sleepy',
  };

  return mapping[emotion] || 'breathing';
}

/**
 * 计算动画强度（基于精力）
 */
export function calculateAnimationIntensity(energy: number): number {
  if (energy < 20) return 0.2; // 低精力：轻微动画
  if (energy < 50) return 0.5; // 中等精力
  return 0.8; // 高精力：活跃动画
}
