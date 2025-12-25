// Live2D Manager - Wrapper around OhMyLive2D

import { loadOml2d } from 'oh-my-live2d';
import type { Live2DModelConfig, Live2DState, Live2DEmotionMapping, PetActionType } from '../../types';
import type { EmotionType } from '../../types';

// OhMyLive2D instance type (simplified)
interface Oml2dInstance {
  version: string;
  modelIndex: number;
  loadNextModel: () => Promise<void>;
  loadModelByIndex: (index: number) => Promise<void>;
  loadModelByName: (name: string) => Promise<void>;
  loadNextModelClothes: () => Promise<void>;
  tipsMessage: (message: string, duration: number, priority: number) => void;
  clearTips: () => void;
  stageSlideIn: () => Promise<void>;
  stageSlideOut: () => Promise<void>;
  onLoad: (callback: (status: string) => void) => void;
  onStageSlideIn: (callback: () => void) => void;
  onStageSlideOut: (callback: () => void) => void;
  options: {
    models: Live2DModelConfig[];
  };
}

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
          this.state.currentModel = models[this.state.currentModelIndex]?.name ?? null;
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

    switch (action) {
      case 'feed':
        this.instance.tipsMessage('咔嚓咔嚓吃苹果~', 2800, 6);
        this.playActionSound(action);
        break;
      case 'play':
        this.instance.tipsMessage('小游戏时间！', 2600, 6);
        this.playActionSound(action);
        break;
      case 'sleep':
        this.instance.tipsMessage('稍作休息...', 3200, 5);
        this.playActionSound(action);
        break;
      case 'transform':
        this.instance.tipsMessage('变身中…✨', 3200, 7);
        this.loadNextModel().catch((err) => console.warn('变身切换模型失败', err));
        this.playActionSound(action);
        break;
      case 'music':
        this.instance.tipsMessage('播放一首喜欢的歌', 2600, 6);
        this.playActionSound(action);
        break;
      case 'dance':
        this.instance.tipsMessage('舞蹈模式开启！', 2600, 7);
        this.playActionSound(action);
        break;
      case 'magic':
        this.instance.tipsMessage('看我小魔术~', 2600, 6);
        this.playActionSound(action);
        break;
      case 'art':
        this.instance.tipsMessage('生成艺术中...', 3000, 5);
        this.playActionSound(action);
        break;
      case 'clean':
        this.instance.tipsMessage('正在清洁~', 2600, 6);
        this.playActionSound(action);
        break;
      case 'brush':
        this.instance.tipsMessage('梳毛梳毛~', 2600, 6);
        this.playActionSound(action);
        break;
      case 'rest':
        this.instance.tipsMessage('放松一下', 2600, 5);
        this.playActionSound(action);
        break;
      default:
        break;
    }
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
      osc.frequency.value = 880;
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
    // OhMyLive2D doesn't have a destroy method
    // We just clear our reference
    this.instance = null;
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
