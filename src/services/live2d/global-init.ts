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
  console.log('[GlobalLive2D] ✓ 标记为已加载（原因）：', reason);
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

function forceFixLive2DSize(): void {
  const stage = document.getElementById('oml2d-stage') as HTMLElement | null;
  const canvas = document.getElementById('oml2d-canvas') as HTMLCanvasElement | null;
  if (!stage && !canvas) return;

  const targetWidth = MODEL_CONFIG.stageStyle.width;
  const targetHeight = MODEL_CONFIG.stageStyle.height;

  if (stage) {
    const rect = stage.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      stage.style.cssText = `
        width: ${targetWidth}px !important;
        height: ${targetHeight}px !important;
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
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
  if (initPromise) return initPromise;

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
    console.log('[GlobalLive2D] Starting initialization...');

    try {
      await ensureDomReady();

      // 先检查模型文件是否可访问（本地静态资源）
      try {
        const response = await fetch(MODEL_CONFIG.path);
        if (!response.ok) {
          console.warn(
            '[GlobalLive2D] ⚠️ 模型入口文件不可访问：',
            MODEL_CONFIG.path,
            response.status,
            response.statusText
          );
        }
      } catch (err) {
        console.warn('[GlobalLive2D] ⚠️ 模型入口文件请求失败：', err);
      }

      console.log('[GlobalLive2D] Loading oh-my-live2d...');
      const { loadOml2d } = await import('oh-my-live2d');
      console.log('[GlobalLive2D] ✓ oh-my-live2d loaded');

      const config = {
        models: [MODEL_CONFIG],
        dockedPosition: 'right' as const,
        // 关键：当前窗口 300x400 会被库判定为 mobile（matchMedia max-width:768）
        // 若不允许 mobileDisplay，库会直接跳过模型加载（你日志里 hasModel:false 就是这个原因）。
        mobileDisplay: true,
        primaryColor: '#58b0fc',
        sayHello: false,
        tips: {
          // 默认 3 行会截断长气泡，这里放宽并配合 CSS 取消 clamp
          messageLine: 12,
          // 统一 PC / mobile 的气泡样式（窗口很小，默认样式容易被挡/太窄）
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

      console.log('[GlobalLive2D] Creating Live2D instance...');
      globalInstance = loadOml2d(config) as Oml2dInstance;
      console.log('[GlobalLive2D] ✓ Instance created');

      globalInstance.onLoad((status) => {
        console.log('[GlobalLive2D] ⚡ onLoad:', status);
        if (status === 'success') {
          forceFixLive2DSize();
          // 直接标记为已加载，不依赖内部模型检测（版本兼容性问题）
          markLoaded('onLoad(success)');
          // 某些环境下舞台/画布尺寸可能会是 0，额外兜底修复
          setTimeout(forceFixLive2DSize, 200);
          finishInit();
        }
      });

      const onLoadError = (globalInstance as any)?.onLoadError as
        | ((cb: (error: unknown) => void) => void)
        | undefined;
      onLoadError?.((error: unknown) => {
        console.error('[GlobalLive2D] ⚡ onLoadError:', error);
      });

      console.log('[GlobalLive2D] Scheduling model load...');
      setTimeout(() => {
        if (!globalInstance) return;

        globalInstance
          .loadModelByIndex(0)
          .then(() => {
            console.log('[GlobalLive2D] ✓ loadModelByIndex(0) resolved');
            forceFixLive2DSize();
            tryMarkLoaded('afterLoadModelByIndex(0)');

            // 最终兜底：如果 onLoad 仍未触发，做一次更可靠的状态检查（不再盲目置为 loaded）
            setTimeout(() => {
              forceFixLive2DSize();
              tryMarkLoaded('timeoutCheck(5s)');
              if (!isLoaded) {
                const model = (globalInstance as any)?.models?.model;
                const pixiStageChildren =
                  (globalInstance as any)?.pixiApp?.app?.stage?.children?.length ?? 0;
                console.warn('[GlobalLive2D] ⚠️ 模型仍未就绪（5s）', {
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
              '[GlobalLive2D] ❌ loadModelByIndex(0) failed:',
              err instanceof Error ? err.message : String(err)
            );
            finishInit();
          })
          .finally(() => {});
      }, 100);

      resolve(globalInstance);
    } catch (err) {
      console.error('[GlobalLive2D] ❌ Initialization failed:', err);
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
