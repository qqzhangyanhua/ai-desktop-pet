/**
 * 全局 Live2D 初始化器
 * 在 React 外部初始化 Live2D，避免 React 生命周期导致的重复初始化问题
 *
 * 目标：默认展示效果与 `test.html` 保持一致（white-cat + stage 300x400 + scale/position）。
 */

import type { Oml2dEvents, Oml2dMethods, Oml2dProperties } from 'oh-my-live2d';

type Oml2dInstance = Oml2dProperties & Oml2dMethods & Oml2dEvents;

// 全局状态
let globalInstance: Oml2dInstance | null = null;
let isInitializing = false;
let isLoaded = false;
let initPromise: Promise<Oml2dInstance | null> | null = null;

// 默认配置（与 test.html 保持一致）
const MODEL_CONFIG = {
  name: 'white-cat',
  path: '/whitecatfree_vts/white-cat.model3.json',
  scale: 0.15,
  position: [0, 60] as [number, number],
  stageStyle: {
    height: 400,
    width: 300,
  },
  // 关键：窗口宽度 300px 会触发 oh-my-live2d 的 “mobile” 分支（<=768px）
  // 若不显式提供 mobile* 配置，会导致模型不加载/不可见。
  mobileScale: 0.15,
  mobilePosition: [0, 60] as [number, number],
  mobileStageStyle: {
    height: 400,
    width: 300,
  },
};

// 状态监听者
type Listener = () => void;
const listeners: Set<Listener> = new Set();

function notifyListeners(): void {
  listeners.forEach((fn) => fn());
}

function markLoaded(reason: string): void {
  if (isLoaded) return;
  isLoaded = true;
  notifyListeners();
}

function finishInit(): void {
  isInitializing = false;
}

async function ensureDomReady(): Promise<void> {
  if (typeof document === 'undefined') return;
  if (document.readyState !== 'loading') return;
  await new Promise<void>((resolve) => {
    document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
  });
}

/**
 * 🔍 诊断 Live2D stage 的实际状态
 * 检查位置、尺寸、样式，找出为什么不可见
 */
function diagnoseLive2DStage(): void {
  // Diagnostic function - kept for debugging purposes but logs removed
}

/**
 * 🔧 强制修复 Live2D stage 的位置和尺寸
 * 确保它在窗口内可见
 */
function forceFixLive2DSize(): void {
  const stage = document.getElementById('oml2d-stage') as HTMLElement | null;
  const canvas = document.getElementById('oml2d-canvas') as HTMLCanvasElement | null;
  if (!stage && !canvas) {
    return;
  }

  const targetWidth = MODEL_CONFIG.stageStyle.width;
  const targetHeight = MODEL_CONFIG.stageStyle.height;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // 🔥 计算合适的位置：确保 stage 在窗口内可见
  // Tauri 窗口是 400x600，stage 是 300x400
  // 我们希望 stage 在窗口左下角可见
  const targetLeft = 50; // 距离左边缘 50px
  const targetBottom = 0; // 距离底部 0px

  if (stage) {
    const rect = stage.getBoundingClientRect();
    const needsFix =
      rect.width === 0 ||
      rect.height === 0 ||
      rect.left < 0 ||
      rect.right > viewportWidth ||
      rect.top < 0 ||
      rect.bottom > viewportHeight;

    if (needsFix) {
      // 🔥 强制设置位置和尺寸
      stage.style.cssText = `
        position: fixed !important;
        left: ${targetLeft}px !important;
        bottom: ${targetBottom}px !important;
        right: auto !important;
        top: auto !important;
        width: ${targetWidth}px !important;
        height: ${targetHeight}px !important;
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        z-index: 50 !important;
        pointer-events: auto !important;
      `;
    }
  }

  if (canvas) {
    if (canvas.width === 0 || canvas.height === 0) {
      canvas.width = targetWidth * window.devicePixelRatio;
      canvas.height = targetHeight * window.devicePixelRatio;
      canvas.style.cssText = `
        width: ${targetWidth}px !important;
        height: ${targetHeight}px !important;
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
      `;
    }
  }
}

function tryMarkLoaded(reason: string): void {
  if (!globalInstance || isLoaded) return;

  const stage = document.getElementById('oml2d-stage');
  const canvas = document.getElementById('oml2d-canvas') as HTMLCanvasElement | null;
  const stageRect = stage?.getBoundingClientRect();
  const canvasOk = !!canvas && canvas.width > 0 && canvas.height > 0;
  const stageOk = !!stageRect && stageRect.width > 0 && stageRect.height > 0;

  const model = (globalInstance as any)?.models?.model;
  const hasInternalModel = Boolean(model?.internalModel);
  const pixiStageChildren =
    (globalInstance as any)?.pixiApp?.app?.stage?.children?.length ?? 0;

  if ((hasInternalModel || pixiStageChildren > 0) && (canvasOk || stageOk)) {
    markLoaded(reason);
  }
}

/**
 * 初始化全局 Live2D 实例
 * 这个函数只会真正执行一次，后续调用会返回相同的 Promise
 */
export function initGlobalLive2D(): Promise<Oml2dInstance | null> {
  if (initPromise) {
    return initPromise;
  }

  initPromise = new Promise<Oml2dInstance | null>(async (resolve) => {
    if (globalInstance && isLoaded) {
      resolve(globalInstance);
      return;
    }

    if (isInitializing) {
      const checkInterval = setInterval(() => {
        if (!isInitializing) {
          clearInterval(checkInterval);
          resolve(globalInstance);
        }
      }, 100);
      return;
    }

    isInitializing = true;

    try {
      await ensureDomReady();

      // Test paths for model loading
      const testPaths = [
        MODEL_CONFIG.path,
        MODEL_CONFIG.path.replace('./', '/'),
        MODEL_CONFIG.path.replace('./', ''),
        new URL(MODEL_CONFIG.path, document.baseURI).href,
      ];

      // Check model file accessibility
      let workingModelUrl = MODEL_CONFIG.path;
      let foundWorkingPath = false;

      for (const testPath of testPaths) {
        try {
          const response = await fetch(testPath);

          if (response.ok) {
            workingModelUrl = testPath;
            foundWorkingPath = true;
            break;
          }
        } catch (err) {
          // Continue trying other paths
        }
      }

      // Dynamic import oh-my-live2d
      let loadOml2d: Awaited<typeof import('oh-my-live2d')>['loadOml2d'];
      try {
        const module = await import('oh-my-live2d');
        loadOml2d = module.loadOml2d;
      } catch (importErr) {
        console.error('[GlobalLive2D] oh-my-live2d import failed', importErr);

        // Fallback: try global variable
        if (typeof (window as any).OML2D !== 'undefined') {
          loadOml2d = (window as any).OML2D.loadOml2d;
        } else {
          console.error('[GlobalLive2D] Cannot load oh-my-live2d');
          finishInit();
          resolve(null);
          return;
        }
      }

      // Use working path for configuration
      const modelConfig = { ...MODEL_CONFIG };
      if (foundWorkingPath && workingModelUrl !== MODEL_CONFIG.path) {
        modelConfig.path = workingModelUrl;
      }

      const config = {
        models: [modelConfig],
        dockedPosition: 'left' as const,
        mobileDisplay: true,
        primaryColor: '#58b0fc',
        sayHello: false,
        tips: {
          messageLine: 12,
          style: {
            top: '44px',
            bottom: 'auto',
            left: '50%',
            width: '92%',
            minHeight: 'unset',
            padding: '10px 12px',
            borderRadius: '12px',
            backgroundColor: 'rgba(255,255,255,0.92)',
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
            color: 'rgba(15,23,42,0.92)',
            fontSize: '12px',
            lineHeight: '1.45',
            transform: 'translateX(-50%)',
          },
          mobileStyle: {
            top: '44px',
            bottom: 'auto',
            left: '50%',
            width: '92%',
            minHeight: 'unset',
            padding: '10px 12px',
            borderRadius: '12px',
            backgroundColor: 'rgba(255,255,255,0.92)',
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
            color: 'rgba(15,23,42,0.92)',
            fontSize: '12px',
            lineHeight: '1.45',
            transform: 'translateX(-50%)',
          },
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

      try {
        globalInstance = loadOml2d(config) as Oml2dInstance;
      } catch (loadErr) {
        console.error('[GlobalLive2D] loadOml2d() failed', loadErr);
        finishInit();
        resolve(null);
        return;
      }

      // Listen to events
      try {
        globalInstance.onLoad((status) => {
          if (status === 'success') {
            // Model loaded successfully
            diagnoseLive2DStage();
            forceFixLive2DSize();
            setTimeout(forceFixLive2DSize, 200);
            setTimeout(forceFixLive2DSize, 500);
            setTimeout(forceFixLive2DSize, 1000);

            setTimeout(() => {
              diagnoseLive2DStage();
            }, 1200);

            markLoaded('onLoad(success)');
            finishInit();
          }
        });
      } catch (e) {
        console.error('[GlobalLive2D] onLoad registration failed', e);
      }

      const onLoadError = (globalInstance as any)?.onLoadError as
        | ((cb: (error: unknown) => void) => void)
        | undefined;
      if (onLoadError) {
        onLoadError((error: unknown) => {
          console.error('[GlobalLive2D] onLoadError triggered', error);
        });
      }

      setTimeout(() => {
        if (!globalInstance) {
          console.error('[GlobalLive2D] globalInstance is null');
          return;
        }

        globalInstance
          .loadModelByIndex(0)
          .then(() => {
            setTimeout(() => {
              diagnoseLive2DStage();
              forceFixLive2DSize();
            }, 300);

            // Regular check and fix (prevent oh-my-live2d from modifying styles)
            const fixInterval = setInterval(() => {
              const stage = document.getElementById('oml2d-stage');
              if (stage) {
                const rect = stage.getBoundingClientRect();
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;

                if (rect.left < 0 || rect.right > viewportWidth ||
                    rect.top < 0 || rect.bottom > viewportHeight ||
                    rect.width === 0 || rect.height === 0) {
                  forceFixLive2DSize();
                }
              } else {
                clearInterval(fixInterval);
              }
            }, 2000);

            setTimeout(() => {
              clearInterval(fixInterval);
            }, 10000);

            forceFixLive2DSize();
            tryMarkLoaded('afterLoadModelByIndex(0)');

            setTimeout(() => {
              forceFixLive2DSize();
              tryMarkLoaded('timeoutCheck(5s)');
              if (!isLoaded) {
                const model = (globalInstance as any)?.models?.model;
                const pixiStageChildren =
                  (globalInstance as any)?.pixiApp?.app?.stage?.children?.length ?? 0;
                console.warn('[GlobalLive2D] Model not ready after 5s', {
                  hasModel: Boolean(model),
                  hasInternalModel: Boolean(model?.internalModel),
                  pixiStageChildren,
                });
              }
              finishInit();
            }, 5000);
          })
          .catch((err: unknown) => {
            console.error(
              '[GlobalLive2D] loadModelByIndex(0) failed',
              err instanceof Error ? err.message : String(err)
            );
            finishInit();
          })
          .finally(() => {});
      }, 100);

      resolve(globalInstance);
    } catch (err) {
      console.error('[GlobalLive2D] ❌ Initialization failed!');
      console.error('[GlobalLive2D] 错误类型:', Object.prototype.toString.call(err));
      console.error('[GlobalLive2D] 错误内容:', err);
      if (err instanceof Error) {
        console.error('[GlobalLive2D] 错误消息:', err.message);
        console.error('[GlobalLive2D] 错误堆栈:', err.stack);
      } else {
        console.error('[GlobalLive2D] 非 Error 对象:', JSON.stringify(err));
      }
      finishInit();
      resolve(null);
    }
  });

  return initPromise;
}

/**
 * 订阅加载状态变化
 */
export function subscribeToLoadState(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * 获取当前状态
 */
export function getLive2DState(): { instance: Oml2dInstance | null; isLoaded: boolean } {
  return { instance: globalInstance, isLoaded };
}

/**
 * 获取全局实例（如果已初始化）
 */
export function getGlobalInstance(): Oml2dInstance | null {
  return globalInstance;
}

/**
 * 检查是否已加载
 */
export function isLive2DLoaded(): boolean {
  return isLoaded;
}
