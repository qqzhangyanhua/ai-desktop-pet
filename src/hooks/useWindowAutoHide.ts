/**
 * Window Auto-Hide Hook
 * 窗口自动隐藏 Hook
 *
 * 实现靠边自动隐藏功能：
 * - 窗口靠近屏幕边缘时自动隐藏
 * - 鼠标悬停时显示
 */

import { useEffect, useState } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { LogicalPosition } from '@tauri-apps/api/dpi';

interface UseWindowAutoHideOptions {
  enabled?: boolean;
  edgeThreshold?: number; // 靠边判定距离（px）
  hideOffset?: number; // 隐藏时露出的宽度（px）
  hoverRevealDelay?: number; // 鼠标悬停多久显示（ms）
}

export function useWindowAutoHide(options: UseWindowAutoHideOptions = {}) {
  const {
    enabled = true,
    edgeThreshold = 50,
    hideOffset = 20,
    hoverRevealDelay = 100,
  } = options;

  const [isHidden, setIsHidden] = useState(false);
  const [screenEdge, setScreenEdge] = useState<'left' | 'right' | 'top' | 'bottom' | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (!isTauri()) return;

    const appWindow = getCurrentWindow();
    let dragEndTimer: ReturnType<typeof setTimeout> | null = null;
    let hoverTimer: ReturnType<typeof setTimeout> | null = null;
    let isCheckingEdge = false; // 防止并发检查
    let isInitialized = false; // 防止初始化时立即触发
    let isHiddenRef = false;
    let screenEdgeRef: typeof screenEdge = null;

    /**
     * Check if window is near screen edge
     * 检查窗口是否靠近屏幕边缘
     */
    const checkEdgeProximity = async () => {
      // 防止并发检查
      if (isCheckingEdge) return;
      // 未初始化时不检查
      if (!isInitialized) return;

      isCheckingEdge = true;

      try {
        const position = await appWindow.outerPosition();
        const size = await appWindow.outerSize();

        // Get screen dimensions (approximation)
        const screenWidth = window.screen.width;
        const screenHeight = window.screen.height;

        const x = position.x;
        const y = position.y;
        const width = size.width;
        const height = size.height;

        // Check which edge is closest
        let nearEdge: typeof screenEdge = null;

        if (x <= edgeThreshold) {
          nearEdge = 'left';
        } else if (x + width >= screenWidth - edgeThreshold) {
          nearEdge = 'right';
        } else if (y <= edgeThreshold) {
          nearEdge = 'top';
        } else if (y + height >= screenHeight - edgeThreshold) {
          nearEdge = 'bottom';
        }

        setScreenEdge(nearEdge);
        screenEdgeRef = nearEdge;

        // Auto-hide if near edge
        if (nearEdge) {
          await hideWindow(nearEdge, position, size);
          setIsHidden(true);
          isHiddenRef = true;
        } else {
          setIsHidden(false);
          isHiddenRef = false;
        }
      } catch (error) {
        console.error('[useWindowAutoHide] Failed to check edge proximity:', error);
      } finally {
        isCheckingEdge = false;
      }
    };

    /**
     * Hide window by moving it off-screen
     * 通过移动窗口位置来隐藏
     */
    const hideWindow = async (
      edge: 'left' | 'right' | 'top' | 'bottom',
      position: { x: number; y: number },
      size: { width: number; height: number }
    ) => {
      try {
        let newX = position.x;
        let newY = position.y;

        switch (edge) {
          case 'left':
            newX = -(size.width - hideOffset);
            break;
          case 'right':
            newX = window.screen.width - hideOffset;
            break;
          case 'top':
            newY = -(size.height - hideOffset);
            break;
          case 'bottom':
            newY = window.screen.height - hideOffset;
            break;
        }

        await appWindow.setPosition(new LogicalPosition(newX, newY));
      } catch (error) {
        console.error('[useWindowAutoHide] Failed to hide window:', error);
      }
    };

    /**
     * Reveal window
     * 显示窗口
     */
    const revealWindow = async () => {
      if (!screenEdgeRef) return;

      try {
        const position = await appWindow.outerPosition();
        const size = await appWindow.outerSize();

        let newX = position.x;
        let newY = position.y;

        switch (screenEdgeRef) {
          case 'left':
            newX = 0;
            break;
          case 'right':
            newX = window.screen.width - size.width;
            break;
          case 'top':
            newY = 0;
            break;
          case 'bottom':
            newY = window.screen.height - size.height;
            break;
        }

        await appWindow.setPosition(new LogicalPosition(newX, newY));
        setIsHidden(false);
        isHiddenRef = false;
      } catch (error) {
        console.error('[useWindowAutoHide] Failed to reveal window:', error);
      }
    };

    /**
     * Handle mouse enter - reveal window
     * 鼠标进入 - 显示窗口
     */
    const handleMouseEnter = () => {
      if (!isHiddenRef) return;

      if (hoverTimer) {
        clearTimeout(hoverTimer);
      }

      hoverTimer = setTimeout(() => {
        revealWindow();
      }, hoverRevealDelay);
    };

    /**
     * Handle mouse leave - check if should hide
     * 鼠标离开 - 检查是否应该隐藏
     */
    const handleMouseLeave = () => {
      if (hoverTimer) {
        clearTimeout(hoverTimer);
        hoverTimer = null;
      }

      // Re-check edge proximity after a short delay
      setTimeout(() => {
        checkEdgeProximity();
      }, 300);
    };

    /**
     * Handle drag end - check edge proximity
     * 拖动结束 - 检查边缘距离
     */
    const handleDragEnd = () => {
      if (dragEndTimer) {
        clearTimeout(dragEndTimer);
      }

      // Wait for drag to finish, then check
      dragEndTimer = setTimeout(() => {
        checkEdgeProximity();
      }, 500);
    };

    // Listen to mouse events
    document.addEventListener('mouseenter', handleMouseEnter, true);
    document.addEventListener('mouseleave', handleMouseLeave, true);

    // Listen to window events (drag end is approximated by position change)
    const positionUnlisten = appWindow.onMoved(() => {
      handleDragEnd();
    });

    // Delayed initialization to avoid conflicts with app startup
    const initTimer = setTimeout(() => {
      isInitialized = true;
      console.log('[useWindowAutoHide] Initialized, auto-hide enabled');
    }, 2000); // 延迟 2 秒初始化，避免与应用启动冲突

    return () => {
      document.removeEventListener('mouseenter', handleMouseEnter, true);
      document.removeEventListener('mouseleave', handleMouseLeave, true);
      positionUnlisten.then((unlisten) => unlisten());
      if (dragEndTimer) clearTimeout(dragEndTimer);
      if (hoverTimer) clearTimeout(hoverTimer);
      if (initTimer) clearTimeout(initTimer);
    };
  }, [enabled, edgeThreshold, hideOffset, hoverRevealDelay]);

  return {
    isHidden,
    screenEdge,
  };
}
