// @ts-nocheck
import type { Live2DModelConfig, Live2DState } from '../../types';
import type { Oml2dMethods, Oml2dProperties, Oml2dEvents } from 'oh-my-live2d';

type Oml2dInstance = Oml2dProperties & Oml2dMethods & Oml2dEvents;

export interface Live2DLoaderOptions {
  dockedPosition?: 'left' | 'right';
  primaryColor?: string;
  onStateChange?: (state: Live2DState) => void;
}

export class Live2DLoader {
  private instance: Oml2dInstance | null = null;
  private models: Live2DModelConfig[] = [];
  private onStateChange?: (state: Live2DState) => void;
  private isInitializing = false;

  async init(models: Live2DModelConfig[], options?: Live2DLoaderOptions): Promise<Oml2dInstance | null> {
    if (this.instance && this.instance) {
      console.log('[Live2DLoader] Already initialized, reusing existing instance');
      if (options?.onStateChange) {
        this.onStateChange = options.onStateChange;
      }
      return this.instance;
    }

    if (this.isInitializing) {
      console.warn('[Live2DLoader] Initialization already in progress');
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!this.isInitializing) {
            clearInterval(checkInterval);
            resolve(this.instance);
          }
        }, 100);
      });
    }

    this.isInitializing = true;
    console.log('[Live2DLoader] Starting initialization with models:', models.map(m => ({ name: m.name, path: m.path })));

    this.onStateChange = options?.onStateChange;
    this.models = models;

    try {
      console.log('[Live2DLoader] Loading oh-my-live2d...');
      const { loadOml2d } = await import('oh-my-live2d');
      console.log('[Live2DLoader] oh-my-live2d loaded successfully');

      const oml2dConfig = {
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
      };

      console.log('[Live2DLoader] Creating oh-my-live2d instance with config:', JSON.stringify(oml2dConfig, null, 2));

      if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
          console.log('[Live2DLoader] Waiting for DOM to be ready, current readyState:', document.readyState);
          await new Promise<void>((resolve) => {
            const handler = () => {
              console.log('[Live2DLoader] DOMContentLoaded fired');
              resolve();
            };
            document.addEventListener('DOMContentLoaded', handler, { once: true });
          });
        } else {
          console.log('[Live2DLoader] DOM already ready, readyState:', document.readyState);
        }
      }

      const firstModel = models[0];
      if (firstModel) {
        console.log('[Live2DLoader] 将要加载的模型：', firstModel);
        console.log('[Live2DLoader] 请确保以下文件存在：');
        console.log('[Live2DLoader]   - ', firstModel.path);
      }

      this.instance = loadOml2d(oml2dConfig) as Oml2dInstance;
      console.log('[Live2DLoader] Instance created:', !!this.instance);
      console.log('[Live2DLoader] Instance type:', typeof this.instance);
      console.log('[Live2DLoader] Instance keys:', Object.keys(this.instance || {}).slice(0, 10));

      this.isInitializing = false;
      return this.instance;

    } catch (error) {
      console.error('[Live2DLoader] Failed to initialize Live2D:', error);
      this.isInitializing = false;
      throw error;
    }
  }

  getInstance(): Oml2dInstance | null {
    return this.instance;
  }

  isInitialized(): boolean {
    return this.instance !== null;
  }

  destroy(): void {
    if (typeof window !== 'undefined') {
      // Clear any pending operations
    }
    this.instance = null;
    this.models = [];
    this.onStateChange = undefined;
    this.isInitializing = false;
  }
}
