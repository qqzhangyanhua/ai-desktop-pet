/**
 * usePerformanceMode Hook
 * 性能模式管理 Hook
 *
 * 监听窗口状态变化，自动切换性能模式
 */

import { useEffect, useState, useCallback } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { getPerformanceManager } from '@/services/performance';
import { useConfigStore } from '@/stores';
import type { PerformanceMode } from '@/types';

interface UsePerformanceModeResult {
  currentMode: PerformanceMode;
  currentFps: number;
  isWindowFocused: boolean;
  setMode: (mode: PerformanceMode) => Promise<void>;
}

export function usePerformanceMode(): UsePerformanceModeResult {
  const [currentMode, setCurrentMode] = useState<PerformanceMode>('balanced');
  const [currentFps, setCurrentFps] = useState(30);
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  const { config } = useConfigStore();

  // 手动设置模式
  const setMode = useCallback(async (mode: PerformanceMode) => {
    const manager = getPerformanceManager();
    await manager.setMode(mode);
    setCurrentMode(mode);
    setCurrentFps(manager.getCurrentFps());
  }, []);

  // 初始化和监听窗口事件
  useEffect(() => {
    const manager = getPerformanceManager();

    // 设置回调
    manager.setCallbacks({
      onFpsChange: (fps) => setCurrentFps(fps),
      onModeChange: (mode) => setCurrentMode(mode),
    });

    // 初始化
    void manager.initialize().then(() => {
      setCurrentMode(manager.getCurrentMode());
      setCurrentFps(manager.getCurrentFps());
    });

    // 监听窗口事件（仅在 Tauri 环境）
    if (!isTauri()) {
      return;
    }

    const setupWindowListeners = async () => {
      try {
        const appWindow = getCurrentWindow();

        // 监听焦点事件
        const unlistenFocus = await appWindow.onFocusChanged(({ payload: focused }) => {
          setIsWindowFocused(focused);
          if (focused) {
            void manager.onWindowFocus();
          } else {
            void manager.onWindowBlur();
          }
        });

        // 返回清理函数
        return () => {
          unlistenFocus();
        };
      } catch (error) {
        console.warn('[usePerformanceMode] Failed to setup window listeners:', error);
        return () => {};
      }
    };

    let cleanup: (() => void) | undefined;
    void setupWindowListeners().then((fn) => {
      cleanup = fn;
    });

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, []);

  // 当配置变化时更新
  useEffect(() => {
    const manager = getPerformanceManager();
    // 如果窗口获得焦点，则更新为性能模式；否则使用配置的后台模式
    const windowState = manager.getWindowState();
    if (windowState.focused && !windowState.minimized) {
      void manager.setMode('performance');
    }
  }, [config.performance.backgroundMode]);

  return {
    currentMode,
    currentFps,
    isWindowFocused,
    setMode,
  };
}
