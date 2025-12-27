// Live2D Manager - Wrapper around OhMyLive2D

import { loadOml2d } from 'oh-my-live2d';
import type { Live2DModelConfig, Live2DState, Live2DEmotionMapping, PetActionType } from '../../types';
import type { EmotionType } from '../../types';
import type { Oml2dMethods, Oml2dProperties, Oml2dEvents } from 'oh-my-live2d';
import type { IdleGesture } from '@/services/pet/idle-behavior';

type Oml2dInstance = Oml2dProperties & Oml2dMethods & Oml2dEvents;

// Default emotion to motion mapping
const DEFAULT_EMOTION_MAPPING: Live2DEmotionMapping = {
  happy: 'tap_body',
  sad: 'idle',
  angry: 'shake',
  surprised: 'flick_head',
  thinking: 'idle',
  neutral: 'idle',
  excited: 'tap_body',
  confused: 'shake',
};

export class Live2DManager {
  private instance: Oml2dInstance | null = null;
  private models: Live2DModelConfig[] = [];
  private state: Live2DState = {
    isLoaded: false,
    currentModel: null,
    currentModelIndex: 0,
    isPlaying: true,
  };
  private emotionMapping: Live2DEmotionMapping = DEFAULT_EMOTION_MAPPING;
  private onStateChange?: (state: Live2DState) => void;
  private actionAudio: Partial<Record<PetActionType, string>> = {};
  private audioContext: AudioContext | null = null;
  private actionTimers: number[] = [];
  private speakingTimer: number | null = null;
  private baseScale = 0.1;
  private basePosition: { x: number; y: number } = { x: 0, y: 50 };

  constructor() {
    // Manager is initialized but not loaded until init() is called
  }

  async init(models: Live2DModelConfig[], options?: {
    dockedPosition?: 'left' | 'right';
    primaryColor?: string;
    onStateChange?: (state: Live2DState) => void;
  }): Promise<void> {
    if (this.instance) {
      console.warn('Live2DManager already initialized');
      return;
    }

    this.onStateChange = options?.onStateChange;
    this.models = models;

    try {
      this.instance = loadOml2d({
        models: models.map(m => ({
          name: m.name,
          path: m.path,
          scale: m.scale ?? 0.1,
          position: m.position ?? [0, 50],
          stageStyle: {
            height: m.stageStyle?.height ?? 400,
            width: m.stageStyle?.width ?? 300,
          },
        })),
        dockedPosition: options?.dockedPosition ?? 'right',
        primaryColor: options?.primaryColor ?? '#58b0fc',
        sayHello: false,
        tips: {
          idleTips: {
            wordTheDay: false,
          },
        },
        statusBar: {
          disable: true,
        },
        menus: {
          disable: true,
        },
      }) as Oml2dInstance;

      // Set up event handlers
      this.instance.onLoad((status) => {
        if (status === 'success') {
          this.state.isLoaded = true;
          this.state.currentModelIndex = this.instance?.modelIndex ?? 0;
          this.state.currentModel = this.models[this.state.currentModelIndex]?.name ?? null;
          const base = this.models[this.state.currentModelIndex];
          this.baseScale = base?.scale ?? 0.1;
          const pos = base?.position ?? [0, 50];
          this.basePosition = { x: pos[0] ?? 0, y: pos[1] ?? 50 };
          this.resetModelTransform();
          this.emitStateChange();
        }
      });

      this.instance.onStageSlideIn(() => {
        this.state.isPlaying = true;
        this.emitStateChange();
      });

      this.instance.onStageSlideOut(() => {
        this.state.isPlaying = false;
        this.emitStateChange();
      });

    } catch (error) {
      console.error('Failed to initialize Live2D:', error);
      throw error;
    }
  }

  private emitStateChange(): void {
    this.onStateChange?.({ ...this.state });
  }

  getState(): Live2DState {
    return { ...this.state };
  }

  isInitialized(): boolean {
    return this.instance !== null;
  }

  // Model management
  async loadModel(indexOrName: number | string): Promise<void> {
    if (!this.instance) {
      throw new Error('Live2DManager not initialized');
    }

    if (typeof indexOrName === 'number') {
      await this.instance.loadModelByIndex(indexOrName);
    } else {
      await this.instance.loadModelByName(indexOrName);
    }
  }

  async loadNextModel(): Promise<void> {
    if (!this.instance) {
      throw new Error('Live2DManager not initialized');
    }
    await this.instance.loadNextModel();
  }

  async loadNextClothes(): Promise<void> {
    if (!this.instance) {
      throw new Error('Live2DManager not initialized');
    }
    await this.instance.loadNextModelClothes();
  }

  // Visibility
  async show(): Promise<void> {
    if (!this.instance) return;
    await this.instance.stageSlideIn();
  }

  async hide(): Promise<void> {
    if (!this.instance) return;
    await this.instance.stageSlideOut();
  }

  // Tips/Messages
  showMessage(message: string, duration: number = 3000, priority: number = 5): void {
    if (!this.instance) return;
    this.instance.tipsMessage(message, duration, priority);
  }

  clearMessages(): void {
    if (!this.instance) return;
    this.instance.clearTips();
  }

  // Emotion mapping
  setEmotionMapping(mapping: Partial<Live2DEmotionMapping>): void {
    this.emotionMapping = { ...this.emotionMapping, ...mapping };
  }

  // 为动作绑定音效文件
  setActionAudio(action: PetActionType, url: string): void {
    this.actionAudio[action] = url;
  }

  setActionAudioMap(map: Partial<Record<PetActionType, string>>): void {
    this.actionAudio = { ...this.actionAudio, ...map };
  }

  // Trigger emotion - maps to motion
  triggerEmotion(emotion: EmotionType): void {
    const motionGroup = this.emotionMapping[emotion] || 'idle';
    // OhMyLive2D doesn't expose direct motion control
    // We'll use tips as visual feedback for now
    // In production, we'd need to access the underlying Live2D model
    console.log(`Triggering emotion: ${emotion} -> motion: ${motionGroup}`);
  }

  // 简易动作提示/变装映射
  playAction(action: PetActionType): void {
    if (!this.instance) return;

    this.cancelActionEffects();
    this.resetModelTransform();

    switch (action) {
      case 'feed':
        this.statusBarPopup('🍎 咔嚓咔嚓', 2400, '#22c55e');
        this.instance.tipsMessage('咔嚓咔嚓吃苹果~', 2800, 6);
        this.pulseScale(1.03, 2, 140);
        this.playActionSound(action);
        break;
      case 'play':
        this.statusBarPopup('🎮 开始玩啦', 2400, '#0ea5e9');
        this.instance.tipsMessage('小游戏时间！', 2600, 6);
        this.bounce(6, 4, 9, 70);
        this.playActionSound(action);
        break;
      case 'sleep':
        this.statusBarPopup('😴 小憩一下', 2600, '#a855f7');
        this.instance.tipsMessage('稍作休息...', 3200, 5);
        this.stageSleep(3600);
        this.playActionSound(action);
        break;
      case 'work':
        this.statusBarOpen('🧰 打工中…', '#f59e0b');
        this.instance.tipsMessage('打工中…', 3000, 5);
        this.sway(10, 10, 120);
        this.schedule(() => {
          this.statusBarClose('完成一小段工作', 1200, '#10b981');
        }, 4200);
        this.playActionSound(action);
        break;
      case 'transform':
        this.statusBarPopup('✨ 变身', 2200, '#f97316');
        this.instance.tipsMessage('变身中...', 3200, 7);
        this.schedule(() => {
          this.instance
            ?.loadNextModelClothes()
            .catch(() => this.instance?.loadNextModel())
            .catch(() => this.instance?.loadRandomModel())
            .catch((err) => console.warn('变身切换模型失败', err));
        }, 300);
        this.playActionSound(action);
        break;
      case 'music':
        this.statusBarPopup('🎵 一起听歌', 2400, '#06b6d4');
        this.instance.tipsMessage('播放一首喜欢的歌', 2600, 6);
        this.sway(12, 14, 120);
        this.playActionSound(action);
        break;
      case 'dance':
        this.statusBarPopup('💃 舞蹈模式', 2400, '#ec4899');
        this.instance.tipsMessage('舞蹈模式开启！', 2600, 7);
        this.sway(16, 18, 90);
        this.bounce(8, 6, 8, 60);
        this.playActionSound(action);
        break;
      case 'magic':
        this.statusBarPopup('🎩 小魔术', 2200, '#8b5cf6');
        this.instance.tipsMessage('看我小魔术~', 2600, 6);
        this.twist(18, 6, 80);
        this.flashHitArea(1100);
        this.playActionSound(action);
        break;
      case 'art':
        this.statusBarPopup('🎨 生成艺术', 2600, '#14b8a6');
        this.instance.tipsMessage('生成艺术中...', 3000, 5);
        this.pulseScale(1.05, 3, 140);
        this.playActionSound(action);
        break;
      case 'clean':
        this.statusBarPopup('🫧 清洁中', 2400, '#3b82f6');
        this.instance.tipsMessage('正在清洁~', 2600, 6);
        this.bounce(5, 3, 10, 80);
        this.playActionSound(action);
        break;
      case 'brush':
        this.statusBarPopup('🪮 梳毛', 2400, '#84cc16');
        this.instance.tipsMessage('梳毛梳毛~', 2600, 6);
        this.sway(10, 12, 140);
        this.playActionSound(action);
        break;
      case 'rest':
        this.statusBarPopup('🧘 放松一下', 2600, '#22c55e');
        this.instance.tipsMessage('放松一下', 2600, 5);
        this.pulseScale(1.02, 4, 180);
        this.playActionSound(action);
        break;
      default:
        break;
    }
  }

  // 说话状态联动（轻量嘴型替代：小幅度摇摆/缩放）
  setSpeaking(isSpeaking: boolean): void {
    if (typeof window === 'undefined') return;
    if (!this.instance) return;

    if (!isSpeaking) {
      if (this.speakingTimer) {
        window.clearInterval(this.speakingTimer);
        this.speakingTimer = null;
      }
      // 仅重置旋转/缩放，避免破坏外部对位置的控制
      try {
        this.instance.setModelRotation(0);
        this.instance.setModelScale(this.baseScale);
      } catch {
        // ignore
      }
      return;
    }

    if (this.speakingTimer) return;

    let phase = 0;
    this.speakingTimer = window.setInterval(() => {
      if (!this.instance) return;
      phase += 1;
      const rot = (phase % 4) * 1.2 - 1.8; // [-1.8, 1.8] 的小摆动
      const scale = this.baseScale * (phase % 2 === 0 ? 1.01 : 0.99);
      try {
        this.instance.setModelRotation(rot);
        this.instance.setModelScale(scale);
      } catch {
        // ignore
      }
    }, 180);
  }

  // Idle 小动作（不显示提示，不改变数值）
  playIdleGesture(gesture: IdleGesture): void {
    if (!this.instance) return;
    this.cancelActionEffects();
    this.resetModelTransform();

    switch (gesture) {
      case 'sway':
        this.sway(6, 10, 140);
        break;
      case 'bounce':
        this.bounce(6, 4, 10, 80);
        break;
      case 'pulse':
        this.pulseScale(1.02, 3, 180);
        break;
      default:
        break;
    }
  }

  private schedule(fn: () => void, delayMs: number): void {
    if (typeof window === 'undefined') return;
    const id = window.setTimeout(fn, delayMs);
    this.actionTimers.push(id);
  }

  private cancelActionEffects(): void {
    if (typeof window === 'undefined') return;
    for (const id of this.actionTimers) {
      window.clearTimeout(id);
    }
    this.actionTimers = [];

    // 避免状态条被上一次动作遗留
    try {
      this.instance?.statusBarClearEvents();
    } catch {
      // ignore
    }
  }

  private statusBarPopup(content: string, delay: number, color?: string): void {
    try {
      this.instance?.statusBarPopup(content, delay, color);
    } catch {
      // ignore
    }
  }

  private statusBarOpen(content?: string, color?: string): void {
    try {
      this.instance?.statusBarOpen(content, color);
    } catch {
      // ignore
    }
  }

  private statusBarClose(content?: string, delay?: number, color?: string): void {
    try {
      this.instance?.statusBarClose(content, delay, color);
    } catch {
      // ignore
    }
  }

  private resetModelTransform(): void {
    if (!this.instance) return;
    try {
      this.instance.setModelRotation(0);
      this.instance.setModelPosition(this.basePosition);
      this.instance.setModelScale(this.baseScale);
    } catch {
      // ignore
    }
  }

  private pulseScale(multiplier: number, times: number, intervalMs: number): void {
    if (!this.instance) return;
    const up = this.baseScale * multiplier;
    const down = this.baseScale;
    for (let i = 0; i < times; i++) {
      this.schedule(() => this.instance?.setModelScale(up), i * intervalMs * 2);
      this.schedule(() => this.instance?.setModelScale(down), i * intervalMs * 2 + intervalMs);
    }
    this.schedule(() => this.resetModelTransform(), times * intervalMs * 2 + 20);
  }

  private bounce(dx: number, dy: number, times: number, intervalMs: number): void {
    if (!this.instance) return;
    for (let i = 0; i < times; i++) {
      const sign = i % 2 === 0 ? 1 : -1;
      this.schedule(
        () =>
          this.instance?.setModelPosition({
            x: this.basePosition.x + dx * sign,
            y: this.basePosition.y + dy * (sign > 0 ? -1 : 1),
          }),
        i * intervalMs
      );
    }
    this.schedule(() => this.resetModelTransform(), times * intervalMs + 40);
  }

  private sway(maxDeg: number, times: number, intervalMs: number): void {
    if (!this.instance) return;
    for (let i = 0; i < times; i++) {
      const sign = i % 2 === 0 ? 1 : -1;
      this.schedule(() => this.instance?.setModelRotation(maxDeg * sign), i * intervalMs);
    }
    this.schedule(() => this.resetModelTransform(), times * intervalMs + 40);
  }

  private twist(maxDeg: number, times: number, intervalMs: number): void {
    if (!this.instance) return;
    for (let i = 0; i < times; i++) {
      const phase = i % 3;
      const deg = phase === 0 ? maxDeg : phase === 1 ? -maxDeg : 0;
      this.schedule(() => this.instance?.setModelRotation(deg), i * intervalMs);
    }
    this.schedule(() => this.resetModelTransform(), times * intervalMs + 40);
  }

  private flashHitArea(durationMs: number): void {
    if (!this.instance) return;
    try {
      this.instance.showModelHitAreaFrames();
      this.schedule(() => this.instance?.hideModelHitAreaFrames(), durationMs);
    } catch {
      // ignore
    }
  }

  private stageSleep(durationMs: number): void {
    if (!this.instance) return;
    void this.instance.stageSlideOut().catch(() => undefined);
    this.schedule(() => void this.instance?.stageSlideIn().catch(() => undefined), durationMs);
  }

  // 播放动作音效，优先使用绑定资源，否则生成短暂提示音
  private playActionSound(action: PetActionType): void {
    if (typeof window === 'undefined') return;
    const url = this.actionAudio[action];

    if (url) {
      const audio = new Audio(url);
      void audio.play().catch((err) => console.warn('音效播放失败', err));
      return;
    }

    // 兜底：使用 Web Audio 生成 0.2s 短提示音
    try {
      if (!this.audioContext) {
        type WebkitWindow = typeof window & { webkitAudioContext?: typeof AudioContext };
        const Ctor = window.AudioContext || (window as WebkitWindow).webkitAudioContext;
        if (!Ctor) return;
        this.audioContext = new Ctor();
      }
      const ctx = this.audioContext;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      // 简单按动作区分频率，让反馈更“有性格”
      const baseHz: Record<PetActionType, number> = {
        feed: 660,
        play: 880,
        sleep: 220,
        work: 440,
        transform: 740,
        music: 520,
        dance: 980,
        magic: 1040,
        art: 600,
        clean: 560,
        brush: 480,
        rest: 360,
      };
      osc.frequency.value = baseHz[action] ?? 880;
      gain.gain.value = 0.08;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (err) {
      console.warn('生成提示音失败', err);
    }
  }

  // Cleanup
  destroy(): void {
    if (typeof window !== 'undefined' && this.speakingTimer) {
      window.clearInterval(this.speakingTimer);
      this.speakingTimer = null;
    }
    this.cancelActionEffects();
    // OhMyLive2D doesn't have a destroy method
    // We just clear our reference
    this.instance = null;
    this.models = [];
    this.state = {
      isLoaded: false,
      currentModel: null,
      currentModelIndex: 0,
      isPlaying: false,
    };

    if (this.audioContext) {
      this.audioContext.close().catch(() => undefined);
      this.audioContext = null;
    }
  }
}

// Singleton instance
let managerInstance: Live2DManager | null = null;

export function getLive2DManager(): Live2DManager {
  if (!managerInstance) {
    managerInstance = new Live2DManager();
  }
  return managerInstance;
}

export function destroyLive2DManager(): void {
  if (managerInstance) {
    managerInstance.destroy();
    managerInstance = null;
  }
}
