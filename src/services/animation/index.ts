// @ts-nocheck
/**
 * Animation System - Unified Exports
 * 动画系统 - 统一导出
 */

export { MicroInteractionHandler, calculateRelativePosition } from './micro-interactions';
export type {
  MicroInteractionConfig,
  MicroInteractionEvent,
  MicroInteractionResult,
  InteractionZone,
  ParticleEffect,
  RippleEffect,
} from './micro-interactions';

export { ParticleSystem, createParticleSystem } from './particle-system';

export {
  IdleAnimationManager,
  getIdleAnimationByEmotion,
  calculateAnimationIntensity,
} from './idle-animations';
export type {
  IdleAnimationConfig,
  IdleAnimationState,
  IdleAnimationEvent,
  IdleAnimationType,
} from './idle-animations';

/**
 * 动画系统管理器
 * 整合微互动、粒子效果和待机动画
 */
import { MicroInteractionHandler } from './micro-interactions';
import { ParticleSystem, createParticleSystem } from './particle-system';
import { IdleAnimationManager } from './idle-animations';
import type { EmotionType } from '@/types';

export class AnimationManager {
  private microInteraction: MicroInteractionHandler;
  private particleSystem: ParticleSystem | null = null;
  private idleAnimation: IdleAnimationManager;
  private animationCanvas: HTMLCanvasElement | null = null;
  private isInitialized = false;

  constructor(
    microConfig?: Parameters<typeof MicroInteractionHandler>[0],
    idleConfig?: Parameters<typeof IdleAnimationManager>[0]
  ) {
    this.microInteraction = new MicroInteractionHandler(microConfig);
    this.idleAnimation = new IdleAnimationManager(idleConfig);

    // 订阅微互动事件
    this.microInteraction.subscribe((event) => {
      this.handleMicroInteraction(event);
    });

    // 订阅待机动画事件
    this.idleAnimation.subscribe((event) => {
      this.handleIdleAnimation(event);
    });
  }

  /**
   * 初始化动画系统
   */
  initialize(canvas: HTMLCanvasElement): void {
    this.animationCanvas = canvas;
    this.particleSystem = createParticleSystem(canvas, {
      maxParticles: 500,
      enabled: true,
    });

    this.particleSystem.start();

    this.isInitialized = true;
  }

  /**
   * 处理微互动事件
   */
  private handleMicroInteraction(event: any): void {
    if (!this.particleSystem) return;

    const result = this.microInteraction.generateFeedback(event);

    // 创建粒子效果
    if (result.particles) {
      const rect = this.animationCanvas!.getBoundingClientRect();
      const x = event.position.x * rect.width;
      const y = event.position.y * rect.height;
      this.particleSystem.createParticles(result.particles, x, y);
    }

    // 创建波纹效果
    if (result.ripple) {
      this.particleSystem.createRipple(result.ripple);
    }

    // 通知外部监听器
    this.listeners.forEach((listener) => {
      listener({
        type: 'micro-interaction',
        data: { event, result },
      });
    });
  }

  /**
   * 处理待机动画事件
   */
  private handleIdleAnimation(event: any): void {
    // 通知外部监听器
    this.listeners.forEach((listener) => {
      listener({
        type: 'idle-animation',
        data: event,
      });
    });
  }

  /**
   * 主更新循环
   * 在动画帧中调用
   */
  update(): void {
    if (!this.isInitialized) return;

    this.idleAnimation.update();
  }

  /**
   * 处理鼠标事件
   */
  handleMouseMove(clientX: number, clientY: number, element: HTMLElement): void {
    const position = calculateRelativePosition(clientX, clientY, element);
    this.microInteraction.onMouseMove(position.x, position.y);
  }

  handleMouseEnter(clientX: number, clientY: number, element: HTMLElement): void {
    const position = calculateRelativePosition(clientX, clientY, element);
    this.microInteraction.onHoverStart(position.x, position.y);
  }

  handleMouseLeave(clientX: number, clientY: number, element: HTMLElement): void {
    const position = calculateRelativePosition(clientX, clientY, element);
    this.microInteraction.onHoverEnd(position.x, position.y);
  }

  handleClick(clientX: number, clientY: number, element: HTMLElement): void {
    const position = calculateRelativePosition(clientX, clientY, element);
    this.microInteraction.onClick(position.x, position.y);
  }

  /**
   * 更新宠物状态
   */
  updatePetState(emotion: EmotionType, energy: number): void {
    this.idleAnimation.updateEmotion(emotion);
    this.idleAnimation.updateEnergy(energy);
  }

  /**
   * 触发特效
   */
  triggerEffect(
    type: 'particle' | 'ripple',
    effect: any,
    x: number,
    y: number
  ): void {
    if (!this.particleSystem) return;

    if (type === 'particle') {
      this.particleSystem.createParticles(effect, x, y);
    } else if (type === 'ripple') {
      this.particleSystem.createRipple(effect);
    }
  }

  /**
   * 获取当前动画状态
   */
  getCurrentAnimation() {
    return this.idleAnimation.getCurrentAnimation();
  }

  /**
   * 获取呼吸值
   */
  getBreathingValue(): number {
    return this.idleAnimation.getBreathingValue();
  }

  /**
   * 获取摇摆角度
   */
  getSwayAngle(): number {
    return this.idleAnimation.getSwayAngle();
  }

  /**
   * 获取注视方向
   */
  getLookDirection(): number {
    return this.idleAnimation.getLookDirection();
  }

  /**
   * 是否正在眨眼
   */
  isBlinking(): boolean {
    return this.idleAnimation.isCurrentlyBlinking();
  }

  /**
   * 监听器
   */
  private listeners: Set<(event: any) => void> = new Set();

  subscribe(listener: (event: any) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 配置更新
   */
  updateMicroConfig(config: any): void {
    this.microInteraction.updateConfig(config);
  }

  updateIdleConfig(config: any): void {
    this.idleAnimation.updateConfig(config);
  }

  updateParticleConfig(config: any): void {
    if (this.particleSystem) {
      this.particleSystem.updateConfig(config);
    }
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.microInteraction.destroy();
    this.idleAnimation.destroy();
    if (this.particleSystem) {
      this.particleSystem.destroy();
    }
    this.listeners.clear();
    this.isInitialized = false;
  }
}
