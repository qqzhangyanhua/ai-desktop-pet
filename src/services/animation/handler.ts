import type {
  InteractionZone,
  MicroInteractionConfig,
  MicroInteractionEvent,
  MicroInteractionResult,
  ParticleEffect,
  RippleEffect,
} from './types';
import { PET_INTERACTION_ZONES, DEFAULT_MICRO_INTERACTION_CONFIG } from './constants';
import type { EmotionType } from '@/types';

/**
 * 微互动处理器
 */
export class MicroInteractionHandler {
  private config: MicroInteractionConfig;
  private lastInteraction: Map<string, number> = new Map();
  private hoverTimer: Map<string, number> = new Map();
  private isHovering: Map<string, boolean> = new Map();
  private listeners: Set<(event: MicroInteractionEvent) => void> = new Set();

  constructor(config: MicroInteractionConfig = DEFAULT_MICRO_INTERACTION_CONFIG) {
    this.config = { ...config };
  }

  /**
   * 检查点是否在区域内
   */
  isInZone(x: number, y: number, zone: InteractionZone): boolean {
    return (
      x >= zone.x &&
      x <= zone.x + zone.width &&
      y >= zone.y &&
      y <= zone.y + zone.height
    );
  }

  /**
   * 获取鼠标位置对应的互动区域
   */
  getZoneAt(x: number, y: number): InteractionZone | null {
    for (const zone of PET_INTERACTION_ZONES) {
      if (this.isInZone(x, y, zone)) {
        return zone;
      }
    }
    return null;
  }

  /**
   * 处理鼠标悬停开始
   */
  onHoverStart(x: number, y: number): MicroInteractionEvent | null {
    const zone = this.getZoneAt(x, y);
    if (!zone) return null;

    const zoneId = zone.id;
    const now = Date.now();

    if (this.config.cooldownEnabled) {
      const last = this.lastInteraction.get(zoneId) || 0;
      if (now - last < this.config.cooldownDuration) {
        return null;
      }
    }

    this.isHovering.set(zoneId, true);

    if (this.config.hoverDelay > 0) {
      const timer = window.setTimeout(() => {
        if (this.isHovering.get(zoneId)) {
          const event: MicroInteractionEvent = {
            zone,
            type: 'hover-start',
            timestamp: Date.now(),
            position: { x, y },
            intensity: 0.5,
          };
          this.notifyListeners(event);
        }
      }, this.config.hoverDelay);

      this.hoverTimer.set(zoneId, timer);
    } else {
      const event: MicroInteractionEvent = {
        zone,
        type: 'hover-start',
        timestamp: now,
        position: { x, y },
        intensity: 0.5,
      };
      this.notifyListeners(event);
    }

    return {
      zone,
      type: 'hover-start',
      timestamp: now,
      position: { x, y },
      intensity: 0.5,
    };
  }

  /**
   * 处理鼠标悬停结束
   */
  onHoverEnd(x: number, y: number): MicroInteractionEvent | null {
    const zone = this.getZoneAt(x, y);
    if (!zone) return null;

    const zoneId = zone.id;

    const timer = this.hoverTimer.get(zoneId);
    if (timer) {
      clearTimeout(timer);
      this.hoverTimer.delete(zoneId);
    }

    this.isHovering.set(zoneId, false);

    const event: MicroInteractionEvent = {
      zone,
      type: 'hover-end',
      timestamp: Date.now(),
      position: { x, y },
      intensity: 0,
    };

    this.notifyListeners(event);
    return event;
  }

  /**
   * 处理鼠标移动（实时反馈）
   */
  onMouseMove(x: number, y: number): MicroInteractionEvent | null {
    const zone = this.getZoneAt(x, y);
    if (!zone) return null;

    const zoneId = zone.id;

    if (!this.isHovering.get(zoneId)) {
      return null;
    }

    const centerX = zone.x + zone.width / 2;
    const centerY = zone.y + zone.height / 2;
    const distance = Math.sqrt(
      Math.pow((x - centerX) / zone.width, 2) +
        Math.pow((y - centerY) / zone.height, 2)
    );

    const intensity = Math.max(0, 1 - distance);

    const event: MicroInteractionEvent = {
      zone,
      type: 'hover',
      timestamp: Date.now(),
      position: { x, y },
      intensity,
    };

    this.notifyListeners(event);
    return event;
  }

  /**
   * 处理点击
   */
  onClick(x: number, y: number): MicroInteractionEvent | null {
    const zone = this.getZoneAt(x, y);
    if (!zone) return null;

    const zoneId = zone.id;
    const now = Date.now();

    if (this.config.cooldownEnabled) {
      const last = this.lastInteraction.get(zoneId) || 0;
      if (now - last < this.config.cooldownDuration) {
        return null;
      }
    }

    this.lastInteraction.set(zoneId, now);

    const event: MicroInteractionEvent = {
      zone,
      type: 'click',
      timestamp: now,
      position: { x, y },
      intensity: 1.0,
    };

    this.notifyListeners(event);
    return event;
  }

  /**
   * 生成微互动反馈
   */
  generateFeedback(event: MicroInteractionEvent): MicroInteractionResult {
    const { zone, type, intensity } = event;

    let emotion: EmotionType = 'neutral';
    let animation: string | undefined;
    let particles: ParticleEffect | undefined;
    let sound: string | undefined;
    let message: string | undefined;
    let ripple: RippleEffect | undefined;

    if (type === 'hover-start' || type === 'hover') {
      switch (zone.id) {
        case 'head':
          emotion = 'thinking';
          message = '嗯？';
          particles = this.createParticleEffect('sparkle', 3, intensity);
          break;
        case 'body':
          emotion = 'neutral';
          message = '摸摸~';
          particles = this.createParticleEffect('bubble', 2, intensity);
          break;
        case 'feet':
          emotion = 'excited';
          message = '哈哈~';
          particles = this.createParticleEffect('heart', 4, intensity);
          break;
      }

      if (this.config.showRipple) {
        ripple = {
          x: event.position.x,
          y: event.position.y,
          color: '#ffffff',
          size: 20 + intensity * 10,
          duration: 500,
        };
      }
    }

    if (type === 'click') {
      switch (zone.id) {
        case 'head':
          emotion = 'happy';
          animation = 'tap_head';
          message = '好舒服~';
          particles = this.createParticleEffect('heart', 8, 1);
          sound = 'pet-click';
          break;
        case 'body':
          emotion = 'happy';
          animation = 'eat';
          message = '嗯嗯~';
          particles = this.createParticleEffect('star', 6, 1);
          sound = 'body-click';
          break;
        case 'feet':
          emotion = 'excited';
          animation = 'happy';
          message = '好开心!';
          particles = this.createParticleEffect('heart', 10, 1);
          sound = 'feet-click';
          break;
      }

      ripple = {
        x: event.position.x,
        y: event.position.y,
        color: '#ff69b4',
        size: 30,
        duration: 300,
      };
    }

    return {
      emotion,
      animation,
      particles,
      sound,
      message,
      ripple,
    };
  }

  /**
   * 创建粒子效果
   */
  private createParticleEffect(
    type: ParticleEffect['type'],
    count: number,
    intensity: number
  ): ParticleEffect {
    const configs = {
      heart: {
        color: '#ff69b4',
        velocity: { x: 0, y: -50 },
        gravity: 10,
      },
      star: {
        color: '#ffd700',
        velocity: { x: 0, y: -40 },
        gravity: 8,
      },
      sparkle: {
        color: '#ffffff',
        velocity: { x: 0, y: -30 },
        gravity: 5,
      },
      bubble: {
        color: '#87ceeb',
        velocity: { x: 0, y: -20 },
        gravity: 2,
      },
    };

    const config = configs[type];

    return {
      type,
      count: Math.floor(count * intensity),
      color: config.color,
      duration: 1500,
      size: 8 + intensity * 4,
      velocity: { ...config.velocity },
      gravity: config.gravity,
      fadeOut: true,
    };
  }

  /**
   * 订阅微互动事件
   */
  subscribe(listener: (event: MicroInteractionEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 通知监听器
   */
  private notifyListeners(event: MicroInteractionEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('[MicroInteraction] Listener error:', error);
      }
    });
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<MicroInteractionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 获取当前配置
   */
  getConfig(): MicroInteractionConfig {
    return { ...this.config };
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.hoverTimer.forEach((timer) => clearTimeout(timer));
    this.hoverTimer.clear();
    this.isHovering.clear();
    this.lastInteraction.clear();
    this.listeners.clear();
  }
}
