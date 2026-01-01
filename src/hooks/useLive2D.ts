// useLive2D hook - React hook for Live2D integration
// 使用全局初始化器，避免 React 生命周期问题

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  getLive2DState, 
  subscribeToLoadState, 
  getGlobalInstance,
  initGlobalLive2D,
  isLive2DLoaded 
} from '../services/live2d/global-init';
import { getLive2DManager, destroyLive2DManager } from '../services/live2d';
import type { Live2DModelConfig, Live2DState } from '../types';
import type { EmotionType } from '../types';

interface UseLive2DOptions {
  models: Live2DModelConfig[];
  dockedPosition?: 'left' | 'right';
  primaryColor?: string;
  autoInit?: boolean;
}

interface UseLive2DReturn {
  state: Live2DState;
  isReady: boolean;
  error: Error | null;
  init: () => Promise<void>;
  loadModel: (indexOrName: number | string) => Promise<void>;
  loadNextModel: () => Promise<void>;
  show: () => Promise<void>;
  hide: () => Promise<void>;
  showMessage: (message: string, duration?: number) => void;
  triggerEmotion: (emotion: EmotionType) => void;
}

export function useLive2D(options: UseLive2DOptions): UseLive2DReturn {
  const { autoInit = true } = options;

  const [state, setState] = useState<Live2DState>(() => {
    // 初始状态从全局获取
    const globalState = getLive2DState();
    return {
      isLoaded: globalState.isLoaded,
      currentModel: globalState.isLoaded ? 'white-cat' : null,
      currentModelIndex: 0,
      isPlaying: true,
    };
  });
  
  const [isReady, setIsReady] = useState(() => {
    // 如果全局实例已存在，直接标记为 ready
    return !!getGlobalInstance();
  });
  
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  // 如果需要，确保全局初始化已启动（避免在某些入口未提前调用 initGlobalLive2D 时卡住）
  useEffect(() => {
    if (!autoInit) return;
    if (getGlobalInstance()) return;
    initGlobalLive2D().catch(() => {});
  }, [autoInit]);

  // 订阅全局状态变化
  useEffect(() => {
    console.log('[useLive2D] Setting up global state subscription');
    mountedRef.current = true;

    // 检查当前状态
    const currentState = getLive2DState();
    if (currentState.instance) {
      setIsReady(true);
      if (currentState.isLoaded) {
        setState(prev => ({
          ...prev,
          isLoaded: true,
          currentModel: 'white-cat',
        }));
      }
    }

    // 订阅加载完成事件
    const unsubscribe = subscribeToLoadState(() => {
      console.log('[useLive2D] Received load state change notification');
      if (mountedRef.current) {
        const newState = getLive2DState();
        console.log('[useLive2D] New state:', newState);
        setIsReady(!!newState.instance);
        setState(prev => ({
          ...prev,
          isLoaded: newState.isLoaded,
          currentModel: newState.isLoaded ? 'white-cat' : null,
        }));
      }
    });

    return () => {
      console.log('[useLive2D] Component unmounting, cleaning up subscription');
      mountedRef.current = false;
      unsubscribe();
    };
  }, []);

  // 轮询检查状态（兜底机制）
  useEffect(() => {
    if (state.isLoaded) return;

    const checkInterval = setInterval(() => {
      if (isLive2DLoaded() && mountedRef.current) {
        console.log('[useLive2D] Polling detected loaded state');
        setState(prev => ({
          ...prev,
          isLoaded: true,
          currentModel: 'white-cat',
        }));
        clearInterval(checkInterval);
      }
    }, 500);

    return () => clearInterval(checkInterval);
  }, [state.isLoaded]);

  // init 现在是空操作，因为初始化在 main.tsx 中完成
  const init = useCallback(async () => {
    console.log('[useLive2D] init() called - using global initializer');
    // 全局初始化已经在 main.tsx 中启动
    // 这里只需要等待它完成
    const currentState = getLive2DState();
    if (currentState.instance) {
      setIsReady(true);
      if (currentState.isLoaded) {
        setState(prev => ({
          ...prev,
          isLoaded: true,
          currentModel: 'white-cat',
        }));
      }
    }
  }, []);

  const loadModel = useCallback(async (indexOrName: number | string) => {
    try {
      const manager = getLive2DManager();
      await manager.loadModel(indexOrName);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load model'));
    }
  }, []);

  const loadNextModel = useCallback(async () => {
    try {
      const manager = getLive2DManager();
      await manager.loadNextModel();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load next model'));
    }
  }, []);

  const show = useCallback(async () => {
    const instance = getGlobalInstance();
    if (instance?.stageSlideIn) {
      await instance.stageSlideIn();
    }
  }, []);

  const hide = useCallback(async () => {
    const instance = getGlobalInstance();
    if (instance?.stageSlideOut) {
      await instance.stageSlideOut();
    }
  }, []);

  const showMessage = useCallback((message: string, duration: number = 3000) => {
    const instance = getGlobalInstance();
    if (instance?.tipsMessage) {
      // oh-my-live2d 内部用 innerHTML 渲染消息，这里做一次最小安全处理：
      // 1) 转义 HTML，避免注入
      // 2) 将换行转成 <br/>，避免“看起来显示不全”
      const escaped = message
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/\n/g, '<br/>');
      instance.tipsMessage(escaped, duration, 5);
    }
  }, []);

  const triggerEmotion = useCallback((emotion: EmotionType) => {
    console.log('[useLive2D] Triggering emotion:', emotion);
    // 情绪变化仅记录日志，不再显示emoji
    // 原因：emoji会通过tipsMessage显示，与bubbleText冲突
    // 未来可以在这里触发Live2D模型的表情动作
    // 例如：切换模型的motion/expression等
  }, []);

  return {
    state,
    isReady,
    error,
    init,
    loadModel,
    loadNextModel,
    show,
    hide,
    showMessage,
    triggerEmotion,
  };
}

// Cleanup function to call on app unmount
export function cleanupLive2D(): void {
  destroyLive2DManager();
}
