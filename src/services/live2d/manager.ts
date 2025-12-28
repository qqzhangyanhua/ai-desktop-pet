import type { Live2DModelConfig, Live2DState, Live2DEmotionMapping, PetActionType } from '../../types';
import type { Oml2dMethods, Oml2dProperties, Oml2dEvents } from 'oh-my-live2d';
import type { IdleGesture } from '@/services/pet/idle-behavior';
import { Live2DLoader } from './loader';
import { Live2DActions } from './actions';

type Oml2dInstance = Oml2dProperties & Oml2dMethods & Oml2dEvents;

export class Live2DManager {
  private instance: Oml2dInstance | null = null;
  private models: Live2DModelConfig[] = [];
  private state: Live2DState = {
    isLoaded: false,
    currentModel: null,
    currentModelIndex: 0,
    isPlaying: true,
  };
  private onStateChange?: (state: Live2DState) => void;
  private loader: Live2DLoader;
  private actions: Live2DActions;
  private baseScale = 0.1;
  private basePosition: { x: number; y: number } = { x: 0, y: 50 };

  constructor() {
    this.loader = new Live2DLoader();
    this.actions = new Live2DActions(null);
  }

  async init(models: Live2DModelConfig[], options?: {
    dockedPosition?: 'left' | 'right';
    primaryColor?: string;
    onStateChange?: (state: Live2DState) => void;
  }): Promise<void> {
    this.onStateChange = options?.onStateChange;
    this.models = models;

    try {
      const instance = await this.loader.init(models, {
        dockedPosition: options?.dockedPosition,
        primaryColor: options?.primaryColor,
        onStateChange: (state) => {
          this.state = state;
          this.emitStateChange();
        },
      });

      if (!instance) {
        throw new Error('Failed to create Live2D instance');
      }

      this.instance = instance;
      this.actions.setInstance(instance);

      this.setupEventHandlers();
      this.scheduleInitialLoad();

    } catch (error) {
      console.error('[Live2DManager] Failed to initialize Live2D:', error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this.instance) return;

    const loadHandler = (status: string) => {
      console.log('[Live2DManager] ⚡ onLoad callback triggered with status:', status);
      if (status === 'success') {
        console.log('[Live2DManager] ✓ Model loaded successfully! Updating state...');
        this.state.isLoaded = true;
        this.state.currentModelIndex = this.instance?.modelIndex ?? 0;
        this.state.currentModel = this.models[this.state.currentModelIndex]?.name ?? null;
        const base = this.models[this.state.currentModelIndex];
        this.baseScale = base?.scale ?? 0.1;
        const pos = base?.position ?? [0, 50];
        this.basePosition = { x: pos[0] ?? 0, y: pos[1] ?? 50 };

        this.actions.setBaseTransform(this.baseScale, this.basePosition);

        console.log('[Live2DManager] State updated:', this.state);

        setTimeout(() => {
          this.resetModelTransform();
        }, 100);

        this.emitStateChange();
        console.log('[Live2DManager] State change emitted, isLoaded:', this.state.isLoaded);
      } else {
        console.warn('[Live2DManager] Load status is not success:', status);
      }
    };

    this.instance.onLoad(loadHandler);

    if ('onLoadError' in this.instance && typeof this.instance.onLoadError === 'function') {
      this.instance.onLoadError((error: unknown) => {
        console.error('[Live2DManager] Load error:', error);
        console.error('[Live2DManager] 可能的原因：');
        console.error('[Live2DManager]   1. 模型文件路径不正确');
        console.error('[Live2DManager]   2. 模型文件不存在或无法访问');
        console.error('[Live2DManager]   3. 模型文件格式不正确');
        console.error('[Live2DManager]   4. CORS 问题（如果从远程加载）');
        this.emitStateChange();
      });
    }

    this.instance.onStageSlideIn(() => {
      this.state.isPlaying = true;
      this.emitStateChange();
    });

    this.instance.onStageSlideOut(() => {
      this.state.isPlaying = false;
      this.emitStateChange();
    });
  }

  private scheduleInitialLoad(): void {
    if (typeof window === 'undefined') return;
    console.log('[Live2DManager] Scheduling initial model load...');

    requestAnimationFrame(() => {
      setTimeout(() => {
        if (!this.instance) {
          console.error('[Live2DManager] Instance was destroyed before model could load');
          return;
        }

        if (this.state.isLoaded) {
          console.log('[Live2DManager] Model already loaded, skipping');
          return;
        }

        const firstModel = this.models[0];
        if (!firstModel) {
          console.error('[Live2DManager] No models configured');
          return;
        }

        console.log('[Live2DManager] 开始加载模型:', firstModel);
        console.log('[Live2DManager] 模型路径:', firstModel.path);
        console.log('[Live2DManager] 完整 URL:', window.location.origin + firstModel.path);

        this.instance.loadModelByIndex(0)
          .then(() => {
            console.log('[Live2DManager] ✓ loadModelByIndex(0) promise resolved');

            setTimeout(() => {
              if (!this.state.isLoaded) {
                console.warn('[Live2DManager] ⚠️ 模型加载超时（3秒后仍未完成）');
                console.warn('[Live2DManager] 这可能是 oh-my-live2d 的 onLoad 回调没有触发');
                console.warn('[Live2DManager] 尝试手动设置加载状态...');

                this.state.isLoaded = true;
                this.state.currentModelIndex = this.instance?.modelIndex ?? 0;
                this.state.currentModel = this.models[this.state.currentModelIndex]?.name ?? null;
                const base = this.models[this.state.currentModelIndex];
                if (base) {
                  this.baseScale = base.scale ?? 0.1;
                  const pos = base?.position ?? [0, 50];
                  this.basePosition = { x: pos[0] ?? 0, y: pos[1] ?? 50 };
                }
                this.actions.setBaseTransform(this.baseScale, this.basePosition);
                this.emitStateChange();
                console.log('[Live2DManager] 🔧 已手动设置为加载完成状态');
              }
            }, 3000);
          })
          .catch((err: Error) => {
            console.error('[Live2DManager] ✗ 加载模型失败:', err.message);
            console.error('[Live2DManager] 错误详情:', err);
            console.error('[Live2DManager] 请检查：');
            console.error('[Live2DManager]   1. 模型路径是否正确:', this.models[0]?.path);
            console.error('[Live2DManager]   2. 打开浏览器 Network 标签查看请求');
            console.error('[Live2DManager]   3. 检查控制台是否有 404 或 CORS 错误');
          });
      }, 200);
    });
  }

  private emitStateChange(): void {
    this.onStateChange?.({ ...this.state });
  }

  private resetModelTransform(): void {
    if (!this.instance) {
      console.log('[Live2DManager] Skipping transform reset - no instance');
      return;
    }
    if (!this.state.isLoaded) {
      console.log('[Live2DManager] Skipping transform reset - model not loaded yet');
      return;
    }

    try {
      this.instance.setModelRotation(0);
      this.instance.setModelPosition(this.basePosition);
      this.instance.setModelScale(this.baseScale);
      console.log('[Live2DManager] ✓ Transform reset successful');
    } catch (err) {
      console.log('[Live2DManager] Transform reset skipped - model not ready yet');
    }
  }

  getState(): Live2DState {
    return { ...this.state };
  }

  isInitialized(): boolean {
    return this.instance !== null;
  }

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

  async show(): Promise<void> {
    if (!this.instance) return;
    await this.instance.stageSlideIn();
  }

  async hide(): Promise<void> {
    if (!this.instance) return;
    await this.instance.stageSlideOut();
  }

  showMessage(message: string, duration: number = 3000, priority: number = 5): void {
    if (!this.instance) return;
    this.instance.tipsMessage(message, duration, priority);
  }

  clearMessages(): void {
    if (!this.instance) return;
    this.instance.clearTips();
  }

  setEmotionMapping(mapping: Partial<Live2DEmotionMapping>): void {
    this.actions.setEmotionMapping(mapping);
  }

  setActionAudio(action: PetActionType, url: string): void {
    this.actions.setActionAudio(action, url);
  }

  setActionAudioMap(map: Partial<Record<PetActionType, string>>): void {
    this.actions.setActionAudioMap(map);
  }

  triggerEmotion(emotion: any): void {
    this.actions.triggerEmotion(emotion);
  }

  playAction(action: PetActionType): void {
    this.actions.playAction(action);
  }

  setSpeaking(isSpeaking: boolean): void {
    this.actions.setSpeaking(isSpeaking);
  }

  playIdleGesture(gesture: IdleGesture): void {
    this.actions.playIdleGesture(gesture);
  }

  destroy(): void {
    this.actions.destroy();
    this.loader.destroy();
    this.instance = null;
    this.models = [];
    this.state = {
      isLoaded: false,
      currentModel: null,
      currentModelIndex: 0,
      isPlaying: false,
    };
  }
}

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
