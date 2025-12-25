// useLive2D hook - React hook for Live2D integration

import { useState, useEffect, useCallback, useRef } from 'react';
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
  const { models, dockedPosition, primaryColor, autoInit = true } = options;

  const [state, setState] = useState<Live2DState>({
    isLoaded: false,
    currentModel: null,
    currentModelIndex: 0,
    isPlaying: false,
  });
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const initRef = useRef(false);

  const init = useCallback(async () => {
    if (initRef.current) return;
    initRef.current = true;

    try {
      const manager = getLive2DManager();

      if (manager.isInitialized()) {
        setState(manager.getState());
        setIsReady(true);
        return;
      }

      await manager.init(models, {
        dockedPosition,
        primaryColor,
        onStateChange: (newState) => {
          setState(newState);
        },
      });

      setIsReady(true);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to initialize Live2D'));
      initRef.current = false;
    }
  }, [models, dockedPosition, primaryColor]);

  useEffect(() => {
    if (autoInit && models.length > 0) {
      init();
    }

    return () => {
      // Don't destroy on unmount - let it persist
    };
  }, [autoInit, models.length, init]);

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
    const manager = getLive2DManager();
    await manager.show();
  }, []);

  const hide = useCallback(async () => {
    const manager = getLive2DManager();
    await manager.hide();
  }, []);

  const showMessage = useCallback((message: string, duration: number = 3000) => {
    const manager = getLive2DManager();
    manager.showMessage(message, duration);
  }, []);

  const triggerEmotion = useCallback((emotion: EmotionType) => {
    const manager = getLive2DManager();
    manager.triggerEmotion(emotion);
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
