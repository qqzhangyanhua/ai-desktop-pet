/**
 * Particle Effect System
 * 粒子特效系统
 *
 * 高性能粒子渲染引擎
 */

import type { ParticleEffect, RippleEffect } from './micro-interactions';

/**
 * 粒子实例
 */
interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;      // 剩余生命（0-1）
  rotation: number;
  rotationSpeed: number;
  type: ParticleEffect['type'];
}

/**
 * 波纹实例
 */
interface Ripple {
  id: string;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
  lineWidth: number;
}

/**
 * 粒子系统配置
 */
interface ParticleSystemConfig {
  maxParticles: number;
  gravity: number;
  friction: number;
  enabled: boolean;
}

/**
 * 粒子系统
 */
export class ParticleSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Map<string, Particle> = new Map();
  private ripples: Map<string, Ripple> = new Map();
  private config: ParticleSystemConfig;
  private animationFrameId: number | null = null;
  private isRunning = false;
  private lastTime = 0;

  constructor(canvas: HTMLCanvasElement, config?: Partial<ParticleSystemConfig>) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法获取Canvas 2D上下文');
    }
    this.ctx = ctx;

    this.config = {
      maxParticles: 1000,
      gravity: 0.3,
      friction: 0.98,
      enabled: true,
      ...config,
    };

    this.setupCanvas();
  }

  /**
   * 设置Canvas
   */
  private setupCanvas(): void {
    // 高DPI支持
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;

    this.ctx.scale(dpr, dpr);
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
  }

  /**
   * 创建粒子
   */
  createParticles(effect: ParticleEffect, x: number, y: number): void {
    if (!this.config.enabled) return;
    if (this.particles.size >= this.config.maxParticles) return;

    const count = Math.min(effect.count, this.config.maxParticles - this.particles.size);

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = Math.random() * 30 + 20;

      const particle: Particle = {
        id: `particle-${Date.now()}-${i}-${Math.random()}`,
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed + (effect.velocity?.x || 0),
        vy: Math.sin(angle) * speed + (effect.velocity?.y || 0),
        size: effect.size * (0.8 + Math.random() * 0.4),
        color: effect.color,
        alpha: 1,
        life: 1,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        type: effect.type,
      };

      this.particles.set(particle.id, particle);
    }
  }

  /**
   * 创建波纹效果
   */
  createRipple(effect: RippleEffect): void {
    if (!this.config.enabled) return;

    const ripple: Ripple = {
      id: `ripple-${Date.now()}-${Math.random()}`,
      x: effect.x,
      y: effect.y,
      radius: 0,
      maxRadius: effect.size,
      alpha: 0.6,
      color: effect.color,
      lineWidth: 2,
    };

    this.ripples.set(ripple.id, ripple);
  }

  /**
   * 启动渲染循环
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.animate();
  }

  /**
   * 停止渲染循环
   */
  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * 渲染循环
   */
  private animate(): void {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = Math.min(currentTime - this.lastTime, 33); // 限制最大帧时间
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.render();

    this.animationFrameId = requestAnimationFrame(() => this.animate());
  }

  /**
   * 更新粒子和波纹
   */
  private update(deltaTime: number): void {
    const dt = deltaTime / 16.67; // 标准化到60fps

    // 更新粒子
    this.particles.forEach((particle, id) => {
      // 更新速度
      particle.vy += this.config.gravity * dt;

      // 应用摩擦力
      particle.vx *= this.config.friction;
      particle.vy *= this.config.friction;

      // 更新位置
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;

      // 更新生命
      particle.life -= deltaTime / (particle.type === 'heart' ? 2000 : 1500);

      // 更新透明度
      particle.alpha = particle.life;

      // 更新旋转
      particle.rotation += particle.rotationSpeed * dt;

      // 移除死亡粒子
      if (particle.life <= 0) {
        this.particles.delete(id);
      }
    });

    // 更新波纹
    this.ripples.forEach((ripple, id) => {
      ripple.radius += (ripple.maxRadius - ripple.radius) * 0.1;
      ripple.alpha -= deltaTime / (ripple.maxRadius * 20);

      if (ripple.alpha <= 0) {
        this.ripples.delete(id);
      }
    });
  }

  /**
   * 渲染所有效果
   */
  private render(): void {
    // 清空画布
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 渲染波纹（在底层）
    this.ripples.forEach((ripple) => {
      this.renderRipple(ripple);
    });

    // 渲染粒子
    this.particles.forEach((particle) => {
      this.renderParticle(particle);
    });
  }

  /**
   * 渲染单个粒子
   */
  private renderParticle(particle: Particle): void {
    this.ctx.save();

    this.ctx.globalAlpha = particle.alpha;
    this.ctx.translate(particle.x, particle.y);
    this.ctx.rotate(particle.rotation);

    switch (particle.type) {
      case 'heart':
        this.renderHeart(particle);
        break;
      case 'star':
        this.renderStar(particle);
        break;
      case 'sparkle':
        this.renderSparkle(particle);
        break;
      case 'bubble':
        this.renderBubble(particle);
        break;
    }

    this.ctx.restore();
  }

  /**
   * 渲染爱心
   */
  private renderHeart(particle: Particle): void {
    const size = particle.size;
    this.ctx.fillStyle = particle.color;

    this.ctx.beginPath();
    this.ctx.moveTo(0, -size / 3);
    this.ctx.bezierCurveTo(size / 2, -size, size, -size / 3, 0, size);
    this.ctx.bezierCurveTo(-size, -size / 3, -size / 2, -size, 0, -size / 3);
    this.ctx.fill();
  }

  /**
   * 渲染星星
   */
  private renderStar(particle: Particle): void {
    const spikes = 5;
    const outerRadius = particle.size;
    const innerRadius = outerRadius / 2;
    const rot = Math.PI / 2 * 3;

    this.ctx.fillStyle = particle.color;
    this.ctx.beginPath();
    this.ctx.moveTo(0, -outerRadius);

    for (let i = 0; i < spikes; i++) {
      this.ctx.lineTo(
        Math.cos(rot + (i * Math.PI * 2) / spikes) * outerRadius,
        Math.sin(rot + (i * Math.PI * 2) / spikes) * outerRadius
      );
      this.ctx.lineTo(
        Math.cos(rot + ((i + 0.5) * Math.PI * 2) / spikes) * innerRadius,
        Math.sin(rot + ((i + 0.5) * Math.PI * 2) / spikes) * innerRadius
      );
    }
    this.ctx.closePath();
    this.ctx.fill();
  }

  /**
   * 渲染闪光
   */
  private renderSparkle(particle: Particle): void {
    const size = particle.size;
    this.ctx.strokeStyle = particle.color;
    this.ctx.lineWidth = 2;

    this.ctx.beginPath();
    this.ctx.moveTo(-size, 0);
    this.ctx.lineTo(size, 0);
    this.ctx.moveTo(0, -size);
    this.ctx.lineTo(0, size);
    this.ctx.stroke();
  }

  /**
   * 渲染泡泡
   */
  private renderBubble(particle: Particle): void {
    const radius = particle.size / 2;
    this.ctx.strokeStyle = particle.color;
    this.ctx.lineWidth = 1.5;

    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
    this.ctx.stroke();

    // 高光效果
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.beginPath();
    this.ctx.arc(-radius / 3, -radius / 3, radius / 3, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /**
   * 渲染波纹
   */
  private renderRipple(ripple: Ripple): void {
    this.ctx.save();

    this.ctx.globalAlpha = ripple.alpha;
    this.ctx.strokeStyle = ripple.color;
    this.ctx.lineWidth = ripple.lineWidth;

    this.ctx.beginPath();
    this.ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.restore();
  }

  /**
   * 清空所有效果
   */
  clear(): void {
    this.particles.clear();
    this.ripples.clear();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<ParticleSystemConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 获取当前配置
   */
  getConfig(): ParticleSystemConfig {
    return { ...this.config };
  }

  /**
   * 获取活跃粒子数量
   */
  getActiveParticleCount(): number {
    return this.particles.size;
  }

  /**
   * 获取活跃波纹数量
   */
  getActiveRippleCount(): number {
    return this.ripples.size;
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.stop();
    this.clear();
    this.particles.clear();
    this.ripples.clear();
  }

  /**
   * 窗口大小改变时重新设置Canvas
   */
  resize(): void {
    this.setupCanvas();
  }
}

/**
 * 创建粒子系统实例
 */
export function createParticleSystem(
  canvas: HTMLCanvasElement,
  config?: Partial<ParticleSystemConfig>
): ParticleSystem {
  return new ParticleSystem(canvas, config);
}
